import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { notifications, notificationPreferences, users } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

export const notificationsRouter = router({
  /**
   * Get all notifications for current user
   */
  getAll: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(20),
        offset: z.number().optional().default(0),
        unreadOnly: z.boolean().optional().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const whereConditions = input.unreadOnly
        ? and(eq(notifications.userId, ctx.user.id), eq(notifications.isRead, false))
        : eq(notifications.userId, ctx.user.id);

      const result = await db
        .select()
        .from(notifications)
        .where(whereConditions)
        .orderBy(desc(notifications.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return result;
    }),

  /**
   * Get unread notification count
   */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return 0;

    const result = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, false)
        )
      );

    return result.length;
  }),

  /**
   * Mark notification as read
   */
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify ownership
      const notification = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, input.id))
        .limit(1);

      if (!notification.length || notification[0].userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(eq(notifications.id, input.id));

      return { success: true };
    }),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, false)
        )
      );

    return { success: true };
  }),

  /**
   * Delete notification
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify ownership
      const notification = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, input.id))
        .limit(1);

      if (!notification.length || notification[0].userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      await db.delete(notifications).where(eq(notifications.id, input.id));

      return { success: true };
    }),

  /**
   * Get notification preferences
   */
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, ctx.user.id))
      .limit(1);

    if (prefs.length === 0) {
      // Create default preferences
      await db.insert(notificationPreferences).values({
        userId: ctx.user.id,
      });
      const newPrefs = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, ctx.user.id))
        .limit(1);
      return newPrefs[0] || null;
    }

    return prefs[0] || null;
  }),

  /**
   * Update notification preferences
   */
  updatePreferences: protectedProcedure
    .input(
      z.object({
        emailOnSale: z.boolean().optional(),
        emailOnLowStock: z.boolean().optional(),
        emailOnPayment: z.boolean().optional(),
        emailOnSubscriptionChange: z.boolean().optional(),
        pushOnSale: z.boolean().optional(),
        pushOnLowStock: z.boolean().optional(),
        pushOnPayment: z.boolean().optional(),
        pushOnSubscriptionChange: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const prefs = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, ctx.user.id))
        .limit(1);

      if (!prefs.length) {
        await db.insert(notificationPreferences).values({
          userId: ctx.user.id,
          ...input,
        });
      } else {
        await db
          .update(notificationPreferences)
          .set(input)
          .where(eq(notificationPreferences.userId, ctx.user.id));
      }

      return { success: true };
    }),

  /**
   * Create notification (internal use)
   */
  create: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        type: z.enum([
          "sale",
          "low_stock",
          "payment_received",
          "subscription_change",
          "system",
        ]),
        title: z.string(),
        message: z.string(),
        relatedId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(notifications).values({
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        relatedId: input.relatedId,
      });

      return { success: true };
    }),
});
