// ============================================================================
// ROUTER tRPC - Bolsillos personales (Wallets)
// ----------------------------------------------------------------------------
// Endpoints:
//   wallets.list                    -> lista bolsillos
//   wallets.get(id)                 -> obtener un bolsillo
//   wallets.create(...)             -> crear nuevo
//   wallets.archive(id)             -> eliminar
//   wallets.setDefault(id)          -> marcar como default
//   wallets.deposit({walletId, amount, ...})    -> entrada de dinero
//   wallets.withdraw({walletId, amount, ...})   -> salida de dinero
//   wallets.transfer({from, to, amount, ...})   -> mover entre bolsillos
//   wallets.movements.list(walletId)            -> historial
//   wallets.movements.monthStats(walletId, ...) -> totales del mes
//
// Blindado ownerOnly (solo el admin/David puede tocar sus bolsillos).
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { ENV } from "../_core/env";
import {
  listWallets,
  getWalletById,
  createWallet,
  archiveWallet,
  setDefaultWallet,
  depositToWallet,
  withdrawFromWallet,
  transferBetweenWallets,
  listWalletMovements,
  getWalletMonthStats,
} from "../personalWalletsDb";

const ownerOnlyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user || ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta seccion es privada del administrador.",
    });
  }
  return next();
});

// ----------------------------------------------------------------------------
// Schemas Zod (validacion de inputs)
// ----------------------------------------------------------------------------

const createWalletSchema = z.object({
  name: z.string().min(1).max(100),
  ownerName: z.string().max(100).nullable().optional(),
  initialBalance: z.number().nonnegative().optional(),
  walletType: z
    .enum(["cash", "card", "shared", "savings", "other"])
    .optional(),
  color: z.string().max(16).optional(),
  icon: z.string().max(8).optional(),
  isDefault: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

const movementBaseSchema = z.object({
  walletId: z.number().int().positive(),
  amount: z.number().positive(),
  description: z.string().max(255).nullable().optional(),
  category: z.string().max(60).nullable().optional(),
  occurredAt: z.string().nullable().optional(),
});

const transferSchema = z.object({
  fromWalletId: z.number().int().positive(),
  toWalletId: z.number().int().positive(),
  amount: z.number().positive(),
  description: z.string().max(255).nullable().optional(),
  occurredAt: z.string().nullable().optional(),
});

// ----------------------------------------------------------------------------
// Router
// ----------------------------------------------------------------------------

export const personalWalletsRouter = router({
  wallets: router({
    // Listar todos los bolsillos del usuario
    list: ownerOnlyProcedure.query(async ({ ctx }) => {
      return await listWallets(ctx.user.id);
    }),

    // Obtener uno por ID
    get: ownerOnlyProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const wallet = await getWalletById(ctx.user.id, input.id);
        if (!wallet) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Bolsillo no encontrado",
          });
        }
        return wallet;
      }),

    // Crear nuevo
    create: ownerOnlyProcedure
      .input(createWalletSchema)
      .mutation(async ({ ctx, input }) => {
        return await createWallet(ctx.user.id, input);
      }),

    // Archivar (eliminar suave)
    archive: ownerOnlyProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        return await archiveWallet(ctx.user.id, input.id);
      }),

    // Marcar como default
    setDefault: ownerOnlyProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        return await setDefaultWallet(ctx.user.id, input.id);
      }),

    // Depositar (entrada de dinero)
    deposit: ownerOnlyProcedure
      .input(movementBaseSchema)
      .mutation(async ({ ctx, input }) => {
        return await depositToWallet(ctx.user.id, input);
      }),

    // Retirar (salida de dinero)
    withdraw: ownerOnlyProcedure
      .input(movementBaseSchema)
      .mutation(async ({ ctx, input }) => {
        return await withdrawFromWallet(ctx.user.id, input);
      }),

    // Transferir entre bolsillos
    transfer: ownerOnlyProcedure
      .input(transferSchema)
      .mutation(async ({ ctx, input }) => {
        return await transferBetweenWallets(ctx.user.id, input);
      }),
  }),

  // Movimientos: lectura
  movements: router({
    list: ownerOnlyProcedure
      .input(
        z.object({
          walletId: z.number().int().positive(),
          limit: z.number().int().positive().max(500).optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        return await listWalletMovements(
          ctx.user.id,
          input.walletId,
          input.limit,
        );
      }),

    monthStats: ownerOnlyProcedure
      .input(
        z.object({
          walletId: z.number().int().positive(),
          year: z.number().int().min(2000).max(2100),
          month: z.number().int().min(1).max(12),
        }),
      )
      .query(async ({ ctx, input }) => {
        return await getWalletMonthStats(
          ctx.user.id,
          input.walletId,
          input.year,
          input.month,
        );
      }),
  }),
});
