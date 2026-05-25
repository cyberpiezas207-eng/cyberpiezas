import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, gte, lte, or, ne, isNull, isNotNull } from "drizzle-orm";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import {
  users,
  mobilityProfiles,
  mobilityVerifications,
  mobilityRides,
  mobilityRideBookings,
  mobilityReviews,
  mobilityReports,
  mobilityWhitelist,
} from "../../drizzle/schema";
import * as db from "../db";
import { createNotification } from "./notifications";
import { storagePut } from "../storage";

async function getDbOrThrow() {
  const conn = await db.getDbOrThrow();
  if (!conn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
  return conn;
}

async function requireAdmin(userId: number) {
  const conn = await getDbOrThrow();
  const userRows = await conn.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!userRows[0] || userRows[0].role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Solo admin" });
  }
}

async function requireMobilityProfile(userId: number) {
  const conn = await getDbOrThrow();
  const rows = await conn
    .select()
    .from(mobilityProfiles)
    .where(eq(mobilityProfiles.userId, userId))
    .limit(1);
  const profile = rows[0];
  if (!profile) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Necesitas crear tu perfil de Mobility primero.",
    });
  }
  if (!profile.isActive) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Tu cuenta de Mobility esta inactiva.",
    });
  }
  return profile;
}

async function requireVerifiedDriver(userId: number) {
  const profile = await requireMobilityProfile(userId);
  if (profile.role !== "driver_verified" && profile.role !== "both") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Para publicar viajes necesitas verificacion de identidad.",
    });
  }
  return profile;
}

function decodeBase64Image(input: string): Buffer | null {
  if (!input) return null;
  const normalized = input.includes(",") ? input.split(",").pop() ?? "" : input;
  try {
    return Buffer.from(normalized, "base64");
  } catch {
    return null;
  }
}

