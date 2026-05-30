// ============================================================================
// SCHEMA - Modulo Deudas (MVP)
// ----------------------------------------------------------------------------
// 2 tablas:
//   - personalDebts        : deuda con campos opcionales para activo vinculado
//   - personalDebtPayments : cada pago realizado
//
// Diseño aprobado (version simplificada vs ChatGPT):
//   - El "activo" vive como campos opcionales dentro de la deuda
//   - Si manana queremos historial profundo de activos, se promueve a tabla
//   - Ingresos por venta van en personal_income_events (commit posterior)
//
// Convenciones:
//   - userId en todo para multiusuario futuro
//   - Soft delete con deletedAt
//   - Dinero: decimal(12,2)
//   - CREATE TABLE IF NOT EXISTS (idempotente)
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import {
  mysqlTable,
  int,
  varchar,
  decimal,
  boolean,
  text,
  timestamp,
  date,
  mysqlEnum,
} from "drizzle-orm/mysql-core";

// ----------------------------------------------------------------------------
// TABLA 1: personalDebts
// ----------------------------------------------------------------------------
export const personalDebts = mysqlTable("personalDebts", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),

  // Acreedor (quien me presto / a quien le debo)
  creditorName: varchar("creditorName", { length: 100 }).notNull(), // "Coppel"
  normalizedCreditorName: varchar("normalizedCreditorName", { length: 100 })
    .notNull(),

  // Concepto / titulo
  title: varchar("title", { length: 150 }).notNull(), // "Bicicleta"
  description: text("description"),

  // Categoria libre
  category: varchar("category", { length: 60 }),

  // Montos
  originalAmount: decimal("originalAmount", { precision: 12, scale: 2 }),
  currentBalance: decimal("currentBalance", { precision: 12, scale: 2 })
    .notNull()
    .default("0.00"),
  installmentAmount: decimal("installmentAmount", { precision: 12, scale: 2 }),

  // Avance
  currentInstallment: int("currentInstallment").default(0),
  totalInstallments: int("totalInstallments"),

  // Fechas y vencimiento
  dueDay: int("dueDay"), // 1-31, dia del mes en que vence
  nextDueDate: date("nextDueDate", { mode: "string" }),
  startDate: date("startDate", { mode: "string" }),
  endDate: date("endDate", { mode: "string" }),

  // Estado y prioridad
  status: mysqlEnum("status", ["active", "paused", "paid", "cancelled"])
    .notNull()
    .default("active"),
  priority: mysqlEnum("priority", ["low", "medium", "high"])
    .notNull()
    .default("medium"),

  // Tipo de plan
  isInstallmentPurchase: boolean("isInstallmentPurchase").default(false),
  installmentPlanType: mysqlEnum("installmentPlanType", [
    "msi",
    "interest",
    "fixed_payment",
    "informal",
    "other",
  ]),

  paymentMethod: mysqlEnum("paymentMethod", [
    "cash",
    "debit",
    "credit",
    "transfer",
    "other",
  ]),

  // -------------------------------------------------
  // ACTIVO VINCULADO (embedded en la deuda, MVP)
  // -------------------------------------------------
  linkedAssetName: varchar("linkedAssetName", { length: 150 }),
  assetStatus: mysqlEnum("assetStatus", [
    "owned",
    "sold",
    "lost",
    "gifted",
    "archived",
  ]),
  assetSoldAt: date("assetSoldAt", { mode: "string" }),
  assetSoldPrice: decimal("assetSoldPrice", { precision: 12, scale: 2 }),
  assetSoldBuyer: varchar("assetSoldBuyer", { length: 100 }),
  assetSoldNotes: text("assetSoldNotes"),

  // UI
  color: varchar("color", { length: 16 }).default("#fb7185"),
  icon: varchar("icon", { length: 8 }).default("💳"),

  notes: text("notes"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().onUpdateNow(),
  deletedAt: timestamp("deletedAt"),
});

export type PersonalDebt = typeof personalDebts.$inferSelect;
export type NewPersonalDebt = typeof personalDebts.$inferInsert;

