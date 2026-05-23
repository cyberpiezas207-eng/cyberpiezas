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

// =============================================================================
// MOBILITY ROUTER
// -----------------------------------------------------------------------------
// Cableado completo del cuarto "Mobility" del edificio CyberPiezas.
//
// Filosofía operativa (referencia rápida):
//   - Whitelist explícita controla quién puede crear perfil de Mobility.
//   - Verificación humana INE + selfie ANTES de poder ofrecer viajes.
//   - Reseñas son texto cualitativo, sin estrellas, sin números.
//   - Comunicación previa al viaje pasa por WhatsApp (no hay chat in-app).
//   - El dinero entre conductor y pasajero pasa FUERA de la plataforma.
//
// Estructura de sub-routers:
//   - whitelist     → admin gestiona invitaciones al piloto cerrado
//   - profile       → perfil del usuario dentro de Mobility
//   - verification  → flujo de verificación INE + selfie
//   - rides         → viajes publicados por conductores
//   - bookings      → solicitudes de pasajeros a viajes
//   - reviews       → descripciones cualitativas post-viaje
//   - reports       → reportes de moderación
// =============================================================================

async function getDbOrThrow() {
  const conn = await db.getDbOrThrow();
  if (!conn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
  return conn;
}

// =============================================================================
// HELPERS
// =============================================================================

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
      message: "Tu cuenta de Mobility está inactiva. Escribe a moderacion@cyberpiezas.com.",
    });
  }
  return profile;
}

async function requireVerifiedDriver(userId: number) {
  const profile = await requireMobilityProfile(userId);
  if (profile.role !== "driver_verified" && profile.role !== "both") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Para publicar viajes necesitas completar la verificación de identidad (INE + selfie).",
    });
  }
  return profile;
}

// =============================================================================
// ROUTER
// =============================================================================

