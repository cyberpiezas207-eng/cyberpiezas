// ============================================================================
// SCHEMA - Modulo Vehiculo personal
// ----------------------------------------------------------------------------
// 2 tablas:
//   - personalVehicles       : carros/motos del usuario (Chevy Pop, etc)
//   - personalVehicleFuelLogs: cada carga de gasolina (monto, precio/L, etc)
//
// Convenciones:
//   - userId en todo para multiusuario futuro
//   - Soft delete con deletedAt
//   - Decimales: dinero 12,2 / precio/litro 8,3 (Pemex usa 3 decimales)
//   - Migraciones con CREATE TABLE IF NOT EXISTS (idempotentes)
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
// TABLA 1: personalVehicles
// ----------------------------------------------------------------------------
export const personalVehicles = mysqlTable("personalVehicles", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),

  name: varchar("name", { length: 80 }).notNull(), // Ej: "Chevy Pop"
  brand: varchar("brand", { length: 60 }), // Ej: "Chevrolet"
  model: varchar("model", { length: 60 }), // Ej: "Pop"
  year: int("year"),
  plate: varchar("plate", { length: 20 }), // placa opcional

  // Capacidad de tanque en litros (Chevy Pop ~40L)
  tankCapacityLiters: decimal("tankCapacityLiters", {
    precision: 6,
    scale: 2,
  }),

  // Ultimo odometro conocido (en km)
  currentOdometer: int("currentOdometer").default(0),

  // Para UI: emoji + color
  icon: varchar("icon", { length: 8 }).default("🚗"),
  color: varchar("color", { length: 16 }).default("#6366f1"),

  // Vehiculo default (cuando capturas sin especificar)
  isDefault: boolean("isDefault").default(false),
  isArchived: boolean("isArchived").default(false),

  notes: text("notes"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().onUpdateNow(),
  deletedAt: timestamp("deletedAt"),
});

export type PersonalVehicle = typeof personalVehicles.$inferSelect;
export type NewPersonalVehicle = typeof personalVehicles.$inferInsert;

// ----------------------------------------------------------------------------
// TABLA 2: personalVehicleFuelLogs
// ----------------------------------------------------------------------------
export const personalVehicleFuelLogs = mysqlTable("personalVehicleFuelLogs", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  vehicleId: int("vehicleId").notNull(),

  fillDate: date("fillDate", { mode: "string" }).notNull(), // YYYY-MM-DD

  // Lo que pagaste (ej: $200)
  amountPaid: decimal("amountPaid", { precision: 12, scale: 2 }).notNull(),

  // Precio por litro (Pemex usa 3 decimales, ej: 23.490)
  pricePerLiter: decimal("pricePerLiter", { precision: 8, scale: 3 }).notNull(),

  // Litros recibidos (computed: amountPaid / pricePerLiter)
  liters: decimal("liters", { precision: 8, scale: 3 }).notNull(),

  // Lectura del odometro al cargar (opcional)
  odometerReading: int("odometerReading"),

  // Km recorridos desde el ultimo refill (calculado al insertar)
  kmSinceLast: int("kmSinceLast"),

  // Rendimiento en km/L de este tramo (calculado al insertar)
  kmPerLiter: decimal("kmPerLiter", { precision: 6, scale: 2 }),

  // Como estaba el tanque ANTES de cargar (0-100 %)
  tankPercentBefore: int("tankPercentBefore"),

  // Tienda donde cargo (referencia a personalExpenseStores)
  storeId: int("storeId"),
  storeName: varchar("storeName", { length: 100 }),

  // Metodo de pago
  paymentMethod: mysqlEnum("paymentMethod", [
    "cash",
    "debit",
    "credit",
    "transfer",
    "other",
  ]).default("cash"),

  // Gasto personal vinculado (cuando se crea automaticamente)
  linkedExpenseId: int("linkedExpenseId"),

  notes: text("notes"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().onUpdateNow(),
  deletedAt: timestamp("deletedAt"),
});

export type PersonalVehicleFuelLog =
  typeof personalVehicleFuelLogs.$inferSelect;
export type NewPersonalVehicleFuelLog =
  typeof personalVehicleFuelLogs.$inferInsert;

// ----------------------------------------------------------------------------
// MIGRACIONES - CREATE TABLE IF NOT EXISTS (idempotentes)
// ----------------------------------------------------------------------------
export const personalVehicleMigrations = [
  `CREATE TABLE IF NOT EXISTS \`personalVehicles\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`userId\` int(11) NOT NULL,
    \`name\` varchar(80) NOT NULL,
    \`brand\` varchar(60) DEFAULT NULL,
    \`model\` varchar(60) DEFAULT NULL,
    \`year\` int(11) DEFAULT NULL,
    \`plate\` varchar(20) DEFAULT NULL,
    \`tankCapacityLiters\` decimal(6,2) DEFAULT NULL,
    \`currentOdometer\` int(11) DEFAULT 0,
    \`icon\` varchar(8) DEFAULT '🚗',
    \`color\` varchar(16) DEFAULT '#6366f1',
    \`isDefault\` tinyint(1) DEFAULT 0,
    \`isArchived\` tinyint(1) DEFAULT 0,
    \`notes\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deletedAt\` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (\`id\`),
    KEY \`personalVehicles_userId_idx\` (\`userId\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS \`personalVehicleFuelLogs\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`userId\` int(11) NOT NULL,
    \`vehicleId\` int(11) NOT NULL,
    \`fillDate\` date NOT NULL,
    \`amountPaid\` decimal(12,2) NOT NULL,
    \`pricePerLiter\` decimal(8,3) NOT NULL,
    \`liters\` decimal(8,3) NOT NULL,
    \`odometerReading\` int(11) DEFAULT NULL,
    \`kmSinceLast\` int(11) DEFAULT NULL,
    \`kmPerLiter\` decimal(6,2) DEFAULT NULL,
    \`tankPercentBefore\` int(11) DEFAULT NULL,
    \`storeId\` int(11) DEFAULT NULL,
    \`storeName\` varchar(100) DEFAULT NULL,
    \`paymentMethod\` enum('cash','debit','credit','transfer','other') DEFAULT 'cash',
    \`linkedExpenseId\` int(11) DEFAULT NULL,
    \`notes\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deletedAt\` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (\`id\`),
    KEY \`personalVehicleFuelLogs_userId_idx\` (\`userId\`),
    KEY \`personalVehicleFuelLogs_vehicleId_idx\` (\`vehicleId\`),
    KEY \`personalVehicleFuelLogs_fillDate_idx\` (\`fillDate\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];
