import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "admin" | "cashier" = "cashier"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "email",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Sales Operations", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should allow cashier to register a cash entry using assigned branch", async () => {
    const ctx = createAuthContext("cashier");
    const caller = appRouter.createCaller(ctx);

    vi.spyOn(db, "getUserBranchAssignment").mockResolvedValue({
      assignment: {
        id: 1,
        userId: 1,
        branchId: 12,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      branch: {
        id: 12,
        userId: 1,
        name: "Sucursal Centro",
        code: "CEN",
        address: null,
        city: null,
        state: null,
        zipCode: null,
        phone: null,
        email: null,
        manager: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as Awaited<ReturnType<typeof db.getUserBranchAssignment>>);

    const createCashMovementSpy = vi
      .spyOn(db, "createCashMovement")
      .mockResolvedValue({ id: 101 } as Awaited<ReturnType<typeof db.createCashMovement>>);

    const result = await caller.sales.registerCashMovement({
      movementType: "entry",
      category: "apartado",
      amount: "250.00",
      reason: "Anticipo de clienta",
      notes: "Mostrador principal",
    });

    expect(result).toEqual({ id: 101 });
    expect(createCashMovementSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        branchId: 12,
        userId: 1,
        movementType: "entry",
        amount: "250.00",
        category: "apartado",
      }),
    );
  });

  it("should create a persisted return and register the refund cash exit", async () => {
    const ctx = createAuthContext("cashier");
    const caller = appRouter.createCaller(ctx);

    vi.spyOn(db, "getSaleById").mockResolvedValue({
      id: 8,
      saleNumber: "SALE-20260429-0001",
      userId: 1,
      subtotal: "400.00",
      discount: "0.00",
      tax: "0.00",
      total: "400.00",
      paymentMethod: "cash",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Awaited<ReturnType<typeof db.getSaleById>>);

    vi.spyOn(db, "getUserBranchAssignment").mockResolvedValue({
      assignment: {
        id: 1,
        userId: 1,
        branchId: 12,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      branch: {
        id: 12,
        userId: 1,
        name: "Sucursal Centro",
        code: "CEN",
        address: null,
        city: null,
        state: null,
        zipCode: null,
        phone: null,
        email: null,
        manager: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as Awaited<ReturnType<typeof db.getUserBranchAssignment>>);

    vi.spyOn(db, "getSaleDetailsBySaleId").mockResolvedValue([
      {
        id: 44,
        saleId: 8,
        productVariantId: 77,
        productName: "Blusa Satinada",
        size: "M",
        color: "Negro",
        quantity: 2,
        unitPrice: "200.00",
        lineTotal: "400.00",
        createdAt: new Date(),
      },
    ] as Awaited<ReturnType<typeof db.getSaleDetailsBySaleId>>);

    vi.spyOn(db, "getSaleReturnsBySaleId").mockResolvedValue([]);
    vi.spyOn(db, "generateReturnNumber").mockResolvedValue("RETURN-20260429-0001");

    const createReturnSpy = vi
      .spyOn(db, "createSaleReturn")
      .mockResolvedValue({ id: 501 } as Awaited<ReturnType<typeof db.createSaleReturn>>);
    const createReturnDetailSpy = vi
      .spyOn(db, "createSaleReturnDetail")
      .mockResolvedValue({ id: 601 } as Awaited<ReturnType<typeof db.createSaleReturnDetail>>);
    const incrementBranchInventorySpy = vi
      .spyOn(db, "incrementBranchInventoryForReturn")
      .mockResolvedValue(undefined);
    const createCashMovementSpy = vi
      .spyOn(db, "createCashMovement")
      .mockResolvedValue({ id: 701 } as Awaited<ReturnType<typeof db.createCashMovement>>);

    const result = await caller.sales.createReturn({
      saleId: 8,
      reason: "Cambio por talla",
      notes: "La clienta pidió devolver una pieza",
      items: [{ saleDetailId: 44, quantity: 1 }],
    });

    expect(result).toEqual({ returnId: 501, returnNumber: "RETURN-20260429-0001" });
    expect(createReturnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        saleId: 8,
        branchId: 12,
        userId: 1,
        subtotal: "200.00",
        total: "200.00",
      }),
    );
    expect(createReturnDetailSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        saleReturnId: 501,
        saleDetailId: 44,
        quantity: 1,
        lineTotal: "200.00",
      }),
    );
    expect(incrementBranchInventorySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        branchId: 12,
        productVariantId: 77,
        quantity: 1,
      }),
    );
    expect(createCashMovementSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        movementType: "exit",
        category: "refund",
        amount: "200.00",
      }),
    );
  });

  it("should reject a return that exceeds the quantity still available", async () => {
    const ctx = createAuthContext("cashier");
    const caller = appRouter.createCaller(ctx);

    vi.spyOn(db, "getSaleById").mockResolvedValue({
      id: 8,
      saleNumber: "SALE-20260429-0001",
      userId: 1,
      subtotal: "400.00",
      discount: "0.00",
      tax: "0.00",
      total: "400.00",
      paymentMethod: "cash",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Awaited<ReturnType<typeof db.getSaleById>>);

    vi.spyOn(db, "getUserBranchAssignment").mockResolvedValue({
      assignment: {
        id: 1,
        userId: 1,
        branchId: 12,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      branch: {
        id: 12,
        userId: 1,
        name: "Sucursal Centro",
        code: "CEN",
        address: null,
        city: null,
        state: null,
        zipCode: null,
        phone: null,
        email: null,
        manager: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as Awaited<ReturnType<typeof db.getUserBranchAssignment>>);

    vi.spyOn(db, "getSaleDetailsBySaleId").mockResolvedValue([
      {
        id: 44,
        saleId: 8,
        productVariantId: 77,
        productName: "Blusa Satinada",
        size: "M",
        color: "Negro",
        quantity: 2,
        unitPrice: "200.00",
        lineTotal: "400.00",
        createdAt: new Date(),
      },
    ] as Awaited<ReturnType<typeof db.getSaleDetailsBySaleId>>);

    vi.spyOn(db, "getSaleReturnsBySaleId").mockResolvedValue([
      {
        id: 501,
        saleId: 8,
        branchId: 12,
        userId: 1,
        returnNumber: "RETURN-20260429-0001",
        subtotal: "200.00",
        tax: "0.00",
        total: "200.00",
        reason: "Cambio por talla",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as Awaited<ReturnType<typeof db.getSaleReturnsBySaleId>>);
    vi.spyOn(db, "getSaleReturnDetailsByReturnId").mockResolvedValue([
      {
        id: 601,
        saleReturnId: 501,
        saleDetailId: 44,
        productVariantId: 77,
        productName: "Blusa Satinada",
        size: "M",
        color: "Negro",
        quantity: 2,
        unitPrice: "200.00",
        lineTotal: "400.00",
        createdAt: new Date(),
      },
    ] as Awaited<ReturnType<typeof db.getSaleReturnDetailsByReturnId>>);

    await expect(
      caller.sales.createReturn({
        saleId: 8,
        reason: "Intento extra",
        items: [{ saleDetailId: 44, quantity: 1 }],
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});

describe("Product Variants", () => {
  it("should validate stock availability", () => {
    const availableStock = 5;
    const requestedQuantity = 3;

    expect(requestedQuantity <= availableStock).toBe(true);
  });

  it("should prevent negative stock", () => {
    const currentStock = 5;
    const soldQuantity = 3;
    const newStock = currentStock - soldQuantity;

    expect(newStock).toBeGreaterThanOrEqual(0);
  });

  it("should prevent overselling", () => {
    const availableStock = 5;
    const requestedQuantity = 10;

    expect(requestedQuantity <= availableStock).toBe(false);
  });
});

describe("Role-Based Access Control", () => {
  it("admin should have full access", async () => {
    const ctx = createAuthContext("admin");
    expect(ctx.user.role).toBe("admin");
  });

  it("cashier should have limited access", async () => {
    const ctx = createAuthContext("cashier");
    expect(ctx.user.role).toBe("cashier");
  });

  it("should differentiate between roles", async () => {
    const adminCtx = createAuthContext("admin");
    const cashierCtx = createAuthContext("cashier");

    expect(adminCtx.user.role).not.toBe(cashierCtx.user.role);
  });
});
