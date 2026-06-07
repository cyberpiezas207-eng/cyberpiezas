import { eq, and, or, gte, lte, like, desc, asc, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { mysqlTable, int, varchar, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
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
  customers,
  type Customer,
  type InsertCustomer,
  // Subscription Core V1
  subscriptions,
  type Subscription,
  type InsertSubscription,
  transferPaymentRequests,
  type TransferPaymentRequest,
  // POS Staff V1 - Sistema unificado de cajeros/empleados por POS
  posStaff,
  type PosStaff,
  type InsertPosStaff,
  posStaffPermissions,
  type PosStaffPermission,
  type InsertPosStaffPermission,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { personalExpensesMigrations } from "./personalExpensesSchema";
import { personalPantryMigrations } from "./personalPantrySchema";
import { personalPantryPricesMigrations } from "./personalPantryPricesSchema";
import { personalRemindersMigrations } from "./personalRemindersSchema";
import { personalVehicleMigrations } from "./personalVehicleSchema";
import { personalDebtsMigrations } from "./personalDebtsSchema";
import { personalServicesMigrations } from "./personalServicesSchema";
import { personalAnimalsMigrations } from "./personalAnimalsSchema";
import { personalInboxMigrations } from "./personalInboxSchema";
import { personalWishesMigrations } from "./personalWishesSchema";
import { TRPCError } from "@trpc/server";

// ============================================================================
// POS SCOPE V1 - Tipos y helpers para separacion estricta de datos por POS
// ----------------------------------------------------------------------------
// Cada funcion canonica de DB que toca tablas con posCode (products, sales,
// categories, inventoryMovements, saleReturns) acepta un PosScopeOptions
// opcional. Si no se pasa, el scope es "legacy" (default explicito).
//
// REGLA: posCode undefined NO significa "sin filtro". Significa "legacy".
// Nunca construir WHERE dinamico que omita el filtro de posCode.
// ============================================================================

export type PosCode =
  | "legacy"
  | "abarrotes"
  | "boutique"
  | "veterinaria"
  | "verduleria"
  | "tarima"
  | "taqueria"
  | "papeleria";

export type PosScopeOptions = {
  posCode?: PosCode;
};

const VALID_POS_CODES: ReadonlySet<PosCode> = new Set([
  "legacy",
  "abarrotes",
  "boutique",
  "veterinaria",
  "verduleria",
  "tarima",
  "taqueria",
  "papeleria",
]);

/**
 * Resuelve el scope efectivo de una operacion DB.
 * Si options.posCode no viene, devuelve "legacy" como default explicito.
 */
export function resolvePosScope(options?: PosScopeOptions): PosCode {
  return options?.posCode ?? "legacy";
}

/**
 * Valida que un posCode sea uno del enum permitido.
 * Lanza TRPCError BAD_REQUEST si no.
 */
export function assertValidPosCode(code: string): asserts code is PosCode {
  if (!VALID_POS_CODES.has(code as PosCode)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `POS code invalido: ${code}`,
    });
  }
}

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

/**
 * Obtiene la conexion a DB o lanza error TRPC si no esta disponible.
 * Usar en routers cuando quieres "asegurar" la conexion sin tener
 * que validar !conn en cada handler. Centraliza el manejo de error.
 */
export async function getDbOrThrow() {
  const conn = await getDb();
  if (!conn) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
  }
  return conn;
}

