import QRCode from "qrcode";
import {
  emitCashDrawerOpen,
  getPosHardwareConfig,
  getPosTaxLabel,
  getReceiptWidthCss,
  shouldDisplayTaxRow,
} from "@/lib/posHardware";

export type PosCartItem = {
  productName: string;
  size: string;
  color: string;
  quantity: number;
  lineTotal: number;
};

export type PostSaleHardwarePayload = {
  saleNumber: string;
  branchName?: string;
  paymentMethod: string;
  items: PosCartItem[];
  subtotal: number;
  discountAmount: number;
  tax: number;
  total: number;
  shouldPrintReceipt?: boolean;
  transferReference?: string | null;
};

export type PostSaleHardwareDependencies = {
  openPrintWindow: () => Window | null;
  emitDrawerOpen: typeof emitCashDrawerOpen;
};

function buildReceiptQrPayload(params: Pick<PostSaleHardwarePayload, "saleNumber" | "total" | "paymentMethod">) {
  return JSON.stringify({
    saleNumber: params.saleNumber,
    total: Number(params.total.toFixed(2)),
    paymentMethod: params.paymentMethod,
  });
}

function buildReceiptQrSvgFallback(value: string) {
  const size = 29;
  const cells = Array.from({ length: size * size }, (_, index) => {
    let hash = 0;
    const seed = `${value}-${index}`;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return hash % 2 === 0 ? 1 : 0;
  });

  const modules = cells
    .map((filled, index) => {
      if (!filled) return "";
      const x = index % size;
      const y = Math.floor(index / size);
      return `<rect x="${x}" y="${y}" width="1" height="1" fill="#000" />`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/>${modules}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

async function generateReceiptQrDataUrl(value: string) {
  try {
    return await QRCode.toDataURL(value, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 160,
    });
  } catch {
    return buildReceiptQrSvgFallback(value);
  }
}

export async function buildSaleReceiptHtml(params: PostSaleHardwarePayload & { header: string; footer: string }) {
  const hardware = getPosHardwareConfig();
  const showTaxRow = shouldDisplayTaxRow(hardware, params.tax);
  const taxRow = showTaxRow
    ? `<div class="line"><span>${getPosTaxLabel(hardware)}</span><span>$${params.tax.toFixed(2)}</span></div>`
    : "";

  const itemsHtml = params.items
    .map(
      (item) => `
        <div style="margin:6px 0; font-size:12px;">
          <div style="display:flex; justify-content:space-between; gap:8px;">
            <span>${item.productName}</span>
            <span>$${item.lineTotal.toFixed(2)}</span>
          </div>
          <div style="color:#555; font-size:11px;">${item.color} / ${item.size} x${item.quantity}</div>
        </div>
      `,
    )
    .join("");

  const qrDataUrl = await generateReceiptQrDataUrl(
    buildReceiptQrPayload({
      saleNumber: params.saleNumber,
      total: params.total,
      paymentMethod: params.paymentMethod,
    }),
  );

  const transferReferenceRow = params.paymentMethod === "transfer" && params.transferReference
    ? `<div class="line"><span>Referencia</span><span>${params.transferReference}</span></div>`
    : "";

  const discountRow = params.discountAmount > 0
    ? `<div class="line"><span>Descuento</span><span>-$${params.discountAmount.toFixed(2)}</span></div>`
    : "";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Ticket ${params.saleNumber}</title>
        <style>
          body { margin:0; padding:10px; width:${getReceiptWidthCss(hardware)}; font-family:'Courier New', monospace; background:white; color:black; }
          .ticket { border:1px dashed #222; padding:12px; }
          .center { text-align:center; }
          .divider { border-top:1px dashed #000; margin:10px 0; }
          .line { display:flex; justify-content:space-between; margin:4px 0; font-size:12px; gap:8px; }
          .muted { color:#555; font-size:11px; }
          .total { font-size:14px; font-weight:bold; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="center">
            <div><strong>${params.header || "BOUTIQUE POS"}</strong></div>
            <div class="muted">${params.branchName || "Sucursal activa"}</div>
          </div>
          <div class="divider"></div>
          <div class="line"><span>Ticket</span><span>${params.saleNumber}</span></div>
          <div class="line"><span>Pago</span><span>${params.paymentMethod}</span></div>
          ${transferReferenceRow}
          <div class="line"><span>Fecha</span><span>${new Date().toLocaleString()}</span></div>
          <div class="divider"></div>
          ${itemsHtml}
          <div class="divider"></div>
          <div class="line"><span>Subtotal</span><span>$${params.subtotal.toFixed(2)}</span></div>
          ${discountRow}
          ${taxRow}
          <div class="line total"><span>Total</span><span>$${params.total.toFixed(2)}</span></div>
          <div class="divider"></div>
          <div class="center" style="margin:12px 0;">
            <img src="${qrDataUrl}" alt="QR del ticket ${params.saleNumber}" style="width:96px; height:96px; border:1px dashed #222; padding:4px;" />
            <div class="muted">QR del ticket</div>
          </div>
          <div class="center muted">${params.footer || "Gracias por su compra"}</div>
        </div>
      </body>
    </html>
  `;
}

export async function runPostSaleHardware(payload: PostSaleHardwarePayload, dependencies: PostSaleHardwareDependencies) {
  const hardware = getPosHardwareConfig();
  const result = {
    printed: false,
    drawerRequested: false,
    blockedByPopup: false,
  };

  const shouldPrintReceipt = payload.shouldPrintReceipt ?? hardware.autoPrintOnSale;

  if (hardware.thermalPrintingEnabled && shouldPrintReceipt) {
    const printWindow = dependencies.openPrintWindow();
    if (printWindow) {
      const receiptHtml = await buildSaleReceiptHtml({
        ...payload,
        header: hardware.receiptHeader,
        footer: hardware.receiptFooter,
      });
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      result.printed = true;
    } else {
      result.blockedByPopup = true;
    }
  }

  if (payload.paymentMethod === "cash" && hardware.cashDrawerEnabled && hardware.openDrawerAfterCashSale) {
    dependencies.emitDrawerOpen({
      reason: "cash-sale",
      branchName: payload.branchName,
      saleNumber: payload.saleNumber,
    });
    result.drawerRequested = true;
  }

  return result;
}
