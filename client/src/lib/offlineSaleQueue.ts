import { saveSaleOffline, type OfflineSale, type OfflineSaleDetail } from './offlineSync';

export type OfflineCheckoutItem = {
  variantId: number;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type OfflineSaleDraftInput = {
  branchId: number;
  userId: number;
  paymentMethod: 'cash' | 'card' | 'transfer';
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  notes?: string;
  items: OfflineCheckoutItem[];
  now?: number;
};

export function buildOfflineSaleDraft(input: OfflineSaleDraftInput): {
  sale: OfflineSale;
  details: OfflineSaleDetail[];
} {
  const timestamp = input.now ?? Date.now();
  const saleId = timestamp;
  const saleNumber = `OFF-${timestamp}`;

  return {
    sale: {
      id: saleId,
      saleNumber,
      branchId: input.branchId,
      userId: input.userId,
      totalAmount: input.total,
      subtotalAmount: input.subtotal,
      discountAmount: input.discount,
      taxAmount: input.tax,
      paymentMethod: input.paymentMethod,
      notes: input.notes ?? '',
      createdAt: timestamp,
      _synced: false,
      _deleted: false,
    },
    details: input.items.map((item, index) => ({
      id: saleId + index + 1,
      saleId,
      variantId: item.variantId,
      productName: item.productName,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      _synced: false,
      _deleted: false,
    })),
  };
}

export async function queueOfflineSale(input: OfflineSaleDraftInput) {
  const draft = buildOfflineSaleDraft(input);
  await saveSaleOffline(draft.sale, draft.details);
  return draft;
}
