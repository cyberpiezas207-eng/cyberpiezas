import { describe, it, expect, beforeEach, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMock = vi.hoisted(() => ({
  getSubdomainRequestsByUserId: vi.fn(),
  getEffectiveUserSubscription: vi.fn(),
  createSubdomainRequest: vi.fn(),
  createNotificationForUser: vi.fn(),
  getAllSubdomainRequests: vi.fn(),
  getSubdomainRequestById: vi.fn(),
  updateSubdomainRequest: vi.fn(),
}));

vi.mock("./db", () => dbMock);
vi.mock("./_core/env", () => ({
  ENV: {
    ownerOpenId: "owner-open-id",
  },
}));

import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(
  role: "admin" | "cashier",
  userId = 1,
  options?: { openId?: string; subscriptionStatus?: string; subscriptionPlan?: string },
): TrpcContext {
  const user = {
    id: userId,
    openId: options?.openId ?? `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `User ${userId}`,
    loginMethod: "email",
    role,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionPlan: (options?.subscriptionPlan ?? "premium") as any,
    subscriptionStatus: (options?.subscriptionStatus ?? "active") as any,
    subscriptionStartDate: null,
    subscriptionEndDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } satisfies AuthenticatedUser;

  return {
    user,
    req: {
      protocol: "https",
      headers: { origin: "https://boutiquepos.test" },
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("subdomains router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("permite a un suscriptor activo enviar una solicitud y normaliza el subdominio", async () => {
    dbMock.getEffectiveUserSubscription.mockResolvedValue({
      user: {
        effectiveSubscriptionStatus: "active",
        subscriptionStatus: "active",
      },
    });
    dbMock.createSubdomainRequest.mockResolvedValue({ id: 91, requestedSubdomain: "boutique-lupita" });

    const caller = appRouter.createCaller(createContext("admin", 7, { openId: "subscriber-7" }));
    const result = await caller.subdomains.createRequest({
      businessName: "Boutique Lupita",
      requestedSubdomain: "Boutiqué Lupita!!!",
      contactWhatsApp: "7771234567",
      notes: "Quiero que use el nombre comercial del negocio",
    });

    expect(dbMock.createSubdomainRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        businessName: "Boutique Lupita",
        requestedSubdomain: "boutique-lupita",
        status: "pending",
        availabilityStatus: "unchecked",
      }),
    );
    expect(dbMock.createNotificationForUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 7, relatedId: 91 }),
    );
    expect(result).toMatchObject({ id: 91, requestedSubdomain: "boutique-lupita" });
  });

  it("bloquea la solicitud cuando la suscripción no está activa", async () => {
    dbMock.getEffectiveUserSubscription.mockResolvedValue({
      user: {
        effectiveSubscriptionStatus: "pending_review",
        subscriptionStatus: "pending_review",
      },
    });

    const caller = appRouter.createCaller(createContext("admin", 9, { openId: "subscriber-9" }));

    await expect(
      caller.subdomains.createRequest({
        businessName: "Moda Norte",
        requestedSubdomain: "moda-norte",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(dbMock.createSubdomainRequest).not.toHaveBeenCalled();
  });

  it("impide a un administrador no dueño listar solicitudes administrativas", async () => {
    const caller = appRouter.createCaller(createContext("admin", 3, { openId: "otro-admin" }));

    await expect(caller.subdomains.adminList()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("permite al dueño revisar una solicitud y notifica al suscriptor", async () => {
    dbMock.getSubdomainRequestById.mockResolvedValue({
      id: 40,
      userId: 12,
      requestedSubdomain: "moda-ayala",
      assignedSubdomain: null,
    });
    dbMock.updateSubdomainRequest.mockResolvedValue({
      id: 40,
      status: "assigned",
      assignedSubdomain: "moda-ayala-oficial",
    });

    const caller = appRouter.createCaller(createContext("admin", 1, { openId: "owner-open-id" }));
    const result = await caller.subdomains.reviewRequest({
      requestId: 40,
      status: "assigned",
      availabilityStatus: "reserved",
      quotedPrice: "499.00",
      assignedSubdomain: "Moda Ayala Oficial",
      adminNotes: "Se apartó el nombre comercial y ya puedes usarlo.",
    });

    expect(dbMock.updateSubdomainRequest).toHaveBeenCalledWith(
      40,
      expect.objectContaining({
        status: "assigned",
        availabilityStatus: "reserved",
        quotedPrice: "499.00",
        assignedSubdomain: "moda-ayala-oficial",
        reviewedByUserId: 1,
      }),
    );
    expect(dbMock.createNotificationForUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 12,
        relatedId: 40,
      }),
    );
    expect(result).toMatchObject({ id: 40, status: "assigned" });
  });
});
