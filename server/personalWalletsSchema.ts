// ============================================================================
// SCHEMA - Bolsillos personales (Wallets) con movimientos in/out
// ----------------------------------------------------------------------------
// David puede tener varios bolsillos:
//   - "Efectivo David": $2,400 (default)
//   - "Mujer": $500 (le pasa dinero, ella registra gastos/ingresos)
//   - "Ninos": $200 (para gastos escolares)
//
// Cada bolsillo tiene movimientos (deposito, retiro, transferencia).
// El balance es denormalizado: se actualiza con cada movimiento via DB.
//
// NOTA V1: la columna accessCode se usa en una fase futura para mini-app
// sin login (URL con codigo secreto para que la esposa entre sin contrasena).
//
// IMPORTANTE: Idempotente con CREATE TABLE IF NOT EXISTS.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import {
  mysqlTable,
  int,
  varchar,
  text,
  decimal,
  date,
  timestamp,
  mysqlEnum,
} from "drizzle-orm/mysql-core";

// ----------------------------------------------------------------------------
// TABLA: personalWallets
// ----------------------------------------------------------------------------
export const personalWallets = mysqlTable("personalWallets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Dueño del sistema (David)

  name: varchar("name", { length: 100 }).notNull(),
  ownerName: varchar("ownerName", { length: 100 }), // "Yo", "Mujer", "Hijo mayor"

  // Saldo actual (denormalizado para velocidad de queries)
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull().default("0.00"),

  // Tipo de bolsillo
  walletType: mysqlEnum("walletType", [
    "cash",      // Efectivo
    "card",      // Tarjeta de debito o credito
    "shared",    // Compartido (esposa, hijos)
    "savings",   // Ahorro
    "other",
  ]).notNull().default("cash"),

  // UI
  color: varchar("color", { length: 16 }).default("#fbbf24"),
  icon: varchar("icon", { length: 8 }).default("👛"),

  // Default = bolsillo principal donde caen los gastos si no se especifica otro
  isDefault: int("isDefault").default(0).notNull(),

  // Acceso compartido (V1: campo presente pero no usado hasta fase mini-app)
  accessCode: varchar("accessCode", { length: 32 }), // Codigo secreto para URL

  notes: text("notes"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});

export type PersonalWallet = typeof personalWallets.$inferSelect;
export type InsertPersonalWallet = typeof personalWallets.$inferInsert;

// ----------------------------------------------------------------------------
// TABLA: personalWalletMovements
// ----------------------------------------------------------------------------
export const personalWalletMovements = mysqlTable("personalWalletMovements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  walletId: int("walletId").notNull(),

  // Tipo de movimiento
  movementType: mysqlEnum("movementType", [
    "deposit",        // Entra dinero (David rellena, ella cobra trabajo)
    "withdrawal",     // Sale dinero (gasto manual)
    "transfer_in",    // Llego de otro bolsillo
    "transfer_out",   // Salio hacia otro bolsillo
  ]).notNull(),

  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: varchar("description", { length: 255 }),
  category: varchar("category", { length: 60 }),

  // Vinculo con otros modulos (cuando aplique)
  // Ej: si este movement viene de un gasto, sourceModule="expense" + sourceId=id_del_gasto
  sourceModule: varchar("sourceModule", { length: 40 }), // "manual" | "expense" | "income" | "transfer"
  sourceId: int("sourceId"),

  // Para transfers: el bolsillo opuesto
  counterpartWalletId: int("counterpartWalletId"),

  occurredAt: date("occurredAt", { mode: "string" }).notNull(),
  notes: text("notes"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});

export type PersonalWalletMovement = typeof personalWalletMovements.$inferSelect;
export type InsertPersonalWalletMovement = typeof personalWalletMovements.$inferInsert;

// ----------------------------------------------------------------------------
// MIGRACIONES SQL (idempotentes con IF NOT EXISTS)
// ----------------------------------------------------------------------------
export const personalWalletsMigrations: string[] = [
  `CREATE TABLE IF NOT EXISTS \`personalWallets\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`userId\` int(11) NOT NULL,
    \`name\` varchar(100) NOT NULL,
    \`ownerName\` varchar(100) DEFAULT NULL,
    \`balance\` decimal(12,2) NOT NULL DEFAULT '0.00',
    \`walletType\` enum('cash','card','shared','savings','other') NOT NULL DEFAULT 'cash',
    \`color\` varchar(16) DEFAULT '#fbbf24',
    \`icon\` varchar(8) DEFAULT '👛',
    \`isDefault\` int(11) NOT NULL DEFAULT 0,
    \`accessCode\` varchar(32) DEFAULT NULL,
    \`notes\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deletedAt\` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (\`id\`),
    KEY \`personalWallets_userId_idx\` (\`userId\`),
    KEY \`personalWallets_isDefault_idx\` (\`isDefault\`),
    UNIQUE KEY \`personalWallets_accessCode_uq\` (\`accessCode\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS \`personalWalletMovements\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`userId\` int(11) NOT NULL,
    \`walletId\` int(11) NOT NULL,
    \`movementType\` enum('deposit','withdrawal','transfer_in','transfer_out') NOT NULL,
    \`amount\` decimal(12,2) NOT NULL,
    \`description\` varchar(255) DEFAULT NULL,
    \`category\` varchar(60) DEFAULT NULL,
    \`sourceModule\` varchar(40) DEFAULT NULL,
    \`sourceId\` int(11) DEFAULT NULL,
    \`counterpartWalletId\` int(11) DEFAULT NULL,
    \`occurredAt\` date NOT NULL,
    \`notes\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deletedAt\` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (\`id\`),
    KEY \`personalWalletMovements_userId_idx\` (\`userId\`),
    KEY \`personalWalletMovements_walletId_idx\` (\`walletId\`),
    KEY \`personalWalletMovements_occurredAt_idx\` (\`occurredAt\`),
    KEY \`personalWalletMovements_sourceModule_idx\` (\`sourceModule\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];