export const mobilityRouter = router({
  whitelist: router({
    checkEmail: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ input }) => {
        const conn = await getDbOrThrow();
        const rows = await conn
          .select()
          .from(mobilityWhitelist)
          .where(
            and(
              eq(mobilityWhitelist.email, input.email.toLowerCase()),
              eq(mobilityWhitelist.isActive, true),
              isNull(mobilityWhitelist.usedAt),
            ),
          )
          .limit(1);
        return { invited: !!rows[0] };
      }),

    add: protectedProcedure
      .input(
        z.object({
          email: z.string().email(),
          phone: z.string().max(32).optional(),
          notes: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await requireAdmin(ctx.user.id);
        const conn = await getDbOrThrow();
        const emailLower = input.email.toLowerCase();
        const existing = await conn
          .select()
          .from(mobilityWhitelist)
          .where(eq(mobilityWhitelist.email, emailLower))
          .limit(1);
        if (existing[0]) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Este email ya esta en la whitelist.",
          });
        }
        await conn.insert(mobilityWhitelist).values({
          email: emailLower,
          phone: input.phone,
          invitedBy: ctx.user.id,
          invitationNotes: input.notes,
        });
        return { success: true };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      await requireAdmin(ctx.user.id);
      const conn = await getDbOrThrow();
      const rows = await conn
        .select()
        .from(mobilityWhitelist)
        .orderBy(desc(mobilityWhitelist.createdAt));
      return rows;
    }),

    deactivate: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requireAdmin(ctx.user.id);
        const conn = await getDbOrThrow();
        await conn
          .update(mobilityWhitelist)
          .set({ isActive: false })
          .where(eq(mobilityWhitelist.id, input.id));
        return { success: true };
      }),
  }),

  profile: router({
   create: protectedProcedure
      .input(
        z.object({
          displayName: z.string().min(2).max(80),
          phone: z.string().min(8).max(32),
          bio: z.string().max(500).optional(),
          baseCity: z.string().max(80).optional(),
          acceptedTermsVersion: z.string().min(1).max(20),
          acceptedPrivacyVersion: z.string().min(1).max(20),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();
        const existing = await conn
          .select()
          .from(mobilityProfiles)
          .where(eq(mobilityProfiles.userId, ctx.user.id))
          .limit(1);
        if (existing[0]) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ya tienes un perfil de Mobility.",
          });
        }
        const userRows = await conn
          .select()
          .from(users)
          .where(eq(users.id, ctx.user.id))
          .limit(1);
        const userRow = userRows[0];
        if (!userRow?.email) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Tu cuenta no tiene email asociado.",
          });
        }
        const emailLower = userRow.email.toLowerCase();
        const wlRows = await conn
          .select()
          .from(mobilityWhitelist)
          .where(
            and(
              eq(mobilityWhitelist.email, emailLower),
              eq(mobilityWhitelist.isActive, true),
              isNull(mobilityWhitelist.usedAt),
            ),
          )
          .limit(1);
        const whitelistEntry = wlRows[0];
        if (!whitelistEntry) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Mobility esta en piloto cerrado. Escribenos si crees que deberias tener acceso.",
          });
        }
        const now = new Date();
        await conn.insert(mobilityProfiles).values({
          userId: ctx.user.id,
          displayName: input.displayName,
          phone: input.phone.trim(),
          bio: input.bio,
          baseCity: input.baseCity,
          role: "passenger",
          phoneVerified: false,
          isActive: true,
          termsAcceptedAt: now,
          termsVersion: input.acceptedTermsVersion,
          privacyAcceptedAt: now,
          privacyVersion: input.acceptedPrivacyVersion,
        });
        await conn
          .update(mobilityWhitelist)
          .set({
            usedAt: now,
            usedByUserId: ctx.user.id,
          })
          .where(eq(mobilityWhitelist.id, whitelistEntry.id));
        return { success: true };
      }),

    getMine: protectedProcedure.query(async ({ ctx }) => {
      const conn = await getDbOrThrow();
      const rows = await conn
        .select()
        .from(mobilityProfiles)
        .where(eq(mobilityProfiles.userId, ctx.user.id))
        .limit(1);
      return rows[0] ?? null;
    }),

    update: protectedProcedure
      .input(
        z.object({
          displayName: z.string().min(2).max(80).optional(),
          phone: z.string().min(8).max(32).optional(),
          bio: z.string().max(500).optional(),
          baseCity: z.string().max(80).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await requireMobilityProfile(ctx.user.id);
        const conn = await getDbOrThrow();
        const updates: Record<string, unknown> = {};
        if (input.displayName !== undefined) updates.displayName = input.displayName;
        if (input.phone !== undefined) updates.phone = input.phone.trim();
        if (input.bio !== undefined) updates.bio = input.bio;
        if (input.baseCity !== undefined) updates.baseCity = input.baseCity;
        if (Object.keys(updates).length === 0) return { success: true };
        await conn
          .update(mobilityProfiles)
          .set(updates)
          .where(eq(mobilityProfiles.userId, ctx.user.id));
        return { success: true };
      }),

    // Perfil publico SIN telefono ni datos sensibles.
    getPublic: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const conn = await getDbOrThrow();
        const rows = await conn
          .select({
            userId: mobilityProfiles.userId,
            displayName: mobilityProfiles.displayName,
            bio: mobilityProfiles.bio,
            baseCity: mobilityProfiles.baseCity,
            role: mobilityProfiles.role,
            isActive: mobilityProfiles.isActive,
            createdAt: mobilityProfiles.createdAt,
          })
          .from(mobilityProfiles)
          .where(eq(mobilityProfiles.userId, input.userId))
          .limit(1);
        return rows[0] ?? null;
      }),

    // Solo entrega el telefono de la OTRA parte si existe un booking
    // aprobado entre ambos. Esto previene que cualquier usuario
    // pueda obtener telefonos sin contexto legitimo.
    getContactInfo: protectedProcedure
      .input(z.object({ otherUserId: z.number(), rideId: z.number() }))
      .query(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();

        // Validar que el ride existe y que el solicitante es parte de el.
        const rideRows = await conn
          .select()
          .from(mobilityRides)
          .where(eq(mobilityRides.id, input.rideId))
          .limit(1);
        const ride = rideRows[0];
        if (!ride) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Viaje no encontrado." });
        }

        // Hay dos casos legitimos:
        //   A) ctx.user es el conductor Y otherUserId es un pasajero aprobado
        //   B) ctx.user es un pasajero aprobado Y otherUserId es el conductor
        let authorized = false;
        if (ctx.user.id === ride.driverId && input.otherUserId !== ride.driverId) {
          // Caso A: revisar que otherUserId tenga booking aprobado en este ride.
          const bookingRows = await conn
            .select()
            .from(mobilityRideBookings)
            .where(
              and(
                eq(mobilityRideBookings.rideId, input.rideId),
                eq(mobilityRideBookings.passengerId, input.otherUserId),
                or(
                  eq(mobilityRideBookings.status, "approved"),
                  eq(mobilityRideBookings.status, "completed"),
                ),
              ),
            )
            .limit(1);
          if (bookingRows[0]) authorized = true;
        } else if (ctx.user.id !== ride.driverId && input.otherUserId === ride.driverId) {
          // Caso B: revisar que ctx.user tenga booking aprobado en este ride.
          const bookingRows = await conn
            .select()
            .from(mobilityRideBookings)
            .where(
              and(
                eq(mobilityRideBookings.rideId, input.rideId),
                eq(mobilityRideBookings.passengerId, ctx.user.id),
                or(
                  eq(mobilityRideBookings.status, "approved"),
                  eq(mobilityRideBookings.status, "completed"),
                ),
              ),
            )
            .limit(1);
          if (bookingRows[0]) authorized = true;
        }

        if (!authorized) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No tienes autorizacion para ver este contacto.",
          });
        }

        const profileRows = await conn
          .select({
            displayName: mobilityProfiles.displayName,
            phone: mobilityProfiles.phone,
          })
          .from(mobilityProfiles)
          .where(eq(mobilityProfiles.userId, input.otherUserId))
          .limit(1);
        const profile = profileRows[0];
        if (!profile || !profile.phone) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "La otra persona no ha registrado un telefono.",
          });
        }
        return {
          displayName: profile.displayName,
          phone: profile.phone,
        };
      }),
  }),

  verification: router({
    submit: protectedProcedure
      .input(
        z.object({
          ineFrontImage: z.string().min(20),
          selfieWithIneImage: z.string().min(20),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await requireMobilityProfile(ctx.user.id);
        const conn = await getDbOrThrow();

        const pending = await conn
          .select()
          .from(mobilityVerifications)
          .where(
            and(
              eq(mobilityVerifications.userId, ctx.user.id),
              eq(mobilityVerifications.status, "pending"),
            ),
          )
          .limit(1);
        if (pending[0]) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ya tienes una verificacion pendiente.",
          });
        }

        const ineBuffer = decodeBase64Image(input.ineFrontImage);
        const selfieBuffer = decodeBase64Image(input.selfieWithIneImage);
        if (!ineBuffer || !selfieBuffer) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Las imagenes no son validas.",
          });
        }

        const MAX_BYTES = 10 * 1024 * 1024;
        if (ineBuffer.length > MAX_BYTES || selfieBuffer.length > MAX_BYTES) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Las imagenes son demasiado grandes. Maximo 10MB cada una.",
          });
        }

        let ineUpload, selfieUpload;
        try {
          ineUpload = await storagePut(
            "mobility-verifications/user_" + ctx.user.id + "/ine.jpg",
            ineBuffer,
            "image/jpeg",
          );
          selfieUpload = await storagePut(
            "mobility-verifications/user_" + ctx.user.id + "/selfie.jpg",
            selfieBuffer,
            "image/jpeg",
          );
        } catch (err) {
          console.error("Storage error:", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No pudimos guardar las imagenes. Intenta de nuevo.",
          });
        }

        await conn.insert(mobilityVerifications).values({
          userId: ctx.user.id,
          ineFrontUrl: ineUpload.url,
          selfieWithIneUrl: selfieUpload.url,
          status: "pending",
        });

        const profileRows = await conn
          .select()
          .from(mobilityProfiles)
          .where(eq(mobilityProfiles.userId, ctx.user.id))
          .limit(1);
        const profile = profileRows[0];
        if (profile && profile.role === "passenger") {
          await conn
            .update(mobilityProfiles)
            .set({ role: "driver_pending" })
            .where(eq(mobilityProfiles.userId, ctx.user.id));
        }

        return { success: true };
      }),

    getMine: protectedProcedure.query(async ({ ctx }) => {
      const conn = await getDbOrThrow();
      const rows = await conn
        .select()
        .from(mobilityVerifications)
        .where(eq(mobilityVerifications.userId, ctx.user.id))
        .orderBy(desc(mobilityVerifications.createdAt))
        .limit(1);
      const v = rows[0];
      if (!v) return null;
      return {
        id: v.id,
        status: v.status,
        rejectionReason: v.rejectionReason,
        submittedAt: v.submittedAt,
        reviewedAt: v.reviewedAt,
      };
    }),

    listPending: protectedProcedure.query(async ({ ctx }) => {
      await requireAdmin(ctx.user.id);
      const conn = await getDbOrThrow();
      const rows = await conn
        .select()
        .from(mobilityVerifications)
        .where(eq(mobilityVerifications.status, "pending"))
        .orderBy(desc(mobilityVerifications.submittedAt));
      return rows;
    }),

    review: protectedProcedure
      .input(
        z.object({
          verificationId: z.number(),
          decision: z.enum(["approved", "rejected"]),
          rejectionReason: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await requireAdmin(ctx.user.id);
        const conn = await getDbOrThrow();
        const vRows = await conn
          .select()
          .from(mobilityVerifications)
          .where(eq(mobilityVerifications.id, input.verificationId))
          .limit(1);
        const verification = vRows[0];
        if (!verification) throw new TRPCError({ code: "NOT_FOUND" });
        if (verification.status !== "pending") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Esta verificacion ya fue revisada.",
          });
        }
        if (input.decision === "rejected" && !input.rejectionReason) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Si rechazas, debes incluir motivo.",
          });
        }
        await conn
          .update(mobilityVerifications)
          .set({
            status: input.decision,
            reviewedBy: ctx.user.id,
            reviewedAt: new Date(),
            rejectionReason: input.decision === "rejected" ? input.rejectionReason : null,
          })
          .where(eq(mobilityVerifications.id, input.verificationId));
        if (input.decision === "approved") {
          await conn
            .update(mobilityProfiles)
            .set({ role: "driver_verified" })
            .where(eq(mobilityProfiles.userId, verification.userId));
        } else {
          await conn
            .update(mobilityProfiles)
            .set({ role: "passenger" })
            .where(eq(mobilityProfiles.userId, verification.userId));
        }
        try {
          await createNotification({
            userId: verification.userId,
            type: "subscription_change",
            title:
              input.decision === "approved"
                ? "Verificacion aprobada"
                : "Verificacion rechazada",
            message:
              input.decision === "approved"
                ? "Ya puedes publicar viajes en Mobility."
                : "Motivo: " + (input.rejectionReason ?? "Sin detalles."),
            relatedId: verification.id,
          });
        } catch (e) {
          console.error("Notif fail:", e);
        }
        return { success: true };
      }),
  }),

  rides: router({
    create: protectedProcedure
      .input(
        z.object({
          originText: z.string().min(3).max(200),
          originLat: z.number().optional(),
          originLng: z.number().optional(),
          destinationText: z.string().min(3).max(200),
          destinationLat: z.number().optional(),
          destinationLng: z.number().optional(),
          departureAt: z.string(),
          seatsTotal: z.number().int().min(1).max(8),
          suggestedCostPerSeat: z.number().nonnegative().optional(),
          notes: z.string().max(500).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await requireVerifiedDriver(ctx.user.id);
        const conn = await getDbOrThrow();
        const departureDate = new Date(input.departureAt);
        if (isNaN(departureDate.getTime())) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Fecha de salida invalida.",
          });
        }
        if (departureDate.getTime() < Date.now() - 60 * 1000) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "La fecha de salida ya paso.",
          });
        }
        await conn.insert(mobilityRides).values({
          driverId: ctx.user.id,
          originText: input.originText,
          originLat: input.originLat !== undefined ? String(input.originLat) : null,
          originLng: input.originLng !== undefined ? String(input.originLng) : null,
          destinationText: input.destinationText,
          destinationLat: input.destinationLat !== undefined ? String(input.destinationLat) : null,
          destinationLng: input.destinationLng !== undefined ? String(input.destinationLng) : null,
          departureAt: departureDate,
          seatsTotal: input.seatsTotal,
          seatsAvailable: input.seatsTotal,
          suggestedCostPerSeat:
            input.suggestedCostPerSeat !== undefined
              ? String(input.suggestedCostPerSeat)
              : null,
          notes: input.notes,
          status: "published",
        });
        return { success: true };
      }),

    listPublished: protectedProcedure
      .input(
        z
          .object({
            search: z.string().max(80).optional(),
            limit: z.number().int().min(1).max(50).default(20),
          })
          .optional(),
      )
      .query(async ({ input }) => {
        const conn = await getDbOrThrow();
        const rows = await conn
          .select()
          .from(mobilityRides)
          .where(
            and(
              eq(mobilityRides.status, "published"),
              gte(mobilityRides.departureAt, new Date()),
            ),
          )
          .orderBy(mobilityRides.departureAt)
          .limit(input?.limit ?? 20);
        return rows;
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const conn = await getDbOrThrow();
        const rows = await conn
          .select()
          .from(mobilityRides)
          .where(eq(mobilityRides.id, input.id))
          .limit(1);
        return rows[0] ?? null;
      }),

    listMine: protectedProcedure.query(async ({ ctx }) => {
      const conn = await getDbOrThrow();
      const rows = await conn
        .select()
        .from(mobilityRides)
        .where(eq(mobilityRides.driverId, ctx.user.id))
        .orderBy(desc(mobilityRides.departureAt));
      return rows;
    }),

    cancel: protectedProcedure
      .input(z.object({ rideId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();
        const rows = await conn
          .select()
          .from(mobilityRides)
          .where(eq(mobilityRides.id, input.rideId))
          .limit(1);
        const ride = rows[0];
        if (!ride) throw new TRPCError({ code: "NOT_FOUND" });
        if (ride.driverId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (ride.status === "completed" || ride.status === "cancelled") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Este viaje ya no se puede cancelar.",
          });
        }
        await conn
          .update(mobilityRides)
          .set({ status: "cancelled" })
          .where(eq(mobilityRides.id, input.rideId));
        const bookings = await conn
          .select()
          .from(mobilityRideBookings)
          .where(
            and(
              eq(mobilityRideBookings.rideId, input.rideId),
              or(
                eq(mobilityRideBookings.status, "requested"),
                eq(mobilityRideBookings.status, "approved"),
              ),
            ),
          );
        for (const b of bookings) {
          await conn
            .update(mobilityRideBookings)
            .set({ status: "cancelled_by_driver" })
            .where(eq(mobilityRideBookings.id, b.id));
          try {
            await createNotification({
              userId: b.passengerId,
              type: "subscription_change",
              title: "Viaje cancelado",
              message: "El conductor cancelo el viaje al que ibas.",
              relatedId: input.rideId,
            });
          } catch (e) {
            console.error("Notif fail:", e);
          }
        }
        return { success: true };
      }),

    markCompleted: protectedProcedure
      .input(z.object({ rideId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();
        const rows = await conn
          .select()
          .from(mobilityRides)
          .where(eq(mobilityRides.id, input.rideId))
          .limit(1);
        const ride = rows[0];
        if (!ride) throw new TRPCError({ code: "NOT_FOUND" });
        if (ride.driverId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await conn
          .update(mobilityRides)
          .set({ status: "completed" })
          .where(eq(mobilityRides.id, input.rideId));
        await conn
          .update(mobilityRideBookings)
          .set({ status: "completed" })
          .where(
            and(
              eq(mobilityRideBookings.rideId, input.rideId),
              eq(mobilityRideBookings.status, "approved"),
            ),
          );
        return { success: true };
      }),
  }),

  bookings: router({
    request: protectedProcedure
      .input(
        z.object({
          rideId: z.number(),
          note: z.string().max(500).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await requireMobilityProfile(ctx.user.id);
        const conn = await getDbOrThrow();
        const rideRows = await conn
          .select()
          .from(mobilityRides)
          .where(eq(mobilityRides.id, input.rideId))
          .limit(1);
        const ride = rideRows[0];
        if (!ride) throw new TRPCError({ code: "NOT_FOUND" });
        if (ride.driverId === ctx.user.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No puedes solicitar un lugar en tu propio viaje.",
          });
        }
        if (ride.status !== "published") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Este viaje ya no acepta solicitudes.",
          });
        }
        if (ride.seatsAvailable <= 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ya no hay lugares disponibles.",
          });
        }
        try {
          await conn.insert(mobilityRideBookings).values({
            rideId: input.rideId,
            passengerId: ctx.user.id,
            status: "requested",
            requestNote: input.note,
          });
        } catch (err: any) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ya solicitaste un lugar en este viaje.",
          });
        }
        try {
          await createNotification({
            userId: ride.driverId,
            type: "subscription_change",
            title: "Nueva solicitud de viaje",
            message:
              "Alguien quiere un lugar en tu viaje del " +
              ride.departureAt.toLocaleDateString("es-MX") + ".",
            relatedId: ride.id,
          });
        } catch (e) {
          console.error("Notif fail:", e);
        }
        return { success: true };
      }),

    listForRide: protectedProcedure
      .input(z.object({ rideId: z.number() }))
      .query(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();
        const rideRows = await conn
          .select()
          .from(mobilityRides)
          .where(eq(mobilityRides.id, input.rideId))
          .limit(1);
        const ride = rideRows[0];
        if (!ride) throw new TRPCError({ code: "NOT_FOUND" });
        if (ride.driverId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const rows = await conn
          .select()
          .from(mobilityRideBookings)
          .where(eq(mobilityRideBookings.rideId, input.rideId))
          .orderBy(desc(mobilityRideBookings.createdAt));
        return rows;
      }),

    listMine: protectedProcedure.query(async ({ ctx }) => {
      const conn = await getDbOrThrow();
      const rows = await conn
        .select()
        .from(mobilityRideBookings)
        .where(eq(mobilityRideBookings.passengerId, ctx.user.id))
        .orderBy(desc(mobilityRideBookings.createdAt));
      return rows;
    }),

    // Obtiene mi booking en un ride especifico (si existe).
    // util para que el pasajero sepa si ya solicito y su estado.
    getMineForRide: protectedProcedure
      .input(z.object({ rideId: z.number() }))
      .query(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();
        const rows = await conn
          .select()
          .from(mobilityRideBookings)
          .where(
            and(
              eq(mobilityRideBookings.rideId, input.rideId),
              eq(mobilityRideBookings.passengerId, ctx.user.id),
            ),
          )
          .limit(1);
        return rows[0] ?? null;
      }),

    decide: protectedProcedure
      .input(
        z.object({
          bookingId: z.number(),
          decision: z.enum(["approved", "rejected"]),
          note: z.string().max(500).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();
        const bRows = await conn
          .select()
          .from(mobilityRideBookings)
          .where(eq(mobilityRideBookings.id, input.bookingId))
          .limit(1);
        const booking = bRows[0];
        if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
        const rideRows = await conn
          .select()
          .from(mobilityRides)
          .where(eq(mobilityRides.id, booking.rideId))
          .limit(1);
        const ride = rideRows[0];
        if (!ride || ride.driverId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (booking.status !== "requested") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Esta solicitud ya fue decidida.",
          });
        }
        await conn
          .update(mobilityRideBookings)
          .set({
            status: input.decision,
            responseNote: input.note,
            decidedAt: new Date(),
          })
          .where(eq(mobilityRideBookings.id, input.bookingId));
        if (input.decision === "approved") {
          const newSeats = ride.seatsAvailable - 1;
          await conn
            .update(mobilityRides)
            .set({
              seatsAvailable: newSeats,
              status: newSeats <= 0 ? "full" : "published",
            })
            .where(eq(mobilityRides.id, ride.id));
        }
        try {
          await createNotification({
            userId: booking.passengerId,
            type: "subscription_change",
            title:
              input.decision === "approved"
                ? "Solicitud aprobada"
                : "Solicitud rechazada",
            message:
              input.decision === "approved"
                ? "El conductor aprobo tu lugar. Ya pueden coordinarse por WhatsApp."
                : input.note ?? "El conductor no aprobo tu solicitud.",
            relatedId: ride.id,
          });
        } catch (e) {
          console.error("Notif fail:", e);
        }
        return { success: true };
      }),

    cancelByPassenger: protectedProcedure
      .input(z.object({ bookingId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();
        const rows = await conn
          .select()
          .from(mobilityRideBookings)
          .where(eq(mobilityRideBookings.id, input.bookingId))
          .limit(1);
        const booking = rows[0];
        if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
        if (booking.passengerId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        if (booking.status === "completed" || booking.status.startsWith("cancelled")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Esta solicitud ya no se puede cancelar.",
          });
        }
        const previousStatus = booking.status;
        await conn
          .update(mobilityRideBookings)
          .set({ status: "cancelled_by_passenger" })
          .where(eq(mobilityRideBookings.id, input.bookingId));
        if (previousStatus === "approved") {
          const rideRows = await conn
            .select()
            .from(mobilityRides)
            .where(eq(mobilityRides.id, booking.rideId))
            .limit(1);
          const ride = rideRows[0];
          if (ride && ride.status !== "departed" && ride.status !== "completed") {
            await conn
              .update(mobilityRides)
              .set({
                seatsAvailable: ride.seatsAvailable + 1,
                status: "published",
              })
              .where(eq(mobilityRides.id, ride.id));
            try {
              await createNotification({
                userId: ride.driverId,
                type: "subscription_change",
                title: "Pasajero cancelo",
                message: "Un pasajero cancelo su lugar. El lugar esta disponible.",
                relatedId: ride.id,
              });
            } catch (e) {
              console.error("Notif fail:", e);
            }
          }
        }
        return { success: true };
      }),
  }),

  reviews: router({
    create: protectedProcedure
      .input(
        z.object({
          rideId: z.number(),
          subjectUserId: z.number(),
          content: z.string().min(5).max(1000),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();
        if (input.subjectUserId === ctx.user.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No puedes resenarte a ti mismo.",
          });
        }
        const rideRows = await conn
          .select()
          .from(mobilityRides)
          .where(eq(mobilityRides.id, input.rideId))
          .limit(1);
        const ride = rideRows[0];
        if (!ride) throw new TRPCError({ code: "NOT_FOUND" });
        if (ride.status !== "completed") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Solo puedes resenar viajes completados.",
          });
        }
        let direction: "passenger_to_driver" | "driver_to_passenger";
        if (ctx.user.id === ride.driverId && input.subjectUserId !== ride.driverId) {
          const passengerBooking = await conn
            .select()
            .from(mobilityRideBookings)
            .where(
              and(
                eq(mobilityRideBookings.rideId, input.rideId),
                eq(mobilityRideBookings.passengerId, input.subjectUserId),
                eq(mobilityRideBookings.status, "completed"),
              ),
            )
            .limit(1);
          if (!passengerBooking[0]) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Ese pasajero no estuvo en este viaje.",
            });
          }
          direction = "driver_to_passenger";
        } else if (ctx.user.id !== ride.driverId && input.subjectUserId === ride.driverId) {
          const myBooking = await conn
            .select()
            .from(mobilityRideBookings)
            .where(
              and(
                eq(mobilityRideBookings.rideId, input.rideId),
                eq(mobilityRideBookings.passengerId, ctx.user.id),
                eq(mobilityRideBookings.status, "completed"),
              ),
            )
            .limit(1);
          if (!myBooking[0]) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "No estuviste en este viaje.",
            });
          }
          direction = "passenger_to_driver";
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Combinacion invalida.",
          });
        }
        await conn.insert(mobilityReviews).values({
          rideId: input.rideId,
          authorId: ctx.user.id,
          subjectId: input.subjectUserId,
          direction,
          content: input.content,
          isVisible: true,
        });
        return { success: true };
      }),

    listForUser: protectedProcedure
      .input(z.object({ userId: z.number(), limit: z.number().int().min(1).max(50).default(20) }))
      .query(async ({ input }) => {
        const conn = await getDbOrThrow();
        const rows = await conn
          .select()
          .from(mobilityReviews)
          .where(
            and(
              eq(mobilityReviews.subjectId, input.userId),
              eq(mobilityReviews.isVisible, true),
            ),
          )
          .orderBy(desc(mobilityReviews.createdAt))
          .limit(input.limit);
        return rows;
      }),

    hide: protectedProcedure
      .input(z.object({ reviewId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requireAdmin(ctx.user.id);
        const conn = await getDbOrThrow();
        await conn
          .update(mobilityReviews)
          .set({ isVisible: false })
          .where(eq(mobilityReviews.id, input.reviewId));
        return { success: true };
      }),
  }),

  reports: router({
    create: protectedProcedure
      .input(
        z.object({
          subjectUserId: z.number(),
          rideId: z.number().optional(),
          category: z.enum([
            "harassment",
            "fraud",
            "no_show",
            "safety",
            "doxxing",
            "spam",
            "discrimination",
            "other",
          ]),
          description: z.string().min(10).max(2000),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await requireMobilityProfile(ctx.user.id);
        if (input.subjectUserId === ctx.user.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No puedes reportarte a ti mismo.",
          });
        }
        const conn = await getDbOrThrow();
        await conn.insert(mobilityReports).values({
          reporterId: ctx.user.id,
          subjectId: input.subjectUserId,
          rideId: input.rideId,
          category: input.category,
          description: input.description,
          status: "open",
        });
        const adminRows = await conn
          .select()
          .from(users)
          .where(eq(users.role, "admin"))
          .limit(1);
        const admin = adminRows[0];
        if (admin) {
          try {
            await createNotification({
              userId: admin.id,
              type: "subscription_change",
              title: "Nuevo reporte en Mobility",
              message: "Categoria: " + input.category,
            });
          } catch (e) {
            console.error("Notif fail:", e);
          }
        }
        return { success: true };
      }),

    listMine: protectedProcedure.query(async ({ ctx }) => {
      const conn = await getDbOrThrow();
      const rows = await conn
        .select()
        .from(mobilityReports)
        .where(eq(mobilityReports.reporterId, ctx.user.id))
        .orderBy(desc(mobilityReports.createdAt));
      return rows;
    }),

    listOpen: protectedProcedure.query(async ({ ctx }) => {
      await requireAdmin(ctx.user.id);
      const conn = await getDbOrThrow();
      const rows = await conn
        .select()
        .from(mobilityReports)
        .where(
          or(
            eq(mobilityReports.status, "open"),
            eq(mobilityReports.status, "investigating"),
          ),
        )
        .orderBy(desc(mobilityReports.createdAt));
      return rows;
    }),

    resolve: protectedProcedure
      .input(
        z.object({
          reportId: z.number(),
          resolution: z.enum(["resolved", "dismissed", "escalated"]),
          notes: z.string().min(3).max(2000),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await requireAdmin(ctx.user.id);
        const conn = await getDbOrThrow();
        await conn
          .update(mobilityReports)
          .set({
            status: input.resolution,
            resolvedBy: ctx.user.id,
            resolvedAt: new Date(),
            resolutionNotes: input.notes,
          })
          .where(eq(mobilityReports.id, input.reportId));
        return { success: true };
      }),
  }),
});
