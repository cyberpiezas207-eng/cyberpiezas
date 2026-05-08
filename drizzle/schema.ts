import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  datetime,
  json,
  unique,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with role field for admin/cashier differentiation.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "cashier"]).default("cashier").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }).unique(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }).unique(),
  subscriptionPlan: mysqlEnum("subscriptionPlan", ["free", "basic", "professional", "premium", "annual"]).default("free").notNull(),
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["inactive", "pending_review", "active", "canceled", "past_due", "unpaid", "trialing", "rejected"]).default("inactive"),
  subscriptionStartDate: timestamp("subscriptionStartDate"),
  subscriptionEndDate: timestamp("subscriptionEndDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  termsAcceptedAt: timestamp("termsAcceptedAt"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Access log for authentication and session audit trail.
 */
export const userAccessLogs = mysqlTable("userAccessLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  openId: varchar("openId", { length: 64 }).notNull(),
  eventType: mysqlEnum("eventType", ["login", "logout", "session_refresh", "failed_login"]).default("login").notNull(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserAccessLog = typeof userAccessLogs.$inferSelect;
export type InsertUserAccessLog = typeof userAccessLogs.$inferInsert;

/**
 * Administrative branding settings for the POS interface.
 * Keeps the app title and optional banner managed by the owner.
 */
export const systemBrandingSettings = mysqlTable("systemBrandingSettings", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("ownerUserId").notNull().references(() => users.id),
  appTitle: varchar("appTitle", { length: 120 }).notNull().default("Boutique POS"),
  appSubtitle: varchar("appSubtitle", { length: 180 }).default("Centro de operación"),
  bannerImageUrl: varchar("bannerImageUrl", { length: 1000 }),
  bannerStorageKey: varchar("bannerStorageKey", { length: 255 }),
  bannerAltText: varchar("bannerAltText", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemBrandingSettings = typeof systemBrandingSettings.$inferSelect;
export type InsertSystemBrandingSettings = typeof systemBrandingSettings.$inferInsert;

/**
 * Product categories for organizing fashion items
 * Isolated by userId for multi-tenant support
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  userCategoryUnique: unique("user_category_unique").on(table.userId, table.name),
}));

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Main products table with fashion-specific attributes
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  categoryId: int("categoryId").notNull(),
  brand: varchar("brand", { length: 100 }).notNull(),
  basePrice: decimal("basePrice", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  sku: varchar("sku", { length: 100 }).notNull().unique(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Product image gallery with support for multiple photos and a primary cover image.
 */
export const productImages = mysqlTable(
  "productImages",
  {
    id: int("id").autoincrement().primaryKey(),
    productId: int("productId").notNull().references(() => products.id),
    imageUrl: varchar("imageUrl", { length: 1000 }).notNull(),
    storageKey: varchar("storageKey", { length: 255 }),
    altText: varchar("altText", { length: 255 }),
    sortOrder: int("sortOrder").default(0).notNull(),
    isPrimary: boolean("isPrimary").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    uniquePrimaryPerPosition: unique("product_images_product_sort_unique").on(
      table.productId,
      table.sortOrder,
    ),
  }),
);

export type ProductImage = typeof productImages.$inferSelect;
export type InsertProductImage = typeof productImages.$inferInsert;

/**
 * Product variants: specific combinations of size and color
 * Each variant tracks its own stock
 */
export const productVariants = mysqlTable("productVariants", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  size: varchar("size", { length: 50 }).notNull(), // XS, S, M, L, XL, etc.
  color: varchar("color", { length: 100 }).notNull(), // Negro, Blanco, etc.
  stock: int("stock").default(0).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Can differ from base price
  imageUrl: varchar("imageUrl", { length: 1000 }),
  sku: varchar("sku", { length: 100 }),
  barcode: varchar("barcode", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductVariant = typeof productVariants.$inferSelect;
export type InsertProductVariant = typeof productVariants.$inferInsert;

/**
 * Sales transactions
 */
export const sales = mysqlTable("sales", {
  id: int("id").autoincrement().primaryKey(),
  saleNumber: varchar("saleNumber", { length: 50 }).notNull().unique(),
  userId: int("userId").notNull(), // Cashier who made the sale
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0").notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "card", "transfer"]).default("cash").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;

/**
 * Sale details: individual items in each sale
 */
export const saleDetails = mysqlTable("saleDetails", {
  id: int("id").autoincrement().primaryKey(),
  saleId: int("saleId").notNull(),
  productVariantId: int("productVariantId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  size: varchar("size", { length: 50 }).notNull(),
  color: varchar("color", { length: 100 }).notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  lineTotal: decimal("lineTotal", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SaleDetail = typeof saleDetails.$inferSelect;
export type InsertSaleDetail = typeof saleDetails.$inferInsert;

/**
 * Inventory movements for tracking stock changes
 */
export const inventoryMovements = mysqlTable("inventoryMovements", {
  id: int("id").autoincrement().primaryKey(),
  productVariantId: int("productVariantId").notNull(),
  movementType: mysqlEnum("movementType", ["sale", "adjustment", "return", "purchase"]).notNull(),
  quantity: int("quantity").notNull(), // Positive for additions, negative for removals
  reason: text("reason"),
  userId: int("userId").notNull(), // User who made the movement
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = typeof inventoryMovements.$inferInsert;

/**
 * Low stock alerts configuration
 */
export const stockAlerts = mysqlTable("stockAlerts", {
  id: int("id").autoincrement().primaryKey(),
  productVariantId: int("productVariantId").notNull(),
  minimumStock: int("minimumStock").default(5).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StockAlert = typeof stockAlerts.$inferSelect;
export type InsertStockAlert = typeof stockAlerts.$inferInsert;


/**
 * Subscription plans with pricing and limits
 */
export const subscriptionPlans = mysqlTable("subscriptionPlans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: text("description"),
  stripePriceId: varchar("stripePriceId", { length: 255 }).notNull().unique(),
  monthlyPrice: decimal("monthlyPrice", { precision: 10, scale: 2 }).notNull(),
  maxProducts: int("maxProducts").notNull(),
  maxUsers: int("maxUsers").notNull(),
  maxTransactionsPerMonth: int("maxTransactionsPerMonth"),
  storageGbLimit: int("storageGbLimit"),
  features: json("features"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

/**
 * Payment history and invoices
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  stripeInvoiceId: varchar("stripeInvoiceId", { length: 255 }).unique(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }).unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("MXN"),
  status: mysqlEnum("status", ["pending", "succeeded", "failed", "canceled"]).notNull(),
  planName: varchar("planName", { length: 50 }),
  paymentProvider: varchar("paymentProvider", { length: 30 }).default("manual_transfer"),
  externalReference: varchar("externalReference", { length: 255 }),
  proofUrl: text("proofUrl"),
  billingPeriodStart: timestamp("billingPeriodStart"),
  billingPeriodEnd: timestamp("billingPeriodEnd"),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Manual transfer requests for subscription activation and lifetime licenses
 */
export const transferPaymentRequests = mysqlTable("transferPaymentRequests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  planCode: mysqlEnum("planCode", ["free", "basic", "professional", "premium", "annual"]).notNull(),
  planName: varchar("planName", { length: 50 }).notNull(),
  billingType: mysqlEnum("billingType", ["monthly", "annual"]).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("MXN").notNull(),
  payerName: varchar("payerName", { length: 150 }).notNull(),
  transferReference: varchar("transferReference", { length: 120 }).notNull(),
  proofUrl: text("proofUrl"),
  notes: text("notes"),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "canceled"]).default("pending").notNull(),
  reviewedByUserId: int("reviewedByUserId"),
  reviewedAt: timestamp("reviewedAt"),
  activatedAt: timestamp("activatedAt"),
  periodStart: timestamp("periodStart"),
  periodEnd: timestamp("periodEnd"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TransferPaymentRequest = typeof transferPaymentRequests.$inferSelect;
export type InsertTransferPaymentRequest = typeof transferPaymentRequests.$inferInsert;

/**
 * Notifications system
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  type: mysqlEnum("type", [
    "sale",
    "low_stock",
    "payment_received",
    "subscription_change",
    "system",
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedId: int("relatedId"), // ID of related entity (sale, product, etc.)
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  readAt: timestamp("readAt"),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Notification preferences
 */
export const notificationPreferences = mysqlTable("notificationPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id),
  emailOnSale: boolean("emailOnSale").default(true),
  emailOnLowStock: boolean("emailOnLowStock").default(true),
  emailOnPayment: boolean("emailOnPayment").default(true),
  emailOnSubscriptionChange: boolean("emailOnSubscriptionChange").default(true),
  pushOnSale: boolean("pushOnSale").default(true),
  pushOnLowStock: boolean("pushOnLowStock").default(true),
  pushOnPayment: boolean("pushOnPayment").default(true),
  pushOnSubscriptionChange: boolean("pushOnSubscriptionChange").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

/**
 * Branches/Sucursales for multi-location support
 * Each subscription plan allows a certain number of branches
 */
export const branches = mysqlTable("branches", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  name: varchar("name", { length: 150 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  zipCode: varchar("zipCode", { length: 20 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  manager: varchar("manager", { length: 150 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Branch = typeof branches.$inferSelect;
export type InsertBranch = typeof branches.$inferInsert;

/**
 * One active branch assignment per user.
 * Cashiers operate only in their assigned branch.
 */
export const userBranchAssignments = mysqlTable(
  "userBranchAssignments",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id),
    branchId: int("branchId").notNull().references(() => branches.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    uniqueUserAssignment: unique("user_branch_assignment_user_unique").on(table.userId),
  })
);

export type UserBranchAssignment = typeof userBranchAssignments.$inferSelect;
export type InsertUserBranchAssignment = typeof userBranchAssignments.$inferInsert;

/**
 * Product availability per branch.
 * Lets the business decide which branches can operate a product from the catalog.
 */
export const productBranchAssignments = mysqlTable(
  "productBranchAssignments",
  {
    id: int("id").autoincrement().primaryKey(),
    productId: int("productId").notNull().references(() => products.id),
    branchId: int("branchId").notNull().references(() => branches.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    uniqueProductBranchAssignment: unique("product_branch_assignment_unique").on(table.productId, table.branchId),
  })
);

export type ProductBranchAssignment = typeof productBranchAssignments.$inferSelect;
export type InsertProductBranchAssignment = typeof productBranchAssignments.$inferInsert;

/**
 * Branch inventory: stock levels per product variant per branch
 * Replaces the global stock model with branch-specific inventory
 */
export const branchInventory = mysqlTable("branchInventory", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull().references(() => branches.id),
  productVariantId: int("productVariantId").notNull().references(() => productVariants.id),
  stock: int("stock").default(0).notNull(),
  minimumStock: int("minimumStock").default(5).notNull(),
  lastAdjustedAt: timestamp("lastAdjustedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BranchInventory = typeof branchInventory.$inferSelect;
export type InsertBranchInventory = typeof branchInventory.$inferInsert;

/**
 * Stock transfers between branches
 * Tracks inter-branch inventory movements
 */
export const stockTransfers = mysqlTable("stockTransfers", {
  id: int("id").autoincrement().primaryKey(),
  fromBranchId: int("fromBranchId").notNull().references(() => branches.id),
  toBranchId: int("toBranchId").notNull().references(() => branches.id),
  productVariantId: int("productVariantId").notNull().references(() => productVariants.id),
  quantity: int("quantity").notNull(),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "in_transit", "received", "canceled"]).default("pending").notNull(),
  initiatedByUserId: int("initiatedByUserId").notNull().references(() => users.id),
  receivedByUserId: int("receivedByUserId").references(() => users.id),
  initiatedAt: timestamp("initiatedAt").defaultNow().notNull(),
  receivedAt: timestamp("receivedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StockTransfer = typeof stockTransfers.$inferSelect;
export type InsertStockTransfer = typeof stockTransfers.$inferInsert;

/**
 * Branch-specific inventory movements
 * Tracks all stock changes at branch level (sales, adjustments, transfers, etc.)
 */
export const branchInventoryMovements = mysqlTable("branchInventoryMovements", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull().references(() => branches.id),
  productVariantId: int("productVariantId").notNull().references(() => productVariants.id),
  movementType: mysqlEnum("movementType", ["sale", "adjustment", "return", "purchase", "transfer_out", "transfer_in"]).notNull(),
  quantity: int("quantity").notNull(), // Positive for additions, negative for removals
  reason: text("reason"),
  relatedTransferId: int("relatedTransferId").references(() => stockTransfers.id),
  userId: int("userId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BranchInventoryMovement = typeof branchInventoryMovements.$inferSelect;
export type InsertBranchInventoryMovement = typeof branchInventoryMovements.$inferInsert;

/**
 * Sales with branch association
 * Updated to include branchId for multi-location tracking
 */
export const branchSales = mysqlTable("branchSales", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull().references(() => branches.id),
  saleNumber: varchar("saleNumber", { length: 50 }).notNull(),
  userId: int("userId").notNull().references(() => users.id),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0").notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "card", "transfer"]).default("cash").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BranchSale = typeof branchSales.$inferSelect;
export type InsertBranchSale = typeof branchSales.$inferInsert;

/**
 * Manual license grants by administrator
 * Allows admin to grant, suspend, or revoke licenses to users
 */
export const manualLicenseGrants = mysqlTable("manualLicenseGrants", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  grantedByUserId: int("grantedByUserId").notNull().references(() => users.id),
  planCode: mysqlEnum("planCode", ["free", "basic", "professional", "premium", "annual"]).notNull(),
  licenseType: mysqlEnum("licenseType", ["free_special", "promotional", "trial", "manual_grant"]).default("manual_grant").notNull(),
  status: mysqlEnum("status", ["active", "suspended", "revoked", "expired"]).default("active").notNull(),
  reason: text("reason"),
  validFrom: timestamp("validFrom").notNull(),
  validUntil: timestamp("validUntil"),
  requiresYouTube: boolean("requiresYouTube").default(false),
  requiresFacebook: boolean("requiresFacebook").default(false),
  youtubeVerified: boolean("youtubeVerified").default(false),
  facebookVerified: boolean("facebookVerified").default(false),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ManualLicenseGrant = typeof manualLicenseGrants.$inferSelect;
export type InsertManualLicenseGrant = typeof manualLicenseGrants.$inferInsert;

/**
 * Subscriber requests for business subdomains handled manually by the owner.
 */
export const subdomainRequests = mysqlTable("subdomainRequests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  businessName: varchar("businessName", { length: 160 }).notNull(),
  requestedSubdomain: varchar("requestedSubdomain", { length: 120 }).notNull(),
  contactWhatsApp: varchar("contactWhatsApp", { length: 40 }),
  notes: text("notes"),
  status: mysqlEnum("status", ["pending", "quoted", "approved", "assigned", "rejected", "canceled"]).default("pending").notNull(),
  availabilityStatus: mysqlEnum("availabilityStatus", ["unchecked", "available", "unavailable", "reserved"]).default("unchecked").notNull(),
  quotedPrice: decimal("quotedPrice", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("MXN").notNull(),
  assignedSubdomain: varchar("assignedSubdomain", { length: 160 }),
  adminNotes: text("adminNotes"),
  reviewedByUserId: int("reviewedByUserId").references(() => users.id),
  reviewedAt: timestamp("reviewedAt"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SubdomainRequest = typeof subdomainRequests.$inferSelect;
export type InsertSubdomainRequest = typeof subdomainRequests.$inferInsert;

/**
 * License grant history for audit trail
 */
export const licenseGrantHistory = mysqlTable("licenseGrantHistory", {
  id: int("id").autoincrement().primaryKey(),
  licenseGrantId: int("licenseGrantId").notNull().references(() => manualLicenseGrants.id),
  changedByUserId: int("changedByUserId").notNull().references(() => users.id),
  previousStatus: mysqlEnum("previousStatus", ["active", "suspended", "revoked", "expired"]),
  newStatus: mysqlEnum("newStatus", ["active", "suspended", "revoked", "expired"]).notNull(),
  changeReason: text("changeReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LicenseGrantHistory = typeof licenseGrantHistory.$inferSelect;
export type InsertLicenseGrantHistory = typeof licenseGrantHistory.$inferInsert;


/**
 * Feature requests and ideas from subscribers
 */
export const featureRequests = mysqlTable("featureRequests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  status: mysqlEnum("status", ["pending", "under_review", "approved", "implemented", "rejected"]).default("pending").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium"),
  category: varchar("category", { length: 50 }),
  reviewedByUserId: int("reviewedByUserId").references(() => users.id),
  reviewedAt: timestamp("reviewedAt"),
  reviewNotes: text("reviewNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FeatureRequest = typeof featureRequests.$inferSelect;
export type InsertFeatureRequest = typeof featureRequests.$inferInsert;


/**
 * Abuse detection log for tracking suspicious activities
 */
export const abuseLog = mysqlTable("abuseLog", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  attemptType: mysqlEnum("attemptType", ["create_account", "edit_product", "access_restricted", "unauthorized_action"]).notNull(),
  description: text("description").notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  severity: mysqlEnum("severity", ["low", "medium", "high"]).default("medium").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  reviewed: boolean("reviewed").default(false).notNull(),
  notes: text("notes"),
});

export type AbuseLogEntry = typeof abuseLog.$inferSelect;
export type InsertAbuseLogEntry = typeof abuseLog.$inferInsert;


/**
 * Free trial tracking for 30-day free trial period
 */
export const freeTrialLogs = mysqlTable("freeTrialLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id),
  planCode: mysqlEnum("planCode", ["basic", "professional", "premium"]).notNull(),
  trialStartDate: timestamp("trialStartDate").defaultNow().notNull(),
  trialEndDate: timestamp("trialEndDate").notNull(),
  reminderSentAt: timestamp("reminderSentAt"),
  reminderResponse: mysqlEnum("reminderResponse", ["pending", "will_pay", "continue_free", "no_response"]).default("pending"),
  convertedToPaid: boolean("convertedToPaid").default(false),
  convertedAt: timestamp("convertedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FreeTrialLog = typeof freeTrialLogs.$inferSelect;
export type InsertFreeTrialLog = typeof freeTrialLogs.$inferInsert;

/**
 * Referral system for automatic free month to referrer
 */
export const referralCodes = mysqlTable("referralCodes", {
  id: int("id").autoincrement().primaryKey(),
  referrerId: int("referrerId").notNull().references(() => users.id),
  referralCode: varchar("referralCode", { length: 20 }).notNull().unique(),
  isActive: boolean("isActive").default(true).notNull(),
  freeMonthGranted: boolean("freeMonthGranted").default(false).notNull(),
  freeMonthGrantedAt: timestamp("freeMonthGrantedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReferralCode = typeof referralCodes.$inferSelect;
export type InsertReferralCode = typeof referralCodes.$inferInsert;

/**
 * Referral tracking - when a user signs up using a referral code
 */
export const referralTracking = mysqlTable("referralTracking", {
  id: int("id").autoincrement().primaryKey(),
  referrerId: int("referrerId").notNull().references(() => users.id),
  referredUserId: int("referredUserId").notNull().references(() => users.id),
  referralCode: varchar("referralCode", { length: 20 }).notNull(),
  planCode: mysqlEnum("planCode", ["basic", "professional", "premium"]).notNull(),
  status: mysqlEnum("status", ["pending", "active", "completed"]).default("pending").notNull(),
  freeMonthAppliedAt: timestamp("freeMonthAppliedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReferralTracking = typeof referralTracking.$inferSelect;
export type InsertReferralTracking = typeof referralTracking.$inferInsert;


/**
 * Per-program access control so each subscriber only sees and uses contracted systems.
 */
export const userProgramAccess = mysqlTable(
  "userProgramAccess",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id),
    programCode: mysqlEnum("programCode", ["boutique", "abarrotes", "celine"]).notNull(),
    status: mysqlEnum("status", ["active", "pending", "inactive", "suspended", "expired"]).default("active").notNull(),
    accessSource: mysqlEnum("accessSource", ["subscription", "manual_license", "trial", "referral", "admin_override"]).default("subscription").notNull(),
    startsAt: timestamp("startsAt").defaultNow().notNull(),
    endsAt: timestamp("endsAt"),
    grantedByUserId: int("grantedByUserId").references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userProgramUnique: unique("user_program_unique").on(table.userId, table.programCode),
  }),
);

export type UserProgramAccess = typeof userProgramAccess.$inferSelect;
export type InsertUserProgramAccess = typeof userProgramAccess.$inferInsert;

/**
 * Cash movements for entries and exits by branch.
 * Keeps an auditable record of caja operations outside normal sales.
 */
export const cashMovements = mysqlTable("cashMovements", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").references(() => branches.id),
  userId: int("userId").notNull().references(() => users.id),
  movementType: mysqlEnum("movementType", ["entry", "exit"]).notNull(),
  category: varchar("category", { length: 100 }).default("general").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  notes: text("notes"),
  relatedSaleId: int("relatedSaleId").references(() => sales.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CashMovement = typeof cashMovements.$inferSelect;
export type InsertCashMovement = typeof cashMovements.$inferInsert;

/**
 * Sale returns with optional branch association.
 * Allows Boutique POS to register devoluciones without losing the original sale trace.
 */
export const saleReturns = mysqlTable("saleReturns", {
  id: int("id").autoincrement().primaryKey(),
  saleId: int("saleId").notNull().references(() => sales.id),
  branchId: int("branchId").references(() => branches.id),
  userId: int("userId").notNull().references(() => users.id),
  returnNumber: varchar("returnNumber", { length: 50 }).notNull().unique(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SaleReturn = typeof saleReturns.$inferSelect;
export type InsertSaleReturn = typeof saleReturns.$inferInsert;

/**
 * Individual items returned from a sale.
 */
export const saleReturnDetails = mysqlTable("saleReturnDetails", {
  id: int("id").autoincrement().primaryKey(),
  saleReturnId: int("saleReturnId").notNull().references(() => saleReturns.id),
  saleDetailId: int("saleDetailId").notNull().references(() => saleDetails.id),
  productVariantId: int("productVariantId").notNull().references(() => productVariants.id),
  productName: varchar("productName", { length: 255 }).notNull(),
  size: varchar("size", { length: 50 }).notNull(),
  color: varchar("color", { length: 100 }).notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  lineTotal: decimal("lineTotal", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SaleReturnDetail = typeof saleReturnDetails.$inferSelect;
export type InsertSaleReturnDetail = typeof saleReturnDetails.$inferInsert;

/**
 * Subscribers table for managing customer subscriptions
 * Tracks all subscribers who have registered for Cyberpiezas services
 */
export const subscribers = mysqlTable("subscribers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull(),
  businessName: varchar("businessName", { length: 255 }),
  plan: mysqlEnum("plan", ["basic", "professional", "permanent"]).default("basic").notNull(),
  status: mysqlEnum("status", ["pending_payment", "active", "suspended", "canceled"]).default("pending_payment").notNull(),
  registrationDate: timestamp("registrationDate").defaultNow().notNull(),
  paymentDate: timestamp("paymentDate"),
  expirationDate: timestamp("expirationDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscriber = typeof subscribers.$inferSelect;
export type InsertSubscriber = typeof subscribers.$inferInsert;

/**
 * Subscriber payments table for tracking payment history
 * Records all payments made by subscribers
 */
export const subscriberPayments = mysqlTable("subscriberPayments", {
  id: int("id").autoincrement().primaryKey(),
  subscriberId: int("subscriberId").notNull().references(() => subscribers.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  plan: mysqlEnum("plan", ["basic", "professional", "permanent"]).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["transfer", "card", "other"]).default("transfer").notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed", "refunded"]).default("pending").notNull(),
  transactionId: varchar("transactionId", { length: 255 }).unique(),
  notes: text("notes"),
  paymentDate: timestamp("paymentDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SubscriberPayment = typeof subscriberPayments.$inferSelect;
export type InsertSubscriberPayment = typeof subscriberPayments.$inferInsert;

/**
 * Local users table for Cyberpiezas authentication
 * Stores email/password credentials for users who register directly in Cyberpiezas
 * Separate from OAuth users to maintain independence from Manus
 */
export const localUsers = mysqlTable(
  "localUsers",
  {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    businessName: varchar("businessName", { length: 255 }),
    plan: mysqlEnum("plan", ["basic", "professional"]).default("basic").notNull(),
    status: mysqlEnum("status", ["active", "suspended", "canceled"]).default("active").notNull(),
    isVerified: boolean("isVerified").default(false).notNull(),
    verificationToken: varchar("verificationToken", { length: 255 }),
    lastLogin: timestamp("lastLogin"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    emailUnique: unique("local_users_email_unique").on(table.email),
  }),
);

export type LocalUser = typeof localUsers.$inferSelect;
export type InsertLocalUser = typeof localUsers.$inferInsert;

/**
 * Local user sessions for authentication
 * Tracks active sessions for local users
 */
export const localUserSessions = mysqlTable("localUserSessions", {
  id: int("id").autoincrement().primaryKey(),
  localUserId: int("localUserId").notNull().references(() => localUsers.id),
  sessionToken: varchar("sessionToken", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LocalUserSession = typeof localUserSessions.$inferSelect;
export type InsertLocalUserSession = typeof localUserSessions.$inferInsert;

/**
 * Customers table for frequent buyer tracking in POS.
 * Each customer belongs to a user (the store owner).
 */
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;


/**
 * Personal compraventa operations table — only for the platform admin.
 * Each row is one product: bought from a supplier, optionally sold to a buyer.
 * Contact info (supplier and buyer) lives inside the row, not in a separate table.
 * Multi-tenant safe: filtered by ownerId on every query.
 */
export const personalOperations = mysqlTable("personalOperations", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id),
  
  // Producto
  productName: varchar("productName", { length: 255 }).notNull(),
  productDescription: text("productDescription"),
  
  // Compra (siempre requerida)
  acquiredAt: timestamp("acquiredAt").notNull(),
  acquiredCost: decimal("acquiredCost", { precision: 10, scale: 2 }).notNull(),
  supplierName: varchar("supplierName", { length: 255 }),
  supplierPhone: varchar("supplierPhone", { length: 40 }),
  supplierLocation: varchar("supplierLocation", { length: 255 }),
  
  // Venta (nullable = todavía está en inventario)
  soldAt: timestamp("soldAt"),
  soldPrice: decimal("soldPrice", { precision: 10, scale: 2 }),
  buyerName: varchar("buyerName", { length: 255 }),
  buyerPhone: varchar("buyerPhone", { length: 40 }),
  buyerLocation: varchar("buyerLocation", { length: 255 }),
  
  // Estado
  status: mysqlEnum("status", ["in_inventory", "sold"]).default("in_inventory").notNull(),
  
  // Extras
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PersonalOperation = typeof personalOperations.$inferSelect;
export type InsertPersonalOperation = typeof personalOperations.$inferInsert;


