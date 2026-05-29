// ============================================================================
// MODULO Historial de Precios - Schema y migraciones
// ----------------------------------------------------------------------------
// Una fila por cada compra registrada de un producto de la alacena.
// Permite consultar historial, calcular minimo/maximo/promedio y comparar
// precios entre tiendas. NO toca personalPantryItems.lastPurchasePrice
// (esa columna sigue guardando el ultimo precio para vista rapida).
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import {
  mysqlTable,
  int,
  varchar,
  decimal,
  date,
  timestamp,
} from "drizzle-orm/mysql-core";

export const personalPantryItemPrices = mysqlTable("personalPantryItemPrices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  pantryItemId: int("pantryItemId").notNull(),
  storeId: int("storeId"),
  expenseId: int("expenseId"),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }),
  unit: varchar("unit", { length: 40 }),
  purchasedAt: date("purchasedAt", { mode: "string" }).notNull(),
  // De donde vino: "bulk_from_expense", "restock", "manual"
  source: varchar("source", { length: 32 }).notNull().default("manual"),
  notes: varchar("notes", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PersonalPantryItemPrice =
  typeof personalPantryItemPrices.$inferSelect;
export type InsertPersonalPantryItemPrice =
  typeof personalPantryItemPrices.$inferInsert;

export const personalPantryPricesMigrations: string[] = [
  `CREATE TABLE IF NOT EXISTS \`personalPantryItemPrices\` (
    \`id\` int AUTO_INCREMENT PRIMARY KEY,
    \`userId\` int NOT NULL,
    \`pantryItemId\` int NOT NULL,
    \`storeId\` int NULL,
    \`expenseId\` int NULL,
    \`unitPrice\` decimal(12,2) NOT NULL,
    \`quantity\` decimal(10,3) NULL,
    \`unit\` varchar(40) NULL,
    \`purchasedAt\` date NOT NULL,
    \`source\` varchar(32) NOT NULL DEFAULT 'manual',
    \`notes\` varchar(255) NULL,
    \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    INDEX \`idx_pantry_prices_user_item\` (\`userId\`, \`pantryItemId\`, \`purchasedAt\`),
    INDEX \`idx_pantry_prices_user_store\` (\`userId\`, \`storeId\`, \`purchasedAt\`),
    FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`)
  )`,
];
