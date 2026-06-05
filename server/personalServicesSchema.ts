// >>> ESTE ARCHIVO ES NUEVO. CREALO EN: server/personalServicesSchema.ts <<<
// ============================================================================
// MODULO SERVICIOS FIJOS - Schema y migracion de arranque
// ----------------------------------------------------------------------------
// Recibos que se repiten cada mes (luz, agua, internet, streaming).
// Guardamos el monto esperado y el dia de pago. Al pagarlos se registra un
// gasto normal (asi entran al pastel del mes). lastPaidYmd dice cuando se
// pago por ultima vez, para saber cuales faltan este mes.
//
// La tabla se crea en runStartupMigrations() de db.ts via el array
// personalServicesMigrations. CREATE TABLE IF NOT EXISTS = idempotente.
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
} from "drizzle-orm/mysql-core";

// ----------------------------------------------------------------------------
// Tabla Drizzle (tipado para el query builder)
// ----------------------------------------------------------------------------

export const personalFixedServices = mysqlTable("personalFixedServices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  // Monto esperado del recibo (puede variar; es solo referencia)
  amount: decimal("amount", { precision: 12, scale: 2 }),
  // Dia del mes en que se suele pagar (1-31)
  dueDay: int("dueDay"),
  // Categoria de gastos a la que pertenece (para etiquetar el pago)
  categoryId: int("categoryId"),
  icon: varchar("icon", { length: 20 }),
  color: varchar("color", { length: 20 }),
  isActive: boolean("isActive").notNull().default(true),
  // Fecha (YYYY-MM-DD) del ultimo pago registrado. Sirve para saber si ya se
  // pago este mes o sigue pendiente.
  lastPaidYmd: date("lastPaidYmd", { mode: "string" }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});

// ----------------------------------------------------------------------------
// Tipos utiles
// ----------------------------------------------------------------------------

export type PersonalFixedService = typeof personalFixedServices.$inferSelect;
export type InsertPersonalFixedService = typeof personalFixedServices.$inferInsert;

// ----------------------------------------------------------------------------
// Migracion de arranque (raw SQL, idempotente)
// ----------------------------------------------------------------------------

export const personalServicesMigrations: string[] = [
  `CREATE TABLE IF NOT EXISTS \`personalFixedServices\` (
    \`id\` int AUTO_INCREMENT PRIMARY KEY,
    \`userId\` int NOT NULL,
    \`name\` varchar(120) NOT NULL,
    \`amount\` decimal(12,2) NULL,
    \`dueDay\` int NULL,
    \`categoryId\` int NULL,
    \`icon\` varchar(20) NULL,
    \`color\` varchar(20) NULL,
    \`isActive\` tinyint(1) NOT NULL DEFAULT 1,
    \`lastPaidYmd\` date NULL,
    \`notes\` text NULL,
    \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    \`updatedAt\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    \`deletedAt\` timestamp NULL DEFAULT NULL,
    INDEX \`idx_fixedsvc_user_active\` (\`userId\`, \`isActive\`),
    FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`)
  )`,
];