export const mobilityRouter = router({
  // =========================================================================
  // WHITELIST (admin gestiona el piloto cerrado)
  // =========================================================================
  whitelist: router({
    // Verificar si un email está invitado. PÚBLICO porque se llama
    // antes del registro (durante el flujo de signup a Mobility).
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

        // Si ya existe, evitar duplicado.
        const existing = await conn
          .select()
          .from(mobilityWhitelist)
          .where(eq(mobilityWhitelist.email, emailLower))
          .limit(1);
        if (existing[0]) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Este email ya está en la whitelist.",
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

  // =========================================================================
  // PROFILE (perfil del usuario dentro de Mobility)
  // =========================================================================
  profile: router({
    // Crear el perfil de mobility para el usuario logueado.
    // Verifica que su email esté en la whitelist activa.
    create: protectedProcedure
      .input(
        z.object({
          displayName: z.string().min(2).max(80),
          bio: z.string().max(500).optional(),
          baseCity: z.string().max(80).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();

        // Verificar que el usuario no tenga ya un perfil.
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

        // Verificar whitelist por email del usuario.
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
            message:
              "Mobility está en piloto cerrado por invitación. Si crees que deberías tener acceso, escríbenos.",
          });
        }

        // Crear perfil
        const result = await conn.insert(mobilityProfiles).values({
          userId: ctx.user.id,
          displayName: input.displayName,
          bio: input.bio,
          baseCity: input.baseCity,
          role: "passenger",
          phoneVerified: false,
          isActive: true,
        });

        // Marcar invitación como usada
        await conn
          .update(mobilityWhitelist)
          .set({
            usedAt: new Date(),
            usedByUserId: ctx.user.id,
          })
          .where(eq(mobilityWhitelist.id, whitelistEntry.id));

        return { success: true };
      }),

    // Obtener mi propio perfil completo
    getMine: protectedProcedure.query(async ({ ctx }) => {
      const conn = await getDbOrThrow();
      const rows = await conn
        .select()
        .from(mobilityProfiles)
        .where(eq(mobilityProfiles.userId, ctx.user.id))
        .limit(1);
      return rows[0] ?? null;
    }),

    // Actualizar mi propio perfil
    update: protectedProcedure
      .input(
        z.object({
          displayName: z.string().min(2).max(80).optional(),
          bio: z.string().max(500).optional(),
          baseCity: z.string().max(80).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await requireMobilityProfile(ctx.user.id);
        const conn = await getDbOrThrow();
        const updates: Record<string, unknown> = {};
        if (input.displayName !== undefined) updates.displayName = input.displayName;
        if (input.bio !== undefined) updates.bio = input.bio;
        if (input.baseCity !== undefined) updates.baseCity = input.baseCity;
        if (Object.keys(updates).length === 0) {
          return { success: true };
        }
        await conn
          .update(mobilityProfiles)
          .set(updates)
          .where(eq(mobilityProfiles.userId, ctx.user.id));
        return { success: true };
      }),

    // Ver perfil PÚBLICO de otro usuario (info limitada, sin INE ni datos sensibles)
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
  }),

  // =========================================================================
  // VERIFICATION (INE + selfie con INE junto a la cara)
  // =========================================================================
  verification: router({
    // Usuario sube sus dos URLs (las imágenes ya subieron a storage externo).
    submit: protectedProcedure
      .input(
        z.object({
          ineFrontUrl: z.string().url().max(500),
          selfieWithIneUrl: z.string().url().max(500),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await requireMobilityProfile(ctx.user.id);
        const conn = await getDbOrThrow();

        // Si ya tiene una verificación pendiente, no permitir otra.
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
            message: "Ya tienes una verificación pendiente. Espera la revisión.",
          });
        }

        await conn.insert(mobilityVerifications).values({
          userId: ctx.user.id,
          ineFrontUrl: input.ineFrontUrl,
          selfieWithIneUrl: input.selfieWithIneUrl,
          status: "pending",
        });

        // Actualizar perfil a "driver_pending" si todavía no es driver verified.
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

    // Usuario consulta el estado de su última verificación.
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
      // No regresamos las URLs al usuario por seguridad/privacidad.
      // Solo estado y motivo si fue rechazado.
      return {
        id: v.id,
        status: v.status,
        rejectionReason: v.rejectionReason,
        submittedAt: v.submittedAt,
        reviewedAt: v.reviewedAt,
      };
    }),

    // Admin lista las verificaciones pendientes.
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

    // Admin aprueba o rechaza. Si aprueba, actualiza el perfil del usuario
    // a "driver_verified" (o "both" si ya era something else).
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
            message: "Esta verificación ya fue revisada.",
          });
        }
        if (input.decision === "rejected" && !input.rejectionReason) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Si rechazas, debes incluir motivo (mensaje al usuario).",
          });
        }

        // Marcar verificación
        await conn
          .update(mobilityVerifications)
          .set({
            status: input.decision,
            reviewedBy: ctx.user.id,
            reviewedAt: new Date(),
            rejectionReason: input.decision === "rejected" ? input.rejectionReason : null,
          })
          .where(eq(mobilityVerifications.id, input.verificationId));

        // Si aprobado, ajustar rol del perfil
        if (input.decision === "approved") {
          await conn
            .update(mobilityProfiles)
            .set({ role: "driver_verified" })
            .where(eq(mobilityProfiles.userId, verification.userId));
        } else {
          // Si rechazado, regresar a passenger (no quedan en estado pending colgado)
          await conn
            .update(mobilityProfiles)
            .set({ role: "passenger" })
            .where(eq(mobilityProfiles.userId, verification.userId));
        }

        // Notificar al usuario
        try {
          await createNotification({
            userId: verification.userId,
            type: "subscription_change",
            title:
              input.decision === "approved"
                ? "Verificación aprobada"
                : "Verificación rechazada",
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

  // =========================================================================
  // RIDES (viajes publicados por conductores)
  // =========================================================================
  rides: router({
    // Publicar un viaje. Solo conductores verificados.
    create: protectedProcedure
      .input(
        z.object({
          originText: z.string().min(3).max(200),
          originLat: z.number().optional(),
          originLng: z.number().optional(),
          destinationText: z.string().min(3).max(200),
          destinationLat: z.number().optional(),
          destinationLng: z.number().optional(),
          departureAt: z.string(), // ISO date string
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
            message: "Fecha de salida inválida.",
          });
        }
        if (departureDate.getTime() < Date.now() - 60 * 1000) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "La fecha de salida ya pasó.",
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

    // Lista pública de viajes activos (que aún no salieron).
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
        await requireMobilityProfile; // Solo usuarios con perfil de Mobility ven viajes.
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

    // Detalle de un viaje específico.
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

    // Mis viajes como conductor.
    listMine: protectedProcedure.query(async ({ ctx }) => {
      const conn = await getDbOrThrow();
      const rows = await conn
        .select()
        .from(mobilityRides)
        .where(eq(mobilityRides.driverId, ctx.user.id))
        .orderBy(desc(mobilityRides.departureAt));
      return rows;
    }),

    // Cancelar un viaje (solo el conductor).
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

        // Marcar bookings aprobados/solicitados como cancelados por el conductor.
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
          // Notificar al pasajero
          try {
            await createNotification({
              userId: b.passengerId,
              type: "subscription_change",
              title: "Viaje cancelado",
              message: "El conductor canceló el viaje al que ibas. Disculpa las molestias.",
              relatedId: input.rideId,
            });
          } catch (e) {
            console.error("Notif fail:", e);
          }
        }

        return { success: true };
      }),

    // Marcar viaje como completado.
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

        // Marcar bookings aprobados como completados (para que puedan hacer reviews)
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

  // =========================================================================
  // BOOKINGS (solicitudes de pasajeros a viajes)
  // =========================================================================
  bookings: router({
    // Pasajero solicita un lugar.
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

        // El unique constraint en (rideId, passengerId) previene duplicados a nivel DB.
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

        // Notificar al conductor
        try {
          await createNotification({
            userId: ride.driverId,
            type: "subscription_change",
            title: "Nueva solicitud de viaje",
            message: "Alguien quiere un lugar en tu viaje del " + ride.departureAt.toLocaleDateString("es-MX") + ".",
            relatedId: ride.id,
          });
        } catch (e) {
          console.error("Notif fail:", e);
        }

        return { success: true };
      }),

    // Conductor ve solicitudes de su viaje.
    listForRide: protectedProcedure
      .input(z.object({ rideId: z.number() }))
      .query(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();
        // Verificar que el conductor sea dueño del viaje.
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

    // Mis solicitudes como pasajero.
    listMine: protectedProcedure.query(async ({ ctx }) => {
      const conn = await getDbOrThrow();
      const rows = await conn
        .select()
        .from(mobilityRideBookings)
        .where(eq(mobilityRideBookings.passengerId, ctx.user.id))
        .orderBy(desc(mobilityRideBookings.createdAt));
      return rows;
    }),

    // Conductor decide (aprobar o rechazar).
    // Al aprobar: ambas partes deben recibir el WhatsApp del otro
    // (este intercambio se hace en el cliente, leyendo los users
    // — la columna phone está en users si la añades; por ahora
    // se asume que el cliente lo expone una vez aprobada).
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

        // Verificar que el conductor sea dueño del viaje
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

        // Si aprobó, decrementar lugares disponibles
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

        // Notificar al pasajero
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
                ? "El conductor aprobó tu lugar. Ya pueden coordinarse."
                : input.note ?? "El conductor no aprobó tu solicitud.",
            relatedId: ride.id,
          });
        } catch (e) {
          console.error("Notif fail:", e);
        }
        return { success: true };
      }),

    // Pasajero cancela su solicitud.
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

        // Si estaba aprobado, devolver el lugar al ride
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
            // Notificar al conductor
            try {
              await createNotification({
                userId: ride.driverId,
                type: "subscription_change",
                title: "Pasajero canceló",
                message: "Un pasajero canceló su lugar. El lugar está disponible de nuevo.",
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

  // =========================================================================
  // REVIEWS (descripciones cualitativas post-viaje — NO ESTRELLAS)
  // =========================================================================
  reviews: router({
    // Crear reseña. Solo si participaste en el viaje (como conductor o pasajero
    // con booking 'completed').
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
            message: "No puedes reseñarte a ti mismo.",
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
            message: "Solo puedes reseñar viajes completados.",
          });
        }

        // Determinar dirección y validar relación
        let direction: "passenger_to_driver" | "driver_to_passenger";
        if (ctx.user.id === ride.driverId && input.subjectUserId !== ride.driverId) {
          // Conductor reseñando a un pasajero: validar que pasajero estuvo en el viaje
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
          // Pasajero reseñando al conductor: validar que pasajero estuvo en el viaje
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
            message: "Combinación de autor/sujeto inválida para este viaje.",
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

    // Listar reseñas visibles de un usuario.
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

    // Admin oculta una reseña (moderación).
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

  // =========================================================================
  // REPORTS (moderación)
  // =========================================================================
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

        // Avisar al admin (notificación interna). El admin va a revisar
        // su panel; el aviso es por si revisa notifications también.
        // Buscamos un admin para notificar (en piloto solo hay uno: David).
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
              message: "Categoría: " + input.category,
            });
          } catch (e) {
            console.error("Notif fail:", e);
          }
        }
        return { success: true };
      }),

    // Mis reportes (los que yo hice).
    listMine: protectedProcedure.query(async ({ ctx }) => {
      const conn = await getDbOrThrow();
      const rows = await conn
        .select()
        .from(mobilityReports)
        .where(eq(mobilityReports.reporterId, ctx.user.id))
        .orderBy(desc(mobilityReports.createdAt));
      return rows;
    }),

    // Admin ve reportes abiertos.
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

    // Admin resuelve un reporte.
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
