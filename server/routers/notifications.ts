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
      const conn = await db.getDbOrThrow();
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
    const conn = await db.getDbOrThrow();
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
      const conn = await db.getDbOrThrow();
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
    const conn = await db.getDbOrThrow();
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
      const conn = await db.getDbOrThrow();
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
