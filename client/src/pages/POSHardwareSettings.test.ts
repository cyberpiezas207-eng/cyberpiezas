import {
  BARCODE_SCANNED_EVENT,
  CASH_DRAWER_EVENT,
  buildReceiptHtml,
  defaultConfig,
  emitBarcodeScanned,
  emitCashDrawerOpen,
  getPosHardwareConfig,
  savePosHardwareConfig,
  STORAGE_KEY,
} from "@/lib/posHardware";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("POS hardware helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("expone una configuración por defecto segura para operación genérica", () => {
    expect(defaultConfig.thermalPrintingEnabled).toBe(true);
    expect(defaultConfig.autoPrintOnSale).toBe(true);
    expect(defaultConfig.cashDrawerEnabled).toBe(false);
    expect(defaultConfig.barcodeScannerEnabled).toBe(true);
    expect(defaultConfig.scannerSuffix).toBe("enter");
    expect(defaultConfig.receiptHeader).toBe("BOUTIQUE POS");
  });

  it("persiste y recupera la configuración local de hardware", () => {
    savePosHardwareConfig({
      ...defaultConfig,
      preferredPrinterName: "Epson TM-T20III",
      cashDrawerEnabled: true,
    });

    const recovered = getPosHardwareConfig();

    expect(window.localStorage.getItem(STORAGE_KEY)).toContain("Epson TM-T20III");
    expect(recovered.preferredPrinterName).toBe("Epson TM-T20III");
    expect(recovered.cashDrawerEnabled).toBe(true);
  });

  it("genera un ticket HTML de prueba con los textos configurados", () => {
    const html = buildReceiptHtml({
      ...defaultConfig,
      receiptHeader: "Boutique Centro",
      receiptFooter: "Vuelva pronto",
    });

    expect(html).toContain("Boutique Centro");
    expect(html).toContain("Vuelva pronto");
    expect(html).toContain("Ticket de prueba para impresora térmica");
    expect(html).toContain("TEST-001");
    expect(html).toContain("Blusa Satinada");
  });

  it("mantiene el formato de ticket de 80 mm para impresoras térmicas", () => {
    const html = buildReceiptHtml(defaultConfig);

    expect(html).toContain("width: 80mm");
    expect(html).toContain("font-family: 'Courier New', monospace");
    expect(html).toContain("Gracias por su compra");
  });

  it("emite un evento compatible al solicitar apertura de cajón", () => {
    const listener = vi.fn();
    window.addEventListener(CASH_DRAWER_EVENT, listener as EventListener);

    emitCashDrawerOpen({ reason: "cash-sale", branchName: "Centro", saleNumber: "VTA-001" });

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ reason: "cash-sale", branchName: "Centro", saleNumber: "VTA-001" });

    window.removeEventListener(CASH_DRAWER_EVENT, listener as EventListener);
  });

  it("emite un evento compatible al detectar un código de barras", () => {
    const listener = vi.fn();
    window.addEventListener(BARCODE_SCANNED_EVENT, listener as EventListener);

    emitBarcodeScanned({ code: "750101234567", source: "keyboard-wedge" });

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ code: "750101234567", source: "keyboard-wedge" });

    window.removeEventListener(BARCODE_SCANNED_EVENT, listener as EventListener);
  });
});
