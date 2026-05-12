import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { notifications } from "../../drizzle/schema";
import * as db from "../db";

// ============================================================================
// HELPER LOCAL: getDbOrThrow
// Reemplaza llamadas a db.getDbOrThrow() que no existe en db.ts
// ============================================================================
async function getDbOrThrow() {
  const conn = await db.getDb();
  if (!conn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
  return conn;
}

// ============================================================================
// HELPER GLOBAL: createNotification
// Usalo desde CUALQUIER otro router para enviar notificaciones programaticas.
//
// Ejemplo de uso:
//   import { createNotification } from "./notifications";
//   await createNotification({
//     userId: cliente.id,
//     type: "low_stock",
//     title: "Stock bajo",
//     message: "Producto X tiene solo 2 unidades",
//     relatedId: producto.id,
//   });
// ============================================================================

export type NotificationType =
  | "sale"
  | "low_stock"
  | "payment_received"
  | "subscription_change"
  | "system";

export async function createNotification(params: {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: number;
}) {
  const conn = await getDbOrThrow();
  await conn.insert(notifications).values({
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    relatedId: params.relatedId ?? null,
    isRead: false,
  });
}

// ============================================================================
// ROUTER
// ============================================================================

export const notificationsRouter = router({
  // Listar mis notificaciones (paginado simple)
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().positive().max(50).default(20),
        onlyUnread: z.boolean().default(false),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const conn = await getDbOrThrow();
      const limit = input?.limit ?? 20;
      const onlyUnread = input?.onlyUnread ?? false;

      const conditions: any[] = [eq(notifications.userId, ctx.user.id)];
      if (onlyUnread) {
        conditions.push(eq(notifications.isRead, false));
      }

      return await conn
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
    }),

  // Contar no leidas
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const conn = await getDbOrThrow();
    const result = await conn
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, false),
        ),
      );
    return result[0]?.count ?? 0;
  }),

  // Marcar una como leida
  markRead: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getDbOrThrow();
      await conn
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.userId, ctx.user.id),
          ),
        );
      return { success: true };
    }),

  // Marcar TODAS como leidas
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const conn = await getDbOrThrow();
    await conn
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, false),
        ),
      );
    return { success: true };
  }),

  // Eliminar una notificacion
  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getDbOrThrow();
      await conn
        .delete(notifications)
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.userId, ctx.user.id),
          ),
        );
      return { success: true };
    }),

  // ENDPOINT DE PRUEBA: el user se manda una notif de prueba.
  // Util para verificar que el sistema funciona end-to-end.
  // Borrar despues de testear si quieres.
  sendTest: protectedProcedure.mutation(async ({ ctx }) => {
    await createNotification({
      userId: ctx.user.id,
      type: "system",
      title: "Notificacion de prueba",
      message: "Si ves esto, el sistema funciona correctamente.",
    });
    return { success: true };
  }),
});
