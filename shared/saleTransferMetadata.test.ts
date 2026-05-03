import { describe, expect, it } from "vitest";
import { parseSaleTransferMetadata, serializeSaleTransferMetadata } from "./saleTransferMetadata";

describe("saleTransferMetadata", () => {
  it("serializa y recupera correctamente referencia, comprobante y notas de una venta por transferencia", () => {
    const serialized = serializeSaleTransferMetadata({
      customerNotes: "Pago validado desde caja 2",
      transferReference: "SPEI-445566",
      proofUrl: "https://files.example.com/comprobante.jpg",
      proofFileName: "comprobante.jpg",
      proofMimeType: "image/jpeg",
    });

    const parsed = parseSaleTransferMetadata(serialized);

    expect(parsed).toEqual({
      customerNotes: "Pago validado desde caja 2",
      transferReference: "SPEI-445566",
      proofUrl: "https://files.example.com/comprobante.jpg",
      proofFileName: "comprobante.jpg",
      proofMimeType: "image/jpeg",
    });
  });

  it("mantiene compatibilidad con notas antiguas sin metadatos estructurados", () => {
    const parsed = parseSaleTransferMetadata("Cliente pidió empaque para regalo");

    expect(parsed).toEqual({
      customerNotes: "Cliente pidió empaque para regalo",
      transferReference: null,
      proofUrl: null,
      proofFileName: null,
      proofMimeType: null,
    });
  });
});
