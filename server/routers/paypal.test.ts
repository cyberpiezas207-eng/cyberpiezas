import { describe, it, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "../routers";
import { createNotificationForUser, getDb, getEffectiveUserSubscription } from "../db";
import { users, transferPaymentRequests, payments, notifications } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Mock database
vi.mock("../db", () => ({
  getDb: vi.fn(),
  createNotificationForUser: vi.fn(),
  getEffectiveUserSubscription: vi.fn(),
}));

describe("PayPal Router - Manual Transfer Flow", () => {
  let mockDb: any;
  let adminContext: any;
  let userContext: any;

  beforeEach(() => {
    // Mock chainable Drizzle query builder
    const createChain = () => ({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      orderBy: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue(undefined),
    });

    mockDb = {
      insert: vi.fn(() => ({
        values: vi.fn().mockResolvedValue(undefined),
        $returningId: vi.fn().mockResolvedValue([{ id: 1 }]),
      })),
      select: vi.fn(() => createChain()),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn().mockResolvedValue(undefined),
        })),
      })),
    };

    vi.mocked(getDb).mockResolvedValue(mockDb);
    vi.mocked(createNotificationForUser).mockResolvedValue(undefined as any);
    vi.mocked(getEffectiveUserSubscription).mockResolvedValue({
      user: {
        id: 2,
        subscriptionPlan: "free",
        subscriptionStatus: "inactive",
      },
      activeLicense: null,
    } as any);

    adminContext = {
      user: {
        id: 1,
        openId: "admin-001",
        name: "Admin User",
        email: "admin@test.com",
        role: "admin",
        subscriptionPlan: "premium",
        subscriptionStatus: "active",
      },
    };

    userContext = {
      user: {
        id: 2,
        openId: "user-001",
        name: "Test User",
        email: "user@test.com",
        role: "cashier",
        subscriptionPlan: "free",
        subscriptionStatus: "inactive",
      },
    };
  });

  describe("getPlans", () => {
    it("should return available plans with payment method info", async () => {
      const caller = appRouter.createCaller({});
      const result = await caller.paypal.getPlans();

      expect(result).toHaveProperty("monthly");
      expect(result).toHaveProperty("annual");
      expect(result).toHaveProperty("paymentMethod");
      expect(result.paymentMethod.type).toBe("manual_transfer");
      expect(result.monthly).toHaveLength(3); // basic, professional, premium
      expect(result.annual).toBeDefined();
    });

    it("should include all required plan fields", async () => {
      const caller = appRouter.createCaller({});
      const result = await caller.paypal.getPlans();

      const basicPlan = result.monthly[0];
      expect(basicPlan).toHaveProperty("id");
      expect(basicPlan).toHaveProperty("name");
      expect(basicPlan).toHaveProperty("price");
      expect(basicPlan).toHaveProperty("currency", "MXN");
      expect(basicPlan).toHaveProperty("features");
    });
  });

  describe("createSubscriptionCheckout", () => {
    it("should create a monthly subscription request with proof", async () => {
      const caller = appRouter.createCaller(adminContext);

      const insertChain = {
        values: vi.fn().mockReturnThis(),
        $returningId: vi.fn().mockResolvedValue([{ id: 123 }]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      const result = await caller.paypal.createSubscriptionCheckout({
        planId: "basic",
        payerName: "Juan Pérez",
        transferReference: "REF-12345",
        notes: "Test transfer",
        proofBase64: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        proofMimeType: "image/jpeg",
        proofFileName: "comprobante.jpg",
      });

      expect(result.success).toBe(true);
      expect(result.requestId).toBe(123);
      expect(result.planName).toBe("Básico");
      expect(result.amount).toBe(99);
      expect(result.currency).toBe("MXN");
    });

    it("should reject invalid plan ID", async () => {
      const caller = appRouter.createCaller(adminContext);

      try {
        await caller.paypal.createSubscriptionCheckout({
          planId: "invalid" as any,
          payerName: "Juan Pérez",
          transferReference: "REF-12345",
        });
        expect.fail("Should have thrown error");
      } catch (error) {
        // Expected to throw error for invalid plan
        expect(error).toBeInstanceOf(Error);
      }
    });

    it("should reject non-admin users when trying to change plan", async () => {
      const caller = appRouter.createCaller(userContext);

      await expect(
        caller.paypal.createSubscriptionCheckout({
          planId: "basic",
          payerName: "Juan Pérez",
          transferReference: "REF-12345",
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("should require authentication", async () => {
      const caller = appRouter.createCaller({});

      try {
        await caller.paypal.createSubscriptionCheckout({
          planId: "basic",
          payerName: "Juan Pérez",
          transferReference: "REF-12345",
        });
        expect.fail("Should have thrown error");
      } catch (error) {
        // Expected to throw UNAUTHORIZED or similar
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe("createAnnualCheckout", () => {
    it("should create an annual plan request", async () => {
      const caller = appRouter.createCaller(adminContext);

      const insertChain = {
        values: vi.fn().mockReturnThis(),
        $returningId: vi.fn().mockResolvedValue([{ id: 456 }]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      const result = await caller.paypal.createAnnualCheckout({
        payerName: "María García",
        transferReference: "REF-67890",
        notes: "Annual plan purchase",
      });

      expect(result.success).toBe(true);
      expect(result.requestId).toBe(456);
      expect(result.planName).toBe("Anualidad");
      expect(result.amount).toBe(7000);
      expect(result.currency).toBe("MXN");
    });

    it("should reject non-admin annual plan changes", async () => {
      const caller = appRouter.createCaller(userContext);

      await expect(
        caller.paypal.createAnnualCheckout({
          payerName: "María García",
          transferReference: "REF-67890",
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("getPendingTransferRequests", () => {
    it("should require admin role", async () => {
      const caller = appRouter.createCaller(userContext);

      try {
        await caller.paypal.getPendingTransferRequests();
        expect.fail("Should have thrown error");
      } catch (error) {
        // Expected to throw FORBIDDEN
        expect(error).toBeInstanceOf(Error);
      }
    });

    it("should return pending requests for admin", async () => {
      const caller = appRouter.createCaller(adminContext);

      const mockRequests = [
        {
          request: {
            id: 1,
            userId: 2,
            planCode: "basic",
            planName: "Básico",
            amount: "99.00",
            status: "pending",
          },
          user: {
            id: 2,
            name: "Test User",
            email: "user@test.com",
          },
        },
      ];

      const selectChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockRequests),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await caller.paypal.getPendingTransferRequests();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("approveTransferRequest", () => {
    it("should require admin role", async () => {
      const caller = appRouter.createCaller(userContext);

      try {
        await caller.paypal.approveTransferRequest({ requestId: 1 });
        expect.fail("Should have thrown error");
      } catch (error) {
        // Expected to throw FORBIDDEN
        expect(error).toBeInstanceOf(Error);
      }
    });

    it("should approve pending transfer and activate subscription", async () => {
      const caller = appRouter.createCaller(adminContext);

      const mockRequest = {
        id: 1,
        userId: 2,
        planCode: "basic",
        planName: "Básico",
        billingType: "monthly",
        amount: "99.00",
        currency: "MXN",
        status: "pending",
        transferReference: "REF-12345",
        proofUrl: "https://example.com/proof.jpg",
      };

      // Setup mock chain for select query
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockRequest]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await caller.paypal.approveTransferRequest({ requestId: 1 });

      expect(result.success).toBe(true);
      expect(result.requestId).toBe(1);
      expect(result.planCode).toBe("basic");
      expect(mockDb.update).toHaveBeenCalledTimes(2);
      expect(createNotificationForUser).toHaveBeenCalledWith({
        userId: 2,
        type: "payment_received",
        title: "Pago recibido",
        message: "Recibimos tu pago por Básico y fue validado correctamente.",
        relatedId: 1,
      });
      expect(createNotificationForUser).toHaveBeenCalledWith({
        userId: 2,
        type: "subscription_change",
        title: "Suscripción activada",
        message: "Tu pago por transferencia fue validado y tu plan Básico ya está activo.",
        relatedId: 1,
      });
    });

    it("should reject if request not found", async () => {
      const caller = appRouter.createCaller(adminContext);

      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(selectChain);

      try {
        await caller.paypal.approveTransferRequest({ requestId: 999 });
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError<any>).code).toBe("NOT_FOUND");
      }
    });
  });

  describe("rejectTransferRequest", () => {
    it("should require admin role", async () => {
      const caller = appRouter.createCaller(userContext);

      try {
        await caller.paypal.rejectTransferRequest({
          requestId: 1,
          reason: "Invalid proof",
        });
        expect.fail("Should have thrown error");
      } catch (error) {
        // Expected to throw FORBIDDEN
        expect(error).toBeInstanceOf(Error);
      }
    });

    it("should reject transfer and notify user", async () => {
      const caller = appRouter.createCaller(adminContext);

      const mockRequest = {
        id: 1,
        userId: 2,
        status: "pending",
        notes: "Original notes",
      };

      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockRequest]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await caller.paypal.rejectTransferRequest({
        requestId: 1,
        reason: "Comprobante ilegible",
      });

      expect(result.success).toBe(true);
      expect(createNotificationForUser).toHaveBeenCalledWith({
        userId: 2,
        type: "subscription_change",
        title: "Pago pendiente de corrección",
        message: "Tu comprobante no pudo validarse: Comprobante ilegible",
        relatedId: 1,
      });
    });

    it("should reject if request not found", async () => {
      const caller = appRouter.createCaller(adminContext);

      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(selectChain);

      try {
        await caller.paypal.rejectTransferRequest({
          requestId: 999,
          reason: "Not found",
        });
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        expect((error as TRPCError<any>).code).toBe("NOT_FOUND");
      }
    });
  });

  describe("getCurrentSubscription", () => {
    it("should return effective subscription and payment requests", async () => {
      const caller = appRouter.createCaller(userContext);

      const mockRequests = [
        {
          id: 1,
          userId: 2,
          planCode: "basic",
          status: "pending",
        },
      ];

      vi.mocked(getEffectiveUserSubscription).mockResolvedValue({
        user: {
          id: 2,
          subscriptionPlan: "annual",
          subscriptionStatus: "active",
          effectiveSubscriptionPlan: "annual",
          effectiveSubscriptionStatus: "active",
        },
        activeLicense: {
          id: 9,
          userId: 2,
          planCode: "annual",
          status: "active",
          requiresYouTube: true,
          requiresFacebook: true,
          youtubeVerified: true,
          facebookVerified: false,
        },
      } as any);

      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockRequests),
        orderBy: vi.fn().mockReturnThis(),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await caller.paypal.getCurrentSubscription();

      expect(getEffectiveUserSubscription).toHaveBeenCalledWith(2);
      expect(result.user?.subscriptionPlan).toBe("annual");
      expect(result.activeLicense).toMatchObject({
        planCode: "annual",
        requiresYouTube: true,
        requiresFacebook: true,
      });
      expect(result.requests).toEqual(mockRequests);
    });
  });

  describe("cancelSubscription", () => {
    it("should cancel user subscription", async () => {
      const caller = appRouter.createCaller(adminContext);

      const updateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };
      mockDb.update.mockReturnValue(updateChain);

      const result = await caller.paypal.cancelSubscription();

      expect(result.success).toBe(true);
    });

    it("should reject non-admin cancellation attempts", async () => {
      const caller = appRouter.createCaller(userContext);

      await expect(caller.paypal.cancelSubscription()).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

});
