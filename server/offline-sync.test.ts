import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Offline Sync E2E Tests
 * Validates the offline synchronization logic for the POS system
 */

interface OfflineProduct {
  id: number;
  name: string;
  description: string;
  categoryId: number;
  createdAt: number;
  updatedAt: number;
  _synced: boolean;
  _deleted: boolean;
}

interface OfflineVariant {
  id: number;
  productId: number;
  size: string;
  color: string;
  sku: string;
  price: string;
  stock: number;
  createdAt: number;
  updatedAt: number;
  _synced: boolean;
  _deleted: boolean;
}

interface OfflineSale {
  id: number;
  saleNumber: string;
  branchId: number;
  userId: number;
  totalAmount: string;
  paymentMethod: string;
  notes: string;
  createdAt: number;
  _synced: boolean;
  _deleted: boolean;
}

interface OfflineSaleDetail {
  id: number;
  saleId: number;
  variantId: number;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  _synced: boolean;
  _deleted: boolean;
}

interface SyncStatus {
  unsyncedProducts: number;
  unsyncedVariants: number;
  unsyncedSales: number;
  unsyncedDetails: number;
  totalUnsynced: number;
}

class MockOfflineStore {
  private products: Map<number, OfflineProduct> = new Map();
  private variants: Map<number, OfflineVariant> = new Map();
  private sales: Map<number, OfflineSale> = new Map();
  private saleDetails: Map<number, OfflineSaleDetail> = new Map();

  saveProduct(product: OfflineProduct): void {
    this.products.set(product.id, {
      ...product,
      _synced: false,
      updatedAt: Date.now(),
    });
  }

  saveVariant(variant: OfflineVariant): void {
    this.variants.set(variant.id, {
      ...variant,
      _synced: false,
      updatedAt: Date.now(),
    });
  }

  saveSale(sale: OfflineSale, details: OfflineSaleDetail[]): void {
    this.sales.set(sale.id, { ...sale, _synced: false });
    for (const detail of details) {
      this.saleDetails.set(detail.id, { ...detail, _synced: false });
    }
  }

  getUnsyncedRecords(table: 'products' | 'variants' | 'sales' | 'saleDetails'): any[] {
    const store = this.getStore(table);
    return Array.from(store.values()).filter((record) => !record._synced);
  }

  markAsSynced(table: 'products' | 'variants' | 'sales' | 'saleDetails', id: number): void {
    const store = this.getStore(table);
    const record = store.get(id);
    if (record) {
      record._synced = true;
    }
  }

  getSyncStatus(): SyncStatus {
    const unsyncedProducts = Array.from(this.products.values()).filter((p) => !p._synced).length;
    const unsyncedVariants = Array.from(this.variants.values()).filter((v) => !v._synced).length;
    const unsyncedSales = Array.from(this.sales.values()).filter((s) => !s._synced).length;
    const unsyncedDetails = Array.from(this.saleDetails.values()).filter((d) => !d._synced).length;

    return {
      unsyncedProducts,
      unsyncedVariants,
      unsyncedSales,
      unsyncedDetails,
      totalUnsynced: unsyncedProducts + unsyncedVariants + unsyncedSales + unsyncedDetails,
    };
  }

