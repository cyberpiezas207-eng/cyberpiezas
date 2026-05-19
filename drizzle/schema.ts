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
