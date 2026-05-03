import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();
const addEventListener = vi.fn();
const removeEventListener = vi.fn();
const dispatchEvent = vi.fn();

vi.stubGlobal("window", {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  },
  addEventListener,
  removeEventListener,
  dispatchEvent,
});

import { savePosHardwareConfig } from "../client/src/lib/posHardware";
import { buildSaleReceiptHtml, runPostSaleHardware } from "../client/src/lib/posSaleHardware";

describe("POS hardware sale flow", () => {
  beforeEach(() => {
    storage.clear();
    addEventListener.mockReset();
    removeEventListener.mockReset();
    dispatchEvent.mockReset();
  });

  it("imprime ticket y solicita apertura de cajón en ventas en efectivo cuando la configuración lo permite", async () => {
    savePosHardwareConfig({
      thermalPrintingEnabled: true,
      autoPrintOnSale: true,
      cashDrawerEnabled: true,
      openDrawerAfterCashSale: true,
      barcodeScannerEnabled: true,
      scannerSuffix: "enter",
      preferredPrinterName: "Caja principal",
      receiptPaperWidth: "80mm",
      receiptHeader: "Sucursal Centro",
      receiptFooter: "Gracias",
      taxEnabled: true,
      taxRate: 19,
    });

    const write = vi.fn();
    const close = vi.fn();
    const focus = vi.fn();
    const print = vi.fn();
    const emitDrawerOpen = vi.fn();

    const result = await runPostSaleHardware(
      {
        saleNumber: "VTA-100",
        branchName: "Centro",
        paymentMethod: "cash",
        items: [
          {
            productName: "Vestido Midi",
            size: "M",
            color: "Negro",
            quantity: 1,
            lineTotal: 899,
          },
        ],
        subtotal: 899,
        discountAmount: 0,
        tax: 170.81,
        total: 1069.81,
      },
      {
        openPrintWindow: () => ({ document: { write, close }, focus, print } as unknown as Window),
        emitDrawerOpen,
      },
    );

    expect(result).toEqual({ printed: true, drawerRequested: true, blockedByPopup: false });
    expect(write).toHaveBeenCalledTimes(1);
    expect(print).toHaveBeenCalledTimes(1);
    expect(emitDrawerOpen).toHaveBeenCalledWith({ reason: "cash-sale", branchName: "Centro", saleNumber: "VTA-100" });
  });

  it("reporta bloqueo emergente si la impresión automática no puede abrir ventana", async () => {
    savePosHardwareConfig({
      thermalPrintingEnabled: true,
      autoPrintOnSale: true,
      cashDrawerEnabled: false,
      openDrawerAfterCashSale: false,
      barcodeScannerEnabled: true,
      scannerSuffix: "enter",
      preferredPrinterName: "",
      receiptPaperWidth: "80mm",
      receiptHeader: "BOUTIQUE POS",
      receiptFooter: "Gracias por su compra",
      taxEnabled: true,
      taxRate: 19,
    });

    const result = await runPostSaleHardware(
      {
        saleNumber: "VTA-101",
        branchName: "Norte",
        paymentMethod: "card",
        items: [],
        subtotal: 0,
        discountAmount: 0,
        tax: 0,
        total: 0,
      },
      {
        openPrintWindow: () => null,
        emitDrawerOpen: vi.fn(),
      },
    );

    expect(result).toEqual({ printed: false, drawerRequested: false, blockedByPopup: true });
  });

  it("genera un ticket HTML con la información real de la venta y QR automático", async () => {
    const html = await buildSaleReceiptHtml({
      saleNumber: "VTA-102",
      branchName: "Sur",
      paymentMethod: "transfer",
      transferReference: "SPEI-9981",
      items: [
        {
          productName: "Blusa Satinada",
          size: "L",
          color: "Azul",
          quantity: 2,
          lineTotal: 1198,
        },
      ],
      subtotal: 1198,
      discountAmount: 50,
      tax: 218.12,
      total: 1366.12,
      header: "Boutique Sur",
      footer: "Vuelva pronto",
    });

    expect(html).toContain("Boutique Sur");
    expect(html).toContain("VTA-102");
    expect(html).toContain("Blusa Satinada");
    expect(html).toContain("Vuelva pronto");
    expect(html).toContain("QR del ticket");
    expect(html).toContain("SPEI-9981");
    expect(html).toContain("data:image/");
  });

  it("ajusta el ancho del ticket para impresora genérica de 58mm", async () => {
    savePosHardwareConfig({
      thermalPrintingEnabled: true,
      autoPrintOnSale: false,
      cashDrawerEnabled: false,
      openDrawerAfterCashSale: false,
      barcodeScannerEnabled: true,
      scannerSuffix: "enter",
      preferredPrinterName: "Genérica 58mm",
      receiptPaperWidth: "58mm",
      receiptHeader: "Mini Ticket",
      receiptFooter: "Gracias",
      taxEnabled: true,
      taxRate: 16,
    });

    const html = await buildSaleReceiptHtml({
      saleNumber: "VTA-103",
      branchName: "Centro",
      paymentMethod: "cash",
      items: [],
      subtotal: 100,
      discountAmount: 0,
      tax: 16,
      total: 116,
      header: "Mini Ticket",
      footer: "Gracias",
    });

    expect(html).toContain("width:58mm");
    expect(html).toContain("Mini Ticket");
  });

  it("permite cobrar sin imprimir aunque la impresión automática global esté activa", async () => {
    savePosHardwareConfig({
      thermalPrintingEnabled: true,
      autoPrintOnSale: true,
      cashDrawerEnabled: false,
      openDrawerAfterCashSale: false,
      barcodeScannerEnabled: true,
      scannerSuffix: "enter",
      preferredPrinterName: "Caja principal",
      receiptPaperWidth: "80mm",
      receiptHeader: "Sucursal Centro",
      receiptFooter: "Gracias",
      taxEnabled: true,
      taxRate: 16,
    });

    const print = vi.fn();
    const write = vi.fn();

    const result = await runPostSaleHardware(
      {
        saleNumber: "VTA-104",
        branchName: "Centro",
        paymentMethod: "card",
        items: [],
        subtotal: 200,
        discountAmount: 0,
        tax: 32,
        total: 232,
        shouldPrintReceipt: false,
      },
      {
        openPrintWindow: () => ({ document: { write, close: vi.fn() }, focus: vi.fn(), print } as unknown as Window),
        emitDrawerOpen: vi.fn(),
      },
    );

    expect(result).toEqual({ printed: false, drawerRequested: false, blockedByPopup: false });
    expect(write).not.toHaveBeenCalled();
    expect(print).not.toHaveBeenCalled();
  });
});
