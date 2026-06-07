// >>> ESTE ARCHIVO ES NUEVO. CREALO EN: server/personalInboxSchema.ts <<<
// ============================================================================
// MODULO BUZON (formato esposa) - Schema y migracion de arranque
// ----------------------------------------------------------------------------
// Permite que alguien de confianza (la esposa) capture compras desde un link
// secreto, SIN entrar al admin. Lo que manda llega como PENDIENTE y el dueno
// lo confirma (ahi se vuelve gasto real).
//
// 1) personalInboxTokens     -> el link secreto de acceso (revocable)
// 2) personalInboxSubmissions -> lo que ella manda, en estado pendiente
//
// SEGURIDAD:
//   - El token es largo y aleatorio (se genera en el backend, Paso 2).
//   - El acceso publico SOLO permite mandar al buzon; nada mas.
//   - Nada entra a los gastos sin que el dueno confirme.
//
// Las tablas se crean en runStartupMigrations() de db.ts via el array
// personalInboxMigrations. CREATE TABLE IF NOT EXISTS = idempotente.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import {
  mysqlTable,
  int,
  varchar,
  text,
  boolean,
  decimal,
  timestamp,
} from "drizzle-orm/mysql-core";

// ----------------------------------------------------------------------------
// Tabla 1: token de acceso (el link secreto)
// ----------------------------------------------------------------------------

export const personalInboxTokens = mysqlTable("personalInboxTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // Cadena secreta larga y aleatoria (se genera en el backend).
  token: varchar("token", { length: 80 }).notNull(),
  // Etiqueta para que el dueno sepa de quien es (ej: "Esposa").
  label: varchar("label", { length: 80 }),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
});

// ----------------------------------------------------------------------------
// Tabla 2: envios pendientes (lo que ella manda)
// ----------------------------------------------------------------------------

export const personalInboxSubmissions = mysqlTable("personalInboxSubmissions", {
  id: int("id").autoincrement().primaryKey(),
  // Dueno del buzon (a quien le llega).
  userId: int("userId").notNull(),
  // Token con el que se mando (para trazabilidad).
  tokenId: int("tokenId").notNull(),
  // Quien lo manda (opcional, ej: "Tilin").
  senderName: varchar("senderName", { length: 80 }),
  // Que compro (texto del producto).
  description: varchar("description", { length: 255 }).notNull(),
  // Monto (opcional: puede no saberlo).
  amount: decimal("amount", { precision: 12, scale: 2 }),
  // Tienda (opcional).
  storeName: varchar("storeName", { length: 120 }),
  // Texto crudo por si manda algo libre.
  rawText: text("rawText"),
  // pending | confirmed | rejected
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  // Si se confirmo, a que gasto se convirtio (link al personalExpense).
  confirmedExpenseId: int("confirmedExpenseId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  confirmedAt: timestamp("confirmedAt"),
});

// ----------------------------------------------------------------------------
// Tipos utiles
// ----------------------------------------------------------------------------

export type PersonalInboxToken = typeof personalInboxTokens.$inferSelect;
export type InsertPersonalInboxToken = typeof personalInboxTokens.$inferInsert;
export type PersonalInboxSubmission =
  typeof personalInboxSubmissions.$inferSelect;
export type InsertPersonalInboxSubmission =
  typeof personalInboxSubmissions.$inferInsert;

// ----------------------------------------------------------------------------
// Migracion de arranque (raw SQL, idempotente). Primero el token, luego los
// envios (que referencian al token).
// ----------------------------------------------------------------------------

export const personalInboxMigrations: string[] = [
  `CREATE TABLE IF NOT EXISTS \`personalInboxTokens\` (
    \`id\` int AUTO_INCREMENT PRIMARY KEY,
    \`userId\` int NOT NULL,
    \`token\` varchar(80) NOT NULL,
    \`label\` varchar(80) NULL,
    \`isActive\` tinyint(1) NOT NULL DEFAULT 1,
    \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    \`revokedAt\` timestamp NULL DEFAULT NULL,
    UNIQUE KEY \`uniq_inbox_token\` (\`token\`),
    INDEX \`idx_inbox_token_user\` (\`userId\`, \`isActive\`),
    FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`personalInboxSubmissions\` (
    \`id\` int AUTO_INCREMENT PRIMARY KEY,
    \`userId\` int NOT NULL,
    \`tokenId\` int NOT NULL,
    \`senderName\` varchar(80) NULL,
    \`description\` varchar(255) NOT NULL,
    \`amount\` decimal(12,2) NULL,
    \`storeName\` varchar(120) NULL,
    \`rawText\` text NULL,
    \`status\` varchar(20) NOT NULL DEFAULT 'pending',
    \`confirmedExpenseId\` int NULL,
    \`notes\` text NULL,
    \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    \`confirmedAt\` timestamp NULL DEFAULT NULL,
    INDEX \`idx_inbox_sub_user_status\` (\`userId\`, \`status\`),
    INDEX \`idx_inbox_sub_token\` (\`tokenId\`),
    FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`),
    FOREIGN KEY (\`tokenId\`) REFERENCES \`personalInboxTokens\`(\`id\`)
  )`,
];
