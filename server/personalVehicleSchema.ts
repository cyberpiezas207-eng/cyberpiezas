// ============================================================================
// SCHEMA - Modulo Vehiculo personal
// ----------------------------------------------------------------------------
// 3 tablas:
//   - personalVehicles            : carros/motos del usuario (Chevy Pop, etc)
//   - personalVehicleFuelLogs     : cada carga de gasolina
//   - personalVehicleTankReadings : lecturas manuales del % de tanque (NUEVO)
//
// CAMPOS NUEVOS en personalVehicles (Cerebro de Tanque Mediano):
//   - lastKnownTankPercent       : 0-100, lo que David dijo "estoy en X%"
//   - lastKnownTankAt            : timestamp de cuando dijo eso
//   - lastKnownOdometerAtTank    : odometro registrado en ese momento
//
// El motor calcula el % actual del tanque a partir de:
//   1. Ultimo % conocido + odometro de ese momento
//   2. Odometro actual del vehiculo (km manejados desde entonces)
//   3. Litros cargados desde entonces (suben el tanque)
//
// Convenciones:
//   - userId en todo para multiusuario futuro
//   - Soft delete con deletedAt
//   - Decimales: dinero 12,2 / precio/litro 8,3 (Pemex usa 3 decimales)
//   - Migraciones con CREATE TABLE IF NOT EXISTS (idempotentes)
//   - ALTER TABLE con catch de errno 1060 (columna ya existe)
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

  // ----------------- CEREBRO DE TANQUE (NUEVO) -----------------
  // Ultima lectura manual del tanque que dio el usuario (0-100)
  lastKnownTankPercent: int("lastKnownTankPercent"),
  // Timestamp de esa ultima lectura
  lastKnownTankAt: timestamp("lastKnownTankAt"),
  // Odometro registrado en el momento de esa lectura (para calcular km manejados despues)
  lastKnownOdometerAtTank: int("lastKnownOdometerAtTank"),
  // -------------------------------------------------------------

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
// TABLA 3: personalVehicleTankReadings (NUEVO - Cerebro de Tanque)
// ----------------------------------------------------------------------------
// Historial de lecturas manuales del tanque. Cada vez que el usuario dice
// "estoy en 50%", "tanque lleno", etc, se guarda aqui. Sirve para:
//   - Auditoria (ver historial de lecturas)
//   - Calculos retroactivos si llegara a hacer falta
//   - Stats de "cuantas veces dejo el tanque casi vacio" en el futuro
//
// La lectura MAS RECIENTE se cachea ademas en personalVehicles para evitar
// queries innecesarias.
// ----------------------------------------------------------------------------
export const personalVehicleTankReadings = mysqlTable(
  "personalVehicleTankReadings",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("userId").notNull(),
    vehicleId: int("vehicleId").notNull(),

    // % que dijo el usuario (0-100)
    tankPercent: int("tankPercent").notNull(),

    // Odometro en ese momento (puede ser null si no lo dio)
    odometerAtReading: int("odometerAtReading"),

    // Como dio la lectura: boton rapido o input exacto o auto al cargar
    source: mysqlEnum("source", ["quick_button", "exact_input", "auto_refill"])
      .default("quick_button")
      .notNull(),

    notes: text("notes"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
);

export type PersonalVehicleTankReading =
  typeof personalVehicleTankReadings.$inferSelect;
export type NewPersonalVehicleTankReading =
  typeof personalVehicleTankReadings.$inferInsert;

// ----------------------------------------------------------------------------
// MIGRACIONES - CREATE TABLE IF NOT EXISTS + ALTER TABLE (idempotentes)
// ----------------------------------------------------------------------------
// IMPORTANTE: Los ALTER TABLE deben ejecutarse con catch del errno 1060
// (columna ya existe) en el runStartupMigrations de db.ts.
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
    \`lastKnownTankPercent\` int(11) DEFAULT NULL,
    \`lastKnownTankAt\` timestamp NULL DEFAULT NULL,
    \`lastKnownOdometerAtTank\` int(11) DEFAULT NULL,
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

  // ALTER TABLE para vehiculos existentes (catch errno 1060 si ya existen)
  `ALTER TABLE \`personalVehicles\` ADD COLUMN \`lastKnownTankPercent\` int(11) DEFAULT NULL`,
  `ALTER TABLE \`personalVehicles\` ADD COLUMN \`lastKnownTankAt\` timestamp NULL DEFAULT NULL`,
  `ALTER TABLE \`personalVehicles\` ADD COLUMN \`lastKnownOdometerAtTank\` int(11) DEFAULT NULL`,

  // Tabla nueva de lecturas de tanque
  `CREATE TABLE IF NOT EXISTS \`personalVehicleTankReadings\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`userId\` int(11) NOT NULL,
    \`vehicleId\` int(11) NOT NULL,
    \`tankPercent\` int(11) NOT NULL,
    \`odometerAtReading\` int(11) DEFAULT NULL,
    \`source\` enum('quick_button','exact_input','auto_refill') NOT NULL DEFAULT 'quick_button',
    \`notes\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`personalVehicleTankReadings_userId_idx\` (\`userId\`),
    KEY \`personalVehicleTankReadings_vehicleId_idx\` (\`vehicleId\`),
    KEY \`personalVehicleTankReadings_createdAt_idx\` (\`createdAt\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];
