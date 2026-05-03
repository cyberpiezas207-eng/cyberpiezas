import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMock = vi.hoisted(() => ({
  getManagedStaffUsers: vi.fn(),
  getSubscriberAccessRecords: vi.fn(),
  getUsersWithAssignedBranch: vi.fn(),
  getUserBranchAssignment: vi.fn(),
  assignUserToBranch: vi.fn(),
  getBranchById: vi.fn(),
  getBranchesByUserId: vi.fn(),
  generateSaleNumber: vi.fn(),
  createSale: vi.fn(),
  createSaleDetail: vi.fn(),
  decrementBranchInventoryForSale: vi.fn(),
  getProductVariantById: vi.fn(),
  updateProductVariantStock: vi.fn(),
  createInventoryMovement: vi.fn(),
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
  plan: "free" | "basic" | "professional" | "premium" | "annual" = "premium",
  openId = role === "admin" && userId === 1 ? "owner-open-id" : `user-${userId}`,
): TrpcContext {
  const user = {
    id: userId,
    openId,
    email: `user${userId}@example.com`,
    name: `User ${userId}`,
    loginMethod: "email",
    role,
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

describe("users and branch assignment router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("permite al administrador listar solo el personal interno gestionado", async () => {
    const rows = [
      {
        user: { id: 2, role: "cashier", name: "Caja Centro", email: "caja@example.com" },
        assignment: { id: 5, userId: 2, branchId: 9 },
        branch: { id: 9, name: "Sucursal Centro", code: "CTR" },
      },
    ];
    dbMock.getManagedStaffUsers.mockResolvedValue(rows);

    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.users.list();

    expect(result).toEqual(rows);
    expect(dbMock.getManagedStaffUsers).toHaveBeenCalledWith(1);
  });

  it("expone un listado separado para suscriptores en gestión de acceso", async () => {
    const rows = [
      {
        user: {
          id: 14,
          name: "Suscriptor Demo",
          email: "suscriptor@example.com",
          effectiveSubscriptionPlan: "annual",
          effectiveSubscriptionStatus: "active",
        },
        assignment: null,
        branch: null,
        activeLicense: {
          id: 88,
          userId: 14,
          planCode: "annual",
          status: "active",
          requiresYouTube: true,
          requiresFacebook: true,
          youtubeVerified: true,
          facebookVerified: false,
        },
      },
    ];
    dbMock.getSubscriberAccessRecords.mockResolvedValue(rows);

    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.users.subscribers();

    expect(result).toEqual(rows);
    expect(dbMock.getSubscriberAccessRecords).toHaveBeenCalledWith(1);
  });

  it("impide que un cajero liste usuarios", async () => {
    const caller = appRouter.createCaller(createContext("cashier"));

    await expect(caller.users.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("exige sucursal al convertir un usuario en cajero", async () => {
    const caller = appRouter.createCaller(createContext("admin"));

    await expect(
      caller.users.assignBranch({ userId: 7, role: "cashier", branchId: null }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(dbMock.assignUserToBranch).not.toHaveBeenCalled();
  });

  it("bloquea la asignación de cajeros cuando el administrador no es el dueño principal", async () => {
    const caller = appRouter.createCaller(createContext("admin", 4, "premium", "admin-secundario"));

    await expect(
      caller.users.assignBranch({ userId: 7, role: "cashier", branchId: 3 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(dbMock.assignUserToBranch).not.toHaveBeenCalled();
  });

  it("asigna la sucursal cuando el dueño principal envía una sucursal válida", async () => {
    dbMock.getBranchById.mockResolvedValue({ id: 3, userId: 1, name: "Norte", code: "NTE" });
    dbMock.getUsersWithAssignedBranch.mockResolvedValue([
      {
        user: { id: 1, role: "admin", name: "Owner", email: "owner@example.com" },
        assignment: null,
        branch: null,
      },
    ]);
    dbMock.assignUserToBranch.mockResolvedValue({
      user: { id: 7, role: "cashier" },
      assignment: { id: 11, userId: 7, branchId: 3 },
      branch: { id: 3, name: "Norte", code: "NTE" },
    });

    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.users.assignBranch({ userId: 7, role: "cashier", branchId: 3 });

    expect(dbMock.getBranchById).toHaveBeenCalledWith(3, 1);
    expect(dbMock.assignUserToBranch).toHaveBeenCalledWith({ userId: 7, role: "cashier", branchId: 3 });
    expect(result.branch).toMatchObject({ id: 3, name: "Norte" });
  });

  it("bloquea nuevas asignaciones cuando el plan básico alcanza su límite de usuarios", async () => {
    dbMock.getBranchById.mockResolvedValue({ id: 3, userId: 1, name: "Norte", code: "NTE" });
    dbMock.getUsersWithAssignedBranch.mockResolvedValue([
      {
        user: { id: 1, role: "admin", name: "Owner", email: "owner@example.com" },
        assignment: null,
        branch: null,
      },
      {
        user: { id: 2, role: "cashier", name: "Caja 1", email: "caja1@example.com" },
        assignment: { id: 10, userId: 2, branchId: 3 },
        branch: { id: 3, userId: 1, name: "Norte", code: "NTE" },
      },
      {
        user: { id: 3, role: "cashier", name: "Caja 2", email: "caja2@example.com" },
        assignment: { id: 11, userId: 3, branchId: 4 },
        branch: { id: 4, userId: 1, name: "Centro", code: "CTR" },
      },
    ]);

    const caller = appRouter.createCaller(createContext("admin", 1, "basic"));

    await expect(
      caller.users.assignBranch({ userId: 9, role: "cashier", branchId: 3 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(dbMock.assignUserToBranch).not.toHaveBeenCalled();
  });

  it("limita el listado de sucursales del cajero a su sucursal asignada", async () => {
    dbMock.getUserBranchAssignment.mockResolvedValue({
      assignment: { id: 4, userId: 5, branchId: 8 },
      branch: { id: 8, name: "Sucursal Sur", code: "SUR" },
    });

    const caller = appRouter.createCaller(createContext("cashier", 5));
    const result = await caller.branches.list();

    expect(result).toEqual([{ id: 8, name: "Sucursal Sur", code: "SUR" }]);
    expect(dbMock.getBranchesByUserId).not.toHaveBeenCalled();
  });

  it("bloquea ventas de cajero sin sucursal asignada", async () => {
    dbMock.getUserBranchAssignment.mockResolvedValue(null);

    const caller = appRouter.createCaller(createContext("cashier", 10));

    await expect(
      caller.sales.create({
        branchId: 4,
        items: [],
        subtotal: "0",
        discount: "0",
        tax: "0",
        total: "0",
        paymentMethod: "cash",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(dbMock.createSale).not.toHaveBeenCalled();
  });

  it("bloquea ventas cuando el cajero intenta usar otra sucursal", async () => {
    dbMock.getUserBranchAssignment.mockResolvedValue({
      assignment: { id: 4, userId: 10, branchId: 4 },
      branch: { id: 4, name: "Centro", code: "CTR" },
    });

    const caller = appRouter.createCaller(createContext("cashier", 10));

    await expect(
      caller.sales.create({
        branchId: 9,
        items: [],
        subtotal: "0",
        discount: "0",
        tax: "0",
        total: "0",
        paymentMethod: "cash",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(dbMock.createSale).not.toHaveBeenCalled();
  });
});