// ============================================================================
// VETERINARIA CASHIERS - Tabla independiente para empleados de veterinaria
// Tenant isolation por ownerUserId (cada admin solo ve sus cajeros)
// ============================================================================
export const veterinariaCashiers = mysqlTable("veterinariaCashiers", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("ownerUserId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 180 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["doctor", "asistente", "recepcionista"])
    .notNull()
    .default("asistente"),
  branchName: varchar("branchName", { length: 120 }).notNull().default(""),
  status: mysqlEnum("status", ["active", "inactive"])
    .notNull()
    .default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VeterinariaCashier = typeof veterinariaCashiers.$inferSelect;
export type InsertVeterinariaCashier = typeof veterinariaCashiers.$inferInsert;

/**
 * Ejecuta migraciones de columnas nuevas directamente como SQL.
 * Se llama al arrancar el servidor para garantizar que las columnas existen
 * sin depender de archivos .sql externos que no se empaquetan en el build.
 */
export async function runStartupMigrations(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.log("[Startup Migrations] No DATABASE_URL, skipping.");
    return;
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Startup Migrations] Could not get DB connection, skipping.");
    return;
  }
  const migrations = [
    // Tablas del modulo de gastos personales (admin exclusivo)
    ...personalExpensesMigrations,
    ...personalPantryMigrations,
    ...personalPantryPricesMigrations,
    ...personalServicesMigrations,
    ...personalAnimalsMigrations,
    ...personalInboxMigrations,
    ...personalWishesMigrations,
    
    // Columna para persistir aceptación de términos y condiciones por usuario
    // Nota: IF NOT EXISTS no es compatible con MySQL — el catch maneja errno 1060 (columna ya existe)
    "ALTER TABLE `users` ADD COLUMN `termsAcceptedAt` timestamp NULL DEFAULT NULL",
    // Campo de imagen opcional por variante de producto
    "ALTER TABLE `productVariants` ADD COLUMN `imageUrl` varchar(1000) NULL DEFAULT NULL",
    // SKU y código de barras opcionales por variante
    "ALTER TABLE `productVariants` ADD COLUMN `sku` varchar(100) NULL DEFAULT NULL",
    "ALTER TABLE `productVariants` ADD COLUMN `barcode` varchar(50) NULL DEFAULT NULL",
    // Tarima: campos para temas personalizados
    "ALTER TABLE `tarimaProfiles` ADD COLUMN `customColors` json NULL DEFAULT NULL",
    "ALTER TABLE `tarimaProfiles` ADD COLUMN `fontFamily` varchar(50) NULL DEFAULT NULL",
    // Tabla de clientes frecuentes para el POS
    `CREATE TABLE IF NOT EXISTS \`customers\` (
      \`id\` int AUTO_INCREMENT PRIMARY KEY,
      \`userId\` int NOT NULL,
      \`name\` varchar(255) NOT NULL,
      \`phone\` varchar(40),
      \`email\` varchar(320),
      \`notes\` text,
      \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
      \`updatedAt\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`)
    )`,
    // Tabla de cajeros/empleados de veterinaria (aislado por ownerUserId)
    `CREATE TABLE IF NOT EXISTS \`veterinariaCashiers\` (
      \`id\` int AUTO_INCREMENT PRIMARY KEY,
      \`ownerUserId\` int NOT NULL,
      \`name\` varchar(120) NOT NULL,
      \`email\` varchar(180) NOT NULL,
      \`passwordHash\` varchar(255) NOT NULL,
      \`role\` enum('doctor','asistente','recepcionista') NOT NULL DEFAULT 'asistente',
      \`branchName\` varchar(120) NOT NULL DEFAULT '',
      \`status\` enum('active','inactive') NOT NULL DEFAULT 'active',
      \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
      \`updatedAt\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      INDEX \`idx_vetcashiers_owner\` (\`ownerUserId\`),
      UNIQUE KEY \`uq_vetcashiers_email_owner\` (\`email\`, \`ownerUserId\`),
      FOREIGN KEY (\`ownerUserId\`) REFERENCES \`users\`(\`id\`)
    )`,
    // POS Staff V1 - Tabla principal de cajeros/empleados por POS
    // Aislado por (ownerUserId, posCode, branchId). Reutiliza users existente.
    `CREATE TABLE IF NOT EXISTS \`posStaff\` (
      \`id\` int AUTO_INCREMENT PRIMARY KEY,
      \`ownerUserId\` int NOT NULL,
      \`staffUserId\` int NOT NULL,
      \`posCode\` enum('boutique','abarrotes','veterinaria','verduleria','tarima','taqueria','papeleria') NOT NULL,
      \`branchId\` int NULL,
      \`rolePreset\` enum('manager','cashier','custom') NOT NULL DEFAULT 'cashier',
      \`status\` enum('active','disabled','invited') NOT NULL DEFAULT 'active',
      \`createdByUserId\` int NOT NULL,
      \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
      \`updatedAt\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      INDEX \`idx_posstaff_owner_pos\` (\`ownerUserId\`, \`posCode\`),
      INDEX \`idx_posstaff_staffuser\` (\`staffUserId\`),
      INDEX \`idx_posstaff_status\` (\`status\`),
      UNIQUE KEY \`uq_posstaff_owner_user_pos_branch\` (\`ownerUserId\`, \`staffUserId\`, \`posCode\`, \`branchId\`),
      FOREIGN KEY (\`ownerUserId\`) REFERENCES \`users\`(\`id\`),
      FOREIGN KEY (\`staffUserId\`) REFERENCES \`users\`(\`id\`),
      FOREIGN KEY (\`createdByUserId\`) REFERENCES \`users\`(\`id\`),
      FOREIGN KEY (\`branchId\`) REFERENCES \`branches\`(\`id\`)
    )`,
    // POS Staff V1 - Permisos granulares por staff member
    // Presencia de row con allowed=1 = concedido. Ausencia = denegado.
    `CREATE TABLE IF NOT EXISTS \`posStaffPermissions\` (
      \`id\` int AUTO_INCREMENT PRIMARY KEY,
      \`staffId\` int NOT NULL,
      \`permission\` varchar(60) NOT NULL,
      \`allowed\` tinyint(1) NOT NULL DEFAULT 1,
      \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
      \`updatedAt\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      UNIQUE KEY \`uq_posstaffperm_staff_permission\` (\`staffId\`, \`permission\`),
      INDEX \`idx_posstaffperm_permission\` (\`permission\`),
      FOREIGN KEY (\`staffId\`) REFERENCES \`posStaff\`(\`id\`) ON DELETE CASCADE
    )`,
    // ========================================================================
    // POS SCOPE V1 - Separacion estricta de datos por POS
    // Cada tabla core obtiene posCode NOT NULL DEFAULT 'legacy'.
    // Datos existentes se marcan como 'legacy' (no se mezclan con POS nuevos).
    // Abarrotes router SOLO consultara posCode='abarrotes'.
    // ========================================================================
    // products - agregar posCode + backfill + NOT NULL + index
    "ALTER TABLE `products` ADD COLUMN `posCode` varchar(40) NULL",
    "UPDATE `products` SET `posCode` = 'legacy' WHERE `posCode` IS NULL",
    "ALTER TABLE `products` MODIFY `posCode` varchar(40) NOT NULL DEFAULT 'legacy'",
    "CREATE INDEX `idx_products_poscode` ON `products` (`posCode`)",
    // sales - mismo patron con index compuesto userId+posCode+createdAt
    "ALTER TABLE `sales` ADD COLUMN `posCode` varchar(40) NULL",
    "UPDATE `sales` SET `posCode` = 'legacy' WHERE `posCode` IS NULL",
    "ALTER TABLE `sales` MODIFY `posCode` varchar(40) NOT NULL DEFAULT 'legacy'",
    "CREATE INDEX `idx_sales_user_poscode_created` ON `sales` (`userId`, `posCode`, `createdAt`)",
    // categories - mismo patron con index userId+posCode
    "ALTER TABLE `categories` ADD COLUMN `posCode` varchar(40) NULL",
    "UPDATE `categories` SET `posCode` = 'legacy' WHERE `posCode` IS NULL",
    "ALTER TABLE `categories` MODIFY `posCode` varchar(40) NOT NULL DEFAULT 'legacy'",
    "CREATE INDEX `idx_categories_user_poscode` ON `categories` (`userId`, `posCode`)",
    // inventoryMovements - mismo patron con index posCode+createdAt
    "ALTER TABLE `inventoryMovements` ADD COLUMN `posCode` varchar(40) NULL",
    "UPDATE `inventoryMovements` SET `posCode` = 'legacy' WHERE `posCode` IS NULL",
    "ALTER TABLE `inventoryMovements` MODIFY `posCode` varchar(40) NOT NULL DEFAULT 'legacy'",
    "CREATE INDEX `idx_invmov_poscode_created` ON `inventoryMovements` (`posCode`, `createdAt`)",
    // saleReturns - mismo patron con index userId+posCode
    "ALTER TABLE `saleReturns` ADD COLUMN `posCode` varchar(40) NULL",
    "UPDATE `saleReturns` SET `posCode` = 'legacy' WHERE `posCode` IS NULL",
    "ALTER TABLE `saleReturns` MODIFY `posCode` varchar(40) NOT NULL DEFAULT 'legacy'",
    "CREATE INDEX `idx_salereturns_user_poscode` ON `saleReturns` (`userId`, `posCode`)",
    // ========================================================================
    // COMMIT 3b-1: Sales Lifecycle Columns
    // ------------------------------------------------------------------------
    // Permite rastrear el ciclo de vida de una venta:
    //   active    -> venta normal (default)
    //   cancelled -> venta cancelada (cancelledAt, cancelledByUserId)
    //   refunded  -> venta devuelta (refundedAt, refundedByUserId, refundReason)
    // createdByUserId trackea quien creo la venta (staff o owner).
    // Datos legacy: status='active' por default, otros campos NULL.
    // ========================================================================
    "ALTER TABLE `sales` ADD COLUMN `status` enum('active','cancelled','refunded') NOT NULL DEFAULT 'active'",
    "ALTER TABLE `sales` ADD COLUMN `createdByUserId` int NULL DEFAULT NULL",
    "ALTER TABLE `sales` ADD COLUMN `cancelledAt` timestamp NULL DEFAULT NULL",
    "ALTER TABLE `sales` ADD COLUMN `cancelledByUserId` int NULL DEFAULT NULL",
    "ALTER TABLE `sales` ADD COLUMN `refundedAt` timestamp NULL DEFAULT NULL",
    "ALTER TABLE `sales` ADD COLUMN `refundedByUserId` int NULL DEFAULT NULL",
    "ALTER TABLE `sales` ADD COLUMN `refundReason` text NULL DEFAULT NULL",
    "CREATE INDEX `idx_sales_status` ON `sales` (`status`)",
    "CREATE INDEX `idx_sales_poscode_status` ON `sales` (`posCode`, `status`)",
    // ========================================================================
    // B2 - Ticket Mixto Clinico nivel BD: anticipos reales y cajero atendedor
    // - amountPaid: monto realmente cobrado (anticipo parcial vs total)
    // - attendedByCashierId: doctor/asistente/recepcionista que atendio
    // Ambos NULL por default = retro-compatible con ventas existentes.
    // ========================================================================
    "ALTER TABLE `vetSales` ADD COLUMN `amountPaid` decimal(10,2) NULL DEFAULT NULL",
    "ALTER TABLE `vetSales` ADD COLUMN `attendedByCashierId` int NULL DEFAULT NULL",
    "CREATE INDEX `idx_vetsales_cashier` ON `vetSales` (`attendedByCashierId`)",
    "CREATE INDEX `idx_vetsales_paymentstatus` ON `vetSales` (`paymentStatus`)",
    // ========================================================================
    // P1 - Portal de Duenos de Mascotas (Vet Owner Portal MVP)
    // - petOwnerPortalTokens: tokens privados por cliente final
    // - portalAccessLog: bitacora de accesos para seguridad y soporte
    // ========================================================================
    "CREATE TABLE IF NOT EXISTS `petOwnerPortalTokens` (" +
      "`id` int AUTO_INCREMENT NOT NULL, " +
      "`clinicUserId` int NOT NULL, " +
      "`customerId` int NOT NULL, " +
      "`tokenHash` varchar(128) NOT NULL, " +
      "`status` enum('active','revoked','expired') NOT NULL DEFAULT 'active', " +
      "`expiresAt` timestamp NOT NULL, " +
      "`lastAccessAt` timestamp NULL DEFAULT NULL, " +
      "`accessCount` int NOT NULL DEFAULT 0, " +
      "`internalNotes` varchar(255) NULL DEFAULT NULL, " +
      "`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
      "`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, " +
      "PRIMARY KEY (`id`), " +
      "UNIQUE KEY `uniq_portal_token_hash` (`tokenHash`)" +
      ")",
    "CREATE INDEX `idx_portaltoken_clinic` ON `petOwnerPortalTokens` (`clinicUserId`)",
    "CREATE INDEX `idx_portaltoken_customer` ON `petOwnerPortalTokens` (`customerId`)",
    "CREATE INDEX `idx_portaltoken_status` ON `petOwnerPortalTokens` (`status`)",
    "CREATE TABLE IF NOT EXISTS `portalAccessLog` (" +
      "`id` int AUTO_INCREMENT NOT NULL, " +
      "`tokenId` int NULL DEFAULT NULL, " +
      "`customerId` int NULL DEFAULT NULL, " +
      "`ipHash` varchar(64) NULL DEFAULT NULL, " +
      "`userAgent` varchar(255) NULL DEFAULT NULL, " +
      "`eventType` enum('view','denied','rate_limited') NOT NULL, " +
      "`accessedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
      "PRIMARY KEY (`id`)" +
      ")",
    "CREATE INDEX `idx_portallog_token` ON `portalAccessLog` (`tokenId`)",
    "CREATE INDEX `idx_portallog_iphash_time` ON `portalAccessLog` (`ipHash`, `accessedAt`)",
    // ========================================================================
    // ABARROTES - Sistema de Fiado (Libreta Digital)
    // - abarrotesCustomers: clientes conocidos a los que se les vende a fiado
    // - abarrotesFiados: deudas activas con totalAmount y paidAmount
    // - abarrotesAbonos: pagos parciales historicos de cada fiado
    // Es el diferenciador clave segun ChatGPT para Abarrotes vertical.
    // ========================================================================
    "CREATE TABLE IF NOT EXISTS `abarrotesCustomers` (" +
      "`id` int AUTO_INCREMENT NOT NULL, " +
      "`subscriberId` int NOT NULL, " +
      "`name` varchar(100) NOT NULL, " +
      "`phone` varchar(20) NULL DEFAULT NULL, " +
      "`notes` text NULL DEFAULT NULL, " +
      "`creditLimit` decimal(10,2) NULL DEFAULT '0.00', " +
      "`isActive` boolean NOT NULL DEFAULT true, " +
      "`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
      "`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, " +
      "PRIMARY KEY (`id`)" +
      ")",
    "CREATE INDEX `idx_abarrotescustomer_subscriber` ON `abarrotesCustomers` (`subscriberId`)",
    "CREATE INDEX `idx_abarrotescustomer_active` ON `abarrotesCustomers` (`subscriberId`, `isActive`)",
    "CREATE TABLE IF NOT EXISTS `abarrotesFiados` (" +
      "`id` int AUTO_INCREMENT NOT NULL, " +
      "`subscriberId` int NOT NULL, " +
      "`customerId` int NOT NULL, " +
      "`saleId` int NULL DEFAULT NULL, " +
      "`description` varchar(255) NULL DEFAULT NULL, " +
      "`totalAmount` decimal(10,2) NOT NULL, " +
      "`paidAmount` decimal(10,2) NOT NULL DEFAULT '0.00', " +
      "`status` enum('pending','partial','paid') NOT NULL DEFAULT 'pending', " +
      "`dueDate` timestamp NULL DEFAULT NULL, " +
      "`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
      "`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, " +
      "PRIMARY KEY (`id`)" +
      ")",
    "CREATE INDEX `idx_abarrotesfiado_subscriber` ON `abarrotesFiados` (`subscriberId`)",
    "CREATE INDEX `idx_abarrotesfiado_customer` ON `abarrotesFiados` (`customerId`)",
    "CREATE INDEX `idx_abarrotesfiado_status` ON `abarrotesFiados` (`subscriberId`, `status`)",
    "CREATE TABLE IF NOT EXISTS `abarrotesAbonos` (" +
      "`id` int AUTO_INCREMENT NOT NULL, " +
      "`subscriberId` int NOT NULL, " +
      "`fiadoId` int NOT NULL, " +
      "`customerId` int NOT NULL, " +
      "`amount` decimal(10,2) NOT NULL, " +
      "`paymentMethod` enum('cash','transfer','card') NOT NULL DEFAULT 'cash', " +
      "`notes` varchar(255) NULL DEFAULT NULL, " +
      "`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
      "PRIMARY KEY (`id`)" +
      ")",
    "CREATE INDEX `idx_abarrotesabono_subscriber` ON `abarrotesAbonos` (`subscriberId`)",
    "CREATE INDEX `idx_abarrotesabono_fiado` ON `abarrotesAbonos` (`fiadoId`)",
    "CREATE INDEX `idx_abarrotesabono_customer` ON `abarrotesAbonos` (`customerId`)",
    // Deudas: cadencia (cada N dias) y primer pago distinto
    "ALTER TABLE `personalDebts` ADD COLUMN `frequencyDays` int NULL DEFAULT NULL",
    "ALTER TABLE `personalDebts` ADD COLUMN `firstInstallmentAmount` decimal(12,2) NULL DEFAULT NULL",
  ];
  for (const migration of migrations) {
    try {
      await db.execute(sql.raw(migration));
      console.log(`[Startup Migrations] OK: ${migration.slice(0, 60)}...`);
    } catch (err: unknown) {
      // Errores idempotentes esperados:
      // 1060 = columna ya existe (ALTER ADD COLUMN repetido)
      // 1061 = key/index ya existe (CREATE INDEX repetido)
      // 1091 = no se puede dropear un index inexistente
      const mysqlErr = err as { errno?: number };
      if (mysqlErr?.errno === 1060) {
        console.log(`[Startup Migrations] Column already exists, skipping.`);
      } else if (mysqlErr?.errno === 1061) {
        console.log(`[Startup Migrations] Index already exists, skipping.`);
      } else if (mysqlErr?.errno === 1091) {
        console.log(`[Startup Migrations] Index does not exist, skipping.`);
      } else {
        console.error(`[Startup Migrations] Error (non-fatal):`, err);
      }
    }
  }
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
    if (user.termsAcceptedAt !== undefined) {
      values.termsAcceptedAt = user.termsAcceptedAt;
      updateSet.termsAcceptedAt = user.termsAcceptedAt;
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

export async function updateCategory(id: number, userId: number, name: string, description?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(categories)
    .set({ name, description: description ?? null })
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));
}

