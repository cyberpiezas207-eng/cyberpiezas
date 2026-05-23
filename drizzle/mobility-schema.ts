/**
 * ============================================================================
 * MOBILITY SCHEMA — CyberPiezas
 * ============================================================================
 *
 * Archivo independiente con todas las tablas del módulo Mobility.
 * No modifica el schema principal del repo. Se integra agregando
 * UNA sola línea al final de schema.ts:
 *
 *     export * from './mobility-schema';
 *
 * Filosofía:
 *   - Identidad única (usuario) compartida con el resto del ecosistema.
 *   - Reputación CONTEXTUAL: lo que se construye aquí no se mezcla
 *     automáticamente con Celine ni con POS.
 *   - Sin scores numéricos. Las reseñas son texto cualitativo.
 *   - Whitelist explícita: solo personas invitadas pueden registrarse
 *     a Mobility durante el piloto cerrado.
 *   - Verificación humana INE + selfie antes de poder ofrecer viajes.
 *
 * ============================================================================
 */

import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  datetime,
  unique,
} from "drizzle-orm/mysql-core";

import { users } from "./schema";

// ============================================================================
// 1. mobility_profiles
// ----------------------------------------------------------------------------
// Perfil de un usuario dentro de Mobility. Una persona = un perfil.
// Separado de los datos generales de `users` para mantener aislamiento
// del módulo (cada "cuarto del edificio" tiene su propio recibo de luz).
// ============================================================================

