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
    programCode: mysqlEnum("programCode", ["boutique", "abarrotes", "celine", "veterinaria"]).notNull(),
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
 * Each row is one product OR one service.
 * Contact info (supplier and buyer/customer) lives inside the row.
 * Multi-tenant safe: filtered by ownerId on every query.
 */
export const personalOperations = mysqlTable("personalOperations", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id),
  
  // Tipo de operación: producto (compraventa) o servicio
  operationType: mysqlEnum("operationType", ["product", "service"]).default("product").notNull(),
  
  // ─── PRODUCTO (cuando operationType = 'product') ───────────────────
  productName: varchar("productName", { length: 255 }),
  productDescription: text("productDescription"),
  
  // Compra del producto
  acquiredAt: timestamp("acquiredAt"),
  acquiredCost: decimal("acquiredCost", { precision: 10, scale: 2 }),
  supplierName: varchar("supplierName", { length: 255 }),
  supplierPhone: varchar("supplierPhone", { length: 40 }),
  supplierLocation: varchar("supplierLocation", { length: 255 }),
  
  // Venta del producto
  soldAt: timestamp("soldAt"),
  soldPrice: decimal("soldPrice", { precision: 10, scale: 2 }),
  buyerName: varchar("buyerName", { length: 255 }),
  buyerPhone: varchar("buyerPhone", { length: 40 }),
  buyerLocation: varchar("buyerLocation", { length: 255 }),
  
  // ─── SERVICIO (cuando operationType = 'service') ──────────────────
  serviceTitle: varchar("serviceTitle", { length: 255 }),
  serviceFee: decimal("serviceFee", { precision: 10, scale: 2 }),
  serviceDate: timestamp("serviceDate"),
  customerName: varchar("customerName", { length: 255 }),
  customerPhone: varchar("customerPhone", { length: 40 }),
  customerLocation: varchar("customerLocation", { length: 255 }),
  
  // Estado (aplica a productos: in_inventory/sold; servicios siempre 'sold')
  status: mysqlEnum("status", ["in_inventory", "sold"]).default("in_inventory").notNull(),
  
  // Extras
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PersonalOperation = typeof personalOperations.$inferSelect;
export type InsertPersonalOperation = typeof personalOperations.$inferInsert;



// ============================================================================
// VETERINARIA — sistema completo de gestión veterinaria
// ============================================================================

/**
 * Configuración del negocio veterinario.
 * Datos del veterinario, clínica, datos fiscales, logo para recibos.
 */
export const vetClinicSettings = mysqlTable("vetClinicSettings", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id).unique(),

  // Datos de la clínica
  clinicName: varchar("clinicName", { length: 255 }),
  doctorName: varchar("doctorName", { length: 255 }),
  professionalLicense: varchar("professionalLicense", { length: 100 }),
  university: varchar("university", { length: 255 }),

  // Contacto
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),

  // Datos fiscales (para recibos formales)
  rfc: varchar("rfc", { length: 13 }),
  fiscalName: varchar("fiscalName", { length: 255 }),

  // Visual
  logoUrl: varchar("logoUrl", { length: 500 }),
  primaryColor: varchar("primaryColor", { length: 20 }).default("#7c3aed"),

  // Para pie de recibos
  receiptFooter: text("receiptFooter"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type VetClinicSettings = typeof vetClinicSettings.$inferSelect;
export type InsertVetClinicSettings = typeof vetClinicSettings.$inferInsert;

/**
 * Mascotas - vinculadas a clientes (que son compartidos entre programas).
 */
export const pets = mysqlTable("pets", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id),
  customerId: int("customerId").notNull().references(() => customers.id),

  // Datos básicos
  name: varchar("name", { length: 100 }).notNull(),
  species: mysqlEnum("species", ["perro", "gato", "ave", "reptil", "roedor", "exotico", "otro"]).default("perro").notNull(),
  breed: varchar("breed", { length: 100 }),
  birthDate: timestamp("birthDate"),
  sex: mysqlEnum("sex", ["macho", "hembra", "desconocido"]).default("desconocido").notNull(),
  sterilized: boolean("sterilized").default(false).notNull(),
  color: varchar("color", { length: 100 }),
  microchip: varchar("microchip", { length: 50 }),
  weight: decimal("weight", { precision: 6, scale: 2 }),

  // Visual
  photoUrl: varchar("photoUrl", { length: 500 }),

  // Médico básico para alertas
  allergies: text("allergies"),
  chronicConditions: text("chronicConditions"),
  notes: text("notes"),

  isActive: boolean("isActive").default(true).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Pet = typeof pets.$inferSelect;
export type InsertPet = typeof pets.$inferInsert;

/**
 * Catálogo de productos del veterinario (medicamentos, alimento, accesorios).
 */
export const vetProducts = mysqlTable("vetProducts", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id),

  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["medicamento", "alimento", "accesorio", "higiene", "vitamina", "otro"]).default("otro").notNull(),

  // Precio y costo (para utilidad)
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }),

  // Inventario
  stock: int("stock").default(0).notNull(),
  lowStockAlert: int("lowStockAlert").default(5).notNull(),

  // Identificación
  sku: varchar("sku", { length: 100 }),
  barcode: varchar("barcode", { length: 100 }),

  // Específico para medicamentos
  requiresPrescription: boolean("requiresPrescription").default(false).notNull(),
  expirationDate: timestamp("expirationDate"),
  batchNumber: varchar("batchNumber", { length: 100 }),

  isActive: boolean("isActive").default(true).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type VetProduct = typeof vetProducts.$inferSelect;
