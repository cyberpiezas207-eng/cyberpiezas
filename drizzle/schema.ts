/**
 * Subscription Core V1 - Source of truth for active access per user/POS
 *
 * Esta tabla es la nueva fuente de verdad para "tiene acceso este usuario a este POS".
 * Reemplaza la responsabilidad de control de acceso que estaba mezclada en
 * transferPaymentRequests (que ahora solo es bitacora de pagos).
 *
 * - UNIQUE(userId, posCode): un usuario solo tiene 1 sub por POS
 * - currentPeriodEnd: la fecha que decide si tiene acceso
 * - sourceType: discriminator (payment, courtesy, migration, admin_grant)
 * - grantedByUserId: audit trail de quien otorgo la sub (NULL si vino de pago normal)
 * - metadata JSON: escape hatch para campos futuros sin migracion
 *
 * La tabla en MySQL se creo manualmente con SQL antes que este archivo.
 * El SQL incluye indices secundarios (status, sourceType, periodEnd) que NO se
 * declaran aqui porque Drizzle no los necesita para tipos, solo viven en MySQL
 * para optimizar queries.
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  posCode: varchar("posCode", { length: 50 }).notNull(),
  planType: varchar("planType", { length: 20 }).notNull().default("monthly"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  // Discriminator column (ajuste 1 de ChatGPT): origen de la sub
  sourceType: varchar("sourceType", { length: 20 }).notNull().default("payment"),
  currentPeriodStart: timestamp("currentPeriodStart").notNull(),
  currentPeriodEnd: timestamp("currentPeriodEnd").notNull(),
  // Trazabilidad al ultimo pago para idempotencia. NULL si vino de cortesia/grant
  lastPaymentRequestId: int("lastPaymentRequestId").references(() => transferPaymentRequests.id),
  // Audit trail (ajuste 2 de ChatGPT): quien otorgo esta sub (admin si fue cortesia)
  grantedByUserId: int("grantedByUserId").references(() => users.id),
  // Escape hatch (ajuste 3 inicial): info no estructurada sin necesidad de migrar schema
  metadata: json("metadata"),
  cancelledAt: timestamp("cancelledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  uniqUserPos: unique("uniq_user_pos").on(table.userId, table.posCode),
}));

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
