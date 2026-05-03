export type ScannerSuffix = "enter" | "tab" | "none";
export type ReceiptPaperWidth = "58mm" | "80mm";

export type HardwareConfig = {
  thermalPrintingEnabled: boolean;
  autoPrintOnSale: boolean;
  cashDrawerEnabled: boolean;
  openDrawerAfterCashSale: boolean;
  barcodeScannerEnabled: boolean;
  scannerSuffix: ScannerSuffix;
  preferredPrinterName: string;
  receiptPaperWidth: ReceiptPaperWidth;
  receiptHeader: string;
  receiptFooter: string;
  taxEnabled: boolean;
  taxRate: number;
};

export type PosTaxSummary = {
  taxableBase: number;
  tax: number;
  total: number;
};

export const STORAGE_KEY = "boutique-pos-hardware-config";
export const CASH_DRAWER_EVENT = "boutique-pos:cash-drawer-open";
export const BARCODE_SCANNED_EVENT = "boutique-pos:barcode-scanned";

export const defaultConfig: HardwareConfig = {
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
};

function normalizeTaxRate(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return defaultConfig.taxRate;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Number(value.toFixed(2));
}

export function getPosHardwareConfig(): HardwareConfig {
  if (typeof window === "undefined") return defaultConfig;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultConfig;

  try {
    const parsed = JSON.parse(raw) as Partial<HardwareConfig>;
    return {
      ...defaultConfig,
      ...parsed,
      taxEnabled: parsed.taxEnabled ?? defaultConfig.taxEnabled,
      taxRate: normalizeTaxRate(parsed.taxRate),
    };
  } catch {
    return defaultConfig;
  }
}

export function savePosHardwareConfig(config: HardwareConfig) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...config,
      taxRate: normalizeTaxRate(config.taxRate),
    }),
  );
}

export function getPosTaxLabel(config: Pick<HardwareConfig, "taxEnabled" | "taxRate">) {
  if (!config.taxEnabled) return "IVA";
  const formattedRate = Number.isInteger(config.taxRate) ? config.taxRate.toString() : config.taxRate.toFixed(2);
  return `IVA (${formattedRate}%)`;
}

export function calculatePosTaxSummary(
  subtotal: number,
  discountAmount: number,
  config: Pick<HardwareConfig, "taxEnabled" | "taxRate">,
): PosTaxSummary {
  const taxableBase = Math.max(subtotal - discountAmount, 0);
  const effectiveRate = config.taxEnabled ? normalizeTaxRate(config.taxRate) / 100 : 0;
  const tax = Number((taxableBase * effectiveRate).toFixed(2));
  const total = Number((taxableBase + tax).toFixed(2));

  return {
    taxableBase: Number(taxableBase.toFixed(2)),
    tax,
    total,
  };
}

export function shouldDisplayTaxRow(config: Pick<HardwareConfig, "taxEnabled">, taxAmount?: number) {
  return config.taxEnabled || Math.abs(taxAmount ?? 0) > 0.0001;
}

export function getReceiptWidthCss(config: Pick<HardwareConfig, "receiptPaperWidth">) {
  return config.receiptPaperWidth === "58mm" ? "58mm" : "80mm";
}

export function buildReceiptHtml(config: HardwareConfig) {
  const sampleSubtotal = 948;
  const sampleDiscount = 0;
  const sampleSummary = calculatePosTaxSummary(sampleSubtotal, sampleDiscount, config);
  const taxRow = shouldDisplayTaxRow(config, sampleSummary.tax)
    ? `<div class="line"><span>${getPosTaxLabel(config)}</span><span>$${sampleSummary.tax.toFixed(2)}</span></div>`
    : "";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Prueba de ticket</title>
        <style>
          body {
            margin: 0;
            padding: 10px;
            width: ${getReceiptWidthCss(config)};
            font-family: 'Courier New', monospace;
            background: white;
            color: black;
          }
          .ticket {
            border: 1px dashed #222;
            padding: 12px;
          }
          .center {
            text-align: center;
          }
          .line {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
            font-size: 12px;
          }
          .muted {
            color: #555;
            font-size: 11px;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 10px 0;
          }
          .total {
            font-weight: bold;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="center">
            <div><strong>${config.receiptHeader || "BOUTIQUE POS"}</strong></div>
            <div class="muted">Ticket de prueba para impresora térmica</div>
          </div>
          <div class="divider"></div>
          <div class="line"><span>Fecha</span><span>${new Date().toLocaleString()}</span></div>
          <div class="line"><span>Ticket</span><span>TEST-001</span></div>
          <div class="divider"></div>
          <div class="line"><span>Blusa Satinada</span><span>$799.00</span></div>
          <div class="muted">Negro / M x1</div>
          <div class="line"><span>Accesorio</span><span>$149.00</span></div>
          <div class="muted">Dorado x1</div>
          <div class="divider"></div>
          <div class="line"><span>Subtotal</span><span>$${sampleSubtotal.toFixed(2)}</span></div>
          ${taxRow}
          <div class="line total"><span>Total</span><span>$${sampleSummary.total.toFixed(2)}</span></div>
          <div class="divider"></div>
          <div class="center muted">${config.receiptFooter || "Gracias por su compra"}</div>
        </div>
      </body>
    </html>
  `;
}

export function emitCashDrawerOpen(detail: {
  reason: "cash-sale" | "manual-test";
  branchName?: string;
  saleNumber?: string;
}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CASH_DRAWER_EVENT, { detail }));
}

export function emitBarcodeScanned(detail: {
  code: string;
  source: "keyboard-wedge" | "simulated";
}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BARCODE_SCANNED_EVENT, { detail }));
}
