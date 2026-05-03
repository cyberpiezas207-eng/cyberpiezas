import { eq, and, gte, lte, like, desc, asc, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  categories,
  products,
  productVariants,
  productImages,
  sales,
  saleDetails,
  inventoryMovements,
  stockAlerts,
  branches,
  userBranchAssignments,
  branchInventory,
  stockTransfers,
  branchInventoryMovements,
  payments,
  notifications,
  notificationPreferences,
  userAccessLogs,
  manualLicenseGrants,
  licenseGrantHistory,
  subdomainRequests,
  productBranchAssignments,
  systemBrandingSettings,
  featureRequests,
  type ManualLicenseGrant,
  type InsertManualLicenseGrant,
  type InsertSubdomainRequest,
  type InsertProductBranchAssignment,
  type InsertSystemBrandingSettings,
  type Product,
  type ProductVariant,
  type Sale,
  type SaleDetail,
  type Category,
  type InsertUserAccessLog,
  freeTrialLogs,
  referralCodes,
  referralTracking,
  type FreeTrialLog,
  type InsertFreeTrialLog,
  type ReferralCode,
  type InsertReferralCode,
  type ReferralTracking,
  type InsertReferralTracking,
  userProgramAccess,
  type UserProgramAccess,
  type InsertUserProgramAccess,
  cashMovements,
  saleReturns,
  saleReturnDetails,
  type CashMovement,
  type InsertCashMovement,
  type SaleReturn,
  type InsertSaleReturn,
  type SaleReturnDetail,
  type InsertSaleReturnDetail,
  localUsers,
  type LocalUser,
  type InsertLocalUser,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createUserAccessLog(data: InsertUserAccessLog) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create access log: database not available");
    return;
  }

  await db.insert(userAccessLogs).values(data);
}

export async function getUserAccessLogs(limit = 100) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(userAccessLogs)
    .orderBy(desc(userAccessLogs.createdAt))
    .limit(limit);
}

type NotificationType = "sale" | "low_stock" | "payment_received" | "subscription_change" | "system";

export async function isNotificationEnabledForUser(userId: number, type: NotificationType) {
  const db = await getDb();
  if (!db) return false;

  let prefs = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  if (!prefs.length) {
    await db.insert(notificationPreferences).values({ userId });
    prefs = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);
  }

  const preference = prefs[0];
  if (!preference) return true;

  switch (type) {
    case "sale":
      return preference.emailOnSale ?? true;
    case "low_stock":
      return preference.emailOnLowStock ?? true;
    case "payment_received":
      return preference.emailOnPayment ?? true;
    case "subscription_change":
      return preference.emailOnSubscriptionChange ?? true;
    case "system":
    default:
      return true;
  }
}

export async function createNotificationForUser(data: {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: number;
}) {
  const db = await getDb();
  if (!db) {
    return;
  }

  const enabled = await isNotificationEnabledForUser(data.userId, data.type);
  if (!enabled) {
    return;
  }

  await db.insert(notifications).values({
    userId: data.userId,
    type: data.type,
    title: data.title,
    message: data.message,
    relatedId: data.relatedId,
    isRead: false,
  });
}

export async function getSystemBrandingSettings(ownerUserId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(systemBrandingSettings)
    .where(eq(systemBrandingSettings.ownerUserId, ownerUserId))
    .limit(1);

  return result[0] ?? null;
}

export async function upsertSystemBrandingSettings(data: InsertSystemBrandingSettings) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const existing = await getSystemBrandingSettings(data.ownerUserId);

  if (existing) {
    await db
      .update(systemBrandingSettings)
      .set({
        appTitle: data.appTitle ?? existing.appTitle,
        appSubtitle: data.appSubtitle ?? existing.appSubtitle,
        bannerImageUrl: data.bannerImageUrl ?? null,
        bannerStorageKey: data.bannerStorageKey ?? null,
        bannerAltText: data.bannerAltText ?? null,
      })
      .where(eq(systemBrandingSettings.id, existing.id));

    const updated = await db
      .select()
      .from(systemBrandingSettings)
      .where(eq(systemBrandingSettings.id, existing.id))
      .limit(1);

    return updated[0] ?? null;
  }

  await db.insert(systemBrandingSettings).values({
    ownerUserId: data.ownerUserId,
    appTitle: data.appTitle ?? "Boutique POS",
    appSubtitle: data.appSubtitle ?? "Centro de operación",
    bannerImageUrl: data.bannerImageUrl ?? null,
    bannerStorageKey: data.bannerStorageKey ?? null,
    bannerAltText: data.bannerAltText ?? null,
  });

  return await getSystemBrandingSettings(data.ownerUserId);
}

export async function createSubdomainRequest(data: InsertSubdomainRequest) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.insert(subdomainRequests).values(data);

  const result = await db
    .select()
    .from(subdomainRequests)
    .where(
      and(
        eq(subdomainRequests.userId, data.userId),
        eq(subdomainRequests.requestedSubdomain, data.requestedSubdomain),
      ),
    )
    .orderBy(desc(subdomainRequests.id))
    .limit(1);

  return result[0];
}

export async function getSubdomainRequestsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(subdomainRequests)
    .where(eq(subdomainRequests.userId, userId))
    .orderBy(desc(subdomainRequests.createdAt), desc(subdomainRequests.id));
}

export async function getSubdomainRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(subdomainRequests).where(eq(subdomainRequests.id, id)).limit(1);
  return result[0];
}

export async function getAllSubdomainRequests() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      request: subdomainRequests,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        subscriptionPlan: users.subscriptionPlan,
        subscriptionStatus: users.subscriptionStatus,
      },
    })
    .from(subdomainRequests)
    .leftJoin(users, eq(subdomainRequests.userId, users.id))
    .orderBy(desc(subdomainRequests.createdAt), desc(subdomainRequests.id));
}

