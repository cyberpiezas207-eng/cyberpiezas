// ============================================================================
// SCHEMA - Materiales/Insumos personales (catalogo + movimientos + junction)
// ----------------------------------------------------------------------------
// David revende y usa materiales en servicios tecnicos (cable UTP, RJ45,
// camaras CCTV, componentes PC). Necesita saber utilidad REAL por servicio
// descontando el costo de materiales usados.
//
// Ejemplo:
//   Compra: rollo cable UTP 360m por $980 -> $2.72/m
//   Servicio: cobro $1500, usa 20m de cable -> costo $54.44
//   Utilidad real: $1445.56 (no $1500)
//
// Arquitectura (3 tablas, recomendado por ChatGPT):
//
//   1. personalMaterials
//      - Catalogo de materiales del usuario
//      - Stock denormalizado (se actualiza con movimientos)
//      - Costo promedio ponderado (averageUnitCost)
//
//   2. personalMaterialMovements
//      - Historial completo de entradas/salidas
//      - Tipos: purchase, used_in_operation, waste, adjustment, return
//      - Snapshot del costo unitario al momento del movimiento
//
//   3. personalOperationMaterials
//      - Junction: que materiales se usaron en cada operacion
//      - Snapshot del costo (historico inmutable)
//      - sourceType: inventory | direct_purchase | manual
//
// 3 tipos de material:
//   - consumable: se gasta (cable, tornillos, RJ45)
//   - tool: NO se gasta (taladro, multimetro, escalera)
//   - direct_purchase: se compra solo para un servicio (disco duro especifico)
//
// Costeo: promedio ponderado. Snapshot historico inmutable (si en enero use
// cable a $2.72, esa operacion conserva ese costo aunque hoy cueste $3.50).
//
// IMPORTANTE: Idempotente con CREATE TABLE IF NOT EXISTS.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import {
  mysqlTable,
  int,
  varchar,
  text,
  decimal,
  date,
  timestamp,
  mysqlEnum,
  json,
} from "drizzle-orm/mysql-core";

// ----------------------------------------------------------------------------
// Tabla 1: personalMaterials (catalogo)
// ----------------------------------------------------------------------------

export const personalMaterials = mysqlTable("personalMaterials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),

  // Identificacion
  name: varchar("name", { length: 120 }).notNull(),
  normalizedName: varchar("normalizedName", { length: 120 }).notNull(),
  shortCode: varchar("shortCode", { length: 20 }),
  // Aliases para mejorar busqueda y cerebro NLP futuro
  // Ejemplo: ["cable exterior", "utp", "cable camara"]
  aliasesJson: json("aliasesJson"),

  // Clasificacion
  materialType: mysqlEnum("materialType", [
    "consumable",        // Se gasta (cable, RJ45, tornillos)
    "tool",              // No se gasta (taladro, multimetro)
    "direct_purchase",   // Compra para servicio especifico (no entra a stock general)
  ]).notNull().default("consumable"),
  category: varchar("category", { length: 60 }),

  // Unidad de medida
  unit: mysqlEnum("unit", [
    "m",       // metros
    "pza",     // piezas
    "kg",      // kilogramos
    "L",       // litros
    "rollo",   // rollos
    "caja",    // cajas
    "otro",
  ]).notNull().default("pza"),

  // Stock y costos (denormalizados, se actualizan via movements)
  stockQuantity: decimal("stockQuantity", { precision: 12, scale: 3 })
    .notNull()
    .default("0.000"),
  averageUnitCost: decimal("averageUnitCost", { precision: 12, scale: 4 })
    .notNull()
    .default("0.0000"),
  minStockQuantity: decimal("minStockQuantity", { precision: 12, scale: 3 }),

  // Proveedor (lite, sin tabla aparte)
  preferredSupplierName: varchar("preferredSupplierName", { length: 100 }),
  lastSupplierName: varchar("lastSupplierName", { length: 100 }),
  lastPurchaseDate: date("lastPurchaseDate", { mode: "string" }),
  lastPurchasePrice: decimal("lastPurchasePrice", { precision: 12, scale: 2 }),

  // Visual y notas
  imageUrl: varchar("imageUrl", { length: 500 }),
  icon: varchar("icon", { length: 8 }),
  color: varchar("color", { length: 16 }),
  notes: text("notes"),

  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  deletedAt: timestamp("deletedAt"),
});

// ----------------------------------------------------------------------------
// Tabla 2: personalMaterialMovements (historial)
// ----------------------------------------------------------------------------

export const personalMaterialMovements = mysqlTable("personalMaterialMovements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  materialId: int("materialId").notNull(),
  operationId: int("operationId"),

  // Tipo de movimiento
  movementType: mysqlEnum("movementType", [
    "purchase",            // Compra inicial o recompra (suma stock)
    "used_in_operation",   // Uso en servicio (resta stock)
    "waste",               // Merma/perdida (resta stock)
    "adjustment",          // Ajuste manual (puede ser + o -)
    "return",              // Devolucion al proveedor (resta stock)
  ]).notNull(),

  // Cantidad: positiva o negativa segun movementType
  // purchase y return positivo, used_in_operation y waste negativo
  // adjustment puede ser cualquier signo
  quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),

  // Snapshot del costo al momento del movimiento
  unitCostSnapshot: decimal("unitCostSnapshot", { precision: 12, scale: 4 }),
  totalCostSnapshot: decimal("totalCostSnapshot", { precision: 12, scale: 2 }),

  // Razon (especialmente para waste y adjustment)
  // Ejemplo: "Se rompio", "Se perdio", "Material defectuoso", "Medicion real"
  reason: varchar("reason", { length: 200 }),

  // Proveedor (solo para purchase)
  supplierName: varchar("supplierName", { length: 100 }),

  // Fecha del movimiento (no del createdAt, puede ser retroactivo)
  movementDate: date("movementDate", { mode: "string" }).notNull(),

  notes: text("notes"),

  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// ----------------------------------------------------------------------------