export type InsertVetProduct = typeof vetProducts.$inferInsert;

/**
 * Catálogo de servicios del veterinario (consulta, vacunas, baño, etc).
 */
export const vetServices = mysqlTable("vetServices", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id),

  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["consulta", "vacuna", "desparasitacion", "estetica", "cirugia", "hospitalizacion", "domicilio", "otro"]).default("consulta").notNull(),

  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  durationMinutes: int("durationMinutes").default(30).notNull(),

  isActive: boolean("isActive").default(true).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type VetService = typeof vetServices.$inferSelect;
export type InsertVetService = typeof vetServices.$inferInsert;

/**
 * Ventas de la veterinaria (productos + servicios).
 * customerId y petId son opcionales para venta rápida sin registro.
 */
export const vetSales = mysqlTable("vetSales", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id),
  customerId: int("customerId").references(() => customers.id),
  petId: int("petId").references(() => pets.id),

  // Totales
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),

  // Pago
  paymentMethod: mysqlEnum("paymentMethod", ["efectivo", "tarjeta", "transferencia", "credito", "otro"]).default("efectivo").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pagado", "pendiente", "parcial", "cancelado"]).default("pagado").notNull(),

  notes: text("notes"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type VetSale = typeof vetSales.$inferSelect;
export type InsertVetSale = typeof vetSales.$inferInsert;

/**
 * Items de cada venta veterinaria (productos o servicios).
 * Snapshot al momento de la venta para historial intacto.
 */
export const vetSaleItems = mysqlTable("vetSaleItems", {
  id: int("id").autoincrement().primaryKey(),
  saleId: int("saleId").notNull().references(() => vetSales.id),

  itemType: mysqlEnum("itemType", ["product", "service"]).notNull(),
  productId: int("productId").references(() => vetProducts.id),
  serviceId: int("serviceId").references(() => vetServices.id),

  // Snapshot del item en la venta
  description: varchar("description", { length: 255 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).default("1").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type VetSaleItem = typeof vetSaleItems.$inferSelect;
export type InsertVetSaleItem = typeof vetSaleItems.$inferInsert;

/**
 * Visitas / Expediente clínico de cada mascota.
 * Cada vez que la mascota viene a consulta o tratamiento.
 */
export const vetVisits = mysqlTable("vetVisits", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id),
  petId: int("petId").notNull().references(() => pets.id),
  customerId: int("customerId").notNull().references(() => customers.id),

  visitDate: timestamp("visitDate").defaultNow().notNull(),
  reason: varchar("reason", { length: 500 }).notNull(),

  // Datos al momento de la visita
  weight: decimal("weight", { precision: 6, scale: 2 }),
  temperature: decimal("temperature", { precision: 4, scale: 2 }),

  // Diagnóstico y tratamiento
  symptoms: text("symptoms"),
  diagnosis: text("diagnosis"),
  treatment: text("treatment"),
  prescribedMedications: text("prescribedMedications"),
  recommendations: text("recommendations"),

  // Próxima visita (recordatorio)
  nextVisitDate: timestamp("nextVisitDate"),
  nextVisitReason: varchar("nextVisitReason", { length: 500 }),

  // Vínculo opcional con la venta de esta visita
  saleId: int("saleId").references(() => vetSales.id),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type VetVisit = typeof vetVisits.$inferSelect;
export type InsertVetVisit = typeof vetVisits.$inferInsert;

/**
 * Vacunas aplicadas - separado para tener catálogo y próximas dosis.
 */
export const vetVaccinations = mysqlTable("vetVaccinations", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().references(() => users.id),
  petId: int("petId").notNull().references(() => pets.id),
  visitId: int("visitId").references(() => vetVisits.id),

  vaccineName: varchar("vaccineName", { length: 255 }).notNull(),
  brand: varchar("brand", { length: 100 }),
  batchNumber: varchar("batchNumber", { length: 100 }),

  appliedDate: timestamp("appliedDate").defaultNow().notNull(),
  nextDoseDate: timestamp("nextDoseDate"),

  notes: text("notes"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type VetVaccination = typeof vetVaccinations.$inferSelect;
export type InsertVetVaccination = typeof vetVaccinations.$inferInsert;
export const vetAppointments = mysqlTable("vetAppointments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  customerId: int("customerId").notNull().references(() => customers.id),
  petId: int("petId").notNull().references(() => pets.id),
  appointmentAt: timestamp("appointmentAt").notNull(),
  durationMinutes: int("durationMinutes").notNull().default(30),
  reason: varchar("reason", { length: 200 }).notNull(),
  status: mysqlEnum("status", ["pendiente", "confirmada", "completada", "cancelada"]).notNull().default("pendiente"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});
export type VetAppointment = typeof vetAppointments.$inferSelect;
export type InsertVetAppointment = typeof vetAppointments.$inferInsert;

export const verduleriaProducts = mysqlTable("verduleriaProducts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  name: varchar("name", { length: 200 }).notNull(),
  icon: varchar("icon", { length: 10 }).notNull().default("🥬"),
  unit: mysqlEnum("unit", ["kg", "pieza", "atado", "manojo", "caja", "saco", "litro"]).notNull().default("kg"),
  category: mysqlEnum("category", ["fruta", "verdura", "tuberculo", "hierba", "otro"]).notNull().default("verdura"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: decimal("stock", { precision: 10, scale: 3 }).default("0"),
  trackStock: boolean("trackStock").notNull().default(false),
  isActive: boolean("isActive").notNull().default(true),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});

export type VerduleriaProduct = typeof verduleriaProducts.$inferSelect;
export type InsertVerduleriaProduct = typeof verduleriaProducts.$inferInsert;

export const verduleriaSales = mysqlTable("verduleriaSales", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["efectivo", "tarjeta", "transferencia", "credito"]).notNull().default("efectivo"),
  itemCount: int("itemCount").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type VerduleriaSale = typeof verduleriaSales.$inferSelect;
export type InsertVerduleriaSale = typeof verduleriaSales.$inferInsert;

export const verduleriaSaleItems = mysqlTable("verduleriaSaleItems", {
  id: int("id").autoincrement().primaryKey(),
  saleId: int("saleId").notNull().references(() => verduleriaSales.id),
  productId: int("productId").references(() => verduleriaProducts.id),
  name: varchar("name", { length: 200 }).notNull(),
  icon: varchar("icon", { length: 10 }),
  unit: varchar("unit", { length: 20 }),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
});

export type VerduleriaSaleItem = typeof verduleriaSaleItems.$inferSelect;
export type InsertVerduleriaSaleItem = typeof verduleriaSaleItems.$inferInsert;

export const tarimaProfiles = mysqlTable("tarimaProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  artistName: varchar("artistName", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  bio: text("bio"),
  genre: mysqlEnum("genre", [
    "banda",
    "mariachi",
    "norteno",
    "cumbia",
    "rock",
    "pop",
    "regional",
    "electronica",
    "jazz",
    "clasica",
    "tropical",
    "reggaeton",
    "otro",
  ]).notNull().default("otro"),
  location: varchar("location", { length: 200 }),
  whatsapp: varchar("whatsapp", { length: 30 }),
  contactEmail: varchar("contactEmail", { length: 200 }),
  profileImage: varchar("profileImage", { length: 500 }),
  coverImage: varchar("coverImage", { length: 500 }),
  spotifyUrl: varchar("spotifyUrl", { length: 500 }),
  youtubeUrl: varchar("youtubeUrl", { length: 500 }),
  youtubeFeaturedVideo: varchar("youtubeFeaturedVideo", { length: 500 }),
  instagramUrl: varchar("instagramUrl", { length: 500 }),
  facebookUrl: varchar("facebookUrl", { length: 500 }),
  tiktokUrl: varchar("tiktokUrl", { length: 500 }),
  minBudget: decimal("minBudget", { precision: 10, scale: 2 }),
  serviceArea: varchar("serviceArea", { length: 500 }),
  yearsActive: int("yearsActive"),
  isPublished: boolean("isPublished").notNull().default(false),
  themeId: varchar("themeId", { length: 50 }).notNull().default("default"),
  customColors: json("customColors"),
  fontFamily: varchar("fontFamily", { length: 50 }),
  viewCount: int("viewCount").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});

export type TarimaProfile = typeof tarimaProfiles.$inferSelect;
export type InsertTarimaProfile = typeof tarimaProfiles.$inferInsert;

export const tarimaBookings = mysqlTable("tarimaBookings", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull().references(() => tarimaProfiles.id),
  customerName: varchar("customerName", { length: 200 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 30 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 200 }),
  eventDate: timestamp("eventDate"),
  eventType: mysqlEnum("eventType", [
    "boda",
    "15anos",
    "cumpleanos",
    "evento_corporativo",
    "fiesta_privada",
    "festival",
    "bautizo",
    "otro",
  ]).notNull().default("otro"),
  eventLocation: varchar("eventLocation", { length: 500 }),
  eventDescription: text("eventDescription"),
  budget: decimal("budget", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "completed"]).notNull().default("pending"),
  artistNotes: text("artistNotes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  respondedAt: timestamp("respondedAt"),
});

export type TarimaBooking = typeof tarimaBookings.$inferSelect;
export type InsertTarimaBooking = typeof tarimaBookings.$inferInsert;

export const tarimaMedia = mysqlTable("tarimaMedia", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull().references(() => tarimaProfiles.id),
  type: mysqlEnum("type", ["photo", "video", "music"]).notNull(),
  url: varchar("url", { length: 1000 }).notNull(),
  thumbnail: varchar("thumbnail", { length: 1000 }),
  title: varchar("title", { length: 200 }),
  description: text("description"),
  sortOrder: int("sortOrder").notNull().default(0),
  isHighlight: boolean("isHighlight").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type TarimaMedia = typeof tarimaMedia.$inferSelect;
export type InsertTarimaMedia = typeof tarimaMedia.$inferInsert;

export const posPaymentRequests = mysqlTable("posPaymentRequests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  // Que POS quiere comprar
  posCode: mysqlEnum("posCode", [
    "boutique",
    "abarrotes",
    "veterinaria",
    "verduleria",
    "tarima",
  ]).notNull(),
  // Plan: monthly o yearly
  planType: mysqlEnum("planType", ["monthly", "yearly"]).notNull(),
  // Precios
  originalAmount: decimal("originalAmount", { precision: 10, scale: 2 }).notNull(),
  finalAmount: decimal("finalAmount", { precision: 10, scale: 2 }).notNull(),
  discountApplied: boolean("discountApplied").notNull().default(false),
  discountPercentage: int("discountPercentage").default(0),
  // Pago
  paymentMethod: mysqlEnum("paymentMethod", ["transferencia", "efectivo", "mercadopago"]).notNull(),
  proofUrl: varchar("proofUrl", { length: 1000 }),
  customerNotes: text("customerNotes"),
  // Estado de aprobacion
  status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled"]).notNull().default("pending"),
  adminNotes: text("adminNotes"),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const posPaymentRequests = mysqlTable("posPaymentRequests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  // Que POS quiere comprar
  posCode: mysqlEnum("posCode", [
    "boutique",
    "abarrotes",
    "veterinaria",
    "verduleria",
    "tarima",
  ]).notNull(),
  // Plan: monthly o yearly
  planType: mysqlEnum("planType", ["monthly", "yearly"]).notNull(),
  // Precios
  originalAmount: decimal("originalAmount", { precision: 10, scale: 2 }).notNull(),
  finalAmount: decimal("finalAmount", { precision: 10, scale: 2 }).notNull(),
  discountApplied: boolean("discountApplied").notNull().default(false),
  discountPercentage: int("discountPercentage").default(0),
  // Pago
  paymentMethod: mysqlEnum("paymentMethod", ["transferencia", "efectivo", "mercadopago"]).notNull(),
  proofUrl: varchar("proofUrl", { length: 1000 }),
  customerNotes: text("customerNotes"),
  // Estado de aprobacion
  status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled"]).notNull().default("pending"),
  adminNotes: text("adminNotes"),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type PosPaymentRequest = typeof posPaymentRequests.$inferSelect;
export type InsertPosPaymentRequest = typeof posPaymentRequests.$inferInsert;

export const posSubscriptions = mysqlTable("posSubscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  posCode: mysqlEnum("posCode", [
    "boutique",
    "abarrotes",
    "veterinaria",
    "verduleria",
    "tarima",
  ]).notNull(),
  planType: mysqlEnum("planType", ["monthly", "yearly"]).notNull(),
  status: mysqlEnum("status", ["active", "expired", "cancelled"]).notNull().default("active"),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  paymentRequestId: int("paymentRequestId").references(() => posPaymentRequests.id),
  amountPaid: decimal("amountPaid", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});

export type PosSubscription = typeof posSubscriptions.$inferSelect;
export type InsertPosSubscription = typeof posSubscriptions.$inferInsert;