export async function updateSubdomainRequest(
  id: number,
  data: Partial<InsertSubdomainRequest>,
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.update(subdomainRequests).set(data).where(eq(subdomainRequests.id, id));

  const result = await db.select().from(subdomainRequests).where(eq(subdomainRequests.id, id)).limit(1);
  return result[0];
}

// ============ CATEGORIES ============

export async function getAllCategories(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(asc(categories.name));
}

export async function createCategory(userId: number, name: string, description?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .insert(categories)
    .values({ userId, name, description })
    .$returningId();
  return result[0];
}

// ============ PRODUCTS ============

export async function getProductBranchAssignments(productId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      id: productBranchAssignments.id,
      branchId: branches.id,
      name: branches.name,
      code: branches.code,
      city: branches.city,
      state: branches.state,
    })
    .from(productBranchAssignments)
    .innerJoin(branches, eq(productBranchAssignments.branchId, branches.id))
    .where(eq(productBranchAssignments.productId, productId))
    .orderBy(asc(branches.name), asc(branches.code));
}

async function syncProductBranchAssignments(productId: number, branchIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const normalizedBranchIds = Array.from(
    new Set(branchIds.filter((branchId) => Number.isInteger(branchId) && branchId > 0))
  );

  await db.delete(productBranchAssignments).where(eq(productBranchAssignments.productId, productId));

  if (normalizedBranchIds.length === 0) {
    return;
  }

  const assignmentRows: InsertProductBranchAssignment[] = normalizedBranchIds.map((branchId) => ({
    productId,
    branchId,
  }));

  await db.insert(productBranchAssignments).values(assignmentRows);
}

async function enrichProductWithAssets(product: typeof products.$inferSelect) {
  const [images, assignedBranches] = await Promise.all([
    getProductImagesByProductId(product.id),
    getProductBranchAssignments(product.id),
  ]);

  return {
    ...product,
    primaryImageUrl: images.find((image) => image.isPrimary)?.imageUrl ?? images[0]?.imageUrl ?? null,
    assignedBranches,
    assignedBranchIds: assignedBranches.map((branch) => branch.branchId),
  };
}