// Tabla 3: personalOperationMaterials (junction operaciones <-> materiales)
// ----------------------------------------------------------------------------

export const personalOperationMaterials = mysqlTable("personalOperationMaterials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  operationId: int("operationId").notNull(),

  // materialId puede ser null si es direct_purchase o manual
  // (material que no esta en catalogo, solo registrado para la operacion)
  materialId: int("materialId"),

  // Snapshot del nombre por si despues se borra/edita el material
  materialNameSnapshot: varchar("materialNameSnapshot", { length: 120 }).notNull(),

  // Cantidad usada en esta operacion
  quantityUsed: decimal("quantityUsed", { precision: 12, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 16 }).notNull(),

  // Snapshot del costo (INMUTABLE, no recalcular con precios futuros)
  unitCostSnapshot: decimal("unitCostSnapshot", { precision: 12, scale: 4 }).notNull(),
  totalCostSnapshot: decimal("totalCostSnapshot", { precision: 12, scale: 2 }).notNull(),

  // De donde viene el material
  sourceType: mysqlEnum("sourceType", [
    "inventory",         // Del catalogo (descuenta stock)
    "direct_purchase",   // Compra directa para el servicio (no afecta stock)
    "manual",            // Capturado manualmente sin material en catalogo
  ]).notNull().default("inventory"),

  notes: text("notes"),

  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// ----------------------------------------------------------------------------
// Migraciones SQL (idempotente)
// ----------------------------------------------------------------------------

export const personalMaterialsMigrations: string[] = [
  `CREATE TABLE IF NOT EXISTS \`personalMaterials\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`userId\` int(11) NOT NULL,
    \`name\` varchar(120) NOT NULL,
    \`normalizedName\` varchar(120) NOT NULL,
    \`shortCode\` varchar(20) DEFAULT NULL,
    \`aliasesJson\` json DEFAULT NULL,
    \`materialType\` enum('consumable','tool','direct_purchase') NOT NULL DEFAULT 'consumable',
    \`category\` varchar(60) DEFAULT NULL,
    \`unit\` enum('m','pza','kg','L','rollo','caja','otro') NOT NULL DEFAULT 'pza',
    \`stockQuantity\` decimal(12,3) NOT NULL DEFAULT '0.000',
    \`averageUnitCost\` decimal(12,4) NOT NULL DEFAULT '0.0000',
    \`minStockQuantity\` decimal(12,3) DEFAULT NULL,
    \`preferredSupplierName\` varchar(100) DEFAULT NULL,
    \`lastSupplierName\` varchar(100) DEFAULT NULL,
    \`lastPurchaseDate\` date DEFAULT NULL,
    \`lastPurchasePrice\` decimal(12,2) DEFAULT NULL,
    \`imageUrl\` varchar(500) DEFAULT NULL,
    \`icon\` varchar(8) DEFAULT NULL,
    \`color\` varchar(16) DEFAULT NULL,
    \`notes\` text DEFAULT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deletedAt\` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (\`id\`),
    KEY \`personalMaterials_userId_idx\` (\`userId\`),
    KEY \`personalMaterials_normalizedName_idx\` (\`normalizedName\`),
    KEY \`personalMaterials_materialType_idx\` (\`materialType\`),
    KEY \`personalMaterials_deletedAt_idx\` (\`deletedAt\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS \`personalMaterialMovements\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`userId\` int(11) NOT NULL,
    \`materialId\` int(11) NOT NULL,
    \`operationId\` int(11) DEFAULT NULL,
    \`movementType\` enum('purchase','used_in_operation','waste','adjustment','return') NOT NULL,
    \`quantity\` decimal(12,3) NOT NULL,
    \`unitCostSnapshot\` decimal(12,4) DEFAULT NULL,
    \`totalCostSnapshot\` decimal(12,2) DEFAULT NULL,
    \`reason\` varchar(200) DEFAULT NULL,
    \`supplierName\` varchar(100) DEFAULT NULL,
    \`movementDate\` date NOT NULL,
    \`notes\` text DEFAULT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`personalMaterialMovements_userId_idx\` (\`userId\`),
    KEY \`personalMaterialMovements_materialId_idx\` (\`materialId\`),
    KEY \`personalMaterialMovements_operationId_idx\` (\`operationId\`),
    KEY \`personalMaterialMovements_movementType_idx\` (\`movementType\`),
    KEY \`personalMaterialMovements_movementDate_idx\` (\`movementDate\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS \`personalOperationMaterials\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`userId\` int(11) NOT NULL,
    \`operationId\` int(11) NOT NULL,
    \`materialId\` int(11) DEFAULT NULL,
    \`materialNameSnapshot\` varchar(120) NOT NULL,
    \`quantityUsed\` decimal(12,3) NOT NULL,
    \`unit\` varchar(16) NOT NULL,
    \`unitCostSnapshot\` decimal(12,4) NOT NULL,
    \`totalCostSnapshot\` decimal(12,2) NOT NULL,
    \`sourceType\` enum('inventory','direct_purchase','manual') NOT NULL DEFAULT 'inventory',
    \`notes\` text DEFAULT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`personalOperationMaterials_userId_idx\` (\`userId\`),
    KEY \`personalOperationMaterials_operationId_idx\` (\`operationId\`),
    KEY \`personalOperationMaterials_materialId_idx\` (\`materialId\`),
    KEY \`personalOperationMaterials_sourceType_idx\` (\`sourceType\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];
