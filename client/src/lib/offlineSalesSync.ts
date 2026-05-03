import { getSaleDetailsBySaleId, getUnsyncedRecords, logSyncEvent, markAsSynced, type OfflineSale, type OfflineSaleDetail } from './offlineSync';
import { trpcProxyClient } from './trpcProxyClient';

export type OfflineSalesSyncSummary = {
  attempted: number;
  synced: number;
  failed: number;
};

function formatMoney(value: number) {
  return value.toFixed(2);
}

function getFallbackSubtotal(details: OfflineSaleDetail[]) {
  const subtotal = details.reduce((sum, detail) => sum + Number.parseFloat(detail.lineTotal || '0'), 0);
  return formatMoney(subtotal);
}

function normalizePaymentMethod(method: string): 'cash' | 'card' | 'transfer' {
  if (method === 'card' || method === 'transfer') {
    return method;
  }

  return 'cash';
}

export function mapOfflineSaleToServerInput(sale: OfflineSale, details: OfflineSaleDetail[]) {
  return {
    branchId: sale.branchId,
    items: details.map((detail) => ({
      variantId: detail.variantId,
      productName: detail.productName ?? `Producto ${detail.variantId}`,
      size: detail.size ?? 'Única',
      color: detail.color ?? 'General',
      quantity: detail.quantity,
      unitPrice: detail.unitPrice,
      lineTotal: detail.lineTotal,
    })),
    subtotal: sale.subtotalAmount ?? getFallbackSubtotal(details),
    discount: sale.discountAmount ?? '0.00',
    tax: sale.taxAmount ?? '0.00',
    total: sale.totalAmount,
    paymentMethod: normalizePaymentMethod(sale.paymentMethod),
    notes: sale.notes || undefined,
  };
}

export async function syncOfflineSalesQueue(): Promise<OfflineSalesSyncSummary> {
  if (!navigator.onLine) {
    return { attempted: 0, synced: 0, failed: 0 };
  }

  const unsyncedSales = (await getUnsyncedRecords('sales')) as OfflineSale[];
  const orderedSales = [...unsyncedSales].sort((a, b) => a.createdAt - b.createdAt);

  let synced = 0;
  let failed = 0;

  for (const sale of orderedSales) {
    try {
      const details = (await getSaleDetailsBySaleId(sale.id)) as OfflineSaleDetail[];
      if (details.length === 0) {
        failed += 1;
        await logSyncEvent('error', 'sales', sale.id, 'failed', 'La venta offline no tiene detalles para sincronizar.');
        continue;
      }

      await trpcProxyClient.sales.create.mutate(mapOfflineSaleToServerInput(sale, details));
      await markAsSynced('sales', sale.id);

      for (const detail of details) {
        await markAsSynced('saleDetails', detail.id);
      }

      synced += 1;
      await logSyncEvent('upload', 'sales', sale.id, 'success');
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : 'No se pudo sincronizar la venta offline.';
      await logSyncEvent('error', 'sales', sale.id, 'failed', message);
    }
  }

  return {
    attempted: orderedSales.length,
    synced,
    failed,
  };
}