export async function deleteCategory(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));
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
  const db = await getDb();
  const [images, assignedBranches] = await Promise.all([
    getProductImagesByProductId(product.id),
    getProductBranchAssignments(product.id),
  ]);

  // Calcular stock total sumando todas las variantes en todas las sucursales
  let totalStock = 0;
  let isBestSeller = false;
  let hasNoMovement = false;

  if (db) {
    // Stock total
    const stockResult = await db
      .select({ total: sql<number>`coalesce(sum(${branchInventory.stock}), 0)` })
      .from(branchInventory)
      .innerJoin(productVariants, eq(branchInventory.productVariantId, productVariants.id))
      .where(eq(productVariants.productId, product.id));
    totalStock = Number(stockResult[0]?.total ?? 0);

    // Más vendido: top 10% de productos por ventas en los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const salesResult = await db
      .select({ total: sql<number>`coalesce(sum(${saleDetails.quantity}), 0)` })
      .from(saleDetails)
      .innerJoin(productVariants, eq(saleDetails.productVariantId, productVariants.id))
      .innerJoin(sales, eq(saleDetails.saleId, sales.id))
      .where(and(eq(productVariants.productId, product.id), gte(sales.createdAt, thirtyDaysAgo)));
    const unitsSold = Number(salesResult[0]?.total ?? 0);
    isBestSeller = unitsSold >= 10;

    // Sin movimiento: ninguna venta en los últimos 30 días
    hasNoMovement = unitsSold === 0 && totalStock > 0;
  }

  // Nuevo: creado hace menos de 7 días
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const isNew = product.createdAt >= sevenDaysAgo;

  return {
    ...product,
    primaryImageUrl: images.find((image) => image.isPrimary)?.imageUrl ?? images[0]?.imageUrl ?? null,
    assignedBranches,
    assignedBranchIds: assignedBranches.map((branch) => branch.branchId),
    totalStock,
    isBestSeller,
    hasNoMovement,
    isNew,
  };
}

export async function createProduct(
  data: {
    name: string;
    categoryId: number;
    brand: string;
    basePrice: string;
    sku: string;
    description?: string;
    branchIds?: number[];
  },
  options?: PosScopeOptions,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const scope = resolvePosScope(options);
  const { branchIds = [], ...productData } = data;
  // POS Scope V1: insertar siempre con posCode explicito (legacy por default).
  const result = await db
    .insert(products)
    .values({ ...productData, posCode: scope })
    .$returningId();
  const productId = result[0]?.id;

  if (!productId) {
    throw new Error("No se pudo crear el producto");
  }

  await syncProductBranchAssignments(productId, branchIds);
  if (scope !== "legacy") {
    console.log(`[POS_SCOPE_PRODUCT_CREATE] productId=${productId} posCode=${scope}`);
  }
  return { id: productId };
}

export async function getProductById(
  id: number,
  userId: number,
  options?: PosScopeOptions,
) {
  const db = await getDb();
  if (!db) return null;
  const scope = resolvePosScope(options);

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
    .where(
      and(
        eq(products.id, id),
        eq(branches.userId, userId),
        eq(products.isActive, true),
        eq(products.posCode, scope),
      ),
    )
    .limit(1);

  if (result.length === 0) return null;
  return await enrichProductWithAssets(result[0]);
}
export async function getAllProducts(
  userId: number,
  options?: PosScopeOptions,
) {
  const db = await getDb();
  if (!db) return [];
  const scope = resolvePosScope(options);

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
        eq(products.posCode, scope),
      ),
    )
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

export async function searchProducts(
  userId: number,
  query: string,
  options?: PosScopeOptions,
) {
  const db = await getDb();
  if (!db) return [];
  const scope = resolvePosScope(options);
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
        eq(products.posCode, scope),
        like(products.name, `%${query}%`),
      ),
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
  }>,
  options?: PosScopeOptions,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const scope = resolvePosScope(options);

  // POS Scope V1: getProductById ya filtra por scope, asi que si existe
  // sabemos que el producto pertenece a este POS.
  const existing = await getProductById(id, userId, { posCode: scope });
  if (!existing) {
    throw new Error("Producto no encontrado para este suscriptor");
  }

  const { branchIds, ...productData } = data;

  if (Object.keys(productData).length > 0) {
    // Update doble-bloqueo: WHERE id Y posCode (defense in depth).
    await db
      .update(products)
      .set(productData)
      .where(and(eq(products.id, id), eq(products.posCode, scope)));
  }

  if (branchIds) {
    await syncProductBranchAssignments(id, branchIds);
  }
}

export async function deleteProduct(
  id: number,
  userId: number,
  options?: PosScopeOptions,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const scope = resolvePosScope(options);

  const existing = await getProductById(id, userId, { posCode: scope });
  if (!existing) {
    throw new Error("Producto no encontrado para este suscriptor");
  }

  // Defense in depth: doble-filtro por posCode en el UPDATE.
  await db
    .update(products)
    .set({ isActive: false })
    .where(and(eq(products.id, id), eq(products.posCode, scope)));
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
  sku?: string;
  barcode?: string;
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
      imageUrl: productVariants.imageUrl,
      sku: productVariants.sku,
      barcode: productVariants.barcode,
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

export async function updateProductVariantImage(variantId: number, imageUrl: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(productVariants)
    .set({ imageUrl })
    .where(eq(productVariants.id, variantId));
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

/**
 * Crea una venta nueva.
 *
 * Opciones POS Scope (Opcion A - backward compatible):
 *   - posCode: marca la venta para un POS especifico (default 'legacy')
 *   - createdByUserId: staff que creo la venta (NULL si fue el owner directo)
 *
 * Sin opciones, comportamiento legacy: posCode='legacy', createdByUserId=NULL, status='active'.
 */
export async function createSale(
  data: {
    saleNumber: string;
    userId: number;
    subtotal: string;
    discount: string;
    tax: string;
    total: string;
    paymentMethod: "cash" | "card" | "transfer";
    notes?: string;
  },
  options?: {
    posCode?: string;
    createdByUserId?: number | null;
  },
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const insertValues: Record<string, unknown> = { ...data };
  if (options?.posCode) {
    insertValues.posCode = options.posCode;
  }
  if (options?.createdByUserId !== undefined) {
    insertValues.createdByUserId = options.createdByUserId;
  }
  // status='active' viene del default de la columna

  const result = await db.insert(sales).values(insertValues as InsertSale).$returningId();
  return result[0];
}

/**
 * Devuelve una venta por id, validando tenant (ownerUserId) y posCode.
 * Usado por endpoints scoped (abarrotes.sales.getById).
 *
 * Si el caller es el owner real, devuelve la venta.
 * Si no matchea ownerUserId o posCode, devuelve null (404).
 */
export async function getAbarrotesSaleById(
  saleId: number,
  ownerUserId: number,
  options?: { posCode?: string },
) {
  const db = await getDb();
  if (!db) return null;

  const conditions = [
    eq(sales.id, saleId),
    eq(sales.userId, ownerUserId),
  ];
  if (options?.posCode) {
    conditions.push(eq(sales.posCode, options.posCode));
  }

  const result = await db
    .select()
    .from(sales)
    .where(and(...conditions))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Cancela una venta. Cambia status a 'cancelled', marca cancelledAt y cancelledByUserId.
 *
 * Reglas:
 * - Solo ventas con status='active' pueden ser canceladas
 * - Si status='cancelled' o 'refunded', devuelve false (idempotente)
 * - Valida tenant: ownerUserId + posCode opcional
 *
 * IMPORTANTE: este helper NO valida permisos. El caller (router) debe
 * llamar assertPosPermission antes.
 *
 * Retorna true si la cancelacion ocurrio, false si la venta no se encontro o
 * ya estaba en un estado no-active.
 */
export async function cancelSale(args: {
  saleId: number;
  ownerUserId: number;
  cancelledByUserId: number;
  posCode?: string;
}): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verificar que existe y esta active
  const existing = await getAbarrotesSaleById(args.saleId, args.ownerUserId, {
    posCode: args.posCode,
  });
  if (!existing) return false;
  if (existing.status !== "active") return false;

  const conditions = [
    eq(sales.id, args.saleId),
    eq(sales.userId, args.ownerUserId),
    eq(sales.status, "active"),
  ];
  if (args.posCode) {
    conditions.push(eq(sales.posCode, args.posCode));
  }

  await db
    .update(sales)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledByUserId: args.cancelledByUserId,
    })
    .where(and(...conditions));

  return true;
}

