import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc } from "drizzle-orm";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import {
  tarimaProfiles,
  tarimaBookings,
} from "../../drizzle/schema";
import * as db from "../db";
import { createNotification } from "./notifications";

async function getDbOrThrow() {
  const conn = await db.getDb();
  if (!conn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
  return conn;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 100);
}

export const tarimaRouter = router({
  // =========================================================================
  // PROFILE
  // =========================================================================
  profile: router({
    // Obtener MI perfil (artista autenticado)
    getMine: protectedProcedure.query(async ({ ctx }) => {
      const conn = await getDbOrThrow();
      const rows = await conn
        .select()
        .from(tarimaProfiles)
        .where(eq(tarimaProfiles.userId, ctx.user.id))
        .limit(1);
      return rows[0] ?? null;
    }),

    // Obtener perfil PUBLICO por slug (cualquiera puede ver)
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string().min(1) }))
      .query(async ({ input }) => {
        const conn = await getDbOrThrow();
        const rows = await conn
          .select()
          .from(tarimaProfiles)
          .where(
            and(
              eq(tarimaProfiles.slug, input.slug),
              eq(tarimaProfiles.isPublished, true),
            ),
          )
          .limit(1);
        const profile = rows[0];
        if (!profile) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Artista no encontrado" });
        }
        // Incrementar view count (best effort)
        try {
          await conn
            .update(tarimaProfiles)
            .set({ viewCount: (profile.viewCount ?? 0) + 1 })
            .where(eq(tarimaProfiles.id, profile.id));
        } catch (e) {
          console.error("View count fail:", e);
        }
        return profile;
      }),

    // Crear mi perfil (solo si no tengo uno)
    create: protectedProcedure
      .input(
        z.object({
          artistName: z.string().min(2).max(200),
          genre: z.enum([
            "banda", "mariachi", "norteno", "cumbia", "rock", "pop",
            "regional", "electronica", "jazz", "clasica", "tropical",
            "reggaeton", "otro",
          ]).default("otro"),
          location: z.string().max(200).optional(),
          whatsapp: z.string().max(30).optional(),
          bio: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();
        // Verificar que no exista
        const existing = await conn
          .select()
          .from(tarimaProfiles)
          .where(eq(tarimaProfiles.userId, ctx.user.id))
          .limit(1);
        if (existing.length > 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Ya tienes un perfil" });
        }
        // Generar slug unico
        let baseSlug = generateSlug(input.artistName);
        let finalSlug = baseSlug;
        let counter = 1;
        while (true) {
          const slugCheck = await conn
            .select()
            .from(tarimaProfiles)
            .where(eq(tarimaProfiles.slug, finalSlug))
            .limit(1);
          if (slugCheck.length === 0) break;
          finalSlug = baseSlug + "-" + counter;
          counter++;
          if (counter > 100) {
            finalSlug = baseSlug + "-" + Date.now();
            break;
          }
        }
        const result = await conn.insert(tarimaProfiles).values({
          userId: ctx.user.id,
          artistName: input.artistName,
          slug: finalSlug,
          genre: input.genre,
          location: input.location,
          whatsapp: input.whatsapp,
          bio: input.bio,
          isPublished: false,
        });
        const id = (result as any).insertId as number;
        const rows = await conn.select().from(tarimaProfiles).where(eq(tarimaProfiles.id, id));
        return rows[0];
      }),

    // Actualizar mi perfil
    update: protectedProcedure
      .input(
        z.object({
          artistName: z.string().min(2).max(200).optional(),
          bio: z.string().optional(),
          genre: z.enum([
            "banda", "mariachi", "norteno", "cumbia", "rock", "pop",
            "regional", "electronica", "jazz", "clasica", "tropical",
            "reggaeton", "otro",
          ]).optional(),
          location: z.string().max(200).optional(),
          whatsapp: z.string().max(30).optional(),
          contactEmail: z.string().max(200).optional(),
          profileImage: z.string().max(500).optional(),
          coverImage: z.string().max(500).optional(),
          spotifyUrl: z.string().max(500).optional(),
          youtubeUrl: z.string().max(500).optional(),
          youtubeFeaturedVideo: z.string().max(500).optional(),
          instagramUrl: z.string().max(500).optional(),
          facebookUrl: z.string().max(500).optional(),
          tiktokUrl: z.string().max(500).optional(),
          minBudget: z.string().optional(),
          serviceArea: z.string().max(500).optional(),
          yearsActive: z.number().optional(),
          themeId: z.string().max(50).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();
        const updateData: any = {};
        for (const k of Object.keys(input)) {
          if ((input as any)[k] !== undefined) updateData[k] = (input as any)[k];
        }
        await conn
          .update(tarimaProfiles)
          .set(updateData)
          .where(eq(tarimaProfiles.userId, ctx.user.id));
        const rows = await conn
          .select()
          .from(tarimaProfiles)
          .where(eq(tarimaProfiles.userId, ctx.user.id))
          .limit(1);
        return rows[0];
      }),

    // Publicar/despublicar perfil
    setPublished: protectedProcedure
      .input(z.object({ isPublished: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();
        await conn
          .update(tarimaProfiles)
          .set({ isPublished: input.isPublished })
          .where(eq(tarimaProfiles.userId, ctx.user.id));
        return { success: true, isPublished: input.isPublished };
      }),
  }),

  // =========================================================================
  // BOOKINGS
  // =========================================================================
  bookings: router({
    // Listar MIS bookings (como artista)
    listMine: protectedProcedure
      .input(
        z.object({
          status: z.enum(["pending", "confirmed", "cancelled", "completed"]).optional(),
          limit: z.number().default(50),
        }).optional(),
      )
      .query(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();
        // Buscar mi perfil
        const profileRows = await conn
          .select()
          .from(tarimaProfiles)
          .where(eq(tarimaProfiles.userId, ctx.user.id))
          .limit(1);
        const profile = profileRows[0];
        if (!profile) return [];
        const conditions: any[] = [eq(tarimaBookings.profileId, profile.id)];
        if (input?.status) {
          conditions.push(eq(tarimaBookings.status, input.status));
        }
        return await conn
          .select()
          .from(tarimaBookings)
          .where(and(...conditions))
          .orderBy(desc(tarimaBookings.createdAt))
          .limit(input?.limit ?? 50);
      }),

    // Crear booking (PUBLICO - cualquiera con link)
    create: publicProcedure
      .input(
        z.object({
          profileSlug: z.string().min(1),
          customerName: z.string().min(2).max(200),
          customerPhone: z.string().min(7).max(30),
          customerEmail: z.string().max(200).optional(),
          eventDate: z.string().optional(),
          eventType: z.enum([
            "boda", "15anos", "cumpleanos", "evento_corporativo",
            "fiesta_privada", "festival", "bautizo", "otro",
          ]).default("otro"),
          eventLocation: z.string().max(500).optional(),
          eventDescription: z.string().optional(),
          budget: z.string().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const conn = await getDbOrThrow();
        // Buscar perfil por slug
        const profileRows = await conn
          .select()
          .from(tarimaProfiles)
          .where(
            and(
              eq(tarimaProfiles.slug, input.profileSlug),
              eq(tarimaProfiles.isPublished, true),
            ),
          )
          .limit(1);
        const profile = profileRows[0];
        if (!profile) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Artista no encontrado" });
        }

        const eventDateObj = input.eventDate ? new Date(input.eventDate) : null;

        const result = await conn.insert(tarimaBookings).values({
          profileId: profile.id,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail,
          eventDate: eventDateObj,
          eventType: input.eventType,
          eventLocation: input.eventLocation,
          eventDescription: input.eventDescription,
          budget: input.budget,
          status: "pending",
        });
        const bookingId = (result as any).insertId as number;

        // Notificar al artista
        try {
          await createNotification({
            userId: profile.userId,
            type: "system",
            title: "Nueva solicitud de evento",
            message: input.customerName + " quiere reservarte (" + input.eventType + ")",
            relatedId: bookingId,
          });
        } catch (e) {
          console.error("Notif fail:", e);
        }

        return { success: true, bookingId };
      }),

    // Actualizar status de una booking (solo el artista dueno)
    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
          artistNotes: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const conn = await getDbOrThrow();
        // Verificar que el booking sea de un perfil mio
        const profileRows = await conn
          .select()
          .from(tarimaProfiles)
          .where(eq(tarimaProfiles.userId, ctx.user.id))
          .limit(1);
        const profile = profileRows[0];
        if (!profile) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes perfil" });
        }
        const bookingRows = await conn
          .select()
          .from(tarimaBookings)
          .where(
            and(
              eq(tarimaBookings.id, input.id),
              eq(tarimaBookings.profileId, profile.id),
            ),
          )
          .limit(1);
        if (bookingRows.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Booking no encontrado" });
        }
        await conn
          .update(tarimaBookings)
          .set({
            status: input.status,
            artistNotes: input.artistNotes,
            respondedAt: new Date(),
          })
          .where(eq(tarimaBookings.id, input.id));
        return { success: true };
      }),

    // Stats del artista
    stats: protectedProcedure.query(async ({ ctx }) => {
      const conn = await getDbOrThrow();
      const profileRows = await conn
        .select()
        .from(tarimaProfiles)
        .where(eq(tarimaProfiles.userId, ctx.user.id))
        .limit(1);
      const profile = profileRows[0];
      if (!profile) {
        return { totalBookings: 0, pending: 0, confirmed: 0, viewCount: 0 };
      }
      const allBookings = await conn
        .select()
        .from(tarimaBookings)
        .where(eq(tarimaBookings.profileId, profile.id));
      return {
        totalBookings: allBookings.length,
        pending: allBookings.filter((b) => b.status === "pending").length,
        confirmed: allBookings.filter((b) => b.status === "confirmed").length,
        viewCount: profile.viewCount ?? 0,
      };
    }),
  }),
});
