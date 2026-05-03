import { describe, expect, it } from 'vitest';
import { buildOfflineSaleDraft } from './offlineSaleQueue';

describe('offlineSaleQueue', () => {
  it('convierte una venta del POS en un borrador offline sincronizable', () => {
    const draft = buildOfflineSaleDraft({
      branchId: 7,
      userId: 15,
      paymentMethod: 'card',
      subtotal: '300.00',
      discount: '10.50',
      tax: '60.00',
      total: '349.50',
      notes: 'Venta sin internet',
      now: 1234567890,
      items: [
        {
          variantId: 11,
          productName: 'Vestido midi',
          size: 'M',
          color: 'Negro',
          quantity: 2,
          unitPrice: '174.75',
          lineTotal: '349.50',
        },
      ],
    });

    expect(draft.sale).toMatchObject({
      id: 1234567890,
      saleNumber: 'OFF-1234567890',
      branchId: 7,
      userId: 15,
      totalAmount: '349.50',
      subtotalAmount: '300.00',
      discountAmount: '10.50',
      taxAmount: '60.00',
      paymentMethod: 'card',
      notes: 'Venta sin internet',
      _synced: false,
      _deleted: false,
    });

    expect(draft.details).toEqual([
      {
        id: 1234567891,
        saleId: 1234567890,
        variantId: 11,
        productName: 'Vestido midi',
        size: 'M',
        color: 'Negro',
        quantity: 2,
        unitPrice: '174.75',
        lineTotal: '349.50',
        _synced: false,
        _deleted: false,
      },
    ]);
  });
});
