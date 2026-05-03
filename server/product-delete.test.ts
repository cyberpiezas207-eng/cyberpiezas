import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMock = vi.hoisted(() => ({
  deleteProduct: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    deleteProduct: dbMock.deleteProduct,
  };
});

import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(userId = 41): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `admin-${userId}`,
    email: `admin${userId}@example.com`,
    name: `Admin ${userId}`,
    loginMethod: "email",
    role: "admin",
    subscriptionPlan: "premium",
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

describe("products.delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.deleteProduct.mockResolvedValue(undefined);
  });

  it("retira el producto del catálogo usando el id del suscriptor autenticado", async () => {
    const caller = appRouter.createCaller(createAdminContext(41));

    const result = await caller.products.delete({ id: 73 });

    expect(result).toEqual({ success: true });
    expect(dbMock.deleteProduct).toHaveBeenCalledWith(73, 41);
  });
});