/**
 * Marca una venta como devuelta (refunded). Registra timestamp, quien la
 * refundeo y la razon.
 *
 * Reglas:
 * - Solo ventas con status='active' pueden refundearse
 * - Si ya esta cancelled o refunded, devuelve false
 * - refundReason es obligatorio (el router lo valida con Zod)
 * - NO mueve inventario aqui (eso lo hace saleReturns)
 *
 * IMPORTANTE: este helper NO valida permisos. Caller debe llamar
 * assertPosPermission antes.
 */
export async function refundSale(args: {
  saleId: number;
  ownerUserId: number;
  refundedByUserId: number;
  refundReason: string;
  posCode?: string;
}): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getAbarrotesSaleById(args.saleId, args.ownerUserId, {
    posCode: args.posCode,
  });
  if (!existing) return false;
  if (existing.status !== "active") return false;

  const conditions = [
    eq(sales.id, args.saleId),
    eq(sales.userId, args.ownerUserId),
    eq(sales.status, "active"),
  ];
  if (args.posCode) {
    conditions.push(eq(sales.posCode, args.posCode));
  }

  await db
    .update(sales)
    .set({
      status: "refunded",
      refundedAt: new Date(),
      refundedByUserId: args.refundedByUserId,
      refundReason: args.refundReason,
    })
    .where(and(...conditions));

  return true;
}

/**
 * Lista ventas de un POS especifico para el owner.
 *
 * Filtros opcionales:
 *   - posCode: scope del POS (recomendado pasar siempre)
 *   - status: filtrar por estado (active, cancelled, refunded)
 *   - createdByUserId: filtrar por staff/owner que creo la venta
 *   - startDate, endDate: rango de fechas
 *   - limit: max resultados (default 100)
 *
 * Orden: createdAt desc (mas recientes primero).
 *
 * IMPORTANTE: este helper NO valida permisos. Caller decide si filtra
 * por createdByUserId (cashier que solo ve sus propias ventas, owner ve todas).
 */
export async function listAbarrotesSales(args: {
  ownerUserId: number;
  posCode?: string;
  status?: "active" | "cancelled" | "refunded";
  createdByUserId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(sales.userId, args.ownerUserId)];
  if (args.posCode) {
    conditions.push(eq(sales.posCode, args.posCode));
  }
  if (args.status) {
    conditions.push(eq(sales.status, args.status));
  }
  if (args.createdByUserId !== undefined) {
    conditions.push(eq(sales.createdByUserId, args.createdByUserId));
  }
  if (args.startDate) {
    conditions.push(gte(sales.createdAt, args.startDate));
  }
  if (args.endDate) {
    conditions.push(lte(sales.createdAt, args.endDate));
  }

  return await db
    .select()
    .from(sales)
    .where(and(...conditions))
    .orderBy(desc(sales.createdAt))
    .limit(args.limit ?? 100);
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

/**
 * Crea un movimiento de inventario.
 *
 * Opciones POS Scope (Opcion A - backward compatible):
 *   - posCode: marca el movimiento para un POS especifico (default 'legacy')
 *
 * Sin opciones, comportamiento legacy: posCode='legacy'.
 */
export async function createInventoryMovement(
  data: {
    productVariantId: number;
    movementType: "sale" | "adjustment" | "return" | "purchase";
    quantity: number;
    reason?: string;
    userId: number;
  },
  options?: {
    posCode?: string;
  },
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const insertValues: Record<string, unknown> = { ...data };
  if (options?.posCode) {
    insertValues.posCode = options.posCode;
  }

  const result = await db
    .insert(inventoryMovements)
    .values(insertValues as InsertInventoryMovement)
    .$returningId();
  return result[0];
}

/**
 * Lista movimientos de inventario de un POS para el owner.
 *
 * Filtros opcionales:
 *   - posCode: scope del POS (recomendado siempre pasar)
 *   - movementType: filtrar por tipo
 *   - productVariantId: filtrar por variante especifica
 *   - startDate, endDate: rango de fechas
 *   - limit: max resultados (default 100)
 *
 * Orden: createdAt desc.
 *
 * IMPORTANTE: filtra por userId del movimiento = ownerUserId. Esto requiere
 * que el movimiento haya sido creado con userId=ownerUserId (lo cual hace
 * el endpoint abarrotes.inventory.adjust automaticamente).
 */
export async function listAbarrotesInventoryMovements(args: {
  ownerUserId: number;
  posCode?: string;
  movementType?: "sale" | "adjustment" | "return" | "purchase";
  productVariantId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(inventoryMovements.userId, args.ownerUserId)];
  if (args.posCode) {
    conditions.push(eq(inventoryMovements.posCode, args.posCode));
  }
  if (args.movementType) {
    conditions.push(eq(inventoryMovements.movementType, args.movementType));
  }
  if (args.productVariantId !== undefined) {
    conditions.push(eq(inventoryMovements.productVariantId, args.productVariantId));
  }
  if (args.startDate) {
    conditions.push(gte(inventoryMovements.createdAt, args.startDate));
  }
  if (args.endDate) {
    conditions.push(lte(inventoryMovements.createdAt, args.endDate));
  }

  return await db
    .select()
    .from(inventoryMovements)
    .where(and(...conditions))
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(args.limit ?? 100);
}

// ============================================================================
// ABARROTES REPORTS (Commit 3c)
// ============================================================================

/**
 * Resumen ejecutivo de ventas para un POS y owner.
 *
 * Devuelve agregados:
 *   - totalSales: cantidad de ventas (status='active')
 *   - totalRevenue: suma de totales
 *   - averageTicket: promedio por venta
 *   - cancelledCount: ventas canceladas
 *   - refundedCount: ventas devueltas
 *   - byPaymentMethod: { cash, card, transfer }
 *
 * Filtros: rango de fechas (startDate, endDate).
 *
 * IMPORTANTE: no incluye costos/margen. Eso es reports.profit (otro helper).
 */
export async function getAbarrotesSalesSummary(args: {
  ownerUserId: number;
  posCode: string;
  startDate: Date;
  endDate: Date;
}) {
  const db = await getDb();
  if (!db) {
    return {
      totalSales: 0,
      totalRevenue: 0,
      averageTicket: 0,
      cancelledCount: 0,
      refundedCount: 0,
      byPaymentMethod: { cash: 0, card: 0, transfer: 0 },
    };
  }

  const allSales = await db
    .select()
    .from(sales)
    .where(
      and(
        eq(sales.userId, args.ownerUserId),
        eq(sales.posCode, args.posCode),
        gte(sales.createdAt, args.startDate),
        lte(sales.createdAt, args.endDate),
      ),
    );

  const active = allSales.filter((s) => s.status === "active");
  const cancelled = allSales.filter((s) => s.status === "cancelled");
  const refunded = allSales.filter((s) => s.status === "refunded");

  const totalRevenue = active.reduce(
    (sum, s) => sum + Number(s.total),
    0,
  );
  const averageTicket =
    active.length > 0 ? totalRevenue / active.length : 0;

  const byPaymentMethod = {
    cash: active
      .filter((s) => s.paymentMethod === "cash")
      .reduce((sum, s) => sum + Number(s.total), 0),
    card: active
      .filter((s) => s.paymentMethod === "card")
      .reduce((sum, s) => sum + Number(s.total), 0),
    transfer: active
      .filter((s) => s.paymentMethod === "transfer")
      .reduce((sum, s) => sum + Number(s.total), 0),
  };

  return {
    totalSales: active.length,
    totalRevenue,
    averageTicket,
    cancelledCount: cancelled.length,
    refundedCount: refunded.length,
    byPaymentMethod,
  };
}

/**
 * Top productos vendidos en un POS especifico para el owner.
 *
 * Hace JOIN sales -> saleDetails para agregar quantity por producto.
 * Solo cuenta ventas con status='active'.
 *
 * Devuelve top N (default 10) ordenado por quantity desc.
 */
export async function getAbarrotesTopProducts(args: {
  ownerUserId: number;
  posCode: string;
  startDate: Date;
  endDate: Date;
  limit?: number;
}): Promise<
  Array<{
    productVariantId: number;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
  }>
> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      productVariantId: saleDetails.productVariantId,
      productName: saleDetails.productName,
      totalQuantity: sql<number>`SUM(${saleDetails.quantity})`,
      totalRevenue: sql<number>`SUM(${saleDetails.lineTotal})`,
    })
    .from(saleDetails)
    .innerJoin(sales, eq(saleDetails.saleId, sales.id))
    .where(
      and(
        eq(sales.userId, args.ownerUserId),
        eq(sales.posCode, args.posCode),
        eq(sales.status, "active"),
        gte(sales.createdAt, args.startDate),
        lte(sales.createdAt, args.endDate),
      ),
    )
    .groupBy(saleDetails.productVariantId, saleDetails.productName)
    .orderBy(sql`SUM(${saleDetails.quantity}) DESC`)
    .limit(args.limit ?? 10);

  return rows.map((r) => ({
    productVariantId: r.productVariantId,
    productName: r.productName,
    totalQuantity: Number(r.totalQuantity),
    totalRevenue: Number(r.totalRevenue),
  }));
}

/**
 * Ventas agrupadas por cashier (createdByUserId) para un POS.
 *
 * Util para que el owner vea desempeno de su equipo.
 * Solo cuenta ventas con status='active'.
 *
 * Si createdByUserId es NULL (venta legacy o creada directamente por owner),
 * se agrupa como ownerUserId.
 */
export async function getAbarrotesSalesByCashier(args: {
  ownerUserId: number;
  posCode: string;
  startDate: Date;
  endDate: Date;
}): Promise<
  Array<{
    cashierUserId: number;
    cashierName: string;
    totalSales: number;
    totalRevenue: number;
  }>
