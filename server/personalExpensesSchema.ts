// ============================================================================
// MODULO GASTOS PERSONALES - Schema y migraciones de arranque
// ----------------------------------------------------------------------------
// Datos PERSONALES / del hogar del admin. Estrictamente separados de los
// numeros del negocio (ingresos, utilidad, inventario, ventas).
//
// Las tablas se crean en runStartupMigrations() de db.ts, usando el array que
// exportamos aqui: personalExpensesMigrations.
// Patron CREATE TABLE IF NOT EXISTS -> idempotente: no toca ni roza nada de lo
// que ya existe. Si la tabla ya esta, se salta.
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import {
  mysqlTable,
  int,
  varchar,
  text,
  json,
  date,
  boolean,
  decimal,
  timestamp,
  mysqlEnum,
} from "drizzle-orm/mysql-core";

// ----------------------------------------------------------------------------
// Tablas Drizzle (solo tipado para el query builder en los siguientes commits)
// ----------------------------------------------------------------------------

export const personalExpenseCategories = mysqlTable("personalExpenseCategories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull(),
  icon: varchar("icon", { length: 60 }).notNull().default(""),
  color: varchar("color", { length: 30 }).notNull().default(""),
  keywordsJson: json("keywordsJson"),
  isDefault: boolean("isDefault").notNull().default(false),
  isArchived: boolean("isArchived").notNull().default(false),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const personalExpenseStores = mysqlTable("personalExpenseStores", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull(),
  type: varchar("type", { length: 40 }).notNull().default(""),
  icon: varchar("icon", { length: 60 }).notNull().default(""),
  color: varchar("color", { length: 30 }).notNull().default(""),
  keywordsJson: json("keywordsJson"),
  isArchived: boolean("isArchived").notNull().default(false),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const personalExpenses = mysqlTable("personalExpenses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // Dinero SIEMPRE en decimal, nunca float. Drizzle lo devuelve como string,
  // se parsea con Number() cuando toque graficar (commits posteriores).
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  normalizedDescription: varchar("normalizedDescription", { length: 500 })
    .notNull()
    .default(""),
  // categoryId puede ser null = "Sin clasificar"
  categoryId: int("categoryId"),
  detectedCategoryId: int("detectedCategoryId"),
  storeId: int("storeId"),
  storeName: varchar("storeName", { length: 120 }),
  // Listos desde hoy para crecer a productos/precios (fase 2 y 3), vacios por ahora
  rawItemsText: text("rawItemsText"),
  detectedItemsJson: json("detectedItemsJson"),
  purchaseType: varchar("purchaseType", { length: 40 }).notNull().default("otro"),
  autoDetected: boolean("autoDetected").notNull().default(false),
  // Confianza 0 a 100
  detectionConfidence: int("detectionConfidence").notNull().default(0),
  detectionSource: mysqlEnum("detectionSource", [
    "keyword",
    "rule",
    "manual",
    "none",
  ])
    .notNull()
    .default("none"),
  paymentMethod: mysqlEnum("paymentMethod", [
    "cash",
    "debit",
    "credit",
    "transfer",
    "other",
  ])
    .notNull()
    .default("cash"),
  merchant: varchar("merchant", { length: 120 }),
  // Fecha real del gasto, separada de createdAt (clave para stats por mes)
  expenseDate: date("expenseDate").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  // Soft delete: nunca borramos fisico
  deletedAt: timestamp("deletedAt"),
});

export const personalExpenseRules = mysqlTable("personalExpenseRules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  categoryId: int("categoryId").notNull(),
  phrase: varchar("phrase", { length: 160 }).notNull(),
  normalizedPhrase: varchar("normalizedPhrase", { length: 160 }).notNull(),
  weight: int("weight").notNull().default(1),
  isActive: boolean("isActive").notNull().default(true),
  // De que gasto nacio esta regla (cuando yo corrijo una categoria)
  createdFromExpenseId: int("createdFromExpenseId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ----------------------------------------------------------------------------
// Tipos utiles para los siguientes commits
// ----------------------------------------------------------------------------

export type PersonalExpenseCategory = typeof personalExpenseCategories.$inferSelect;
export type InsertPersonalExpenseCategory = typeof personalExpenseCategories.$inferInsert;
export type PersonalExpenseStore = typeof personalExpenseStores.$inferSelect;
export type InsertPersonalExpenseStore = typeof personalExpenseStores.$inferInsert;
export type PersonalExpense = typeof personalExpenses.$inferSelect;
export type InsertPersonalExpense = typeof personalExpenses.$inferInsert;
export type PersonalExpenseRule = typeof personalExpenseRules.$inferSelect;
export type InsertPersonalExpenseRule = typeof personalExpenseRules.$inferInsert;

// ----------------------------------------------------------------------------
// Migraciones de arranque (raw SQL, idempotentes)
// Se ejecutan desde runStartupMigrations() en db.ts.
// Todas referencian users(id), que ya existe en produccion, asi que el orden
// dentro de este array es seguro.
// ----------------------------------------------------------------------------

export const personalExpensesMigrations: string[] = [
  `CREATE TABLE IF NOT EXISTS \`personalExpenseCategories\` (
    \`id\` int AUTO_INCREMENT PRIMARY KEY,
    \`userId\` int NOT NULL,
    \`name\` varchar(120) NOT NULL,
    \`slug\` varchar(120) NOT NULL,
    \`icon\` varchar(60) NOT NULL DEFAULT '',
    \`color\` varchar(30) NOT NULL DEFAULT '',
    \`keywordsJson\` json NULL,
    \`isDefault\` tinyint(1) NOT NULL DEFAULT 0,
    \`isArchived\` tinyint(1) NOT NULL DEFAULT 0,
    \`sortOrder\` int NOT NULL DEFAULT 0,
    \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    \`updatedAt\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    INDEX \`idx_pe_categories_user\` (\`userId\`),
    UNIQUE KEY \`uq_pe_categories_user_slug\` (\`userId\`, \`slug\`),
    FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`)
  )`,

  `CREATE TABLE IF NOT EXISTS \`personalExpenseStores\` (
    \`id\` int AUTO_INCREMENT PRIMARY KEY,
    \`userId\` int NOT NULL,
    \`name\` varchar(120) NOT NULL,
    \`slug\` varchar(120) NOT NULL,
    \`type\` varchar(40) NOT NULL DEFAULT '',
    \`icon\` varchar(60) NOT NULL DEFAULT '',
    \`color\` varchar(30) NOT NULL DEFAULT '',
    \`keywordsJson\` json NULL,
    \`isArchived\` tinyint(1) NOT NULL DEFAULT 0,
    \`sortOrder\` int NOT NULL DEFAULT 0,
    \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    \`updatedAt\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    INDEX \`idx_pe_stores_user\` (\`userId\`),
    UNIQUE KEY \`uq_pe_stores_user_slug\` (\`userId\`, \`slug\`),
    FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`)
  )`,

  `CREATE TABLE IF NOT EXISTS \`personalExpenses\` (
    \`id\` int AUTO_INCREMENT PRIMARY KEY,
    \`userId\` int NOT NULL,
    \`amount\` decimal(12,2) NOT NULL,
    \`description\` varchar(500) NOT NULL,
    \`normalizedDescription\` varchar(500) NOT NULL DEFAULT '',
    \`categoryId\` int NULL,
    \`detectedCategoryId\` int NULL,
    \`storeId\` int NULL,
    \`storeName\` varchar(120) NULL,
    \`rawItemsText\` text NULL,
    \`detectedItemsJson\` json NULL,
    \`purchaseType\` varchar(40) NOT NULL DEFAULT 'otro',
    \`autoDetected\` tinyint(1) NOT NULL DEFAULT 0,
    \`detectionConfidence\` int NOT NULL DEFAULT 0,
    \`detectionSource\` enum('keyword','rule','manual','none') NOT NULL DEFAULT 'none',
    \`paymentMethod\` enum('cash','debit','credit','transfer','other') NOT NULL DEFAULT 'cash',
    \`merchant\` varchar(120) NULL,
    \`expenseDate\` date NOT NULL,
    \`notes\` text NULL,
    \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    \`updatedAt\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    \`deletedAt\` timestamp NULL DEFAULT NULL,
    INDEX \`idx_pe_expenses_user_date\` (\`userId\`, \`expenseDate\`),
    INDEX \`idx_pe_expenses_user_cat_date\` (\`userId\`, \`categoryId\`, \`expenseDate\`),
    INDEX \`idx_pe_expenses_user_store_date\` (\`userId\`, \`storeId\`, \`expenseDate\`),
    FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`)
  )`,

  `CREATE TABLE IF NOT EXISTS \`personalExpenseRules\` (
    \`id\` int AUTO_INCREMENT PRIMARY KEY,
    \`userId\` int NOT NULL,
    \`categoryId\` int NOT NULL,
    \`phrase\` varchar(160) NOT NULL,
    \`normalizedPhrase\` varchar(160) NOT NULL,
    \`weight\` int NOT NULL DEFAULT 1,
    \`isActive\` tinyint(1) NOT NULL DEFAULT 1,
    \`createdFromExpenseId\` int NULL,
    \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    \`updatedAt\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    INDEX \`idx_pe_rules_user_phrase\` (\`userId\`, \`normalizedPhrase\`),
    FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`)
  )`,
];
