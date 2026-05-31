// ============================================================================
// SCHEMA - Modulo Recordatorios (MVP)
// ----------------------------------------------------------------------------
// 1 tabla:
//   - personalReminders : recordatorio con fecha opcional, recurrencia opcional
//
// Diseño:
//   - Source-aware: cada recordatorio sabe de donde viene (manual, debt,
//     subscription, vehicle, pantry). Si viene de otro modulo, sourceId
//     guarda el id original para deep-link futuro.
//   - Recurrencia simple (daily/weekly/biweekly/monthly/quarterly/yearly).
//     Patrones complejos como "cada 3er lunes" NO en V1 (over-engineering).
//   - Snooze separate del status: status="pending" + snoozedUntil futuro
//     significa pospuesto. Si snoozedUntil pasa, vuelve a activo.
//   - Soft delete con deletedAt.
//
// Convenciones:
//   - userId en todo (multiusuario ready, hoy ownerOnly)
//   - Dinero N/A (recordatorios no manejan plata directamente)
//   - CREATE TABLE IF NOT EXISTS (idempotente)
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import {
  mysqlTable,
  int,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  mysqlEnum,
} from "drizzle-orm/mysql-core";

// ----------------------------------------------------------------------------
// TABLA: personalReminders
// ----------------------------------------------------------------------------
export const personalReminders = mysqlTable("personalReminders", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),

  // Concepto
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),

  // Cuando (opcional - recordatorios sin fecha existen, ej: "comprar pan")
  dueDate: date("dueDate"), // YMD
  dueTime: varchar("dueTime", { length: 8 }), // HH:MM o HH:MM:SS

  // Snooze (pospuesto temporalmente sin completar)
  snoozedUntil: date("snoozedUntil"),

  // Estado
  status: mysqlEnum("status", [
    "pending",
    "done",
    "dismissed",
  ])
    .notNull()
    .default("pending"),
  completedAt: timestamp("completedAt"),

  // Recurrencia
  isRecurring: boolean("isRecurring").notNull().default(false),
  recurrencePattern: mysqlEnum("recurrencePattern", [
    "daily",
    "weekly",
    "biweekly",
    "monthly",
    "quarterly",
    "yearly",
  ]),
  recurrenceUntil: date("recurrenceUntil"), // hasta cuando se repite (opcional)
  lastTriggeredAt: date("lastTriggeredAt"), // ultima vez que se "disparo" el recurrente

  // Source - de donde viene el recordatorio (para deep-link futuro)
  sourceModule: mysqlEnum("sourceModule", [
    "manual",
    "debt",
    "subscription",
    "vehicle",
    "pantry",
  ])
    .notNull()
    .default("manual"),
  sourceId: int("sourceId"), // FK opcional al modulo origen

  // Visualizacion
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"])
    .notNull()
    .default("normal"),
  icon: varchar("icon", { length: 20 }),
  color: varchar("color", { length: 20 }),

  // Tags como JSON array (futuro: filtros por tag)
  tags: text("tags"),

  // Notas internas
  notes: text("notes"),

  // Metadata
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});

// ----------------------------------------------------------------------------
// MIGRATIONS
// ----------------------------------------------------------------------------
export const personalRemindersMigrations: string[] = [
  `CREATE TABLE IF NOT EXISTS \`personalReminders\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`userId\` int(11) NOT NULL,
    \`title\` varchar(255) NOT NULL,
    \`description\` text,
    \`dueDate\` date DEFAULT NULL,
    \`dueTime\` varchar(8) DEFAULT NULL,
    \`snoozedUntil\` date DEFAULT NULL,
    \`status\` enum('pending','done','dismissed') NOT NULL DEFAULT 'pending',
    \`completedAt\` timestamp NULL DEFAULT NULL,
    \`isRecurring\` tinyint(1) NOT NULL DEFAULT 0,
    \`recurrencePattern\` enum('daily','weekly','biweekly','monthly','quarterly','yearly') DEFAULT NULL,
    \`recurrenceUntil\` date DEFAULT NULL,
    \`lastTriggeredAt\` date DEFAULT NULL,
    \`sourceModule\` enum('manual','debt','subscription','vehicle','pantry') NOT NULL DEFAULT 'manual',
    \`sourceId\` int(11) DEFAULT NULL,
    \`priority\` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
    \`icon\` varchar(20) DEFAULT NULL,
    \`color\` varchar(20) DEFAULT NULL,
    \`tags\` text,
    \`notes\` text,
    \`deletedAt\` timestamp NULL DEFAULT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`personalReminders_userId_idx\` (\`userId\`),
    KEY \`personalReminders_dueDate_idx\` (\`dueDate\`),
    KEY \`personalReminders_status_idx\` (\`status\`),
    KEY \`personalReminders_sourceModule_idx\` (\`sourceModule\`),
    KEY \`personalReminders_userId_status_dueDate_idx\` (\`userId\`, \`status\`, \`dueDate\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];