export const mobilityProfiles = mysqlTable("mobility_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id),

  // Cómo se muestra en Mobility. Puede ser distinto del nombre legal.
  displayName: varchar("displayName", { length: 80 }).notNull(),

  // Texto corto. Lo que la persona quiere decir de sí misma en Mobility.
  bio: text("bio"),

  // Ciudad base. En el piloto: solo "Cuernavaca", "Cuautla", etc.
  baseCity: varchar("baseCity", { length: 80 }),

  // Rol funcional. Empieza como passenger. Para volverse driver_verified
  // necesita pasar por mobility_verifications con estado 'approved'.
  role: mysqlEnum("role", [
    "passenger",
    "driver_pending",
    "driver_verified",
    "both",
  ]).default("passenger").notNull(),

  // Verificaciones progresivas (identidad progresiva).
  phoneVerified: boolean("phoneVerified").default(false).notNull(),

  // Soft-disable. Si un usuario es suspendido por moderación,
  // su perfil queda inactivo pero NO se borra.
  isActive: boolean("isActive").default(true).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MobilityProfile = typeof mobilityProfiles.$inferSelect;
export type InsertMobilityProfile = typeof mobilityProfiles.$inferInsert;

// ============================================================================
// 2. mobility_verifications
// ----------------------------------------------------------------------------
// Cada intento de verificación de identidad. INMUTABLE: si se rechaza,
// el usuario crea una nueva entrada. Historial completo se conserva.
//
// Las URLs apuntan a almacenamiento encriptado externo (S3, Cloudinary, etc).
// La columna guarda solo la referencia/key, NUNCA el archivo binario.
// Esas imágenes solo son visibles para el equipo de moderación,
// nunca para otros usuarios. El perfil público solo muestra
// "Identidad verificada" o no.
// ============================================================================

export const mobilityVerifications = mysqlTable("mobility_verifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),

  // Foto de la INE (frente). URL a almacenamiento encriptado.
  ineFrontUrl: varchar("ineFrontUrl", { length: 500 }).notNull(),

  // Foto del usuario sosteniendo su INE junto a su cara.
  // Esta es la pieza clave anti-fraude: previene uso de INE ajena.
  selfieWithIneUrl: varchar("selfieWithIneUrl", { length: 500 }).notNull(),

  status: mysqlEnum("status", ["pending", "approved", "rejected"])
    .default("pending")
    .notNull(),

  // Quién revisó (al principio: siempre David).
  reviewedBy: int("reviewedBy").references(() => users.id),
  reviewedAt: timestamp("reviewedAt"),

  // Si se rechaza, explicación corta para el usuario.
  // Lenguaje humano, no técnico (siguiendo guía de moderación).
  rejectionReason: text("rejectionReason"),

  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MobilityVerification = typeof mobilityVerifications.$inferSelect;
export type InsertMobilityVerification = typeof mobilityVerifications.$inferInsert;

// ============================================================================
// 3. mobility_rides
// ----------------------------------------------------------------------------
// Un viaje publicado por un conductor verificado.
// Origin y destination se guardan como texto + lat/lng OPCIONAL.
// En v1 lat/lng son nullable porque no implementamos geolocalización.
// Cuando se agregue, los viajes existentes no se rompen.
// ============================================================================

export const mobilityRides = mysqlTable("mobility_rides", {
  id: int("id").autoincrement().primaryKey(),
  driverId: int("driverId").notNull().references(() => users.id),

  // Origen: descripción en texto libre (ej. "Cuernavaca centro, Plaza de Armas").
  originText: varchar("originText", { length: 200 }).notNull(),
  originLat: decimal("originLat", { precision: 10, scale: 7 }),
  originLng: decimal("originLng", { precision: 10, scale: 7 }),

  // Destino: descripción en texto libre (ej. "UAEM Cuernavaca, Chamilpa").
  destinationText: varchar("destinationText", { length: 200 }).notNull(),
  destinationLat: decimal("destinationLat", { precision: 10, scale: 7 }),
  destinationLng: decimal("destinationLng", { precision: 10, scale: 7 }),

  // Fecha y hora de salida.
  departureAt: datetime("departureAt").notNull(),

  // Lugares disponibles (se decrementa al aprobar bookings).
  seatsAvailable: int("seatsAvailable").notNull(),
  // Lugares totales que el conductor publicó (referencia histórica).
  seatsTotal: int("seatsTotal").notNull(),

  // Costo sugerido por lugar. Opcional — el conductor puede ofrecer gratis.
  // El dinero se transfiere FUERA de la plataforma (efectivo o transferencia).
  // Esta cifra es solo informativa para el pasajero.
  suggestedCostPerSeat: decimal("suggestedCostPerSeat", { precision: 10, scale: 2 }),

  // Notas adicionales del conductor (ej. "Llevo perro", "Solo no fumadores").
  notes: text("notes"),

  status: mysqlEnum("status", [
    "published",
    "full",
    "departed",
    "completed",
    "cancelled",
  ]).default("published").notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MobilityRide = typeof mobilityRides.$inferSelect;
export type InsertMobilityRide = typeof mobilityRides.$inferInsert;

// ============================================================================
// 4. mobility_ride_bookings
// ----------------------------------------------------------------------------
// Cuando un pasajero solicita un lugar en un viaje publicado.
// El conductor aprueba o rechaza. Si aprueba, ambos reciben acceso
// al WhatsApp del otro (la comunicación previa al viaje pasa por WhatsApp,
// no por chat in-app).
// ============================================================================

export const mobilityRideBookings = mysqlTable(
  "mobility_ride_bookings",
  {
    id: int("id").autoincrement().primaryKey(),
    rideId: int("rideId").notNull().references(() => mobilityRides.id),
    passengerId: int("passengerId").notNull().references(() => users.id),

    status: mysqlEnum("status", [
      "requested",
      "approved",
      "rejected",
      "cancelled_by_passenger",
      "cancelled_by_driver",
      "completed",
    ]).default("requested").notNull(),

    // Mensaje opcional del pasajero al solicitar
    // (ej. "Llevo una mochila grande, ¿hay espacio?").
    requestNote: text("requestNote"),

    // Mensaje opcional del conductor al responder
    // (ej. "Sí, pero salimos 10 min más tarde de lo publicado").
    responseNote: text("responseNote"),

    // Cuándo el conductor tomó la decisión.
    decidedAt: timestamp("decidedAt"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    // Un pasajero no puede solicitar dos veces el mismo viaje.
    uniqRidePassenger: unique("uniqRidePassenger").on(table.rideId, table.passengerId),
  })
);

export type MobilityRideBooking = typeof mobilityRideBookings.$inferSelect;
export type InsertMobilityRideBooking = typeof mobilityRideBookings.$inferInsert;

// ============================================================================
// 5. mobility_reviews
// ----------------------------------------------------------------------------
// Descripción CUALITATIVA post-viaje. INMUTABLE.
//
// CRÍTICO: no hay estrellas, no hay números, no hay "5 de 5".
// Solo texto. Ese es el principio constitucional de la confianza
// en CyberPiezas: "no es un score, son personas describiendo
// a personas".
//
// Si el autor quiere corregir, escribe una segunda. Ambas quedan.
// Moderación puede ocultar una reseña con isVisible=false,
// pero no la borra.
// ============================================================================

export const mobilityReviews = mysqlTable("mobility_reviews", {
  id: int("id").autoincrement().primaryKey(),
  rideId: int("rideId").notNull().references(() => mobilityRides.id),

  // Quién escribió la reseña.
  authorId: int("authorId").notNull().references(() => users.id),
  // Sobre quién es la reseña.
  subjectId: int("subjectId").notNull().references(() => users.id),

  // Pasajero hablando del conductor, o conductor hablando del pasajero.
  direction: mysqlEnum("direction", [
    "passenger_to_driver",
    "driver_to_passenger",
  ]).notNull(),

  // Texto libre. Sin límite duro pero la UI sugiere brevedad
  // (ejemplo de placeholder: "¿Cómo fue compartir este viaje?").
  content: text("content").notNull(),

  // Moderación puede ocultar una reseña (no borrarla) si viola reglas.
  isVisible: boolean("isVisible").default(true).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MobilityReview = typeof mobilityReviews.$inferSelect;
export type InsertMobilityReview = typeof mobilityReviews.$inferInsert;

// ============================================================================
// 6. mobility_reports
// ----------------------------------------------------------------------------
// Cuando un usuario reporta a otro o reporta un viaje.
// Esto entra al pipeline de moderación documentado en
// "moderacion-operativa-cyberpiezas.md".
// ============================================================================

export const mobilityReports = mysqlTable("mobility_reports", {
  id: int("id").autoincrement().primaryKey(),

  // Quién reporta.
  reporterId: int("reporterId").notNull().references(() => users.id),
  // Sobre quién es el reporte.
  subjectId: int("subjectId").notNull().references(() => users.id),
  // Opcional: si el reporte se relaciona con un viaje específico.
  rideId: int("rideId").references(() => mobilityRides.id),

  category: mysqlEnum("category", [
    "harassment",      // acoso
    "fraud",           // fraude (cobró y no llevó, etc.)
    "no_show",         // no se presentó al viaje
    "safety",          // conducta peligrosa en el viaje
    "doxxing",         // publicó info personal sin permiso
    "spam",            // mensajes basura
    "discrimination",  // discurso de odio o discriminación
    "other",
  ]).notNull(),

  // Descripción del reportante. En sus propias palabras.
  description: text("description").notNull(),

  status: mysqlEnum("status", [
    "open",
    "investigating",
    "resolved",
    "dismissed",
    "escalated",       // escalado a autoridades externas
  ]).default("open").notNull(),

  // Quién del equipo resolvió.
  resolvedBy: int("resolvedBy").references(() => users.id),
  resolvedAt: timestamp("resolvedAt"),

  // Notas internas del moderador (no visibles al reportante ni al reportado).
  resolutionNotes: text("resolutionNotes"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MobilityReport = typeof mobilityReports.$inferSelect;
export type InsertMobilityReport = typeof mobilityReports.$inferInsert;

// ============================================================================
// 7. mobility_whitelist
// ----------------------------------------------------------------------------
// El piloto cerrado se controla con whitelist explícita.
// Solo personas invitadas (email pre-registrado por David)
// pueden crear perfil de Mobility.
//
// Cuando se registren, su entrada de whitelist queda marcada
// con usedAt y usedByUserId para auditoría.
// ============================================================================

export const mobilityWhitelist = mysqlTable("mobility_whitelist", {
  id: int("id").autoincrement().primaryKey(),

  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 32 }),

  // Quién invitó a esta persona.
  invitedBy: int("invitedBy").notNull().references(() => users.id),

  // Notas privadas para recordar contexto de la invitación
  // (ej. "Vecina de la colonia, amiga de mi mamá", "Compañero de UAEM").
  invitationNotes: text("invitationNotes"),

  // Cuándo se usó la invitación (cuando se registró el usuario).
  usedAt: timestamp("usedAt"),
  usedByUserId: int("usedByUserId").references(() => users.id),

  // Se puede desactivar una invitación que aún no se haya usado.
  isActive: boolean("isActive").default(true).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MobilityWhitelistEntry = typeof mobilityWhitelist.$inferSelect;
export type InsertMobilityWhitelistEntry = typeof mobilityWhitelist.$inferInsert;

// ============================================================================
// FIN DEL SCHEMA DE MOBILITY
// ============================================================================
