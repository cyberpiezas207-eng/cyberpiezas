import { openDB, IDBPDatabase } from 'idb';

export interface OfflineProduct {
  id: number;
  name: string;
  description: string;
  categoryId: number;
  createdAt: number;
  updatedAt: number;
  _synced: boolean;
  _deleted: boolean;
}

export interface OfflineVariant {
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

export interface OfflineSale {
  id: number;
  saleNumber: string;
  branchId: number;
  userId: number;
  totalAmount: string;
  subtotalAmount?: string;
  discountAmount?: string;
  taxAmount?: string;
  paymentMethod: string;
  notes: string;
  createdAt: number;
  _synced: boolean;
  _deleted: boolean;
}

export interface OfflineSaleDetail {
  id: number;
  saleId: number;
  variantId: number;
  productName?: string;
  size?: string;
  color?: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  _synced: boolean;
  _deleted: boolean;
}

export interface OfflineCategory {
  id: number;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  _synced: boolean;
  _deleted: boolean;
}

export interface SyncLogEntry {
  timestamp: number;
  action: 'upload' | 'download' | 'conflict' | 'error';
  table: string;
  recordId: number;
  status: 'success' | 'pending' | 'failed';
  error?: string;
}

let db: IDBPDatabase | null = null;

export async function initOfflineDB() {
  if (db) return db;

  db = await openDB('boutique-pos-offline', 1, {
    upgrade(database: any) {
      // Products store
      if (!database.objectStoreNames.contains('products')) {
        const productStore = database.createObjectStore('products', { keyPath: 'id' });
        productStore.createIndex('by-category', 'categoryId');
        productStore.createIndex('by-synced', '_synced');
      }

      // Variants store
      if (!database.objectStoreNames.contains('variants')) {
        const variantStore = database.createObjectStore('variants', { keyPath: 'id' });
        variantStore.createIndex('by-product', 'productId');
        variantStore.createIndex('by-synced', '_synced');
      }

      // Sales store
      if (!database.objectStoreNames.contains('sales')) {
        const salesStore = database.createObjectStore('sales', { keyPath: 'id' });
        salesStore.createIndex('by-branch', 'branchId');
        salesStore.createIndex('by-synced', '_synced');
      }

      // Sale details store
      if (!database.objectStoreNames.contains('saleDetails')) {
        const detailsStore = database.createObjectStore('saleDetails', { keyPath: 'id' });
        detailsStore.createIndex('by-sale', 'saleId');
        detailsStore.createIndex('by-synced', '_synced');
      }

      // Categories store
      if (!database.objectStoreNames.contains('categories')) {
        const categoryStore = database.createObjectStore('categories', { keyPath: 'id' });
        categoryStore.createIndex('by-synced', '_synced');
      }

      // Sync log store
      if (!database.objectStoreNames.contains('syncLog')) {
        database.createObjectStore('syncLog', { keyPath: 'timestamp' });
      }
    },
  });

  return db;
}

export async function saveProductOffline(product: any) {
  const database = await initOfflineDB();
  await database.put('products', {
    ...product,
    _synced: false,
    updatedAt: Date.now(),
  });
}

export async function saveVariantOffline(variant: any) {
  const database = await initOfflineDB();
  await database.put('variants', {
    ...variant,
    _synced: false,
    updatedAt: Date.now(),
  });
}

export async function saveSaleOffline(sale: any, details: any[]) {
  const database = await initOfflineDB();
  const tx = database.transaction(['sales', 'saleDetails'], 'readwrite');

  await tx.objectStore('sales').put({
    ...sale,
    _synced: false,
  });

  for (const detail of details) {
    await tx.objectStore('saleDetails').put({
      ...detail,
      _synced: false,
    });
  }

  await tx.done;
}

export async function getUnsyncedRecords(table: string) {
  const database = await initOfflineDB();
  return database.getAllFromIndex(table, 'by-synced', IDBKeyRange.only(false));
}

export async function getSaleDetailsBySaleId(saleId: number) {
  const database = await initOfflineDB();
  return database.getAllFromIndex('saleDetails', 'by-sale', saleId);
}

export async function markAsSynced(table: string, id: number) {
  const database = await initOfflineDB();
  const record = await database.get(table, id);
  if (record) {
    record._synced = true;
    await database.put(table, record);
  }
}

export async function exportOfflineData() {
  const database = await initOfflineDB();
  const exportData = {
    products: await database.getAll('products'),
    variants: await database.getAll('variants'),
    sales: await database.getAll('sales'),
    saleDetails: await database.getAll('saleDetails'),
    categories: await database.getAll('categories'),
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(exportData, null, 2);
}

export async function importOfflineData(jsonData: string) {
  const database = await initOfflineDB();
  const data = JSON.parse(jsonData);

  const tx = database.transaction(
    ['products', 'variants', 'sales', 'saleDetails', 'categories'],
    'readwrite'
  );

  if (data.products) {
    for (const product of data.products) {
      await tx.objectStore('products').put(product);
    }
  }

  if (data.variants) {
    for (const variant of data.variants) {
      await tx.objectStore('variants').put(variant);
    }
  }

  if (data.categories) {
    for (const category of data.categories) {
      await tx.objectStore('categories').put(category);
    }
  }

  if (data.sales) {
    for (const sale of data.sales) {
      await tx.objectStore('sales').put(sale);
    }
  }

  if (data.saleDetails) {
    for (const detail of data.saleDetails) {
      await tx.objectStore('saleDetails').put(detail);
    }
  }

  await tx.done;
}

export async function logSyncEvent(
  action: 'upload' | 'download' | 'conflict' | 'error',
  table: string,
  recordId: number,
  status: 'success' | 'pending' | 'failed',
  error?: string
) {
  const database = await initOfflineDB();
  await database.add('syncLog', {
    timestamp: Date.now(),
    action,
    table,
    recordId,
    status,
    error,
  });
}

export async function clearOfflineDB() {
  const database = await initOfflineDB();
  const tx = database.transaction(
    ['products', 'variants', 'sales', 'saleDetails', 'categories', 'syncLog'],
    'readwrite'
  );

  await tx.objectStore('products').clear();
  await tx.objectStore('variants').clear();
  await tx.objectStore('sales').clear();
  await tx.objectStore('saleDetails').clear();
  await tx.objectStore('categories').clear();
  await tx.objectStore('syncLog').clear();

  await tx.done;
}

export async function getSyncStatus() {
  const database = await initOfflineDB();
  const unsyncedProducts = await database.countFromIndex('products', 'by-synced', IDBKeyRange.only(false));
  const unsyncedVariants = await database.countFromIndex('variants', 'by-synced', IDBKeyRange.only(false));
  const unsyncedSales = await database.countFromIndex('sales', 'by-synced', IDBKeyRange.only(false));
  const unsyncedDetails = await database.countFromIndex('saleDetails', 'by-synced', IDBKeyRange.only(false));

  return {
    unsyncedProducts,
    unsyncedVariants,
    unsyncedSales,
    unsyncedDetails,
    totalUnsynced: unsyncedProducts + unsyncedVariants + unsyncedSales + unsyncedDetails,
  };
}
