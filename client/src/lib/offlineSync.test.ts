import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initOfflineDB,
  saveProductOffline,
  saveVariantOffline,
  saveSaleOffline,
  getUnsyncedRecords,
  markAsSynced,
  exportOfflineData,
  importOfflineData,
  logSyncEvent,
  clearOfflineDB,
  getSyncStatus,
  OfflineProduct,
  OfflineVariant,
  OfflineSale,
  OfflineSaleDetail,
} from './offlineSync';

describe('Offline Sync - Comprehensive E2E Tests', () => {
  beforeEach(async () => {
    // Clear database before each test
    await clearOfflineDB();
  });

  afterEach(async () => {
    // Clean up after each test
    await clearOfflineDB();
  });

  describe('Database Initialization', () => {
    it('should initialize offline database with all required stores', async () => {
      const db = await initOfflineDB();
      expect(db).toBeDefined();
      expect(db.objectStoreNames).toContain('products');
      expect(db.objectStoreNames).toContain('variants');
      expect(db.objectStoreNames).toContain('sales');
      expect(db.objectStoreNames).toContain('saleDetails');
      expect(db.objectStoreNames).toContain('categories');
      expect(db.objectStoreNames).toContain('syncLog');
    });

    it('should return same database instance on multiple calls', async () => {
      const db1 = await initOfflineDB();
      const db2 = await initOfflineDB();
      expect(db1).toBe(db2);
    });
  });

  describe('Product Offline Storage', () => {
    it('should save product offline with synced flag as false', async () => {
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

      await saveProductOffline(product);
      const db = await initOfflineDB();
      const saved = await db.get('products', 1);

      expect(saved).toBeDefined();
      expect(saved._synced).toBe(false);
      expect(saved.name).toBe('Test Product');
    });

    it('should update product timestamp when saving offline', async () => {
      const product: OfflineProduct = {
        id: 1,
        name: 'Test Product',
        description: 'Test Description',
        categoryId: 1,
        createdAt: Date.now(),
        updatedAt: Date.now() - 10000,
        _synced: false,
        _deleted: false,
      };

      await saveProductOffline(product);
      const db = await initOfflineDB();
      const saved = await db.get('products', 1);

      expect(saved.updatedAt).toBeGreaterThan(product.updatedAt);
    });

    it('should save multiple products offline', async () => {
      const products = [
        { id: 1, name: 'Product 1', description: 'Desc 1', categoryId: 1, createdAt: Date.now(), updatedAt: Date.now(), _synced: false, _deleted: false },
        { id: 2, name: 'Product 2', description: 'Desc 2', categoryId: 1, createdAt: Date.now(), updatedAt: Date.now(), _synced: false, _deleted: false },
        { id: 3, name: 'Product 3', description: 'Desc 3', categoryId: 2, createdAt: Date.now(), updatedAt: Date.now(), _synced: false, _deleted: false },
      ];

      for (const product of products) {
        await saveProductOffline(product);
      }

      const db = await initOfflineDB();
      const allProducts = await db.getAll('products');
      expect(allProducts).toHaveLength(3);
    });
  });

  describe('Variant Offline Storage', () => {
    it('should save variant offline with synced flag as false', async () => {
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

      await saveVariantOffline(variant);
      const db = await initOfflineDB();
      const saved = await db.get('variants', 1);

      expect(saved).toBeDefined();
      expect(saved._synced).toBe(false);
      expect(saved.color).toBe('Blue');
      expect(saved.size).toBe('L');
    });

    it('should save variants for multiple products', async () => {
      const variants = [
        { id: 1, productId: 1, size: 'S', color: 'Red', sku: 'SKU-001', price: '50', stock: 5, createdAt: Date.now(), updatedAt: Date.now(), _synced: false, _deleted: false },
        { id: 2, productId: 1, size: 'M', color: 'Red', sku: 'SKU-002', price: '50', stock: 10, createdAt: Date.now(), updatedAt: Date.now(), _synced: false, _deleted: false },
        { id: 3, productId: 2, size: 'L', color: 'Blue', sku: 'SKU-003', price: '75', stock: 8, createdAt: Date.now(), updatedAt: Date.now(), _synced: false, _deleted: false },
      ];

      for (const variant of variants) {
        await saveVariantOffline(variant);
      }

      const db = await initOfflineDB();
      const product1Variants = await db.getAllFromIndex('variants', 'by-product', 1);
      expect(product1Variants).toHaveLength(2);
    });
  });

  describe('Sale Offline Storage', () => {
    it('should save sale with details offline', async () => {
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

      await saveSaleOffline(sale, details);

      const db = await initOfflineDB();
      const savedSale = await db.get('sales', 1);
      const saleDetails = await db.getAllFromIndex('saleDetails', 'by-sale', 1);

      expect(savedSale).toBeDefined();
      expect(savedSale._synced).toBe(false);
      expect(saleDetails).toHaveLength(2);
    });

    it('should save multiple sales offline', async () => {
      const sales = [
        { id: 1, saleNumber: 'SALE-001', branchId: 1, userId: 1, totalAmount: '100', paymentMethod: 'cash', notes: '', createdAt: Date.now(), _synced: false, _deleted: false },
        { id: 2, saleNumber: 'SALE-002', branchId: 1, userId: 1, totalAmount: '200', paymentMethod: 'card', notes: '', createdAt: Date.now(), _synced: false, _deleted: false },
        { id: 3, saleNumber: 'SALE-003', branchId: 2, userId: 2, totalAmount: '150', paymentMethod: 'transfer', notes: '', createdAt: Date.now(), _synced: false, _deleted: false },
      ];

      for (const sale of sales) {
        await saveSaleOffline(sale, []);
      }

      const db = await initOfflineDB();
      const allSales = await db.getAll('sales');
      expect(allSales).toHaveLength(3);
    });
  });

  describe('Sync Status Tracking', () => {
    it('should return correct unsynced counts', async () => {
      // Add unsynced records
      await saveProductOffline({
        id: 1,
        name: 'Product 1',
        description: 'Desc',
        categoryId: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        _synced: false,
        _deleted: false,
      });

      await saveVariantOffline({
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

      const status = await getSyncStatus();

      expect(status.unsyncedProducts).toBe(1);
      expect(status.unsyncedVariants).toBe(1);
      expect(status.totalUnsynced).toBe(2);
    });

    it('should update sync status after marking records as synced', async () => {
      // Add unsynced product
      await saveProductOffline({
        id: 1,
        name: 'Product 1',
        description: 'Desc',
        categoryId: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        _synced: false,
        _deleted: false,
      });

      let status = await getSyncStatus();
      expect(status.unsyncedProducts).toBe(1);

      // Mark as synced
      await markAsSynced('products', 1);

      status = await getSyncStatus();
      expect(status.unsyncedProducts).toBe(0);
    });
  });

  describe('Unsynced Records Retrieval', () => {
    it('should retrieve only unsynced records', async () => {
      const db = await initOfflineDB();

      // Add synced and unsynced products
      await saveProductOffline({
        id: 1,
        name: 'Unsynced Product',
        description: 'Desc',
        categoryId: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        _synced: false,
        _deleted: false,
      });

      await db.put('products', {
        id: 2,
        name: 'Synced Product',
        description: 'Desc',
        categoryId: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        _synced: true,
        _deleted: false,
      });

      const unsynced = await getUnsyncedRecords('products');
      expect(unsynced).toHaveLength(1);
      expect(unsynced[0].id).toBe(1);
    });

    it('should retrieve unsynced records from multiple tables', async () => {
      await saveProductOffline({
        id: 1,
        name: 'Product',
        description: 'Desc',
        categoryId: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        _synced: false,
        _deleted: false,
      });

      await saveVariantOffline({
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

      const unsyncedProducts = await getUnsyncedRecords('products');
      const unsyncedVariants = await getUnsyncedRecords('variants');

      expect(unsyncedProducts).toHaveLength(1);
      expect(unsyncedVariants).toHaveLength(1);
    });
  });

  describe('Data Export and Import', () => {
    it('should export offline data as JSON', async () => {
      await saveProductOffline({
        id: 1,
        name: 'Product 1',
        description: 'Desc',
        categoryId: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        _synced: false,
        _deleted: false,
      });

      const exported = await exportOfflineData();
      const data = JSON.parse(exported);

      expect(data.products).toHaveLength(1);
      expect(data.products[0].name).toBe('Product 1');
      expect(data.exportedAt).toBeDefined();
    });

    it('should import offline data correctly', async () => {
      const exportedData = {
        products: [
          { id: 1, name: 'Imported Product', description: 'Desc', categoryId: 1, createdAt: Date.now(), updatedAt: Date.now(), _synced: false, _deleted: false },
        ],
        variants: [],
        sales: [],
        saleDetails: [],
        categories: [],
        exportedAt: new Date().toISOString(),
      };

      await importOfflineData(JSON.stringify(exportedData));

      const db = await initOfflineDB();
      const products = await db.getAll('products');
      expect(products).toHaveLength(1);
      expect(products[0].name).toBe('Imported Product');
    });

    it('should preserve data integrity during export/import cycle', async () => {
      // Create complex data structure
      await saveProductOffline({
        id: 1,
        name: 'Product 1',
        description: 'Desc',
        categoryId: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        _synced: false,
        _deleted: false,
      });

      await saveVariantOffline({
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

      // Export
      const exported = await exportOfflineData();

      // Clear database
      await clearOfflineDB();

      // Import
      await importOfflineData(exported);

      // Verify
      const db = await initOfflineDB();
      const products = await db.getAll('products');
      const variants = await db.getAll('variants');

      expect(products).toHaveLength(1);
      expect(variants).toHaveLength(1);
      expect(products[0].name).toBe('Product 1');
      expect(variants[0].color).toBe('Blue');
    });
  });

  describe('Sync Event Logging', () => {
    it('should log sync events', async () => {
      await logSyncEvent('upload', 'products', 1, 'success');
      await logSyncEvent('download', 'variants', 2, 'success');
      await logSyncEvent('conflict', 'sales', 3, 'failed', 'Conflict detected');

      const db = await initOfflineDB();
      const logs = await db.getAll('syncLog');

      expect(logs).toHaveLength(3);
      expect(logs[0].action).toBe('upload');
      expect(logs[2].error).toBe('Conflict detected');
    });

    it('should include timestamp in sync logs', async () => {
      const beforeTime = Date.now();
      await logSyncEvent('upload', 'products', 1, 'success');
      const afterTime = Date.now();

      const db = await initOfflineDB();
      const logs = await db.getAll('syncLog');

      expect(logs[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(logs[0].timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Database Clearing', () => {
    it('should clear all offline data', async () => {
      // Add data
      await saveProductOffline({
        id: 1,
        name: 'Product 1',
        description: 'Desc',
        categoryId: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        _synced: false,
        _deleted: false,
      });

      let status = await getSyncStatus();
      expect(status.totalUnsynced).toBe(1);

      // Clear
      await clearOfflineDB();

      // Verify
      status = await getSyncStatus();
      expect(status.totalUnsynced).toBe(0);
    });
  });

  describe('Complex Offline Scenarios', () => {
    it('should handle complete offline transaction workflow', async () => {
      // Simulate offline sale creation
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

      // Save sale offline
      await saveSaleOffline(sale, details);

      // Check sync status
      let status = await getSyncStatus();
      expect(status.unsyncedSales).toBe(1);
      expect(status.unsyncedDetails).toBe(2);

      // Simulate sync
      await markAsSynced('sales', 1);
      await markAsSynced('saleDetails', 1);
      await markAsSynced('saleDetails', 2);

      // Verify all synced
      status = await getSyncStatus();
      expect(status.totalUnsynced).toBe(0);
    });

    it('should handle concurrent offline operations', async () => {
      const promises = [];

      // Create multiple concurrent saves
      for (let i = 1; i <= 5; i++) {
        promises.push(
          saveProductOffline({
            id: i,
            name: `Product ${i}`,
            description: `Desc ${i}`,
            categoryId: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            _synced: false,
            _deleted: false,
          })
        );
      }

      await Promise.all(promises);

      const status = await getSyncStatus();
      expect(status.unsyncedProducts).toBe(5);
    });

    it('should maintain data consistency with mixed synced/unsynced records', async () => {
      const db = await initOfflineDB();

      // Add mix of synced and unsynced
      for (let i = 1; i <= 10; i++) {
        await db.put('products', {
          id: i,
          name: `Product ${i}`,
          description: 'Desc',
          categoryId: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          _synced: i % 2 === 0, // Even = synced, Odd = unsynced
          _deleted: false,
        });
      }

      const status = await getSyncStatus();
      expect(status.unsyncedProducts).toBe(5);

      const unsynced = await getUnsyncedRecords('products');
      expect(unsynced).toHaveLength(5);
      expect(unsynced.every((p) => !p._synced)).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty database gracefully', async () => {
      const status = await getSyncStatus();
      expect(status.totalUnsynced).toBe(0);
      expect(status.unsyncedProducts).toBe(0);
      expect(status.unsyncedVariants).toBe(0);
      expect(status.unsyncedSales).toBe(0);
    });

    it('should handle marking non-existent record as synced', async () => {
      // Should not throw error
      await markAsSynced('products', 999);
      const status = await getSyncStatus();
      expect(status.totalUnsynced).toBe(0);
    });

    it('should handle export of empty database', async () => {
      const exported = await exportOfflineData();
      const data = JSON.parse(exported);

      expect(data.products).toHaveLength(0);
      expect(data.variants).toHaveLength(0);
      expect(data.sales).toHaveLength(0);
      expect(data.saleDetails).toHaveLength(0);
      expect(data.categories).toHaveLength(0);
    });

    it('should handle import of empty data', async () => {
      const emptyData = {
        products: [],
        variants: [],
        sales: [],
        saleDetails: [],
        categories: [],
        exportedAt: new Date().toISOString(),
      };

      await importOfflineData(JSON.stringify(emptyData));
      const status = await getSyncStatus();
      expect(status.totalUnsynced).toBe(0);
    });
  });
});