// ----------------------------------------------------------------------------
// TABLA 2: personalDebtPayments
// ----------------------------------------------------------------------------
export const personalDebtPayments = mysqlTable("personalDebtPayments", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  debtId: int("debtId").notNull(),

  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: date("paymentDate", { mode: "string" }).notNull(),

  // Numero de mensualidad cubierta (5 de 12)
  installmentNumber: int("installmentNumber"),

  paymentMethod: mysqlEnum("paymentMethod", [
    "cash",
    "debit",
    "credit",
    "transfer",
    "other",
  ]).default("cash"),

  // Vinculo con gasto personal creado automaticamente
  linkedExpenseId: int("linkedExpenseId"),

  // Pago parcial (abono) vs mensualidad completa
  isPartial: boolean("isPartial").default(false),

  notes: text("notes"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().onUpdateNow(),
});

export type PersonalDebtPayment = typeof personalDebtPayments.$inferSelect;
export type NewPersonalDebtPayment = typeof personalDebtPayments.$inferInsert;

// ----------------------------------------------------------------------------
// MIGRACIONES - CREATE TABLE IF NOT EXISTS (idempotentes)
// ----------------------------------------------------------------------------
export const personalDebtsMigrations = [
  `CREATE TABLE IF NOT EXISTS \`personalDebts\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`userId\` int(11) NOT NULL,
    \`creditorName\` varchar(100) NOT NULL,
    \`normalizedCreditorName\` varchar(100) NOT NULL,
    \`title\` varchar(150) NOT NULL,
    \`description\` text,
    \`category\` varchar(60) DEFAULT NULL,
    \`originalAmount\` decimal(12,2) DEFAULT NULL,
    \`currentBalance\` decimal(12,2) NOT NULL DEFAULT '0.00',
    \`installmentAmount\` decimal(12,2) DEFAULT NULL,
    \`currentInstallment\` int(11) DEFAULT 0,
    \`totalInstallments\` int(11) DEFAULT NULL,
    \`dueDay\` int(11) DEFAULT NULL,
    \`nextDueDate\` date DEFAULT NULL,
    \`startDate\` date DEFAULT NULL,
    \`endDate\` date DEFAULT NULL,
    \`status\` enum('active','paused','paid','cancelled') NOT NULL DEFAULT 'active',
    \`priority\` enum('low','medium','high') NOT NULL DEFAULT 'medium',
    \`isInstallmentPurchase\` tinyint(1) DEFAULT 0,
    \`installmentPlanType\` enum('msi','interest','fixed_payment','informal','other') DEFAULT NULL,
    \`paymentMethod\` enum('cash','debit','credit','transfer','other') DEFAULT NULL,
    \`linkedAssetName\` varchar(150) DEFAULT NULL,
    \`assetStatus\` enum('owned','sold','lost','gifted','archived') DEFAULT NULL,
    \`assetSoldAt\` date DEFAULT NULL,
    \`assetSoldPrice\` decimal(12,2) DEFAULT NULL,
    \`assetSoldBuyer\` varchar(100) DEFAULT NULL,
    \`assetSoldNotes\` text,
    \`color\` varchar(16) DEFAULT '#fb7185',
    \`icon\` varchar(8) DEFAULT '💳',
    \`notes\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deletedAt\` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (\`id\`),
    KEY \`personalDebts_userId_idx\` (\`userId\`),
    KEY \`personalDebts_status_idx\` (\`status\`),
    KEY \`personalDebts_nextDueDate_idx\` (\`nextDueDate\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS \`personalDebtPayments\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`userId\` int(11) NOT NULL,
    \`debtId\` int(11) NOT NULL,
    \`amount\` decimal(12,2) NOT NULL,
    \`paymentDate\` date NOT NULL,
    \`installmentNumber\` int(11) DEFAULT NULL,
    \`paymentMethod\` enum('cash','debit','credit','transfer','other') DEFAULT 'cash',
    \`linkedExpenseId\` int(11) DEFAULT NULL,
    \`isPartial\` tinyint(1) DEFAULT 0,
    \`notes\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`personalDebtPayments_userId_idx\` (\`userId\`),
    KEY \`personalDebtPayments_debtId_idx\` (\`debtId\`),
    KEY \`personalDebtPayments_paymentDate_idx\` (\`paymentDate\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];
