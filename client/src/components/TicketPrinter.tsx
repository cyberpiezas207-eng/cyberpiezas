import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPosHardwareConfig, getPosTaxLabel, shouldDisplayTaxRow } from "@/lib/posHardware";
import { Printer, Download } from "lucide-react";
import { toast } from "sonner";

interface TicketItem {
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface TicketPrinterProps {
  saleNumber: string;
  date: Date;
  items: TicketItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  cashier?: string;
}

function buildTicketQrPayload(params: Pick<TicketPrinterProps, "saleNumber" | "date" | "total" | "cashier">) {
  return JSON.stringify({
    saleNumber: params.saleNumber,
    date: params.date.toISOString(),
    total: Number(params.total.toFixed(2)),
    cashier: params.cashier || "N/A",
  });
}

export function TicketPrinter({
  saleNumber,
  date,
  items,
  subtotal,
  discount,
  tax,
  total,
  cashier,
}: TicketPrinterProps) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const hardware = getPosHardwareConfig();
  const taxLabel = getPosTaxLabel(hardware);
  const showTaxRow = shouldDisplayTaxRow(hardware, tax);

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(buildTicketQrPayload({ saleNumber, date, total, cashier }), {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 160,
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch(() => {
        if (isMounted) setQrDataUrl("");
      });

    return () => {
      isMounted = false;
    };
  }, [saleNumber, date, total, cashier]);

  const handlePrint = () => {
    if (!ticketRef.current) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("No se pudo abrir la ventana de impresión");
      return;
    }

    const ticketHTML = ticketRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket - ${saleNumber}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            width: 80mm;
            margin: 0;
            padding: 10px;
            background: white;
          }
          .ticket {
            width: 100%;
            text-align: center;
          }
          .header {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .ticket-number {
            font-size: 12px;
            margin: 5px 0;
          }
          .date {
            font-size: 11px;
            color: #666;
            margin-bottom: 10px;
          }
          .items {
            text-align: left;
            font-size: 11px;
            margin: 10px 0;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .item {
            margin: 5px 0;
            display: flex;
            justify-content: space-between;
          }
          .item-name {
            flex: 1;
          }
          .item-price {
            text-align: right;
            min-width: 40px;
          }
          .totals {
            font-size: 11px;
            margin: 10px 0;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .total-amount {
            font-weight: bold;
            font-size: 13px;
            margin-top: 5px;
          }
          .footer {
            font-size: 10px;
            margin-top: 10px;
            color: #666;
          }
        </style>
      </head>
      <body>
        ${ticketHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownload = () => {
    if (!ticketRef.current) return;

    const ticketHTML = ticketRef.current.innerHTML;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket - ${saleNumber}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            width: 80mm;
            margin: 0;
            padding: 10px;
            background: white;
          }
          .ticket {
            width: 100%;
            text-align: center;
          }
          .header {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .ticket-number {
            font-size: 12px;
            margin: 5px 0;
          }
          .date {
            font-size: 11px;
            color: #666;
            margin-bottom: 10px;
          }
          .items {
            text-align: left;
            font-size: 11px;
            margin: 10px 0;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .item {
            margin: 5px 0;
            display: flex;
            justify-content: space-between;
          }
          .item-name {
            flex: 1;
          }
          .item-price {
            text-align: right;
            min-width: 40px;
          }
          .totals {
            font-size: 11px;
            margin: 10px 0;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
          }
          .total-amount {
            font-weight: bold;
            font-size: 13px;
            margin-top: 5px;
          }
          .footer {
            font-size: 10px;
            margin-top: 10px;
            color: #666;
          }
        </style>
      </head>
      <body>
        ${ticketHTML}
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ticket-${saleNumber}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Ticket descargado exitosamente");
  };

  return (
    <div className="space-y-4">
      {/* Preview */}
      <Card className="border-border shadow-sm bg-white">
        <CardContent className="pt-6">
          <div
            ref={ticketRef}
            className="max-w-xs mx-auto font-mono text-sm bg-white p-4 border-2 border-dashed border-border"
          >
            <div className="ticket">
              <div className="header">
                <div>BOUTIQUE</div>
                <div className="text-xs">Punto de Venta</div>
              </div>

              <div className="ticket-number">Ticket: {saleNumber}</div>
              <div className="date">
                {date.toLocaleDateString()} {date.toLocaleTimeString()}
              </div>

              <div className="items">
                {items.map((item, index) => (
                  <div key={index}>
                    <div className="item">
                      <span className="item-name">{item.productName}</span>
                      <span className="item-price">${item.unitPrice.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {item.size} - {item.color} x{item.quantity}
                    </div>
                    <div className="item">
                      <span className="item-name"></span>
                      <span className="item-price font-semibold">
                        ${item.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="totals">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="total-row">
                    <span>Descuento:</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                {showTaxRow && (
                  <div className="total-row">
                    <span>{taxLabel}:</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="total-row total-amount">
                  <span>TOTAL:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {cashier && (
                <div className="footer">
                  <div>Cajero: {cashier}</div>
                </div>
              )}

              {qrDataUrl && (
                <div className="mt-4 flex flex-col items-center gap-2">
                  <img src={qrDataUrl} alt={`QR del ticket ${saleNumber}`} loading="lazy" className="h-28 w-28 border border-dashed border-border p-1" />
                  <div className="text-[10px] text-gray-600">Escanea para identificar este ticket</div>
                </div>
              )}

              <div className="footer" style={{ marginTop: "20px" }}>
                <div>¡Gracias por su compra!</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center">
        <Button
          onClick={handlePrint}
          className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
        >
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
        <Button
          onClick={handleDownload}
          variant="outline"
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Descargar
        </Button>
      </div>
    </div>
  );
}
