import { describe, expect, it } from 'vitest';
import { mapOfflineSaleToServerInput } from './offlineSalesSync';
import type { OfflineSale, OfflineSaleDetail } from './offlineSync';

describe('offlineSalesSync', () => {
  it('convierte una venta offline completa al formato que espera el backend', () => {
    const sale: OfflineSale = {
      id: 1,
      saleNumber: 'OFF-1',
      branchId: 5,
      userId: 9,
      totalAmount: '125.00',
      subtotalAmount: '100.00',
      discountAmount: '5.00',
      taxAmount: '30.00',
      paymentMethod: 'transfer',
      notes: 'Pendiente de sincronizar',
      createdAt: 1,
      _synced: false,
      _deleted: false,
    };

    const details: OfflineSaleDetail[] = [
      {
        id: 11,
        saleId: 1,
        variantId: 22,
        productName: 'Blusa satinada',
        size: 'G',
        color: 'Vino',
        quantity: 1,
        unitPrice: '125.00',
        lineTotal: '125.00',
        _synced: false,
        _deleted: false,
      },
    ];

    expect(mapOfflineSaleToServerInput(sale, details)).toEqual({
      branchId: 5,
      items: [
        {
          variantId: 22,
          productName: 'Blusa satinada',
          size: 'G',
          color: 'Vino',
          quantity: 1,
          unitPrice: '125.00',
          lineTotal: '125.00',
        },
      ],
      subtotal: '100.00',
      discount: '5.00',
      tax: '30.00',
      total: '125.00',
      paymentMethod: 'transfer',
      notes: 'Pendiente de sincronizar',
    });
  });

  it('reconstruye campos faltantes con valores seguros para ventas offline antiguas', () => {
    const sale: OfflineSale = {
      id: 2,
      saleNumber: 'OFF-2',
      branchId: 7,
      userId: 4,
      totalAmount: '80.00',
      paymentMethod: 'otro-metodo',
      notes: '',
      createdAt: 2,
      _synced: false,
      _deleted: false,
    };

    const details: OfflineSaleDetail[] = [
      {
        id: 21,
        saleId: 2,
        variantId: 77,
        quantity: 2,
        unitPrice: '40.00',
        lineTotal: '80.00',
        _synced: false,
        _deleted: false,
      },
    ];

    expect(mapOfflineSaleToServerInput(sale, details)).toEqual({
      branchId: 7,
      items: [
        {
          variantId: 77,
          productName: 'Producto 77',
          size: 'Única',
          color: 'General',
          quantity: 2,
          unitPrice: '40.00',
          lineTotal: '80.00',
        },
      ],
      subtotal: '80.00',
      discount: '0.00',
      tax: '0.00',
      total: '80.00',
      paymentMethod: 'cash',
      notes: undefined,
    });
  });
});