export async function createProduct(data: {
  name: string;
  categoryId: number;
  brand: string;
  basePrice: string;
  sku: string;
  description?: string;
  branchIds?: number[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { branchIds = [], ...productData } = data;
  const result = await db.insert(products).values(productData).$returningId();
  const productId = result[0]?.id;

  if (!productId) {
    throw new Error("No se pudo crear el producto");
  }

  await syncProductBranchAssignments(productId, branchIds);
  return { id: productId };
}

export async function getProductById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .selectDistinct({
      id: products.id,
      name: products.name,
      categoryId: products.categoryId,
      brand: products.brand,
      basePrice: products.basePrice,
      description: products.description,
      sku: products.sku,
      isActive: products.isActive,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .innerJoin(productBranchAssignments, eq(productBranchAssignments.productId, products.id))
    .innerJoin(branches, eq(productBranchAssignments.branchId, branches.id))
    .where(and(eq(products.id, id), eq(branches.userId, userId), eq(products.isActive, true)))
    .limit(1);

  if (result.length === 0) return null;
  return await enrichProductWithAssets(result[0]);
}
export async function getAllProducts(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const productList = await db
    .selectDistinct({
      id: products.id,
      name: products.name,
      categoryId: products.categoryId,
      brand: products.brand,
      basePrice: products.basePrice,
      description: products.description,
      sku: products.sku,
      isActive: products.isActive,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .innerJoin(productBranchAssignments, eq(productBranchAssignments.productId, products.id))
    .innerJoin(branches, eq(productBranchAssignments.branchId, branches.id))
    .where(and(eq(products.isActive, true), eq(branches.userId, userId), eq(branches.isActive, true)))
    .orderBy(desc(products.createdAt));

  return await Promise.all(productList.map((product) => enrichProductWithAssets(product)));
}

export async function countProducts() {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(eq(products.isActive, true));

  return Number(result[0]?.count ?? 0);
}

export async function countProductsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(distinct ${productVariants.productId})` })
    .from(branchInventory)
    .innerJoin(productVariants, eq(branchInventory.productVariantId, productVariants.id))
    .innerJoin(branches, eq(branchInventory.branchId, branches.id))
    .where(and(eq(branches.userId, userId), eq(branches.isActive, true)));

  return Number(result[0]?.count ?? 0);
}

export async function searchProducts(userId: number, query: string) {
  const db = await getDb();
  if (!db) return [];
  const productList = await db
    .selectDistinct({
      id: products.id,
      name: products.name,
      categoryId: products.categoryId,
      brand: products.brand,
      basePrice: products.basePrice,
      description: products.description,
      sku: products.sku,
      isActive: products.isActive,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .innerJoin(productBranchAssignments, eq(productBranchAssignments.productId, products.id))
    .innerJoin(branches, eq(productBranchAssignments.branchId, branches.id))
    .where(
      and(
        eq(products.isActive, true),
        eq(branches.userId, userId),
        eq(branches.isActive, true),
        like(products.name, `%${query}%`)
      )
    )
    .orderBy(asc(products.name));

  return await Promise.all(productList.map((product) => enrichProductWithAssets(product)));
}

export async function updateProduct(
  id: number,
  userId: number,
  data: Partial<{
    name: string;
    categoryId: number;
    brand: string;
    basePrice: string;
    description: string;
    branchIds: number[];
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getProductById(id, userId);
  if (!existing) {
    throw new Error("Producto no encontrado para este suscriptor");
  }

  const { branchIds, ...productData } = data;

  if (Object.keys(productData).length > 0) {
    await db.update(products).set(productData).where(eq(products.id, id));
  }

  if (branchIds) {
    await syncProductBranchAssignments(id, branchIds);
  }
}

export async function deleteProduct(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getProductById(id, userId);
  if (!existing) {
    throw new Error("Producto no encontrado para este suscriptor");
  }

  await db
    .update(products)
    .set({ isActive: false })
    .where(eq(products.id, id));
}

export async function getProductImagesByProductId(productId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(desc(productImages.isPrimary), asc(productImages.sortOrder), asc(productImages.id));
}

export async function createProductImage(data: {
  productId: number;
  imageUrl: string;
  storageKey?: string | null;
  altText?: string | null;
  sortOrder?: number;
  isPrimary?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (data.isPrimary) {
    await db
      .update(productImages)
      .set({ isPrimary: false })
      .where(eq(productImages.productId, data.productId));
  }

  const result = await db
    .insert(productImages)
    .values({
      productId: data.productId,
      imageUrl: data.imageUrl,
      storageKey: data.storageKey ?? null,
      altText: data.altText ?? null,
      sortOrder: data.sortOrder ?? 0,
      isPrimary: data.isPrimary ?? false,
    })
    .$returningId();

  return result[0];
}

export async function deleteProductImage(imageId: number, productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(productImages).where(and(eq(productImages.id, imageId), eq(productImages.productId, productId)));
}

export async function setPrimaryProductImage(productId: number, imageId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(productImages)
    .set({ isPrimary: false })
    .where(eq(productImages.productId, productId));

  await db
    .update(productImages)
    .set({ isPrimary: true })
    .where(and(eq(productImages.id, imageId), eq(productImages.productId, productId)));
}

// ============ PRODUCT VARIANTS ============

export async function createProductVariant(data: {
  productId: number;
  size: string;
  color: string;
  stock: number;
  price: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Create the variant
  const result = await db
    .insert(productVariants)
    .values(data)
    .$returningId();
  
  const variantId = result[0].id;
  
  // Get all branches
  const allBranches = await db.select().from(branches);
  
  // Initialize inventory for this variant in all branches
  if (allBranches.length > 0) {
    const inventoryRecords = allBranches.map(branch => ({
      branchId: branch.id,
      productVariantId: variantId,
      stock: data.stock,
      minimumStock: 5,
    }));
    
    await db.insert(branchInventory).values(inventoryRecords);
  }
  
  return variantId;
}

export async function getProductVariantsByProductId(productId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Validate that the product belongs to the user
  const product = await getProductById(productId, userId);
  if (!product) return [];
  
  return await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, productId))
    .orderBy(asc(productVariants.size), asc(productVariants.color));
}

export async function getProductVariantsByProductIdAndBranch(
  productId: number,
  branchId: number,
  userId: number
) {
  const db = await getDb();
  if (!db) return [];
  
  // Validate that the product belongs to the user
  const product = await getProductById(productId, userId);
  if (!product) return [];

  return await db
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
      size: productVariants.size,
      color: productVariants.color,
      stock: branchInventory.stock,
      price: productVariants.price,
      createdAt: productVariants.createdAt,
      updatedAt: productVariants.updatedAt,
    })
    .from(branchInventory)
    .innerJoin(productVariants, eq(branchInventory.productVariantId, productVariants.id))
    .where(
      and(
        eq(productVariants.productId, productId),
        eq(branchInventory.branchId, branchId)
      )
    )
    .orderBy(asc(productVariants.size), asc(productVariants.color));
}

export async function getProductVariantById(id: number, userId?: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.id, id));
  
  if (result.length === 0) return null;
  const variant = result[0];
  
  // If userId is provided, validate that the product belongs to the user
  if (userId) {
    const product = await getProductById(variant.productId, userId);
    if (!product) return null;
  }
  
  return variant;
}

export async function updateProductVariantStock(
  id: number,
  newStock: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(productVariants)
    .set({ stock: newStock })
    .where(eq(productVariants.id, id));
}

export async function getVariantsWithLowStock(minimumThreshold: number = 5) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select({
      variant: productVariants,
      product: products,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(lte(productVariants.stock, minimumThreshold))
    .orderBy(asc(productVariants.stock));
}

// ============ SALES ============

export async function createSale(data: {
  saleNumber: string;
  userId: number;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  paymentMethod: "cash" | "card" | "transfer";
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(sales).values(data).$returningId();
  return result[0];
}

export async function getSaleById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(sales).where(eq(sales.id, id));
  return result.length > 0 ? result[0] : null;
}

export async function getSalesBetweenDates(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(sales)
    .where(
      and(
        gte(sales.createdAt, startDate),
        lte(sales.createdAt, endDate)
      )
    )
    .orderBy(desc(sales.createdAt));
}
export async function getTodaySales() {
  const db = await getDb();
  if (!db) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return await db
    .select()
    .from(sales)
    .where(
      and(
        gte(sales.createdAt, today),
        lte(sales.createdAt, tomorrow)
      )
    )
    .orderBy(desc(sales.createdAt));
}

export async function countSalesForUserSince(userId: number, since: Date) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(sales)
    .where(and(eq(sales.userId, userId), gte(sales.createdAt, since)));

  return Number(result[0]?.count ?? 0);
}

// ============ SALE DETAILS ============

export async function createSaleDetail(data: {
  saleId: number;
  productVariantId: number;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .insert(saleDetails)
    .values(data)
    .$returningId();
  return result[0];
}

export async function getSaleDetailsBySaleId(saleId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(saleDetails)
    .where(eq(saleDetails.saleId, saleId))
    .orderBy(asc(saleDetails.createdAt));
}

// ============ INVENTORY MOVEMENTS ============

export async function createInventoryMovement(data: {
  productVariantId: number;
  movementType: "sale" | "adjustment" | "return" | "purchase";
  quantity: number;
  reason?: string;
  userId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .insert(inventoryMovements)
    .values(data)
    .$returningId();
  return result[0];
}

export async function getInventoryMovementsByVariantId(variantId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(inventoryMovements)
    .where(eq(inventoryMovements.productVariantId, variantId))
    .orderBy(desc(inventoryMovements.createdAt));
}

// ============ STOCK ALERTS ============

export async function createStockAlert(data: {
  productVariantId: number;
  minimumStock: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .insert(stockAlerts)
    .values(data)
    .$returningId();
  return result[0];
}

export async function getActiveStockAlerts() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(stockAlerts)
    .where(eq(stockAlerts.isActive, true));
}

// ============ SALES ANALYTICS ============

// ============ BRANCHES / SUCURSALES ============

export async function createBranch(data: {
  userId: number;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  manager?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(branches).values(data).$returningId();
  return result[0];
}
export async function getBranchesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(branches)
    .where(and(eq(branches.userId, userId), eq(branches.isActive, true)))
    .orderBy(asc(branches.name));
}

export async function countBranchesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(branches)
    .where(and(eq(branches.userId, userId), eq(branches.isActive, true)));

  return Number(result[0]?.count ?? 0);
}

export async function getBranchById(branchId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(branches)
    .where(and(eq(branches.id, branchId), eq(branches.userId, userId)))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createBranchInventoryRecord(data: {
  branchId: number;
  productVariantId: number;
  stock?: number;
  minimumStock?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(branchInventory).values(data).$returningId();
  return result[0];
}

export async function getBranchInventory(branchId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select({
      inventory: branchInventory,
      variant: productVariants,
      product: products,
    })
    .from(branchInventory)
    .innerJoin(productVariants, eq(branchInventory.productVariantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(branchInventory.branchId, branchId))
    .orderBy(asc(products.name), asc(productVariants.size), asc(productVariants.color));
}

export async function getBranchInventoryItem(branchId: number, productVariantId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(branchInventory)
    .where(
      and(
        eq(branchInventory.branchId, branchId),
        eq(branchInventory.productVariantId, productVariantId)
      )
    )
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateBranchInventoryStock(
  branchId: number,
  productVariantId: number,
  newStock: number,
  userId: number,
  reason?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getBranchInventoryItem(branchId, productVariantId);
  if (existing) {
    const quantityChange = newStock - existing.stock;
    await db
      .update(branchInventory)
      .set({ stock: newStock, lastAdjustedAt: new Date() })
      .where(eq(branchInventory.id, existing.id));

    await db.insert(branchInventoryMovements).values({
      branchId,
      productVariantId,
      movementType: "adjustment",
      quantity: quantityChange,
      reason,
      userId,
    });

    return existing.id;
  }

  const created = await db
    .insert(branchInventory)
    .values({
      branchId,
      productVariantId,
      stock: newStock,
      lastAdjustedAt: new Date(),
    })
    .$returningId();

  await db.insert(branchInventoryMovements).values({
    branchId,
    productVariantId,
    movementType: "adjustment",
    quantity: newStock,
    reason,
    userId,
  });

  return created[0]?.id;
}

export async function createStockTransfer(data: {
  fromBranchId: number;
  toBranchId: number;
  productVariantId: number;
  quantity: number;
  reason?: string;
  initiatedByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(stockTransfers).values(data).$returningId();

  await db.insert(branchInventoryMovements).values({
    branchId: data.fromBranchId,
    productVariantId: data.productVariantId,
    movementType: "transfer_out",
    quantity: -data.quantity,
    reason: data.reason,
    relatedTransferId: result[0].id,
    userId: data.initiatedByUserId,
  });

  return result[0];
}

export async function getTransfersByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const ownedBranches = await getBranchesByUserId(userId);
  const branchIds = ownedBranches.map((branch) => branch.id);
  if (branchIds.length === 0) return [];

  return await db
    .select()
    .from(stockTransfers)
    .where(sql`${stockTransfers.fromBranchId} in (${sql.join(branchIds)}) or ${stockTransfers.toBranchId} in (${sql.join(branchIds)})`)
    .orderBy(desc(stockTransfers.createdAt));
}

export async function decrementBranchInventoryForSale(data: {
  branchId: number;
  productVariantId: number;
  quantity: number;
  userId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const currentInventory = await getBranchInventoryItem(data.branchId, data.productVariantId);
  if (!currentInventory || currentInventory.stock < data.quantity) {
    throw new Error("Insufficient branch stock");
  }

  await db
    .update(branchInventory)
    .set({
      stock: currentInventory.stock - data.quantity,
      lastAdjustedAt: new Date(),
    })
    .where(eq(branchInventory.id, currentInventory.id));

  await db.insert(branchInventoryMovements).values({
    branchId: data.branchId,
    productVariantId: data.productVariantId,
    movementType: "sale",
    quantity: -data.quantity,
    userId: data.userId,
  });

  return currentInventory.stock - data.quantity;
}

export async function receiveStockTransfer(transferId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(stockTransfers)
    .where(eq(stockTransfers.id, transferId))
    .limit(1);

  const transfer = result[0];
  if (!transfer) {
    throw new Error("Transfer not found");
  }

  const destinationInventory = await getBranchInventoryItem(
    transfer.toBranchId,
    transfer.productVariantId
  );

  if (destinationInventory) {
    await db
      .update(branchInventory)
      .set({
        stock: destinationInventory.stock + transfer.quantity,
        lastAdjustedAt: new Date(),
      })
      .where(eq(branchInventory.id, destinationInventory.id));
  } else {
    await db.insert(branchInventory).values({
      branchId: transfer.toBranchId,
      productVariantId: transfer.productVariantId,
      stock: transfer.quantity,
      lastAdjustedAt: new Date(),
    });
  }

  await db
    .update(stockTransfers)
    .set({
      status: "received",
      receivedByUserId: userId,
      receivedAt: new Date(),
    })
    .where(eq(stockTransfers.id, transferId));

  await db.insert(branchInventoryMovements).values({
    branchId: transfer.toBranchId,
    productVariantId: transfer.productVariantId,
    movementType: "transfer_in",
    quantity: transfer.quantity,
    reason: transfer.reason ?? undefined,
    relatedTransferId: transfer.id,
    userId,
  });

  return transfer;
}

// ============ SALES ANALYTICS ============

export async function getTodaysSalesStats() {
  const db = await getDb();
  if (!db) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = await db
    .select({
      totalSales: sql<number>`COUNT(${sales.id})`,
      totalRevenue: sql<string>`SUM(${sales.total})`,
      totalItems: sql<number>`SUM(${saleDetails.quantity})`,
    })
    .from(sales)
    .leftJoin(saleDetails, eq(sales.id, saleDetails.saleId))
    .where(
      and(
        gte(sales.createdAt, today),
        lte(sales.createdAt, tomorrow)
      )
    );

  return result[0] || { totalSales: 0, totalRevenue: "0", totalItems: 0 };
}

export async function getTopSellingProducts(limit: number = 5) {
  const db = await getDb();
  if (!db) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return await db
    .select({
      productName: saleDetails.productName,
      totalQuantity: sql<number>`SUM(${saleDetails.quantity})`,
      totalRevenue: sql<string>`SUM(${saleDetails.lineTotal})`,
    })
    .from(saleDetails)
    .innerJoin(sales, eq(saleDetails.saleId, sales.id))
    .where(
      and(
        gte(sales.createdAt, today),
        lte(sales.createdAt, tomorrow)
      )
    )
    .groupBy(saleDetails.productName)
    .orderBy(desc(sql<number>`SUM(${saleDetails.quantity})`))
    .limit(limit);
}

export async function generateSaleNumber(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = await db
    .select({ count: sql<number>`COUNT(${sales.id})` })
    .from(sales)
    .where(
      and(
        gte(sales.createdAt, today),
        lte(sales.createdAt, tomorrow)
      )
    );

  const count = (result[0]?.count || 0) + 1;
  const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
  return `SALE-${dateStr}-${String(count).padStart(4, "0")}`;
}

// ============ USER BRANCH ASSIGNMENTS ============

type UserBranchAssignmentRow = {
  user: typeof users.$inferSelect;
  assignment: typeof userBranchAssignments.$inferSelect | null;
  branch: typeof branches.$inferSelect | null;
};

function isManagedStaffRow(row: UserBranchAssignmentRow, ownerUserId: number) {
  return row.user.id === ownerUserId || row.branch?.userId === ownerUserId;
}

function applyEffectiveSubscription<T extends typeof users.$inferSelect>(
  user: T,
  activeLicense: ManualLicenseGrant | null,
) {
  if (!activeLicense) {
    return {
      ...user,
      effectiveSubscriptionPlan: user.subscriptionPlan,
      effectiveSubscriptionStatus: user.subscriptionStatus,
      effectiveSubscriptionStartDate: user.subscriptionStartDate,
      effectiveSubscriptionEndDate: user.subscriptionEndDate,
    };
  }

  return {
    ...user,
    subscriptionPlan: activeLicense.planCode,
    subscriptionStatus: activeLicense.status === "active" ? "active" : user.subscriptionStatus,
    subscriptionStartDate: activeLicense.validFrom,
    subscriptionEndDate: activeLicense.validUntil ?? null,
    effectiveSubscriptionPlan: activeLicense.planCode,
    effectiveSubscriptionStatus: activeLicense.status,
    effectiveSubscriptionStartDate: activeLicense.validFrom,
    effectiveSubscriptionEndDate: activeLicense.validUntil ?? null,
  };
}

export async function getUsersWithAssignedBranch() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      user: users,
      assignment: userBranchAssignments,
      branch: branches,
    })
    .from(users)
    .leftJoin(userBranchAssignments, eq(users.id, userBranchAssignments.userId))
    .leftJoin(branches, eq(userBranchAssignments.branchId, branches.id))
    .orderBy(asc(users.role), asc(users.name), asc(users.email));
}

export async function getManagedStaffUsers(ownerUserId: number) {
  const rows = await getUsersWithAssignedBranch();
  return rows.filter((row) => isManagedStaffRow(row, ownerUserId));
}

export async function getSubscriberAccessRecords(ownerUserId: number) {
  const [rows, licenses] = await Promise.all([
    getUsersWithAssignedBranch(),
    getAllManualLicenses(),
  ]);

  const latestActiveLicenseByUserId = new Map<number, ManualLicenseGrant>();
  for (const license of licenses) {
    if (license.status !== "active" || latestActiveLicenseByUserId.has(license.userId)) continue;
    latestActiveLicenseByUserId.set(license.userId, license);
  }

  return rows
    .filter((row) => !isManagedStaffRow(row, ownerUserId))
    .map((row) => {
      const activeLicense = latestActiveLicenseByUserId.get(row.user.id) ?? null;
      return {
        ...row,
        user: applyEffectiveSubscription(row.user, activeLicense),
        activeLicense,
      };
    });
}

export async function getEffectiveUserSubscription(userId: number) {
  const [user, activeLicense] = await Promise.all([
    getUserById(userId),
    getActiveLicenseForUser(userId),
  ]);

  if (!user) return null;

  return {
    user: applyEffectiveSubscription(user, activeLicense),
    activeLicense,
  };
}

export async function getUserBranchAssignment(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      assignment: userBranchAssignments,
      branch: branches,
    })
    .from(userBranchAssignments)
    .innerJoin(branches, eq(userBranchAssignments.branchId, branches.id))
    .where(eq(userBranchAssignments.userId, userId))
    .limit(1);

  return result[0] ?? null;
}

export async function assignUserToBranch(data: {
  userId: number;
  branchId: number | null;
  role?: "admin" | "cashier";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (data.role) {
    await db
      .update(users)
      .set({ role: data.role })
      .where(eq(users.id, data.userId));
  }

  if (data.branchId === null) {
    await db.delete(userBranchAssignments).where(eq(userBranchAssignments.userId, data.userId));
  } else {
    await db
      .insert(userBranchAssignments)
      .values({
        userId: data.userId,
        branchId: data.branchId,
      })
      .onDuplicateKeyUpdate({
        set: {
          branchId: data.branchId,
          updatedAt: new Date(),
        },
      });
  }

  const result = await getUsersWithAssignedBranch();
  return result.find(row => row.user.id === data.userId) ?? null;
}

export async function grantSpecialLicense(data: {
  userId: number;
  grantedByUserId: number;
  planCode: "basic" | "professional" | "premium" | "annual";
  months: number;
  mode: "eco" | "courtesy" | "manual";
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + data.months);

  await db
    .update(users)
    .set({
      role: "admin",
      subscriptionPlan: data.planCode,
      subscriptionStatus: "active",
      subscriptionStartDate: now,
      subscriptionEndDate: periodEnd,
      updatedAt: now,
    })
    .where(eq(users.id, data.userId));

  await db.insert(payments).values({
    userId: data.userId,
    amount: "0.00",
    currency: "MXN",
    status: "succeeded",
    planName: `${data.planCode.toUpperCase()} - licencia especial`,
    paymentProvider: "admin_grant",
    externalReference: `${data.mode}:${data.grantedByUserId}`,
    proofUrl: data.notes ?? null,
    billingPeriodStart: now,
    billingPeriodEnd: periodEnd,
    paidAt: now,
  });

  await db.insert(notifications).values({
    userId: data.userId,
    type: "subscription_change",
    title: "Licencia especial activada",
    message:
      data.mode === "eco"
        ? "Se activó una licencia ecológica especial en tu cuenta. Mantén vigentes las condiciones promocionales compartidas por CyberPiezas."
        : "Se activó una licencia especial en tu cuenta por autorización administrativa de CyberPiezas.",
    relatedId: data.userId,
    isRead: false,
  });

  const result = await getUsersWithAssignedBranch();
  return result.find((row) => row.user.id === data.userId) ?? null;
}


// ============ MANUAL LICENSE GRANTS ============

export async function grantManualLicense(data: InsertManualLicenseGrant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(manualLicenseGrants).values(data).$returningId();

  await db
    .update(users)
    .set({
      role: data.status === "active" ? "admin" : undefined,
      subscriptionPlan: data.planCode,
      subscriptionStatus: data.status === "active" ? "active" : "inactive",
      subscriptionStartDate: data.validFrom,
      subscriptionEndDate: data.validUntil ?? null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, data.userId));

  return result[0];
}

export async function getManualLicensesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(manualLicenseGrants)
    .where(eq(manualLicenseGrants.userId, userId))
    .orderBy(desc(manualLicenseGrants.createdAt));
}

export async function getActiveLicenseForUser(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(manualLicenseGrants)
    .where(
      and(
        eq(manualLicenseGrants.userId, userId),
        eq(manualLicenseGrants.status, "active")
      )
    )
    .orderBy(desc(manualLicenseGrants.createdAt))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateLicenseStatus(
  licenseId: number,
  newStatus: "active" | "suspended" | "revoked" | "expired",
  changedByUserId: number,
  changeReason?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const license = await db
    .select()
    .from(manualLicenseGrants)
    .where(eq(manualLicenseGrants.id, licenseId))
    .limit(1);
  if (license.length === 0) throw new Error("License not found");
  const previousStatus = license[0].status;
  await db
    .update(manualLicenseGrants)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(manualLicenseGrants.id, licenseId));

  await db
    .update(users)
    .set({
      role: newStatus === "active" ? "admin" : undefined,
      subscriptionStatus: newStatus === "active" ? "active" : newStatus === "expired" ? "inactive" : "canceled",
      subscriptionPlan: newStatus === "active" ? license[0].planCode : license[0].planCode,
      subscriptionEndDate: newStatus === "active" ? license[0].validUntil ?? null : new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, license[0].userId));
  await db.insert(licenseGrantHistory).values({
    licenseGrantId: licenseId,
    changedByUserId,
    previousStatus: previousStatus as any,
    newStatus,
    changeReason,
  });
  return license[0];
}
export async function renewManualLicense(
  licenseId: number,
  validUntil: Date,
  changedByUserId: number,
  renewalNotes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const license = await db
    .select()
    .from(manualLicenseGrants)
    .where(eq(manualLicenseGrants.id, licenseId))
    .limit(1);
  if (license.length === 0) throw new Error("License not found");

  const currentLicense = license[0];
  const previousNotes = currentLicense.notes?.trim();
  const normalizedRenewalNotes = renewalNotes?.trim();
  const mergedNotes = normalizedRenewalNotes
    ? [previousNotes, `Renovación: ${normalizedRenewalNotes}`].filter(Boolean).join("\n")
    : currentLicense.notes;

  await db
    .update(manualLicenseGrants)
    .set({
      status: "active",
      validUntil,
      notes: mergedNotes,
      updatedAt: new Date(),
    })
    .where(eq(manualLicenseGrants.id, licenseId));

  await db
    .update(users)
    .set({
      role: "admin",
      subscriptionPlan: currentLicense.planCode,
      subscriptionStatus: "active",
      subscriptionStartDate: currentLicense.validFrom,
      subscriptionEndDate: validUntil,
      updatedAt: new Date(),
    })
    .where(eq(users.id, currentLicense.userId));

  await db.insert(licenseGrantHistory).values({
    licenseGrantId: licenseId,
    changedByUserId,
    previousStatus: currentLicense.status as any,
    newStatus: "active",
    changeReason: normalizedRenewalNotes
      ? `Licencia renovada manualmente. ${normalizedRenewalNotes}`
      : "Licencia renovada manualmente",
  });

  return currentLicense;
}
export async function getAllManualLicenses() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(manualLicenseGrants)
    .orderBy(desc(manualLicenseGrants.createdAt));
}

export async function getLicenseGrantHistory(licenseId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(licenseGrantHistory)
    .where(eq(licenseGrantHistory.licenseGrantId, licenseId))
    .orderBy(desc(licenseGrantHistory.createdAt));
}

// ============ FEATURE REQUESTS ============

export async function createFeatureRequest(data: {
  userId: number;
  title: string;
  description: string;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(featureRequests).values({
    userId: data.userId,
    title: data.title,
    description: data.description,
    status: "pending",
  });

  // Get the created record
  const created = await db
    .select()
    .from(featureRequests)
    .where(eq(featureRequests.userId, data.userId))
    .orderBy(desc(featureRequests.createdAt))
    .limit(1);

  return created[0];
}

export async function getFeatureRequestsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(featureRequests)
    .where(eq(featureRequests.userId, userId))
    .orderBy(desc(featureRequests.createdAt));
}

export async function getAllFeatureRequests() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      request: featureRequests,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(featureRequests)
    .leftJoin(users, eq(featureRequests.userId, users.id))
    .orderBy(desc(featureRequests.createdAt));
}

export async function updateFeatureRequestStatus(
  id: number,
  status: "pending" | "under_review" | "approved" | "implemented" | "rejected",
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(featureRequests)
    .set({ status })
    .where(eq(featureRequests.id, id));

  const result = await db
    .select()
    .from(featureRequests)
    .where(eq(featureRequests.id, id))
    .limit(1);

  return result[0];
}


// ============================================================================
// FREE TRIAL HELPERS
// ============================================================================

export async function createFreeTrialLog(data: InsertFreeTrialLog): Promise<FreeTrialLog> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(freeTrialLogs).values(data);
  const id = result[0].insertId;

  const trial = await db
    .select()
    .from(freeTrialLogs)
    .where(eq(freeTrialLogs.id, id as number))
    .limit(1);

  return trial[0];
}

export async function getFreeTrialLogByUserId(userId: number): Promise<FreeTrialLog | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(freeTrialLogs)
    .where(eq(freeTrialLogs.userId, userId))
    .limit(1);

  return result[0];
}

export async function updateFreeTrialLog(
  userId: number,
  updates: Partial<FreeTrialLog>
): Promise<FreeTrialLog | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(freeTrialLogs)
    .set(updates)
    .where(eq(freeTrialLogs.userId, userId));

  return getFreeTrialLogByUserId(userId);
}

// ============================================================================
// REFERRAL CODE HELPERS
// ============================================================================

export async function createReferralCode(data: InsertReferralCode): Promise<ReferralCode> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(referralCodes).values(data);
  const id = result[0].insertId;

  const code = await db
    .select()
    .from(referralCodes)
    .where(eq(referralCodes.id, id as number))
    .limit(1);

  return code[0];
}

export async function getReferralCodeByCode(code: string): Promise<ReferralCode | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(referralCodes)
    .where(eq(referralCodes.referralCode, code))
    .limit(1);

  return result[0];
}

export async function getReferralCodesByReferrerId(referrerId: number): Promise<ReferralCode[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(referralCodes)
    .where(eq(referralCodes.referrerId, referrerId));
}

export async function updateReferralCode(
  codeId: number,
  updates: Partial<ReferralCode>
): Promise<ReferralCode | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(referralCodes)
    .set(updates)
    .where(eq(referralCodes.id, codeId));

  const result = await db
    .select()
    .from(referralCodes)
    .where(eq(referralCodes.id, codeId))
    .limit(1);

  return result[0];
}

// ============================================================================
// REFERRAL TRACKING HELPERS
// ============================================================================

export async function createReferralTracking(
  data: InsertReferralTracking
): Promise<ReferralTracking> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(referralTracking).values(data);
  const id = result[0].insertId;

  const tracking = await db
    .select()
    .from(referralTracking)
    .where(eq(referralTracking.id, id as number))
    .limit(1);

  return tracking[0];
}

export async function getReferralTrackingByReferrerId(referrerId: number): Promise<ReferralTracking[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(referralTracking)
    .where(eq(referralTracking.referrerId, referrerId));
}

export async function getReferralTrackingByCode(code: string): Promise<ReferralTracking[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(referralTracking)
    .where(eq(referralTracking.referralCode, code));
}

export async function updateReferralTracking(
  trackingId: number,
  updates: Partial<ReferralTracking>
): Promise<ReferralTracking | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(referralTracking)
    .set(updates)
    .where(eq(referralTracking.id, trackingId));

  const result = await db
    .select()
    .from(referralTracking)
    .where(eq(referralTracking.id, trackingId))
    .limit(1);

  return result[0];
}

export async function countSuccessfulReferrals(referrerId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(referralTracking)
    .where(
      and(
        eq(referralTracking.referrerId, referrerId),
        eq(referralTracking.status, "completed")
      )
    );

  return result[0]?.count || 0;
}


// ============================================================================
// PROGRAM ACCESS HELPERS
// ============================================================================

export async function getProgramAccessByUserId(userId: number): Promise<UserProgramAccess[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(userProgramAccess)
    .where(eq(userProgramAccess.userId, userId));
}

export async function getActiveProgramAccessByUserId(userId: number): Promise<UserProgramAccess[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(userProgramAccess)
    .where(
      and(
        eq(userProgramAccess.userId, userId),
        eq(userProgramAccess.status, "active"),
      ),
    );
}

export async function getProgramAccessEntry(
  userId: number,
  programCode: "boutique" | "abarrotes" | "celine",
): Promise<UserProgramAccess | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(userProgramAccess)
    .where(and(eq(userProgramAccess.userId, userId), eq(userProgramAccess.programCode, programCode)))
    .limit(1);

  return result[0];
}

export async function upsertProgramAccess(data: InsertUserProgramAccess): Promise<UserProgramAccess | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  await db
    .insert(userProgramAccess)
    .values(data)
    .onDuplicateKeyUpdate({
      set: {
        status: data.status ?? "active",
        accessSource: data.accessSource ?? "subscription",
        startsAt: data.startsAt ?? new Date(),
        endsAt: data.endsAt ?? null,
        grantedByUserId: data.grantedByUserId ?? null,
        notes: data.notes ?? null,
        updatedAt: new Date(),
      },
    });

  return getProgramAccessEntry(
    data.userId,
    data.programCode as "boutique" | "abarrotes" | "celine",
  );
}

export async function userHasProgramAccess(
  userId: number,
  programCode: "boutique" | "abarrotes" | "celine",
): Promise<boolean> {
  const entry = await getProgramAccessEntry(userId, programCode);
  if (!entry) return false;
  if (entry.status !== "active") return false;
  if (!entry.endsAt) return true;
  return new Date(entry.endsAt).getTime() >= Date.now();
}

// ============ CASH MOVEMENTS & SALE RETURNS ============

export async function createCashMovement(data: InsertCashMovement) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(cashMovements).values(data).$returningId();
  return result[0];
}

export async function listCashMovementsByBranchIds(branchIds: number[], limit: number = 50) {
  const db = await getDb();
  if (!db || branchIds.length === 0) return [] as CashMovement[];

  return await db
    .select()
    .from(cashMovements)
    .where(inArray(cashMovements.branchId, branchIds))
    .orderBy(desc(cashMovements.createdAt))
    .limit(limit);
}

export async function generateReturnNumber(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = await db
    .select({ count: sql<number>`COUNT(${saleReturns.id})` })
    .from(saleReturns)
    .where(and(gte(saleReturns.createdAt, today), lte(saleReturns.createdAt, tomorrow)));

  const count = (result[0]?.count || 0) + 1;
  const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
  return `RETURN-${dateStr}-${String(count).padStart(4, "0")}`;
}

export async function createSaleReturn(data: InsertSaleReturn) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(saleReturns).values(data).$returningId();
  return result[0];
}

export async function createSaleReturnDetail(data: InsertSaleReturnDetail) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(saleReturnDetails).values(data).$returningId();
  return result[0];
}

export async function getSaleReturnsBySaleId(saleId: number) {
  const db = await getDb();
  if (!db) return [] as SaleReturn[];
  return await db
    .select()
    .from(saleReturns)
    .where(eq(saleReturns.saleId, saleId))
    .orderBy(desc(saleReturns.createdAt));
}

export async function getSaleReturnDetailsByReturnId(saleReturnId: number) {
  const db = await getDb();
  if (!db) return [] as SaleReturnDetail[];
  return await db
    .select()
    .from(saleReturnDetails)
    .where(eq(saleReturnDetails.saleReturnId, saleReturnId))
    .orderBy(asc(saleReturnDetails.createdAt));
}

export async function incrementBranchInventoryForReturn(data: {
  branchId: number;
  productVariantId: number;
  quantity: number;
  userId: number;
  reason?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const currentInventory = await getBranchInventoryItem(data.branchId, data.productVariantId);
  if (currentInventory) {
    await db
      .update(branchInventory)
      .set({
        stock: currentInventory.stock + data.quantity,
        lastAdjustedAt: new Date(),
      })
      .where(eq(branchInventory.id, currentInventory.id));
  } else {
    await db.insert(branchInventory).values({
      branchId: data.branchId,
      productVariantId: data.productVariantId,
      stock: data.quantity,
      lastAdjustedAt: new Date(),
    });
  }

  await db.insert(branchInventoryMovements).values({
    branchId: data.branchId,
    productVariantId: data.productVariantId,
    movementType: "return",
    quantity: data.quantity,
    reason: data.reason,
    userId: data.userId,
  });
}

export async function incrementProductVariantStockForReturn(data: {
  productVariantId: number;
  quantity: number;
  userId: number;
  reason?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const variant = await getProductVariantById(data.productVariantId);
  if (!variant) {
    throw new Error("Product variant not found");
  }

  await db
    .update(productVariants)
    .set({ stock: variant.stock + data.quantity })
    .where(eq(productVariants.id, data.productVariantId));

  await db.insert(inventoryMovements).values({
    productVariantId: data.productVariantId,
    movementType: "return",
    quantity: data.quantity,
    reason: data.reason,
    userId: data.userId,
  });
}

// ============================================================================
// LOCAL AUTH - Email/Password users
// ============================================================================

export async function getLocalUserByEmail(email: string): Promise<LocalUser | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(localUsers)
    .where(eq(localUsers.email, email.toLowerCase().trim()))
    .limit(1);
  return result[0] ?? null;
}

export async function getLocalUserById(id: number): Promise<LocalUser | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(localUsers)
    .where(eq(localUsers.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createLocalUser(data: {
  email: string;
  passwordHash: string;
  name: string;
  businessName?: string;
}): Promise<LocalUser> {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");

  const [result] = await db.insert(localUsers).values({
    email: data.email.toLowerCase().trim(),
    passwordHash: data.passwordHash,
    name: data.name.trim(),
    businessName: data.businessName?.trim() ?? null,
    plan: "basic",
    status: "active",
    isVerified: false,
  } as InsertLocalUser);

  const created = await db
    .select()
    .from(localUsers)
    .where(eq(localUsers.id, (result as any).insertId))
    .limit(1);

  if (!created[0]) throw new Error("Error al crear el usuario");
  return created[0];
}

export async function updateLocalUserLastLogin(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(localUsers)
    .set({ lastLogin: new Date() })
    .where(eq(localUsers.id, id));
}
