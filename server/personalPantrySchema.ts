// ============================================================================
// MODULO ALACENA PERSONAL - Schema y migraciones de arranque
// ----------------------------------------------------------------------------
// Alacena del hogar: que hay, que se esta acabando, que comprar.
// Simple: niveles (no gramos exactos). Separado del inventario del negocio.
// Se conecta con gastos (categoria, tienda, precio) sin mezclar tablas.
//
// Las tablas se crean en runStartupMigrations() de db.ts via el array
// personalPantryMigrations. CREATE TABLE IF NOT EXISTS = idempotente.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import {
  mysqlTable,
  int,
  varchar,
  text,
  date,
  boolean,
  decimal,
  timestamp,
  mysqlEnum,
} from "drizzle-orm/mysql-core";

// ----------------------------------------------------------------------------
// Tablas Drizzle (tipado para el query builder)
// ----------------------------------------------------------------------------

export const personalPantryItems = mysqlTable("personalPantryItems", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  normalizedName: varchar("normalizedName", { length: 160 }).notNull().default(""),
  // Se enlazan con las categorias/tiendas de gastos cuando aplican
  categoryId: int("categoryId"),
  storeId: int("storeId"),
  unit: varchar("unit", { length: 40 }),
  // Nivel simple: 0, 25, 50, 75, 100 (barra visual)
  stockPercent: int("stockPercent").notNull().default(100),
  status: mysqlEnum("status", ["available", "low", "out", "archived"])
    .notNull()
    .default("available"),
  // Lista de compra
  onShoppingList: boolean("onShoppingList").notNull().default(false),
  priority: mysqlEnum("priority", ["low", "normal", "high"])
    .notNull()
    .default("normal"),
  // Para "frecuentes", "comprar de nuevo" y precio
  timesPurchased: int("timesPurchased").notNull().default(0),
  lastPurchasePrice: decimal("lastPurchasePrice", { precision: 12, scale: 2 }),
  lastStoreId: int("lastStoreId"),
  lastPurchasedAt: date("lastPurchasedAt", { mode: "string" }),
  lastConsumedAt: date("lastConsumedAt", { mode: "string" }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});

export const personalPantryMovements = mysqlTable("personalPantryMovements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  pantryItemId: int("pantryItemId").notNull(),
  // Si el movimiento vino de un gasto, lo enlazamos (sin forzar)
  expenseId: int("expenseId"),
  movementType: mysqlEnum("movementType", [
    "added",
    "consumed",
    "adjusted",
    "marked_low",
    "marked_out",
    "restocked",
  ]).notNull(),
  stockPercentBefore: int("stockPercentBefore"),
  stockPercentAfter: int("stockPercentAfter"),
  note: varchar("note", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ----------------------------------------------------------------------------
// Tipos utiles
// ----------------------------------------------------------------------------

export type PersonalPantryItem = typeof personalPantryItems.$inferSelect;
export type InsertPersonalPantryItem = typeof personalPantryItems.$inferInsert;
export type PersonalPantryMovement = typeof personalPantryMovements.$inferSelect;
export type InsertPersonalPantryMovement = typeof personalPantryMovements.$inferInsert;

// ----------------------------------------------------------------------------
// Migraciones de arranque (raw SQL, idempotentes)
// ----------------------------------------------------------------------------

export const personalPantryMigrations: string[] = [
  `CREATE TABLE IF NOT EXISTS \`personalPantryItems\` (
    \`id\` int AUTO_INCREMENT PRIMARY KEY,
    \`userId\` int NOT NULL,
    \`name\` varchar(160) NOT NULL,
    \`normalizedName\` varchar(160) NOT NULL DEFAULT '',
    \`categoryId\` int NULL,
    \`storeId\` int NULL,
    \`unit\` varchar(40) NULL,
    \`stockPercent\` int NOT NULL DEFAULT 100,
    \`status\` enum('available','low','out','archived') NOT NULL DEFAULT 'available',
    \`onShoppingList\` tinyint(1) NOT NULL DEFAULT 0,
    \`priority\` enum('low','normal','high') NOT NULL DEFAULT 'normal',
    \`timesPurchased\` int NOT NULL DEFAULT 0,
    \`lastPurchasePrice\` decimal(12,2) NULL,
    \`lastStoreId\` int NULL,
    \`lastPurchasedAt\` date NULL,
    \`lastConsumedAt\` date NULL,
    \`notes\` text NULL,
    \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    \`updatedAt\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    \`deletedAt\` timestamp NULL DEFAULT NULL,
    INDEX \`idx_pantry_user_status\` (\`userId\`, \`status\`),
    INDEX \`idx_pantry_user_name\` (\`userId\`, \`normalizedName\`),
    FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`)
  )`,

  `CREATE TABLE IF NOT EXISTS \`personalPantryMovements\` (
    \`id\` int AUTO_INCREMENT PRIMARY KEY,
    \`userId\` int NOT NULL,
    \`pantryItemId\` int NOT NULL,
    \`expenseId\` int NULL,
    \`movementType\` enum('added','consumed','adjusted','marked_low','marked_out','restocked') NOT NULL,
    \`stockPercentBefore\` int NULL,
    \`stockPercentAfter\` int NULL,
    \`note\` varchar(255) NULL,
    \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    INDEX \`idx_pantry_mov_user_item\` (\`userId\`, \`pantryItemId\`),
    FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`)
  )`,
];
