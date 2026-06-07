// >>> ESTE ARCHIVO ES NUEVO. CREALO EN: server/personalWishesSchema.ts <<<
// ============================================================================
// MODULO DESEOS (wishlist con cerebro de viabilidad) - Schema y migracion
// ----------------------------------------------------------------------------
// Guarda los deseos del dueno (cosas que quiere comprar, ej: un Xbox) y los
// que llegan del buzon de la esposa. El cerebro de la pestana Deseos calcula
// si cada deseo es viable comparando su costo contra el colchon (bolsillos) y
// lo que sobra al mes (dinero libre).
//
//   personalWishes -> un deseo: que es, cuanto cuesta, para cuando, cuanto
//                     llevas apartado, prioridad, estado, de donde vino.
//
// La tabla se crea en runStartupMigrations() de db.ts via el array
// personalWishesMigrations. CREATE TABLE IF NOT EXISTS = idempotente.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import {
  mysqlTable,
  int,
  varchar,
  text,
  decimal,
  timestamp,
} from "drizzle-orm/mysql-core";

// ----------------------------------------------------------------------------
// Tabla: deseos
// ----------------------------------------------------------------------------

export const personalWishes = mysqlTable("personalWishes", {
  id: int("id").autoincrement().primaryKey(),
  // Dueno del deseo (regla de oro: todo filtrado por userId).
  userId: int("userId").notNull(),
  // Que desea (ej: "Xbox Series X").
  title: varchar("title", { length: 160 }).notNull(),
  // Cuanto cuesta (estimado).
  estimatedCost: decimal("estimatedCost", { precision: 12, scale: 2 }).notNull(),
  // Para cuando lo quiere (YYYY-MM-DD, opcional).
  targetDate: varchar("targetDate", { length: 10 }),
  // Cuanto lleva apartado para este deseo (se puede ir sumando).
  savedSoFar: decimal("savedSoFar", { precision: 12, scale: 2 })
    .notNull()
    .default("0.00"),
  // low | medium | high
  priority: varchar("priority", { length: 10 }).notNull().default("medium"),
  // wishing (deseando) | achieved (logrado) | dismissed (descartado)
  status: varchar("status", { length: 12 }).notNull().default("wishing"),
  // own (lo agrego el dueno) | inbox (vino del buzon de la esposa)
  source: varchar("source", { length: 10 }).notNull().default("own"),
  // Si vino del buzon, cual submission lo origino (trazabilidad).
  sourceSubmissionId: int("sourceSubmissionId"),
  // Quien lo pidio (ej: nombre de la esposa, si vino del buzon).
  requestedBy: varchar("requestedBy", { length: 80 }),
  icon: varchar("icon", { length: 16 }),
  color: varchar("color", { length: 16 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  achievedAt: timestamp("achievedAt"),
});

// ----------------------------------------------------------------------------
// Tipos utiles
// ----------------------------------------------------------------------------

export type PersonalWish = typeof personalWishes.$inferSelect;
export type InsertPersonalWish = typeof personalWishes.$inferInsert;

// ----------------------------------------------------------------------------
// Migracion de arranque (raw SQL, idempotente).
// ----------------------------------------------------------------------------

export const personalWishesMigrations: string[] = [
  `CREATE TABLE IF NOT EXISTS \`personalWishes\` (
    \`id\` int AUTO_INCREMENT PRIMARY KEY,
    \`userId\` int NOT NULL,
    \`title\` varchar(160) NOT NULL,
    \`estimatedCost\` decimal(12,2) NOT NULL,
    \`targetDate\` varchar(10) NULL,
    \`savedSoFar\` decimal(12,2) NOT NULL DEFAULT '0.00',
    \`priority\` varchar(10) NOT NULL DEFAULT 'medium',
    \`status\` varchar(12) NOT NULL DEFAULT 'wishing',
    \`source\` varchar(10) NOT NULL DEFAULT 'own',
    \`sourceSubmissionId\` int NULL,
    \`requestedBy\` varchar(80) NULL,
    \`icon\` varchar(16) NULL,
    \`color\` varchar(16) NULL,
    \`notes\` text NULL,
    \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    \`achievedAt\` timestamp NULL DEFAULT NULL,
    INDEX \`idx_wishes_user_status\` (\`userId\`, \`status\`),
    FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`)
  )`,
];