> {
  const db = await getDb();
  if (!db) return [];

  // Subquery: ventas active del POS en el rango
  const salesData = await db
    .select({
      createdByUserId: sales.createdByUserId,
      total: sales.total,
    })
    .from(sales)
    .where(
      and(
        eq(sales.userId, args.ownerUserId),
        eq(sales.posCode, args.posCode),
        eq(sales.status, "active"),
        gte(sales.createdAt, args.startDate),
        lte(sales.createdAt, args.endDate),
      ),
    );

  // Agrupar en memoria por cashier
  const grouped = new Map<
    number,
    { totalSales: number; totalRevenue: number }
  >();

  for (const sale of salesData) {
    // Si no hay createdByUserId, atribuir al owner
    const cashierId = sale.createdByUserId ?? args.ownerUserId;
    const existing = grouped.get(cashierId) ?? {
      totalSales: 0,
      totalRevenue: 0,
    };
    existing.totalSales += 1;
    existing.totalRevenue += Number(sale.total);
    grouped.set(cashierId, existing);
  }

  // Enriquecer con nombres
  const result: Array<{
    cashierUserId: number;
    cashierName: string;
    totalSales: number;
    totalRevenue: number;
  }> = [];

  for (const [cashierId, stats] of grouped.entries()) {
    const userRows = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, cashierId))
      .limit(1);

    const name = userRows[0]?.name ?? userRows[0]?.email ?? `User ${cashierId}`;

    result.push({
      cashierUserId: cashierId,
      cashierName: name,
      totalSales: stats.totalSales,
      totalRevenue: stats.totalRevenue,
    });
  }

  return result.sort((a, b) => b.totalRevenue - a.totalRevenue);
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
  programCode: "boutique" | "abarrotes" | "celine" | "veterinaria",
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

// ============ ANALYTICS BOUTIQUE ============

export async function getTopSellingProductsOfMonth(userId: number, limit: number = 5) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
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
        eq(sales.userId, userId),
        gte(sales.createdAt, monthStart),
        lte(sales.createdAt, monthEnd)
      )
    )
    .groupBy(saleDetails.productName)
    .orderBy(desc(sql<number>`SUM(${saleDetails.quantity})`))
    .limit(limit);
}

export async function getSalesByVariantAttributes(userId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return { bySizes: [], byColors: [] };
  const since = new Date();
  since.setDate(since.getDate() - days);
  const rows = await db
    .select({
      size: saleDetails.size,
      color: saleDetails.color,
      totalQuantity: sql<number>`SUM(${saleDetails.quantity})`,
    })
    .from(saleDetails)
    .innerJoin(sales, eq(saleDetails.saleId, sales.id))
    .where(and(eq(sales.userId, userId), gte(sales.createdAt, since)))
    .groupBy(saleDetails.size, saleDetails.color)
    .orderBy(desc(sql<number>`SUM(${saleDetails.quantity})`));

  const sizeMap = new Map<string, number>();
  const colorMap = new Map<string, number>();
  for (const row of rows) {
    if (row.size) sizeMap.set(row.size, (sizeMap.get(row.size) || 0) + Number(row.totalQuantity));
    if (row.color) colorMap.set(row.color, (colorMap.get(row.color) || 0) + Number(row.totalQuantity));
  }
  const bySizes = Array.from(sizeMap.entries())
    .map(([size, qty]) => ({ size, totalQuantity: qty }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 8);
  const byColors = Array.from(colorMap.entries())
    .map(([color, qty]) => ({ color, totalQuantity: qty }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 8);
  return { bySizes, byColors };
}

export async function getProductsWithoutMovement(userId: number, days: number = 30) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  const allProds = await db
    .selectDistinct({ id: products.id, name: products.name })
    .from(products)
    .innerJoin(productBranchAssignments, eq(productBranchAssignments.productId, products.id))
    .innerJoin(branches, eq(productBranchAssignments.branchId, branches.id))
    .where(and(eq(branches.userId, userId), eq(branches.isActive, true), eq(products.isActive, true)));
  if (allProds.length === 0) return [];
  const activeSales = await db
    .selectDistinct({ productName: saleDetails.productName })
    .from(saleDetails)
    .innerJoin(sales, eq(saleDetails.saleId, sales.id))
    .where(and(eq(sales.userId, userId), gte(sales.createdAt, since)));
  const activeNames = new Set(activeSales.map((s) => s.productName));
  return allProds.filter((p) => !activeNames.has(p.name));
}

export async function getSalesPeriodComparison(userId: number) {
  const db = await getDb();
  if (!db) return { thisWeek: 0, lastWeek: 0, thisMonth: 0, lastMonth: 0, thisWeekRevenue: 0, lastWeekRevenue: 0, thisMonthRevenue: 0, lastMonthRevenue: 0 };
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
  const query = async (start: Date, end: Date) => {
    const rows = await db!
      .select({ count: sql<number>`COUNT(${sales.id})`, revenue: sql<string>`COALESCE(SUM(${sales.total}), 0)` })
      .from(sales)
      .where(and(eq(sales.userId, userId), gte(sales.createdAt, start), lte(sales.createdAt, end)));
    return { count: Number(rows[0]?.count || 0), revenue: Number(rows[0]?.revenue || 0) };
  };
  const [tw, lw, tm, lm] = await Promise.all([
    query(thisWeekStart, now),
    query(lastWeekStart, lastWeekEnd),
    query(thisMonthStart, now),
    query(lastMonthStart, lastMonthEnd),
  ]);
  return { thisWeek: tw.count, lastWeek: lw.count, thisMonth: tm.count, lastMonth: lm.count, thisWeekRevenue: tw.revenue, lastWeekRevenue: lw.revenue, thisMonthRevenue: tm.revenue, lastMonthRevenue: lm.revenue };
}

export async function getReturnsOfMonth(userId: number) {
  const db = await getDb();
  if (!db) return { total: 0, byReason: [] as { reason: string; count: number }[] };
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const returns = await db
    .select({ id: saleReturns.id, reason: saleReturns.reason })
    .from(saleReturns)
    .innerJoin(sales, eq(saleReturns.saleId, sales.id))
    .where(and(eq(sales.userId, userId), gte(saleReturns.createdAt, monthStart), lte(saleReturns.createdAt, monthEnd)));
  const reasonMap = new Map<string, number>();
  for (const r of returns) {
    const key = r.reason || "Sin motivo";
    reasonMap.set(key, (reasonMap.get(key) || 0) + 1);
  }
  const byReason = Array.from(reasonMap.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
  return { total: returns.length, byReason };
}

// ============ ADMIN PANEL — USUARIOS CON ESTADO DE ACCESO ============

/**
 * Devuelve todos los usuarios con su estado en userProgramAccess (boutique).
 * Usado por el panel AdminCyberpiezas para mostrar correctamente quién está
 * activo, pendiente o inactivo.
 */
export async function getAllUsersWithProgramAccess() {
  const db = await getDb();
  if (!db) return [];

  const allUsers = await db
    .select()
    .from(users)
    .orderBy(asc(users.createdAt));

  if (allUsers.length === 0) return [];

  // ==========================================================================
  // FUENTE 1: userProgramAccess (legacy)
  // Tabla con enum cerrado: boutique, abarrotes, veterinaria, celine.
  // Se sigue leyendo para no romper usuarios que todavia tienen acceso solo
  // por esta via (fallback nivel 2 del hibrido hasAccess).
  // ==========================================================================
  const allLegacyAccess = await db
    .select()
    .from(userProgramAccess);

  const legacyByUserAndCode = new Map<number, Record<string, typeof allLegacyAccess[number]>>();
  for (const a of allLegacyAccess) {
    if (!legacyByUserAndCode.has(a.userId)) {
      legacyByUserAndCode.set(a.userId, {});
    }
    legacyByUserAndCode.get(a.userId)![a.programCode] = a;
  }

  // ==========================================================================
  // FUENTE 2: subscriptions (Subscription Core V1)
  // Tabla nueva con posCode VARCHAR libre. Soporta los 7 POS actuales y
  // futuros sin tocar enums. Aqui es la fuente principal de vigencia.
  // ==========================================================================
  const allSubs = await db
    .select()
    .from(subscriptions);

  const subsByUserAndPos = new Map<number, Record<string, typeof allSubs[number]>>();
  for (const s of allSubs) {
    if (!subsByUserAndPos.has(s.userId)) {
      subsByUserAndPos.set(s.userId, {});
    }
    subsByUserAndPos.get(s.userId)![s.posCode] = s;
  }

  // ==========================================================================
  // POS soportados en el panel admin.
  // - Los 3 del enum legacy + celine (historico) siguen para no romper UI vieja.
  // - Los 4 nuevos (verduleria, tarima, taqueria, papeleria) ahora visibles
  //   gracias a la lectura de subscriptions.
  // ==========================================================================
  const ALL_POS = [
    "boutique",
    "abarrotes",
    "veterinaria",
    "celine",
    "verduleria",
    "tarima",
    "taqueria",
    "papeleria",
  ] as const;

  // ==========================================================================
  // Helper de merge: decide el "acceso efectivo" para un par (user, posCode).
  // Aplica las 4 reglas de prioridad acordadas con ChatGPT:
  //   1. Sub activa vigente: gana, source="subscription"
  //   2. Sin sub vigente pero legacy activo: source="legacy_program_access"
  //   3. Sub vencida/cancelada y NO hay legacy activo: refleja la sub historica
  //   4. Nada: shape vacio
  // ==========================================================================
  function mergeAccess(legacy: any, sub: any, now: Date) {
    // Caso 1: sub activa vigente gana sobre todo
    if (sub && sub.status === "active" && new Date(sub.currentPeriodEnd) > now) {
      return {
        active: true,
        source: "subscription" as const,
        status: "active" as const,
        endDate: sub.currentPeriodEnd as Date,
        planType: sub.planType as "monthly" | "annual" | null,
        sourceType: sub.sourceType as
          | "payment"
          | "courtesy"
          | "admin_grant"
          | "migration"
          | null,
        subscriptionId: sub.id as number,
      };
    }

    // Caso 2: sin sub vigente, pero legacy esta activo
    if (legacy && legacy.status === "active") {
      return {
        active: true,
        source: "legacy_program_access" as const,
        status: "active" as const,
        endDate: null,
        planType: null,
        sourceType: null,
        subscriptionId: null,
      };
    }

    // Caso 3: sub vencida o cancelada, sin legacy activo
    if (sub) {
      const subStatus =
        sub.status === "cancelled" ? ("cancelled" as const) : ("expired" as const);
      return {
        active: false,
        source: "subscription" as const,
        status: subStatus,
        endDate: sub.currentPeriodEnd as Date,
        planType: sub.planType as "monthly" | "annual" | null,
        sourceType: sub.sourceType as
          | "payment"
          | "courtesy"
          | "admin_grant"
          | "migration"
          | null,
        subscriptionId: sub.id as number,
      };
    }

    // Caso 4: nada de nada
    return {
      active: false,
      source: "none" as const,
      status: "none" as const,
      endDate: null,
      planType: null,
      sourceType: null,
      subscriptionId: null,
    };
  }

  // ==========================================================================
  // Construir el resultado por usuario
  // ==========================================================================
  const now = new Date();

  return allUsers.map((u) => {
    const userLegacy = legacyByUserAndCode.get(u.id) ?? {};
    const userSubs = subsByUserAndPos.get(u.id) ?? {};

    // Construir el mapa de accesos por POS con el shape nuevo (aditivo)
    const programAccesses: Record<string, ReturnType<typeof mergeAccess>> = {};
    for (const code of ALL_POS) {
      programAccesses[code] = mergeAccess(userLegacy[code], userSubs[code], now);
    }

    // Mantener compatibilidad legacy:
    // programAccess (singular) apunta al row crudo de userProgramAccess para boutique.
    // Algunos consumidores viejos podrian seguir leyendolo.
    const boutiqueLegacy = userLegacy["boutique"] ?? null;

    return {
      user: u,
      programAccess: boutiqueLegacy,
      programAccesses,
      status: boutiqueLegacy?.status ?? "pending",
    };
  });
}

// ─── CUSTOMERS ───────────────────────────────────────────────────────────────

export async function searchCustomers(userId: number, query: string) {
  const db = await getDb();
  if (!db) return [];
  const q = `%${query}%`;
  return await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.userId, userId),
        or(
          like(customers.name, q),
          like(customers.phone, q),
          like(customers.email, q),
        ),
      ),
    )
    .orderBy(asc(customers.name))
    .limit(10);
}

