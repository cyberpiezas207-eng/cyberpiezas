// >>> ESTE ARCHIVO ES NUEVO. CREALO EN: server/personalAnimalsSchema.ts <<<
// ============================================================================
// MODULO ANIMALES - Schema y migracion de arranque
// ----------------------------------------------------------------------------
// Modulo AUTONOMO: no toca gastos ni el pastel. Tiene sus propias tablas.
//
// 1) personalAnimals  -> los grupos (perro, borregos, conejos, gallinas...)
// 2) personalAnimalEvents -> lo que pasa con ellos:
//      - gasto      (comida, vet): sale dinero
//      - produccion (huevos, etc): cantidad + valor estimado opcional
//      - consumo    (te los comes): cantidad + valor estimado opcional
//      - venta      (los vendes): cantidad + dinero real
//
// "Conviene" = (ventas reales + valor estimado de produccion/consumo) - gastos
//
// Las tablas se crean en runStartupMigrations() de db.ts via el array
// personalAnimalsMigrations. CREATE TABLE IF NOT EXISTS = idempotente.
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
// Tabla 1: grupos de animales
// ----------------------------------------------------------------------------

export const personalAnimals = mysqlTable("personalAnimals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  // Especie/tipo libre: borrego, conejo, gallina, perro...
  species: varchar("species", { length: 60 }),
  // Cuantos animales hay en el grupo
  count: int("count").notNull().default(1),
  icon: varchar("icon", { length: 20 }),
  color: varchar("color", { length: 20 }),
  // Si el grupo da retribucion (gallinas, borregos) o es solo gasto (perro).
  // Es informativo; el calculo igual suma lo que registres.
  givesReturn: boolean("givesReturn").notNull().default(true),
  isActive: boolean("isActive").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});

// ----------------------------------------------------------------------------
// Tabla 2: movimientos (gasto / produccion / consumo / venta)
// ----------------------------------------------------------------------------

export const personalAnimalEvents = mysqlTable("personalAnimalEvents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  animalId: int("animalId").notNull(),
  // gasto | produccion | consumo | venta
  type: varchar("type", { length: 20 }).notNull(),
  // Cantidad: huevos, kilos, piezas... (opcional)
  quantity: decimal("quantity", { precision: 12, scale: 2 }),
  // Unidad para mostrar: huevos, kg, piezas...
  unitLabel: varchar("unitLabel", { length: 30 }),
  // Dinero: en gasto/venta es real; en produccion/consumo es valor estimado
  // opcional (el ahorro). Puede ir NULL si solo se quiere contar cantidad.
  amount: decimal("amount", { precision: 12, scale: 2 }),
  eventDate: date("eventDate", { mode: "string" }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  deletedAt: timestamp("deletedAt"),
});

// ----------------------------------------------------------------------------
// Tipos utiles
// ----------------------------------------------------------------------------

export type PersonalAnimal = typeof personalAnimals.$inferSelect;
export type InsertPersonalAnimal = typeof personalAnimals.$inferInsert;
export type PersonalAnimalEvent = typeof personalAnimalEvents.$inferSelect;
export type InsertPersonalAnimalEvent = typeof personalAnimalEvents.$inferInsert;

// ----------------------------------------------------------------------------
// Migracion de arranque (raw SQL, idempotente). Primero los grupos, luego
// los movimientos (que referencian al grupo).
// ----------------------------------------------------------------------------

export const personalAnimalsMigrations: string[] = [
  `CREATE TABLE IF NOT EXISTS \`personalAnimals\` (
    \`id\` int AUTO_INCREMENT PRIMARY KEY,
    \`userId\` int NOT NULL,
    \`name\` varchar(120) NOT NULL,
    \`species\` varchar(60) NULL,
    \`count\` int NOT NULL DEFAULT 1,
    \`icon\` varchar(20) NULL,
    \`color\` varchar(20) NULL,
    \`givesReturn\` tinyint(1) NOT NULL DEFAULT 1,
    \`isActive\` tinyint(1) NOT NULL DEFAULT 1,
    \`notes\` text NULL,
    \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    \`updatedAt\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    \`deletedAt\` timestamp NULL DEFAULT NULL,
    INDEX \`idx_animals_user_active\` (\`userId\`, \`isActive\`),
    FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`personalAnimalEvents\` (
    \`id\` int AUTO_INCREMENT PRIMARY KEY,
    \`userId\` int NOT NULL,
    \`animalId\` int NOT NULL,
    \`type\` varchar(20) NOT NULL,
    \`quantity\` decimal(12,2) NULL,
    \`unitLabel\` varchar(30) NULL,
    \`amount\` decimal(12,2) NULL,
    \`eventDate\` date NOT NULL,
    \`notes\` text NULL,
    \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    \`deletedAt\` timestamp NULL DEFAULT NULL,
    INDEX \`idx_animalev_user\` (\`userId\`),
    INDEX \`idx_animalev_animal\` (\`animalId\`, \`eventDate\`),
    FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`),
    FOREIGN KEY (\`animalId\`) REFERENCES \`personalAnimals\`(\`id\`)
  )`,
];
