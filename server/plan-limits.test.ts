import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMock = vi.hoisted(() => ({
  countProductsByUserId: vi.fn(),
  createProduct: vi.fn(),
  countSalesForUserSince: vi.fn(),
  getBranchesByUserId: vi.fn(),
}));

vi.mock("./db", () => dbMock);

import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(plan: "free" | "basic" | "professional" | "premium" | "annual", userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `admin-${userId}`,
    email: `admin${userId}@example.com`,
    name: `Admin ${userId}`,
    loginMethod: "email",
    role: "admin",
    subscriptionPlan: plan,
    subscriptionStatus: "active",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStartDate: null,
    subscriptionEndDate: null,
    subscriptionCancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: { origin: "https://boutiquepos.test" } } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("plan limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.getBranchesByUserId.mockResolvedValue([]);
  });

  it("bloquea la creación de productos cuando el plan básico alcanza su límite", async () => {
    dbMock.countProductsByUserId.mockResolvedValue(500);

    const caller = appRouter.createCaller(createAdminContext("basic", 7));

    await expect(
      caller.products.create({
        name: "Blusa satinada",
        categoryId: 1,
        brand: "Boutique POS",
        basePrice: "499.00",
        sku: "BLU-001",
        description: "Producto de prueba",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(dbMock.countProductsByUserId).toHaveBeenCalledWith(7);
    expect(dbMock.createProduct).not.toHaveBeenCalled();
  });

  it("permite crear productos mientras el plan profesional no alcanza su límite", async () => {
    dbMock.countProductsByUserId.mockResolvedValue(4999);
    dbMock.createProduct.mockResolvedValue({ id: 91, name: "Vestido Midi" });

    const caller = appRouter.createCaller(createAdminContext("professional", 9));
    const result = await caller.products.create({
      name: "Vestido Midi",
      categoryId: 2,
      brand: "Boutique POS",
      basePrice: "899.00",
      sku: "VES-091",
      description: "Producto válido",
    });

    expect(dbMock.countProductsByUserId).toHaveBeenCalledWith(9);
    expect(dbMock.createProduct).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ id: 91, name: "Vestido Midi" });
  });

  it("bloquea ventas mensuales cuando el plan básico alcanza su tope", async () => {
    dbMock.countSalesForUserSince.mockResolvedValue(1000);

    const caller = appRouter.createCaller(createAdminContext("basic", 14));

    await expect(
      caller.sales.create({
        items: [],
        subtotal: "0",
        discount: "0",
        tax: "0",
        total: "0",
        paymentMethod: "cash",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(dbMock.countSalesForUserSince).toHaveBeenCalledTimes(1);
  });
});