export async function createCustomer(data: {
  userId: number;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("No DB");
  const result = await db.insert(customers).values(data);
  const id = (result as any).insertId as number;
  const rows = await db.select().from(customers).where(eq(customers.id, id));
  return rows[0];
}

export async function listCustomers(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(customers)
    .where(eq(customers.userId, userId))
    .orderBy(asc(customers.name));
}


// ============================================================================
// VETERINARIA CASHIERS - Storage methods (CRUD scoped by ownerUserId)
// ============================================================================

export async function createVetCashier(data: {
  ownerUserId: number;
  name: string;
  email: string;
  passwordHash: string;
  role?: "doctor" | "asistente" | "recepcionista";
  branchName?: string;
}): Promise<VeterinariaCashier> {
  const conn = await getDbOrThrow();
  const result = await conn.insert(veterinariaCashiers).values({
    ownerUserId: data.ownerUserId,
    name: data.name.trim(),
    email: data.email.toLowerCase().trim(),
    passwordHash: data.passwordHash,
    role: data.role ?? "asistente",
    branchName: (data.branchName ?? "").trim(),
  });
  const id = (result as any).insertId as number;
  const rows = await conn
    .select()
    .from(veterinariaCashiers)
    .where(eq(veterinariaCashiers.id, id))
    .limit(1);
  if (!rows[0]) throw new Error("Error al crear cajero veterinaria");
  return rows[0];
}

export async function listVetCashiers(
  ownerUserId: number,
  options?: { status?: "active" | "inactive" | "all" },
): Promise<VeterinariaCashier[]> {
  const conn = await getDb();
  if (!conn) return [];
  const status = options?.status ?? "all";
  const baseQuery = conn
    .select()
    .from(veterinariaCashiers)
    .where(
      status === "all"
        ? eq(veterinariaCashiers.ownerUserId, ownerUserId)
        : and(
            eq(veterinariaCashiers.ownerUserId, ownerUserId),
            eq(veterinariaCashiers.status, status),
          ),
    )
    .orderBy(asc(veterinariaCashiers.name));
  return await baseQuery;
}

export async function getVetCashierById(
  id: number,
  ownerUserId: number,
): Promise<VeterinariaCashier | null> {
  const conn = await getDb();
  if (!conn) return null;
  const rows = await conn
    .select()
    .from(veterinariaCashiers)
    .where(
      and(
        eq(veterinariaCashiers.id, id),
        eq(veterinariaCashiers.ownerUserId, ownerUserId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getVetCashierByEmail(
  email: string,
  ownerUserId: number,
): Promise<VeterinariaCashier | null> {
  const conn = await getDb();
  if (!conn) return null;
  const rows = await conn
    .select()
    .from(veterinariaCashiers)
    .where(
      and(
        eq(veterinariaCashiers.email, email.toLowerCase().trim()),
        eq(veterinariaCashiers.ownerUserId, ownerUserId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function updateVetCashier(
  id: number,
  ownerUserId: number,
  data: {
    name?: string;
    email?: string;
    passwordHash?: string;
    role?: "doctor" | "asistente" | "recepcionista";
    branchName?: string;
  },
): Promise<VeterinariaCashier | null> {
  const conn = await getDbOrThrow();
  const updateSet: Record<string, unknown> = {};
  if (data.name !== undefined) updateSet.name = data.name.trim();
  if (data.email !== undefined) updateSet.email = data.email.toLowerCase().trim();
  if (data.passwordHash !== undefined) updateSet.passwordHash = data.passwordHash;
  if (data.role !== undefined) updateSet.role = data.role;
  if (data.branchName !== undefined) updateSet.branchName = data.branchName.trim();
  if (Object.keys(updateSet).length === 0) return getVetCashierById(id, ownerUserId);
  await conn
    .update(veterinariaCashiers)
    .set(updateSet)
    .where(
      and(
        eq(veterinariaCashiers.id, id),
        eq(veterinariaCashiers.ownerUserId, ownerUserId),
      ),
    );
  return getVetCashierById(id, ownerUserId);
}

export async function setVetCashierStatus(
  id: number,
  ownerUserId: number,
  status: "active" | "inactive",
): Promise<VeterinariaCashier | null> {
  const conn = await getDbOrThrow();
  await conn
    .update(veterinariaCashiers)
    .set({ status })
    .where(
      and(
        eq(veterinariaCashiers.id, id),
        eq(veterinariaCashiers.ownerUserId, ownerUserId),
      ),
    );
  return getVetCashierById(id, ownerUserId);
}

export async function deleteVetCashier(
  id: number,
  ownerUserId: number,
): Promise<{ success: boolean }> {
  const conn = await getDbOrThrow();
  await conn
    .delete(veterinariaCashiers)
    .where(
      and(
        eq(veterinariaCashiers.id, id),
        eq(veterinariaCashiers.ownerUserId, ownerUserId),
      ),
    );
  return { success: true };
}


// ============================================================================
// SUBSCRIPTION CORE V1 - Helpers para gestion de suscripciones
//
// Estos helpers son la API principal para interactuar con la tabla subscriptions.
// Implementan:
//   - Idempotencia en 2 capas (status check + lastPaymentRequestId match)
//   - Vigencias acumulativas (regla 9 de ChatGPT: extender desde currentPeriodEnd
//     si la sub previa sigue vigente, NO desde now)
//   - Aritmetica de meses calendario con setMonth/setFullYear (regla 3 ChatGPT)
//   - hasAccess hibrido con 3 niveles de fallback para no romper usuarios legacy
//
// La tabla subscriptions se creo manualmente con SQL antes que estos helpers.
// Los indices secundarios viven en MySQL y se usan automaticamente en queries.
// ============================================================================

/**
 * Calcula la nueva fecha de vencimiento usando aritmetica de meses calendario.
 * NO suma 30 o 365 dias, suma 1 mes o 1 ano completo del calendario.
 *
 * Ejemplos:
 *   addPeriod(2026-01-31, "monthly") = 2026-02-28 (no 2026-03-02)
 *   addPeriod(2026-05-19, "annual")  = 2027-05-19
 *
 * Esto cumple la expectativa del cliente: si pago el dia X, vence el dia X
 * del mes siguiente.
 */
function addPeriod(baseDate: Date, planType: "monthly" | "annual"): Date {
  const result = new Date(baseDate);
  if (planType === "monthly") {
    result.setMonth(result.getMonth() + 1);
  } else {
    result.setFullYear(result.getFullYear() + 1);
  }
  return result;
}

/**
 * Crea una nueva suscripcion o renueva una existente para el par (userId, posCode).
 *
 * Reglas de negocio:
 * - Si existe sub vigente (status='active' y currentPeriodEnd > now):
 *     baseDate = currentPeriodEnd (EXTENDER vigencia, no reiniciar)
 * - Si existe sub vencida o cancelled, o no existe sub:
 *     baseDate = now (empezar desde hoy)
 * - newPeriodEnd = baseDate + 1 mes o 1 ano segun planType
 *
 * Idempotencia capa 2:
 * - Si la sub existente ya tiene lastPaymentRequestId === input.paymentRequestId,
 *   se considera ya procesado y retorna la sub existente sin cambios.
 *
 * Metadata se mergea con la existente (no se sobrescribe), preservando audit trail.
 *
 * @returns { subscription, wasRenewal } donde wasRenewal=true si extendio
 *          vigencia previa, false si fue creacion o reinicio desde now
 */
export async function createOrRenewSubscription(params: {
  userId: number;
  posCode: string;
  planType: "monthly" | "annual";
  paymentRequestId?: number | null;
  sourceType?: "payment" | "courtesy" | "migration" | "admin_grant";
  grantedByUserId?: number | null;
  metadata?: Record<string, unknown> | null;
}): Promise<{ subscription: Subscription; wasRenewal: boolean }> {
  const conn = await getDbOrThrow();

  const sourceType = params.sourceType ?? "payment";
  const paymentRequestId = params.paymentRequestId ?? null;
  const grantedByUserId = params.grantedByUserId ?? null;
  const inputMetadata = params.metadata ?? null;

  // Buscar sub existente para el par (userId, posCode) - es UNIQUE en la BD
  const existing = await conn
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, params.userId),
        eq(subscriptions.posCode, params.posCode),
      ),
    )
    .limit(1);

  const sub = existing[0];
  const now = new Date();

  // Idempotencia capa 2: mismo paymentRequestId ya procesado, no-op
  if (
    sub &&
    paymentRequestId !== null &&
    sub.lastPaymentRequestId === paymentRequestId
  ) {
    return { subscription: sub, wasRenewal: false };
  }

  // Determinar baseDate segun regla 9 (extender) o regla 10 (reiniciar)
  const hasVigente =
    !!sub &&
    sub.status === "active" &&
    new Date(sub.currentPeriodEnd) > now;

  const baseDate = hasVigente ? new Date(sub!.currentPeriodEnd) : now;
  const newPeriodEnd = addPeriod(baseDate, params.planType);

  // Merge metadata: preservar info anterior (audit trail) + agregar nuevo
  let mergedMetadata: Record<string, unknown> | null = null;
  if (sub?.metadata || inputMetadata) {
    const prev = (sub?.metadata as Record<string, unknown> | null) ?? {};
    const incoming = inputMetadata ?? {};
    mergedMetadata = { ...prev, ...incoming };
  }

  if (sub) {
    // UPDATE: renovar/reactivar la sub existente
    await conn
      .update(subscriptions)
      .set({
        status: "active",
        planType: params.planType,
        currentPeriodStart: hasVigente ? sub.currentPeriodStart : now,
        currentPeriodEnd: newPeriodEnd,
        sourceType,
        lastPaymentRequestId: paymentRequestId,
        grantedByUserId,
        metadata: mergedMetadata,
        cancelledAt: null,
      })
      .where(eq(subscriptions.id, sub.id));

    const updatedRows = await conn
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, sub.id))
      .limit(1);

    return { subscription: updatedRows[0], wasRenewal: hasVigente };
  }

  // INSERT: crear nueva sub
  const insertPayload: InsertSubscription = {
    userId: params.userId,
    posCode: params.posCode,
    planType: params.planType,
    status: "active",
    sourceType,
    currentPeriodStart: now,
    currentPeriodEnd: newPeriodEnd,
    lastPaymentRequestId: paymentRequestId,
    grantedByUserId,
    metadata: mergedMetadata,
  };

  const insertResult = await conn
    .insert(subscriptions)
    .values(insertPayload)
    .$returningId();

  const newId = insertResult[0]?.id;
  if (!newId) {
    throw new Error("No se pudo crear la suscripcion");
  }

  const createdRows = await conn
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, newId))
    .limit(1);

  return { subscription: createdRows[0], wasRenewal: false };
}

/**
 * Determina si un usuario tiene acceso activo a un POS, con fallback hibrido.
 *
 * Niveles de busqueda en orden:
 *   NIVEL 1 - subscriptions (fuente de verdad nueva)
 *     Busca sub active con currentPeriodEnd > now
 *
 *   NIVEL 2 - userProgramAccess (legacy enum: boutique, abarrotes, veterinaria)
 *     Solo aplica para los 3 POS del enum legacy. Status='active'.
 *
 *   NIVEL 3 - transferPaymentRequests aprobados con periodEnd vigente
 *     El posCode vive dentro de notes JSON, hay que parsear.
 *
 * @returns { hasAccess, source, detail } - source indica de donde vino el acceso,
 *          util para debugging y observabilidad.
 */
export async function getSubscriptionState(params: {
  userId: number;
  posCode: string;
}): Promise<{
  hasAccess: boolean;
  source: "subscription" | "legacy_program_access" | "legacy_payment" | "none";
  detail: {
    posCode: string;
    expiresAt?: Date | null;
    planType?: string;
    sourceType?: string;
  } | null;
}> {
  const conn = await getDbOrThrow();
  const now = new Date();

  // NIVEL 1: subscriptions (fuente de verdad)
  const subRows = await conn
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, params.userId),
        eq(subscriptions.posCode, params.posCode),
        eq(subscriptions.status, "active"),
        gte(subscriptions.currentPeriodEnd, now),
      ),
    )
    .limit(1);

  if (subRows.length > 0) {
    const sub = subRows[0];
    return {
      hasAccess: true,
      source: "subscription",
      detail: {
        posCode: sub.posCode,
        expiresAt: sub.currentPeriodEnd,
        planType: sub.planType,
        sourceType: sub.sourceType,
      },
    };
  }

  // NIVEL 2: userProgramAccess (solo para los 3 POS del enum legacy)
  const legacyEnumPOS = ["boutique", "abarrotes", "veterinaria"];
  if (legacyEnumPOS.includes(params.posCode)) {
    const upaRows = await conn
      .select()
      .from(userProgramAccess)
      .where(
        and(
          eq(userProgramAccess.userId, params.userId),
          eq(
            userProgramAccess.programCode,
            params.posCode as "boutique" | "abarrotes" | "veterinaria",
          ),
          eq(userProgramAccess.status, "active"),
        ),
      )
      .limit(1);

    if (upaRows.length > 0) {
      return {
        hasAccess: true,
        source: "legacy_program_access",
        detail: { posCode: params.posCode },
      };
    }
  }

  // NIVEL 3: transferPaymentRequests aprobados con periodEnd vigente
  // El posCode vive dentro de notes JSON (text column), hay que parsear
  const payRows = await conn
    .select()
    .from(transferPaymentRequests)
    .where(
      and(
        eq(transferPaymentRequests.userId, params.userId),
        eq(transferPaymentRequests.status, "approved"),
        gte(transferPaymentRequests.periodEnd, now),
      ),
    );

  for (const pay of payRows) {
    try {
      const data = pay.notes
        ? (JSON.parse(pay.notes) as { posCode?: string })
        : {};
      if (data.posCode === params.posCode) {
        return {
          hasAccess: true,
          source: "legacy_payment",
          detail: {
            posCode: params.posCode,
            expiresAt: pay.periodEnd,
          },
        };
      }
    } catch {
      // JSON corrupto: ignorar este registro y seguir buscando
    }
  }

  // Nada encontrado en los 3 niveles
  return { hasAccess: false, source: "none", detail: null };
}

