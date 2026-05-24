/**
 * ============================================================================
 * MOBILITY SCHEMA — CyberPiezas
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
// ============================================================================

export const mobilityProfiles = mysqlTable("mobility_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id),

  displayName: varchar("displayName", { length: 80 }).notNull(),
  bio: text("bio"),
  baseCity: varchar("baseCity", { length: 80 }),

  // Teléfono para coordinación post-aprobación de viajes.
  // SOLO se entrega a la otra parte cuando hay un booking aprobado.
  // Aislado al cuarto Mobility: NO toca el users.phone del edificio.
  phone: varchar("phone", { length: 32 }),

  role: mysqlEnum("role", [
    "passenger",
    "driver_pending",
    "driver_verified",
    "both",
  ]).default("passenger").notNull(),

  phoneVerified: boolean("phoneVerified").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MobilityProfile = typeof mobilityProfiles.$inferSelect;
export type InsertMobilityProfile = typeof mobilityProfiles.$inferInsert;

// ============================================================================
// 2. mobility_verifications
// ============================================================================

export const mobilityVerifications = mysqlTable("mobility_verifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),

  ineFrontUrl: varchar("ineFrontUrl", { length: 500 }).notNull(),
  selfieWithIneUrl: varchar("selfieWithIneUrl", { length: 500 }).notNull(),

  status: mysqlEnum("status", ["pending", "approved", "rejected"])
    .default("pending")
    .notNull(),

  reviewedBy: int("reviewedBy").references(() => users.id),
  reviewedAt: timestamp("reviewedAt"),
  rejectionReason: text("rejectionReason"),

  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MobilityVerification = typeof mobilityVerifications.$inferSelect;
export type InsertMobilityVerification = typeof mobilityVerifications.$inferInsert;

// ============================================================================
// 3. mobility_rides
// ============================================================================

export const mobilityRides = mysqlTable("mobility_rides", {
  id: int("id").autoincrement().primaryKey(),
  driverId: int("driverId").notNull().references(() => users.id),

  originText: varchar("originText", { length: 200 }).notNull(),
  originLat: decimal("originLat", { precision: 10, scale: 7 }),
  originLng: decimal("originLng", { precision: 10, scale: 7 }),

  destinationText: varchar("destinationText", { length: 200 }).notNull(),
  destinationLat: decimal("destinationLat", { precision: 10, scale: 7 }),
  destinationLng: decimal("destinationLng", { precision: 10, scale: 7 }),

  departureAt: datetime("departureAt").notNull(),

  seatsAvailable: int("seatsAvailable").notNull(),
  seatsTotal: int("seatsTotal").notNull(),

  suggestedCostPerSeat: decimal("suggestedCostPerSeat", { precision: 10, scale: 2 }),

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

    requestNote: text("requestNote"),
    responseNote: text("responseNote"),

    decidedAt: timestamp("decidedAt"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    uniqRidePassenger: unique("uniqRidePassenger").on(table.rideId, table.passengerId),
  })
);

export type MobilityRideBooking = typeof mobilityRideBookings.$inferSelect;
export type InsertMobilityRideBooking = typeof mobilityRideBookings.$inferInsert;

// ============================================================================
// 5. mobility_reviews
// ============================================================================

export const mobilityReviews = mysqlTable("mobility_reviews", {
  id: int("id").autoincrement().primaryKey(),
  rideId: int("rideId").notNull().references(() => mobilityRides.id),

  authorId: int("authorId").notNull().references(() => users.id),
  subjectId: int("subjectId").notNull().references(() => users.id),

  direction: mysqlEnum("direction", [
    "passenger_to_driver",
    "driver_to_passenger",
  ]).notNull(),

  content: text("content").notNull(),
  isVisible: boolean("isVisible").default(true).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MobilityReview = typeof mobilityReviews.$inferSelect;
export type InsertMobilityReview = typeof mobilityReviews.$inferInsert;

// ============================================================================
// 6. mobility_reports
// ============================================================================

export const mobilityReports = mysqlTable("mobility_reports", {
  id: int("id").autoincrement().primaryKey(),

  reporterId: int("reporterId").notNull().references(() => users.id),
  subjectId: int("subjectId").notNull().references(() => users.id),
  rideId: int("rideId").references(() => mobilityRides.id),

  category: mysqlEnum("category", [
    "harassment",
    "fraud",
    "no_show",
    "safety",
    "doxxing",
    "spam",
    "discrimination",
    "other",
  ]).notNull(),

  description: text("description").notNull(),

  status: mysqlEnum("status", [
    "open",
    "investigating",
    "resolved",
    "dismissed",
    "escalated",
  ]).default("open").notNull(),

  resolvedBy: int("resolvedBy").references(() => users.id),
  resolvedAt: timestamp("resolvedAt"),
  resolutionNotes: text("resolutionNotes"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MobilityReport = typeof mobilityReports.$inferSelect;
export type InsertMobilityReport = typeof mobilityReports.$inferInsert;

// ============================================================================
// 7. mobility_whitelist
// ============================================================================

export const mobilityWhitelist = mysqlTable("mobility_whitelist", {
  id: int("id").autoincrement().primaryKey(),

  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 32 }),

  invitedBy: int("invitedBy").notNull().references(() => users.id),
  invitationNotes: text("invitationNotes"),

  usedAt: timestamp("usedAt"),
  usedByUserId: int("usedByUserId").references(() => users.id),

  isActive: boolean("isActive").default(true).notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MobilityWhitelistEntry = typeof mobilityWhitelist.$inferSelect;
export type InsertMobilityWhitelistEntry = typeof mobilityWhitelist.$inferInsert;