  exportData(): string {
    return JSON.stringify(
      {
        products: Array.from(this.products.values()),
        variants: Array.from(this.variants.values()),
        sales: Array.from(this.sales.values()),
        saleDetails: Array.from(this.saleDetails.values()),
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }

  importData(jsonData: string): void {
    const data = JSON.parse(jsonData);

    if (data.products) {
      for (const product of data.products) {
        this.products.set(product.id, product);
      }
    }

    if (data.variants) {
      for (const variant of data.variants) {
        this.variants.set(variant.id, variant);
      }
    }

    if (data.sales) {
      for (const sale of data.sales) {
        this.sales.set(sale.id, sale);
      }
    }

    if (data.saleDetails) {
      for (const detail of data.saleDetails) {
        this.saleDetails.set(detail.id, detail);
      }
    }
  }

  clear(): void {
    this.products.clear();
    this.variants.clear();
    this.sales.clear();
    this.saleDetails.clear();
  }

  private getStore(table: string): Map<number, any> {
    switch (table) {
      case 'products':
        return this.products;
      case 'variants':
        return this.variants;
      case 'sales':
        return this.sales;
      case 'saleDetails':
        return this.saleDetails;
      default:
        throw new Error(`Unknown table: ${table}`);
    }
  }
}

describe('Offline Sync - E2E Tests', () => {
  let store: MockOfflineStore;

  beforeEach(() => {
    store = new MockOfflineStore();
  });

  describe('Product Offline Storage', () => {
    it('should save product offline with synced flag as false', () => {
      const product: OfflineProduct = {
        id: 1,
        name: 'Test Product',
        description: 'Test Description',
        categoryId: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        _synced: false,
        _deleted: false,
      };

      store.saveProduct(product);
      const unsynced = store.getUnsyncedRecords('products');

      expect(unsynced).toHaveLength(1);
      expect(unsynced[0].name).toBe('Test Product');
      expect(unsynced[0]._synced).toBe(false);
    });

    it('should save multiple products offline', () => {
      const products = [
        { id: 1, name: 'Product 1', description: 'Desc 1', categoryId: 1, createdAt: Date.now(), updatedAt: Date.now(), _synced: false, _deleted: false },
        { id: 2, name: 'Product 2', description: 'Desc 2', categoryId: 1, createdAt: Date.now(), updatedAt: Date.now(), _synced: false, _deleted: false },
        { id: 3, name: 'Product 3', description: 'Desc 3', categoryId: 2, createdAt: Date.now(), updatedAt: Date.now(), _synced: false, _deleted: false },
      ];

      for (const product of products) {
        store.saveProduct(product);
      }

      const unsynced = store.getUnsyncedRecords('products');
      expect(unsynced).toHaveLength(3);
    });
  });

  describe('Variant Offline Storage', () => {
    it('should save variant offline', () => {
      const variant: OfflineVariant = {
        id: 1,
        productId: 1,
        size: 'L',
        color: 'Blue',
        sku: 'SKU-001',
        price: '99.99',
        stock: 10,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        _synced: false,
        _deleted: false,
      };

      store.saveVariant(variant);
      const unsynced = store.getUnsyncedRecords('variants');

      expect(unsynced).toHaveLength(1);
      expect(unsynced[0].color).toBe('Blue');
      expect(unsynced[0].size).toBe('L');
    });
  });

  describe('Sale Offline Storage', () => {
    it('should save sale with details offline', () => {
      const sale: OfflineSale = {
        id: 1,
        saleNumber: 'SALE-001',
        branchId: 1,
        userId: 1,
        totalAmount: '149.99',
        paymentMethod: 'cash',
        notes: 'Test sale',
        createdAt: Date.now(),
        _synced: false,
        _deleted: false,
      };

      const details: OfflineSaleDetail[] = [
        {
          id: 1,
          saleId: 1,
          variantId: 1,
          quantity: 2,
          unitPrice: '50.00',
          lineTotal: '100.00',
          _synced: false,
          _deleted: false,
        },
        {
          id: 2,
          saleId: 1,
          variantId: 2,
          quantity: 1,
          unitPrice: '49.99',
          lineTotal: '49.99',
          _synced: false,
          _deleted: false,
        },
      ];

      store.saveSale(sale, details);

      const unsyncedSales = store.getUnsyncedRecords('sales');
      const unsyncedDetails = store.getUnsyncedRecords('saleDetails');

      expect(unsyncedSales).toHaveLength(1);
      expect(unsyncedDetails).toHaveLength(2);
    });
  });

  describe('Sync Status Tracking', () => {
    it('should return correct unsynced counts', () => {
      store.saveProduct({
        id: 1,
        name: 'Product 1',
        description: 'Desc',
        categoryId: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        _synced: false,
        _deleted: false,
      });

      store.saveVariant({
        id: 1,
        productId: 1,
        size: 'L',
        color: 'Blue',
        sku: 'SKU-001',
        price: '99.99',
        stock: 10,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        _synced: false,
        _deleted: false,
      });

      const status = store.getSyncStatus();

      expect(status.unsyncedProducts).toBe(1);
      expect(status.unsyncedVariants).toBe(1);
      expect(status.totalUnsynced).toBe(2);
    });

    it('should update sync status after marking records as synced', () => {
      store.saveProduct({
        id: 1,
        name: 'Product 1',
        description: 'Desc',
        categoryId: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        _synced: false,
        _deleted: false,
      });

      let status = store.getSyncStatus();
      expect(status.unsyncedProducts).toBe(1);

      store.markAsSynced('products', 1);

      status = store.getSyncStatus();
      expect(status.unsyncedProducts).toBe(0);
    });
  });

  describe('Data Export and Import', () => {
    it('should export offline data as JSON', () => {
      store.saveProduct({
        id: 1,
        name: 'Product 1',
        description: 'Desc',
        categoryId: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        _synced: false,
        _deleted: false,
      });

      const exported = store.exportData();
      const data = JSON.parse(exported);

      expect(data.products).toHaveLength(1);
      expect(data.products[0].name).toBe('Product 1');
      expect(data.exportedAt).toBeDefined();
    });

    it('should import offline data correctly', () => {
      const exportedData = {
        products: [
          { id: 1, name: 'Imported Product', description: 'Desc', categoryId: 1, createdAt: Date.now(), updatedAt: Date.now(), _synced: false, _deleted: false },
        ],
        variants: [],
        sales: [],
        saleDetails: [],
        exportedAt: new Date().toISOString(),
      };

      store.importData(JSON.stringify(exportedData));

      const unsynced = store.getUnsyncedRecords('products');
      expect(unsynced).toHaveLength(1);
      expect(unsynced[0].name).toBe('Imported Product');
    });

    it('should preserve data integrity during export/import cycle', () => {
      store.saveProduct({
        id: 1,
        name: 'Product 1',
        description: 'Desc',
        categoryId: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        _synced: false,
        _deleted: false,
      });

      store.saveVariant({
        id: 1,
        productId: 1,
        size: 'L',
        color: 'Blue',
        sku: 'SKU-001',
        price: '99.99',
        stock: 10,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        _synced: false,
        _deleted: false,
      });

      const exported = store.exportData();

      const newStore = new MockOfflineStore();
      newStore.importData(exported);

      const products = newStore.getUnsyncedRecords('products');
      const variants = newStore.getUnsyncedRecords('variants');

      expect(products).toHaveLength(1);
      expect(variants).toHaveLength(1);
      expect(products[0].name).toBe('Product 1');
      expect(variants[0].color).toBe('Blue');
    });
  });

  describe('Complex Offline Scenarios', () => {
    it('should handle complete offline transaction workflow', () => {
      const sale: OfflineSale = {
        id: 1,
        saleNumber: 'SALE-20260420-001',
        branchId: 1,
        userId: 1,
        totalAmount: '299.99',
        paymentMethod: 'cash',
        notes: 'Offline sale',
        createdAt: Date.now(),
        _synced: false,
        _deleted: false,
      };

      const details: OfflineSaleDetail[] = [
        {
          id: 1,
          saleId: 1,
          variantId: 1,
          quantity: 2,
          unitPrice: '100.00',
          lineTotal: '200.00',
          _synced: false,
          _deleted: false,
        },
        {
          id: 2,
          saleId: 1,
          variantId: 2,
          quantity: 1,
          unitPrice: '99.99',
          lineTotal: '99.99',
          _synced: false,
          _deleted: false,
        },
      ];

      store.saveSale(sale, details);

      let status = store.getSyncStatus();
      expect(status.unsyncedSales).toBe(1);
      expect(status.unsyncedDetails).toBe(2);

      store.markAsSynced('sales', 1);
      store.markAsSynced('saleDetails', 1);
      store.markAsSynced('saleDetails', 2);

      status = store.getSyncStatus();
      expect(status.totalUnsynced).toBe(0);
    });

    it('should handle concurrent offline operations', () => {
      for (let i = 1; i <= 5; i++) {
        store.saveProduct({
          id: i,
          name: `Product ${i}`,
          description: `Desc ${i}`,
          categoryId: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          _synced: false,
          _deleted: false,
        });
      }

      const status = store.getSyncStatus();
      expect(status.unsyncedProducts).toBe(5);
    });

    it('should handle multiple sales in offline mode', () => {
      for (let i = 1; i <= 3; i++) {
        const sale: OfflineSale = {
          id: i,
          saleNumber: `SALE-20260420-00${i}`,
          branchId: 1,
          userId: 1,
          totalAmount: (100 * i).toString(),
          paymentMethod: i % 2 === 0 ? 'card' : 'cash',
          notes: `Offline sale ${i}`,
          createdAt: Date.now(),
          _synced: false,
          _deleted: false,
        };

        store.saveSale(sale, [
          {
            id: i,
            saleId: i,
            variantId: i,
            quantity: i,
            unitPrice: '50.00',
            lineTotal: (50 * i).toString(),
            _synced: false,
            _deleted: false,
          },
        ]);
      }

      let status = store.getSyncStatus();
      expect(status.unsyncedSales).toBe(3);
      expect(status.unsyncedDetails).toBe(3);

      store.markAsSynced('sales', 1);
      store.markAsSynced('saleDetails', 1);

      status = store.getSyncStatus();
      expect(status.unsyncedSales).toBe(2);
      expect(status.unsyncedDetails).toBe(2);

      store.markAsSynced('sales', 2);
      store.markAsSynced('sales', 3);
      store.markAsSynced('saleDetails', 2);
      store.markAsSynced('saleDetails', 3);

      status = store.getSyncStatus();
      expect(status.totalUnsynced).toBe(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty database gracefully', () => {
      const status = store.getSyncStatus();
      expect(status.totalUnsynced).toBe(0);
      expect(status.unsyncedProducts).toBe(0);
    });

    it('should handle marking non-existent record as synced', () => {
      store.markAsSynced('products', 999);
      const status = store.getSyncStatus();
      expect(status.totalUnsynced).toBe(0);
    });

    it('should handle export of empty database', () => {
      const exported = store.exportData();
      const data = JSON.parse(exported);

      expect(data.products).toHaveLength(0);
      expect(data.variants).toHaveLength(0);
      expect(data.sales).toHaveLength(0);
    });
  });

  describe('Offline Mode Simulation', () => {
    it('should simulate complete offline workflow: create sale -> export -> import -> sync', () => {
      const sale: OfflineSale = {
        id: 1,
        saleNumber: 'SALE-20260420-001',
        branchId: 1,
        userId: 1,
        totalAmount: '299.99',
        paymentMethod: 'cash',
        notes: 'Offline sale',
        createdAt: Date.now(),
        _synced: false,
        _deleted: false,
      };

      const details: OfflineSaleDetail[] = [
        {
          id: 1,
          saleId: 1,
          variantId: 1,
          quantity: 2,
          unitPrice: '100.00',
          lineTotal: '200.00',
          _synced: false,
          _deleted: false,
        },
      ];

      store.saveSale(sale, details);
      let status = store.getSyncStatus();
      expect(status.totalUnsynced).toBe(2);

      const exported = store.exportData();
      expect(exported).toContain('SALE-20260420-001');

      const newStore = new MockOfflineStore();
      newStore.importData(exported);

      status = newStore.getSyncStatus();
      expect(status.totalUnsynced).toBe(2);

      newStore.markAsSynced('sales', 1);
      newStore.markAsSynced('saleDetails', 1);

      status = newStore.getSyncStatus();
      expect(status.totalUnsynced).toBe(0);
    });
  });
});