/**
 * Lista todas las suscripciones de un usuario (activas, expiradas, canceladas).
 * Util para el panel "Mis Suscripciones" y AdminCyberpiezas.
 *
 * Ordenadas por currentPeriodEnd descendente (las vigentes primero).
 *
 * NO incluye fallback legacy: solo lee de la tabla subscriptions.
 * Para verificar acceso real con fallback, usar getSubscriptionState().
 */
export async function listSubscriptionsByUser(
  userId: number,
): Promise<Subscription[]> {
  const conn = await getDbOrThrow();
  const rows = await conn
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.currentPeriodEnd));
  return rows;
}

/**
 * Cancela manualmente una suscripcion. NO realiza reembolso automatico.
 *
 * Cambios al row:
 *   - status = 'cancelled'
 *   - cancelledAt = now
 *   - metadata.cancelReason = razon dada
 *   - metadata.cancelledByUserId = quien la cancelo (admin)
 *
 * Los pagos historicos en transferPaymentRequests quedan intactos como bitacora.
 */
export async function revokeSubscription(params: {
  userId: number;
  posCode: string;
  reason: string;
  revokedByUserId?: number | null;
}): Promise<{ success: boolean }> {
  const conn = await getDbOrThrow();

  const existing = await conn
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, params.userId),
        eq(subscriptions.posCode, params.posCode),
      ),
    )
    .limit(1);

  const sub = existing[0];
  if (!sub) {
    return { success: false };
  }

  const prev = (sub.metadata as Record<string, unknown> | null) ?? {};
  const newMetadata = {
    ...prev,
    cancelReason: params.reason,
    cancelledByUserId: params.revokedByUserId ?? null,
    cancelledAtIso: new Date().toISOString(),
  };

  await conn
    .update(subscriptions)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      metadata: newMetadata,
    })
    .where(eq(subscriptions.id, sub.id));

  return { success: true };
}


/**
 * Calcula el preview de lo que pasaria al aprobar/activar una suscripcion
 * para el par (userId, posCode) con un planType dado. NO modifica nada.
 *
 * Comparte la misma logica que createOrRenewSubscription pero en modo read-only.
 * Usado por pagos.admin.previewApproval para mostrar al admin que sucedera
 * antes de hacer click en aprobar.
 *
 * Escenarios:
 *   - new: no existe subscription previa para (userId, posCode)
 *   - renewal: existe sub activa con currentPeriodEnd > now (se extiende)
 *   - reactivation: existe sub pero vencida/cancelada (empieza desde now)
 *
 * @returns scenario, fecha actual (si existe), fecha futura tras aprobar
 */
export async function previewSubscriptionRenewal(params: {
  userId: number;
  posCode: string;
  planType: "monthly" | "annual";
}): Promise<{
  scenario: "new" | "renewal" | "reactivation";
  currentPeriodEnd: Date | null;
  futurePeriodEnd: Date;
}> {
  const conn = await getDbOrThrow();

  // Buscar sub existente para el par (userId, posCode) - es UNIQUE en la BD
  const existing = await conn
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, params.userId),
        eq(subscriptions.posCode, params.posCode),
      ),
    )
    .limit(1);

  const sub = existing[0];
  const now = new Date();

  // Caso new: nunca ha existido sub para este par
  if (!sub) {
    return {
      scenario: "new",
      currentPeriodEnd: null,
      futurePeriodEnd: addPeriod(now, params.planType),
    };
  }

  // Caso renewal: sub vigente (status active y periodEnd > now)
  // Extiende desde currentPeriodEnd (regla 9 de Subscription Core V1)
  const isVigente =
    sub.status === "active" && new Date(sub.currentPeriodEnd) > now;

  if (isVigente) {
    return {
      scenario: "renewal",
      currentPeriodEnd: new Date(sub.currentPeriodEnd),
      futurePeriodEnd: addPeriod(new Date(sub.currentPeriodEnd), params.planType),
    };
  }

  // Caso reactivation: sub vencida o cancelada, empezar desde now
  return {
    scenario: "reactivation",
    currentPeriodEnd: new Date(sub.currentPeriodEnd),
    futurePeriodEnd: addPeriod(now, params.planType),
  };
}

// ============================================================================
// POS STAFF V1 - Catalogo de permisos y roles preset
// ----------------------------------------------------------------------------
// 17 permisos granulares. Presencia de row en posStaffPermissions
// con allowed=1 = permiso concedido. Ausencia = denegado.
//
// IMPORTANTE: este catalogo es la fuente de verdad. El frontend lo lee
// via endpoint en Commit 2. Si agregas un permiso, hazlo SOLO aqui.
// ============================================================================

export const POS_PERMISSIONS = {
  // Ventas
  "sales.create": "Crear ventas",
  "sales.cancel": "Cancelar ventas",
  "sales.refund": "Hacer devoluciones",
  "sales.view_history": "Ver historial de ventas",

  // Productos
  "products.view": "Ver productos",
  "products.create": "Crear productos",
  "products.edit": "Editar productos",
  "products.delete": "Eliminar productos",

  // Inventario
  "inventory.view": "Ver inventario",
  "inventory.adjust": "Ajustar inventario",

  // Reportes
  "reports.view": "Ver reportes basicos",
  "reports.profit": "Ver ganancias y costos",
  "reports.export": "Exportar reportes",

  // Configuracion
  "settings.edit": "Editar configuracion del POS",
  "staff.manage": "Gestionar cajeros y permisos",

  // Descuentos
  "discounts.apply": "Aplicar descuentos limitados",
  "discounts.unlimited": "Aplicar descuentos sin limite",
} as const;

