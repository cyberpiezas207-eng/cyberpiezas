import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getProductImagesByProductId: vi.fn(),
  createProductImage: vi.fn(),
  deleteProductImage: vi.fn(),
  setPrimaryProductImage: vi.fn(),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn(),
}));

import { appRouter } from "./routers";
import * as db from "./db";
import { storagePut } from "./storage";

describe("Products image gallery router", () => {
  const adminContext = {
    user: {
      id: 1,
      role: "admin" as const,
      openId: "admin-open-id",
      name: "Admin",
      email: "admin@example.com",
    },
    req: { protocol: "https", headers: {} },
    res: { clearCookie: vi.fn() },
  };

  const cashierContext = {
    user: {
      id: 2,
      role: "cashier" as const,
      openId: "cashier-open-id",
      name: "Cashier",
      email: "cashier@example.com",
    },
    req: { protocol: "https", headers: {} },
    res: { clearCookie: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getProductImagesByProductId).mockResolvedValue([] as never);
  });

  it("lista las fotos de un producto", async () => {
    vi.mocked(db.getProductImagesByProductId).mockResolvedValue([
      {
        id: 10,
        productId: 99,
        imageUrl: "https://cdn.example.com/product-1.jpg",
        sortOrder: 0,
        isPrimary: true,
      },
    ] as never);

    const caller = appRouter.createCaller(adminContext as never);
    const result = await caller.products.images({ productId: 99 });

    expect(result).toHaveLength(1);
    expect(db.getProductImagesByProductId).toHaveBeenCalledWith(99);
  });

  it("permite al administrador subir una foto y marcarla como principal cuando es la primera", async () => {
    vi.mocked(storagePut).mockResolvedValue({
      key: "products/99/archivo.jpg",
      url: "https://cdn.example.com/products/99/archivo.jpg",
    } as never);
    vi.mocked(db.createProductImage).mockResolvedValue({ id: 55 } as never);

    const caller = appRouter.createCaller(adminContext as never);
    const result = await caller.products.addImage({
      productId: 99,
      fileBase64: Buffer.from("imagen de prueba").toString("base64"),
      fileName: "archivo.jpg",
      mimeType: "image/jpeg",
      altText: "Vestido frontal",
      isPrimary: false,
    });

    expect(storagePut).toHaveBeenCalled();
    expect(db.createProductImage).toHaveBeenCalledWith({
      productId: 99,
      imageUrl: "https://cdn.example.com/products/99/archivo.jpg",
      storageKey: "products/99/archivo.jpg",
      altText: "Vestido frontal",
      sortOrder: 0,
      isPrimary: true,
    });
    expect(result).toEqual({ id: 55 });
  });

  it("permite cambiar la foto principal", async () => {
    const caller = appRouter.createCaller(adminContext as never);
    const result = await caller.products.setPrimaryImage({ productId: 40, imageId: 7 });

    expect(db.setPrimaryProductImage).toHaveBeenCalledWith(40, 7);
    expect(result).toEqual({ success: true });
  });

  it("permite eliminar una foto de producto", async () => {
    const caller = appRouter.createCaller(adminContext as never);
    const result = await caller.products.removeImage({ productId: 40, imageId: 7 });

    expect(db.deleteProductImage).toHaveBeenCalledWith(7, 40);
    expect(result).toEqual({ success: true });
  });

  it("bloquea a cajeros cuando intentan cargar fotos", async () => {
    const caller = appRouter.createCaller(cashierContext as never);

    await expect(
      caller.products.addImage({
        productId: 99,
        fileBase64: Buffer.from("imagen de prueba").toString("base64"),
        fileName: "archivo.jpg",
        mimeType: "image/jpeg",
        altText: "Vestido frontal",
        isPrimary: false,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
