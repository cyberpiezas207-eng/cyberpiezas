// ============================================================================
// SCHEMA - Mantenimientos del vehiculo
// ----------------------------------------------------------------------------
// 1 tabla nueva:
//   - personalVehicleMaintenanceLog : registro de cada mantenimiento hecho
//                                     (afinacion, aceite, llantas, etc)
//
// Tipos de mantenimiento (enum):
//   - tire_pressure  : calibracion de llantas
//   - oil_change     : cambio de aceite + filtro
//   - tune_up        : afinacion (bujias, cables)
//   - air_filter     : filtro de aire del motor
//   - brakes         : frenos (balatas, discos)
//   - alignment      : alineacion y/o balanceo
//   - other          : otro mantenimiento no categorizado
//
// El engine de salud lee de aqui y calcula:
//   - Score 0-100
//   - Impacto en rendimiento por cada item descuidado
//   - Recomendaciones
//
// Tabla independiente: no toca personalVehicles ni personalVehicleFuelLogs.
//
// Convenciones:
//   - userId en todo para multiusuario futuro
//   - Sin soft delete (los mantenimientos no se borran, son historial real)
//   - Migracion CREATE TABLE IF NOT EXISTS (idempotente, cero riesgo)
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import {
  mysqlTable,
  int,
  varchar,
  text,
  timestamp,
  date,
  mysqlEnum,
} from "drizzle-orm/mysql-core";

// ----------------------------------------------------------------------------
// TABLA: personalVehicleMaintenanceLog
// ----------------------------------------------------------------------------
export const personalVehicleMaintenanceLog = mysqlTable(
  "personalVehicleMaintenanceLog",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("userId").notNull(),
    vehicleId: int("vehicleId").notNull(),

    // Tipo de mantenimiento
    maintenanceType: mysqlEnum("maintenanceType", [
      "tire_pressure",
      "oil_change",
      "tune_up",
      "air_filter",
      "brakes",
      "alignment",
      "other",
    ]).notNull(),

    // Cuando se hizo (fecha)
    performedAt: date("performedAt", { mode: "string" }).notNull(),

    // Odometro al momento del servicio (opcional, pero muy util)
    odometerAtService: int("odometerAtService"),

    // Costo opcional del servicio (para futuras stats)
    cost: int("cost"), // en pesos, sin decimales (suficiente para mantenimientos)

    // Donde se hizo (taller, etc)
    serviceProvider: varchar("serviceProvider", { length: 120 }),

    // Detalles libres
    notes: text("notes"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull().onUpdateNow(),
  },
);

export type PersonalVehicleMaintenanceLog =
  typeof personalVehicleMaintenanceLog.$inferSelect;
export type NewPersonalVehicleMaintenanceLog =
  typeof personalVehicleMaintenanceLog.$inferInsert;

// ----------------------------------------------------------------------------
// MIGRACIONES - CREATE TABLE IF NOT EXISTS (idempotente)
// ----------------------------------------------------------------------------
export const personalVehicleMaintenanceMigrations = [
  `CREATE TABLE IF NOT EXISTS \`personalVehicleMaintenanceLog\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`userId\` int(11) NOT NULL,
    \`vehicleId\` int(11) NOT NULL,
    \`maintenanceType\` enum('tire_pressure','oil_change','tune_up','air_filter','brakes','alignment','other') NOT NULL,
    \`performedAt\` date NOT NULL,
    \`odometerAtService\` int(11) DEFAULT NULL,
    \`cost\` int(11) DEFAULT NULL,
    \`serviceProvider\` varchar(120) DEFAULT NULL,
    \`notes\` text,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`personalVehicleMaintenanceLog_userId_idx\` (\`userId\`),
    KEY \`personalVehicleMaintenanceLog_vehicleId_idx\` (\`vehicleId\`),
    KEY \`personalVehicleMaintenanceLog_type_idx\` (\`maintenanceType\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];