export type PosPermission = keyof typeof POS_PERMISSIONS;

// Presets de rol: definen que permisos vienen activos por default.
// Owner NO se modela aqui - el owner tiene acceso total siempre.
export const POS_ROLE_PRESETS: Record<"manager" | "cashier", PosPermission[]> = {
  manager: [
    "sales.create",
    "sales.cancel",
    "sales.refund",
    "sales.view_history",
    "products.view",
    "products.create",
    "products.edit",
    "inventory.view",
    "inventory.adjust",
    "reports.view",
    "reports.export",
    "discounts.apply",
    // NO incluidos por default (owner debe activar explicitamente):
    // - products.delete
    // - reports.profit
    // - settings.edit
    // - staff.manage
    // - discounts.unlimited
  ],
  cashier: [
    "sales.create",
    "sales.view_history",
    "products.view",
    "inventory.view",
    "discounts.apply",
    // NO incluidos:
    // - sales.cancel, sales.refund
    // - products.create/edit/delete
    // - inventory.adjust
    // - reports.* (todos)
    // - settings.edit, staff.manage
    // - discounts.unlimited
  ],
};

// ============================================================================
// POS STAFF V1 - Helpers DB (puros, sin trpc, sin sesion)
// ============================================================================

/**
 * Crea un staff member nuevo y le asigna los permisos del preset (o custom).
 * Si rolePreset='custom', no asigna permisos por defecto - el caller debe
 * llamar setPosStaffPermissions despues.
 *
 * Devuelve el row del staff creado con sus permisos.
 *
 * Errores:
 * - BAD_REQUEST si staffUserId no existe en users
 * - FK violation si ownerUserId/createdByUserId/branchId no existen
 * - UNIQUE violation si ya existe (ownerUserId, staffUserId, posCode, branchId)
 */
export async function createPosStaff(data: {
  ownerUserId: number;
  staffUserId: number;
  posCode: PosStaff["posCode"];
  branchId?: number | null;
  rolePreset: "manager" | "cashier" | "custom";
  createdByUserId: number;
  customPermissions?: PosPermission[];
}): Promise<{ staff: PosStaff; permissions: PosStaffPermission[] }> {
  const conn = await getDbOrThrow();

  // Validar que el staffUser existe (la FK lo hara, pero error mas claro aqui)
  const userRows = await conn
    .select()
    .from(users)
    .where(eq(users.id, data.staffUserId))
    .limit(1);
  if (!userRows[0]) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Usuario destino no existe en el sistema",
    });
  }

  // Insertar el staff
  const insertRes = await conn.insert(posStaff).values({
    ownerUserId: data.ownerUserId,
    staffUserId: data.staffUserId,
    posCode: data.posCode,
    branchId: data.branchId ?? null,
    rolePreset: data.rolePreset,
    status: "active",
    createdByUserId: data.createdByUserId,
  });
  const staffId = (insertRes as any).insertId as number;

  // Determinar permisos: preset o custom
  const permsToInsert: PosPermission[] =
    data.rolePreset === "custom"
      ? data.customPermissions ?? []
      : POS_ROLE_PRESETS[data.rolePreset];

  if (permsToInsert.length > 0) {
    await conn.insert(posStaffPermissions).values(
      permsToInsert.map((perm) => ({
        staffId,
        permission: perm,
        allowed: 1,
      })),
    );
  }

  // Fetch back para devolver con timestamps
  const createdStaffRows = await conn
    .select()
    .from(posStaff)
    .where(eq(posStaff.id, staffId))
    .limit(1);

  const createdPerms = await conn
    .select()
    .from(posStaffPermissions)
    .where(eq(posStaffPermissions.staffId, staffId));

  return { staff: createdStaffRows[0], permissions: createdPerms };
}

/**
 * Lista todos los staff de un owner. Opcionalmente filtra por posCode.
 * Tenant isolation: solo devuelve staff del ownerUserId.
 */
export async function listPosStaffByOwner(
  ownerUserId: number,
  posCode?: PosStaff["posCode"],
): Promise<PosStaff[]> {
  const conn = await getDb();
  if (!conn) return [];

  const where = posCode
    ? and(eq(posStaff.ownerUserId, ownerUserId), eq(posStaff.posCode, posCode))
    : eq(posStaff.ownerUserId, ownerUserId);

  return await conn
    .select()
    .from(posStaff)
    .where(where)
    .orderBy(asc(posStaff.posCode), desc(posStaff.createdAt));
}

/**
 * Devuelve un staff member por ID, validando tenant isolation.
 * Si el ownerUserId no matchea, devuelve null (404 en endpoint).
 */
export async function getPosStaffById(
  staffId: number,
  ownerUserId: number,
): Promise<PosStaff | null> {
  const conn = await getDb();
  if (!conn) return null;
  const rows = await conn
    .select()
    .from(posStaff)
    .where(
      and(
        eq(posStaff.id, staffId),
        eq(posStaff.ownerUserId, ownerUserId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Devuelve permisos efectivos de un staff (solo allowed=1).
 */
export async function getPosStaffPermissions(
  staffId: number,
): Promise<PosPermission[]> {
  const conn = await getDb();
  if (!conn) return [];
  const rows = await conn
    .select()
    .from(posStaffPermissions)
    .where(
      and(
        eq(posStaffPermissions.staffId, staffId),
        eq(posStaffPermissions.allowed, 1),
      ),
    );
  return rows.map((r) => r.permission as PosPermission);
}

/**
 * Reemplaza el conjunto completo de permisos de un staff.
 * Idempotente: borra los actuales y reescribe.
 *
 * Tambien actualiza posStaff.rolePreset:
 * - Si el set matchea manager preset, rolePreset = "manager"
 * - Si matchea cashier preset, rolePreset = "cashier"
 * - Si no, rolePreset = "custom"
 */
export async function setPosStaffPermissions(
  staffId: number,
  permissions: PosPermission[],
): Promise<void> {
  const conn = await getDbOrThrow();

  // Borrar todos los permisos actuales
  await conn
    .delete(posStaffPermissions)
    .where(eq(posStaffPermissions.staffId, staffId));

  // Insertar los nuevos (si hay)
  if (permissions.length > 0) {
    await conn.insert(posStaffPermissions).values(
      permissions.map((perm) => ({
        staffId,
        permission: perm,
        allowed: 1,
      })),
    );
  }

  // Detectar si el nuevo set matchea algun preset
  const sortedNew = [...permissions].sort();
  const sortedManager = [...POS_ROLE_PRESETS.manager].sort();
  const sortedCashier = [...POS_ROLE_PRESETS.cashier].sort();

  const matchesManager =
    JSON.stringify(sortedNew) === JSON.stringify(sortedManager);
  const matchesCashier =
    JSON.stringify(sortedNew) === JSON.stringify(sortedCashier);

  const newPreset: "manager" | "cashier" | "custom" = matchesManager
    ? "manager"
    : matchesCashier
    ? "cashier"
    : "custom";

  await conn
    .update(posStaff)
    .set({ rolePreset: newPreset })
    .where(eq(posStaff.id, staffId));
}

/**
 * Cambia status de un staff (active / disabled / invited).
 * Tenant isolation: solo el ownerUserId puede cambiar status de su staff.
 */
export async function setPosStaffStatus(
  staffId: number,
  ownerUserId: number,
  status: "active" | "disabled" | "invited",
): Promise<PosStaff | null> {
  const conn = await getDbOrThrow();
  await conn
    .update(posStaff)
    .set({ status })
    .where(
      and(
        eq(posStaff.id, staffId),
        eq(posStaff.ownerUserId, ownerUserId),
      ),
    );
  return getPosStaffById(staffId, ownerUserId);
}

/**
 * Elimina un staff member. Por CASCADE, sus permisos se borran solos.
 */
export async function deletePosStaff(
  staffId: number,
  ownerUserId: number,
): Promise<{ success: boolean }> {
  const conn = await getDbOrThrow();
  await conn
    .delete(posStaff)
    .where(
      and(
        eq(posStaff.id, staffId),
        eq(posStaff.ownerUserId, ownerUserId),
      ),
    );
  return { success: true };
}

/**
 * CORE: Verifica si un usuario tiene un permiso especifico en un POS.
 *
 * Logica de decision (orden):
 * 1. Si userId tiene role="admin" global -> true (admin de plataforma).
 * 2. Buscar posStaff donde (staffUserId=userId, posCode=posCode, status=active).
 *    Si no existe -> false (no es staff).
 * 3. Buscar el permission en posStaffPermissions con allowed=1.
 *    Si existe -> true. Si no -> false.
 *
 * IMPORTANTE: este helper NO valida que el userId sea el ownerUserId del POS.
 * Para owners, el caller debe checkear primero si user.role==='admin' o si es
 * el owner del recurso (segun la logica del endpoint).
 *
 * Esta es la funcion que el middleware requirePosPermission (Commit 2) usa.
 */
export async function userHasPosPermission(args: {
  userId: number;
  posCode: PosStaff["posCode"];
  permission: PosPermission;
}): Promise<boolean> {
  const conn = await getDb();
  if (!conn) return false;

  // Check 1: admin global de plataforma
  const userRows = await conn
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, args.userId))
    .limit(1);

  const user = userRows[0];
  if (!user) return false;
  if (user.role === "admin") return true;

  // Check 2: buscar staff record activo
  const staffRows = await conn
    .select()
    .from(posStaff)
    .where(
      and(
        eq(posStaff.staffUserId, args.userId),
        eq(posStaff.posCode, args.posCode),
        eq(posStaff.status, "active"),
      ),
    )
    .limit(1);

  const staff = staffRows[0];
  if (!staff) return false;

  // Check 3: verificar el permiso
  const permRows = await conn
    .select()
    .from(posStaffPermissions)
    .where(
      and(
        eq(posStaffPermissions.staffId, staff.id),
        eq(posStaffPermissions.permission, args.permission),
        eq(posStaffPermissions.allowed, 1),
      ),
    )
    .limit(1);

  return !!permRows[0];
}
