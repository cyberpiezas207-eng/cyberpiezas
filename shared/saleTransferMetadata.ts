export const SALE_TRANSFER_NOTE_PREFIX = "__BOUTIQUE_TRANSFER__:";

export type SaleTransferMetadata = {
  customerNotes?: string | null;
  transferReference?: string | null;
  proofUrl?: string | null;
  proofFileName?: string | null;
  proofMimeType?: string | null;
};

export function serializeSaleTransferMetadata(metadata: SaleTransferMetadata) {
  const hasTransferAttachment = Boolean(
    metadata.transferReference?.trim() || metadata.proofUrl?.trim() || metadata.proofFileName?.trim(),
  );

  if (!hasTransferAttachment) {
    return metadata.customerNotes?.trim() ?? "";
  }

  const normalized = {
    customerNotes: metadata.customerNotes?.trim() || null,
    transferReference: metadata.transferReference?.trim() || null,
    proofUrl: metadata.proofUrl?.trim() || null,
    proofFileName: metadata.proofFileName?.trim() || null,
    proofMimeType: metadata.proofMimeType?.trim() || null,
  };

  return `${SALE_TRANSFER_NOTE_PREFIX}${JSON.stringify(normalized)}`;
}

export function parseSaleTransferMetadata(notes?: string | null): SaleTransferMetadata {
  const value = notes?.trim() ?? "";

  if (!value) {
    return {
      customerNotes: "",
      transferReference: null,
      proofUrl: null,
      proofFileName: null,
      proofMimeType: null,
    };
  }

  if (!value.startsWith(SALE_TRANSFER_NOTE_PREFIX)) {
    return {
      customerNotes: value,
      transferReference: null,
      proofUrl: null,
      proofFileName: null,
      proofMimeType: null,
    };
  }

  try {
    const parsed = JSON.parse(value.slice(SALE_TRANSFER_NOTE_PREFIX.length)) as SaleTransferMetadata;
    return {
      customerNotes: parsed.customerNotes?.trim() || "",
      transferReference: parsed.transferReference?.trim() || null,
      proofUrl: parsed.proofUrl?.trim() || null,
      proofFileName: parsed.proofFileName?.trim() || null,
      proofMimeType: parsed.proofMimeType?.trim() || null,
    };
  } catch {
    return {
      customerNotes: value,
      transferReference: null,
      proofUrl: null,
      proofFileName: null,
      proofMimeType: null,
    };
  }
}
