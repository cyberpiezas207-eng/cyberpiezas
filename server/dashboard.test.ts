import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMock = vi.hoisted(() => ({
  getUserById: vi.fn(),
  countProductsByUserId: vi.fn(),
  countBranchesByUserId: vi.fn(),
  countSalesForUserSince: vi.fn(),
  getTopSellingProducts: vi.fn(),
  getVariantsWithLowStock: vi.fn(),
}));

vi.mock("./db", () => dbMock);

import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(plan: string = "free", userId = 1): TrpcContext {
  const user = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `User ${userId}`,
    loginMethod: "email",
    role: "admin",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionPlan: plan,
    subscriptionStatus: "active",
    subscriptionStartDate: null,
    subscriptionEndDate: null,
    subscriptionCancelledAt: null,
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

describe("dashboard router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("expone uso real versus límites del plan gratis usando el conteo de productos por usuario", async () => {
    dbMock.getUserById.mockResolvedValue({ subscriptionPlan: "free" });
    dbMock.countProductsByUserId.mockResolvedValue(1);
    dbMock.countBranchesByUserId.mockResolvedValue(1);
    dbMock.countSalesForUserSince.mockResolvedValue(2);

    const caller = appRouter.createCaller(createContext("free", 44));
    const result = await caller.dashboard.planUsage();

    expect(dbMock.countProductsByUserId).toHaveBeenCalledWith(44);
    expect(dbMock.countBranchesByUserId).toHaveBeenCalledWith(44);
    expect(dbMock.countSalesForUserSince).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      planCode: "free",
      usage: {
        products: 1,
        branches: 1,
        monthlySales: 2,
      },
      limits: {
        products: 100,
        branches: 1,
        monthlySales: 200,
        users: 1,
        historyDays: 30,
      },
    });
  });

  it("mantiene límites ilimitados para planes superiores", async () => {
    dbMock.getUserById.mockResolvedValue({ subscriptionPlan: "premium" });
    dbMock.countProductsByUserId.mockResolvedValue(320);
    dbMock.countBranchesByUserId.mockResolvedValue(6);
    dbMock.countSalesForUserSince.mockResolvedValue(912);

    const caller = appRouter.createCaller(createContext("premium", 88));
    const result = await caller.dashboard.planUsage();

    expect(result.planCode).toBe("premium");
    expect(result.usage).toEqual({
      products: 320,
      branches: 6,
      monthlySales: 912,
    });
    expect(result.limits).toEqual({
      products: null,
      branches: null,
      monthlySales: null,
      users: 50,
      historyDays: null,
    });
  });
});
