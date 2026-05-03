import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

vi.mock("./db", () => ({
  getBranchesByUserId: vi.fn(),
  countBranchesByUserId: vi.fn(),
  createBranch: vi.fn(),
  getBranchById: vi.fn(),
  getBranchInventory: vi.fn(),
  updateBranchInventoryStock: vi.fn(),
  getTransfersByUserId: vi.fn(),
  getBranchInventoryItem: vi.fn(),
  createStockTransfer: vi.fn(),
  receiveStockTransfer: vi.fn(),
  getUserBranchAssignment: vi.fn(),
  getProductVariantsByProductId: vi.fn(),
  getProductVariantsByProductIdAndBranch: vi.fn(),
  getProductById: vi.fn(),
  generateSaleNumber: vi.fn(),
  createSale: vi.fn(),
  createSaleDetail: vi.fn(),
  decrementBranchInventoryForSale: vi.fn(),
  createNotificationForUser: vi.fn(),
  getProductVariantById: vi.fn(),
  updateProductVariantStock: vi.fn(),
  createInventoryMovement: vi.fn(),
  countSalesForUserSince: vi.fn(),
}));

describe("Branches router", () => {
  const adminContext = {
    user: {
      id: 1,
      role: "admin" as const,
      openId: "admin-open-id",
      name: "Admin",
      email: "admin@example.com",
    },
  };

  const cashierContext = {
    user: {
      id: 2,
      role: "cashier" as const,
      openId: "cashier-open-id",
      name: "Cashier",
      email: "cashier@example.com",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.countSalesForUserSince).mockResolvedValue(0 as any);
    vi.mocked(db.countBranchesByUserId).mockResolvedValue(0 as any);
    vi.mocked(db.getUserBranchAssignment).mockResolvedValue({
      assignment: { id: 1, userId: 2, branchId: 10 },
      branch: { id: 10, userId: 2, name: "Centro", code: "CTR" },
    } as any);
  });

  it("lista sucursales del usuario autenticado", async () => {
    vi.mocked(db.getBranchesByUserId).mockResolvedValue([
      { id: 10, userId: 1, name: "Centro", code: "CTR", isActive: true },
    ] as any);

    const caller = appRouter.createCaller(adminContext as any);
    const result = await caller.branches.list();

    expect(result).toHaveLength(1);
    expect(db.getBranchesByUserId).toHaveBeenCalledWith(1);
  });

  it("crea una sucursal cuando el usuario es admin", async () => {
    vi.mocked(db.createBranch).mockResolvedValue({ id: 11 } as any);

    const caller = appRouter.createCaller(adminContext as any);
    const result = await caller.branches.create({
      name: "Sucursal Norte",
      code: "NTE",
      city: "Monterrey",
      state: "Nuevo León",
      manager: "Ana",
    });

    expect(result).toEqual({ id: 11 });
    expect(db.createBranch).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        name: "Sucursal Norte",
        code: "NTE",
      })
    );
  });

  it("rechaza crear sucursal si el usuario no es admin", async () => {
    const caller = appRouter.createCaller(cashierContext as any);

    await expect(
      caller.branches.create({
        name: "Sucursal Norte",
        code: "NTE",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("devuelve inventario de una sucursal válida del usuario", async () => {
    vi.mocked(db.getBranchById).mockResolvedValue({ id: 10, userId: 1, name: "Centro" } as any);
    vi.mocked(db.getBranchInventory).mockResolvedValue([
      {
        inventory: { branchId: 10, productVariantId: 5, stock: 8 },
        variant: { id: 5, size: "M", color: "Negro" },
        product: { id: 7, name: "Vestido midi" },
      },
    ] as any);

    const caller = appRouter.createCaller(adminContext as any);
    const result = await caller.branches.inventory({ branchId: 10 });

    expect(result).toHaveLength(1);
    expect(db.getBranchInventory).toHaveBeenCalledWith(10);
  });

  it("rechaza consultar inventario si la sucursal no pertenece al usuario", async () => {
    vi.mocked(db.getBranchById).mockResolvedValue(null);

    const caller = appRouter.createCaller(adminContext as any);

    await expect(caller.branches.inventory({ branchId: 999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("actualiza inventario por sucursal", async () => {
    vi.mocked(db.getBranchById).mockResolvedValue({ id: 10, userId: 1, name: "Centro" } as any);
    vi.mocked(db.updateBranchInventoryStock).mockResolvedValue(1 as any);

    const caller = appRouter.createCaller(adminContext as any);
    const result = await caller.branches.updateInventory({
      branchId: 10,
      productVariantId: 5,
      newStock: 12,
      reason: "Carga inicial",
    });

    expect(result).toEqual({ success: true });
    expect(db.updateBranchInventoryStock).toHaveBeenCalledWith(10, 5, 12, 1, "Carga inicial");
  });

  it("lista traspasos visibles para el usuario", async () => {
    vi.mocked(db.getTransfersByUserId).mockResolvedValue([
      { id: 30, fromBranchId: 10, toBranchId: 11, quantity: 3, status: "pending" },
    ] as any);

    const caller = appRouter.createCaller(adminContext as any);
    const result = await caller.branches.transfers();

    expect(result).toHaveLength(1);
    expect(db.getTransfersByUserId).toHaveBeenCalledWith(1);
  });

  it("rechaza crear traspaso cuando origen y destino son iguales", async () => {
    const caller = appRouter.createCaller(adminContext as any);

    await expect(
      caller.branches.createTransfer({
        fromBranchId: 10,
        toBranchId: 10,
        productVariantId: 5,
        quantity: 2,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rechaza crear traspaso cuando falta stock en origen", async () => {
    vi.mocked(db.getBranchById)
      .mockResolvedValueOnce({ id: 10, userId: 1, name: "Centro" } as any)
      .mockResolvedValueOnce({ id: 11, userId: 1, name: "Norte" } as any);
    vi.mocked(db.getBranchInventoryItem).mockResolvedValue({ stock: 1 } as any);

    const caller = appRouter.createCaller(adminContext as any);

    await expect(
      caller.branches.createTransfer({
        fromBranchId: 10,
        toBranchId: 11,
        productVariantId: 5,
        quantity: 3,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("crea traspaso cuando hay stock suficiente", async () => {
    vi.mocked(db.getBranchById)
      .mockResolvedValueOnce({ id: 10, userId: 1, name: "Centro" } as any)
      .mockResolvedValueOnce({ id: 11, userId: 1, name: "Norte" } as any);
    vi.mocked(db.getBranchInventoryItem).mockResolvedValue({ stock: 9 } as any);
    vi.mocked(db.updateBranchInventoryStock).mockResolvedValue(1 as any);
    vi.mocked(db.createStockTransfer).mockResolvedValue({ id: 31 } as any);

    const caller = appRouter.createCaller(adminContext as any);
    const result = await caller.branches.createTransfer({
      fromBranchId: 10,
      toBranchId: 11,
      productVariantId: 5,
      quantity: 3,
      reason: "Reabasto",
    });

    expect(result).toEqual({ success: true, transferId: 31 });
    expect(db.updateBranchInventoryStock).toHaveBeenCalled();
    expect(db.createStockTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        fromBranchId: 10,
        toBranchId: 11,
        quantity: 3,
        initiatedByUserId: 1,
      })
    );
  });

  it("marca un traspaso como recibido", async () => {
    vi.mocked(db.receiveStockTransfer).mockResolvedValue({ id: 31 } as any);

    const caller = appRouter.createCaller(adminContext as any);
    const result = await caller.branches.receiveTransfer({ transferId: 31 });

    expect(result).toEqual({ success: true, transferId: 31 });
    expect(db.receiveStockTransfer).toHaveBeenCalledWith(31, 1);
  });

  it("consulta variantes con stock por sucursal cuando se envía branchId", async () => {
    vi.mocked(db.getProductVariantsByProductIdAndBranch).mockResolvedValue([
      { id: 5, color: "Negro", size: "M", stock: 4, price: "499.00" },
    ] as any);
    vi.mocked(db.getProductById).mockResolvedValue({ id: 7 } as any);

    const caller = appRouter.createCaller(adminContext as any);
    const result = await caller.variants.getByProductId({ productId: 7, branchId: 10 });

    expect(result).toHaveLength(1);
    expect(db.getProductVariantsByProductIdAndBranch).toHaveBeenCalledWith(7, 10, 1);
    expect(db.getProductVariantsByProductId).not.toHaveBeenCalled();
  });

  it("mantiene consulta global de variantes cuando no se envía branchId", async () => {
    vi.mocked(db.getProductVariantsByProductId).mockResolvedValue([
      { id: 5, color: "Negro", size: "M", stock: 12, price: "499.00" },
    ] as any);
    vi.mocked(db.getProductById).mockResolvedValue({ id: 7 } as any);

    const caller = appRouter.createCaller(adminContext as any);
    const result = await caller.variants.getByProductId({ productId: 7 });

    expect(result).toHaveLength(1);
    expect(db.getProductVariantsByProductId).toHaveBeenCalledWith(7, 1);
  });

  it("registra una venta descontando existencias desde la sucursal seleccionada", async () => {
    vi.mocked(db.getBranchById).mockResolvedValue({ id: 10, userId: 2, name: "Centro" } as any);
    vi.mocked(db.generateSaleNumber).mockResolvedValue("VTA-1001" as any);
    vi.mocked(db.createSale).mockResolvedValue({ id: 80 } as any);
    vi.mocked(db.createSaleDetail).mockResolvedValue({ id: 1 } as any);
    vi.mocked(db.decrementBranchInventoryForSale).mockResolvedValue(3 as any);

    const caller = appRouter.createCaller(cashierContext as any);
    const result = await caller.sales.create({
      branchId: 10,
      items: [
        {
          variantId: 5,
          productName: "Vestido midi",
          size: "M",
          color: "Negro",
          quantity: 2,
          unitPrice: "499.00",
          lineTotal: "998.00",
        },
      ],
      subtotal: "998.00",
      discount: "0.00",
      tax: "189.62",
      total: "1187.62",
      paymentMethod: "cash",
    });

    expect(result).toEqual({ saleId: 80, saleNumber: "VTA-1001" });
    expect(db.decrementBranchInventoryForSale).toHaveBeenCalledWith({
      branchId: 10,
      productVariantId: 5,
      quantity: 2,
      userId: 2,
    });
    expect(db.updateProductVariantStock).not.toHaveBeenCalled();
    expect(db.createNotificationForUser).toHaveBeenCalledWith({
      userId: 2,
      type: "sale",
      title: "Nueva venta registrada",
      message: "Se registró la venta VTA-1001 por 1187.62 en Centro.",
      relatedId: 80,
    });
  });

  it("rechaza una venta si el cajero intenta operar en una sucursal distinta a la asignada", async () => {
    const caller = appRouter.createCaller(cashierContext as any);

    await expect(
      caller.sales.create({
        branchId: 99,
        items: [
          {
            variantId: 5,
            productName: "Vestido midi",
            size: "M",
            color: "Negro",
            quantity: 1,
            unitPrice: "499.00",
            lineTotal: "499.00",
          },
        ],
        subtotal: "499.00",
        discount: "0.00",
        tax: "94.81",
        total: "593.81",
        paymentMethod: "cash",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rechaza una venta por sucursal si no hay existencias suficientes", async () => {
    vi.mocked(db.getBranchById).mockResolvedValue({ id: 10, userId: 2, name: "Centro" } as any);
    vi.mocked(db.generateSaleNumber).mockResolvedValue("VTA-1002" as any);
    vi.mocked(db.createSale).mockResolvedValue({ id: 81 } as any);
    vi.mocked(db.createSaleDetail).mockResolvedValue({ id: 2 } as any);
    vi.mocked(db.decrementBranchInventoryForSale).mockRejectedValue(new Error("Insufficient branch stock"));

    const caller = appRouter.createCaller(cashierContext as any);

    await expect(
      caller.sales.create({
        branchId: 10,
        items: [
          {
            variantId: 5,
            productName: "Vestido midi",
            size: "M",
            color: "Negro",
            quantity: 9,
            unitPrice: "499.00",
            lineTotal: "4491.00",
          },
        ],
        subtotal: "4491.00",
        discount: "0.00",
        tax: "853.29",
        total: "5344.29",
        paymentMethod: "cash",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
