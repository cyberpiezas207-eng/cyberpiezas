// >>> ESTE ARCHIVO ES NUEVO. CREALO EN: server/personalAgendaSchema.ts <<<
// ============================================================================
// MODULO AGENDA (calendario de la esposa) - Schema y migracion de arranque
// ----------------------------------------------------------------------------
// La esposa tiene su propio mini-calendario en su pagina del buzon. Ahi anota
// sus dias importantes (cuando le pagan, citas, pendientes) y la pagina le
// muestra un aviso visual cuando algo es para manana.
//
//   personalAgenda -> un evento/recordatorio: que es, cuando, monto opcional,
//                     quien lo puso, de donde vino.
//
// La tabla se crea en runStartupMigrations() de db.ts via el array
// personalAgendaMigrations. CREATE TABLE IF NOT EXISTS = idempotente.
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
// Tabla: agenda (eventos y recordatorios)
// ----------------------------------------------------------------------------

export const personalAgenda = mysqlTable("personalAgenda", {
  id: int("id").autoincrement().primaryKey(),
  // Dueno del buzon: la agenda le pertenece (regla de oro userId).
  userId: int("userId").notNull(),
  // Token con el que se creo (trazabilidad, igual que las submissions).
  tokenId: int("tokenId"),
  // Que es (ej: "Me pagan del trabajo", "Cita medica").
  title: varchar("title", { length: 160 }).notNull(),
  // Cuando (YYYY-MM-DD).
  eventDate: varchar("eventDate", { length: 10 }).notNull(),
  // Detalle opcional.
  note: text("note"),
  // income (ingreso) | reminder (recordatorio) | task (pendiente)
  kind: varchar("kind", { length: 12 }).notNull().default("reminder"),
  // Monto opcional (para ingresos).
  amount: decimal("amount", { precision: 12, scale: 2 }),
  // Quien lo puso (nombre, ej: "Tilin").
  createdBy: varchar("createdBy", { length: 80 }),
  // inbox (lo puso ella) | income_submission (vino de un ingreso confirmado)
  source: varchar("source", { length: 20 }).notNull().default("inbox"),
  // Si vino de un ingreso del buzon, cual submission lo origino.
  sourceSubmissionId: int("sourceSubmissionId"),
  // Si ya paso / se cumplio.
  done: boolean("done").notNull().default(false),
  icon: varchar("icon", { length: 16 }),
  color: varchar("color", { length: 16 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ----------------------------------------------------------------------------
// Tipos utiles
// ----------------------------------------------------------------------------

export type PersonalAgendaEvent = typeof personalAgenda.$inferSelect;
export type InsertPersonalAgendaEvent = typeof personalAgenda.$inferInsert;

// ----------------------------------------------------------------------------
// Migracion de arranque (raw SQL, idempotente).
// ----------------------------------------------------------------------------

export const personalAgendaMigrations: string[] = [
  `CREATE TABLE IF NOT EXISTS \`personalAgenda\` (
    \`id\` int AUTO_INCREMENT PRIMARY KEY,
    \`userId\` int NOT NULL,
    \`tokenId\` int NULL,
    \`title\` varchar(160) NOT NULL,
    \`eventDate\` varchar(10) NOT NULL,
    \`note\` text NULL,
    \`kind\` varchar(12) NOT NULL DEFAULT 'reminder',
    \`amount\` decimal(12,2) NULL,
    \`createdBy\` varchar(80) NULL,
    \`source\` varchar(20) NOT NULL DEFAULT 'inbox',
    \`sourceSubmissionId\` int NULL,
    \`done\` tinyint(1) NOT NULL DEFAULT 0,
    \`icon\` varchar(16) NULL,
    \`color\` varchar(16) NULL,
    \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    INDEX \`idx_agenda_user_date\` (\`userId\`, \`eventDate\`),
    FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`)
  )`,
];
