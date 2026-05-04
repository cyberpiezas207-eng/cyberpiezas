import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { serializeSaleTransferMetadata } from "@shared/saleTransferMetadata";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { eq, sql } from "drizzle-orm";
import { sdk } from "./_core/sdk";

import { notificationsRouter } from "./routers/notifications";
import { paypalRouter } from "./routers/paypal";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import * as db from "./db";
import { storagePut } from "./storage";
import { ENV } from "./_core/env";
import { branchInventory, productVariants, branches } from "../drizzle/schema";

function decodeBase64Upload(input?: string) {
  if (!input) return null;
  const normalized = input.includes(",") ? input.split(",").pop() ?? "" : input;
  return Buffer.from(normalized, "base64");
}

function getPlanLimits(plan?: string) {
  switch (plan) {
    case "free":
      return {
        planLabel: "gratis",
        maxBranches: 1,
        maxProducts: 100,
        maxUsers: 1,
        maxMonthlySales: 200,
        historyDays: 30,
        hasAdvancedReports: false,
        hasPrioritySupport: false,
      };
    case "basic":
      return {
        planLabel: "básico",
        maxBranches: 2,
        maxProducts: 500,
        maxUsers: 3,
        maxMonthlySales: 1000,
        historyDays: Infinity,
        hasAdvancedReports: true,
        hasPrioritySupport: false,
      };
    case "professional":
      return {
        planLabel: "profesional",
        maxBranches: 5,
        maxProducts: 5000,
        maxUsers: 10,
        maxMonthlySales: 5000,
        historyDays: Infinity,
        hasAdvancedReports: true,
        hasPrioritySupport: true,
      };
    case "premium":
      return {
        planLabel: "premium",
        maxBranches: Infinity,
        maxProducts: Infinity,
        maxUsers: 50,
        maxMonthlySales: Infinity,
        historyDays: Infinity,
        hasAdvancedReports: true,
        hasPrioritySupport: true,
      };
    case "annual":
      return {
        planLabel: "anual",
        maxBranches: Infinity,
        maxProducts: Infinity,
        maxUsers: Infinity,
        maxMonthlySales: Infinity,
        historyDays: Infinity,
        hasAdvancedReports: true,
        hasPrioritySupport: true,
      };
    default:
      return {
        planLabel: "gratis",
        maxBranches: 1,
        maxProducts: 100,
        maxUsers: 1,
        maxMonthlySales: 200,
        historyDays: 30,
        hasAdvancedReports: false,
        hasPrioritySupport: false,
      };
  }
}

// ============ HELPER PROCEDURES ============
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

const ownerProcedure = adminProcedure.use(({ ctx, next }) => {
  if (ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Solo el dueño principal puede administrar subdominios." });
  }
  return next({ ctx });
});

function normalizeSubdomain(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const cashierProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "cashier") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

function decodeBase64File(base64: string) {
  const normalized = base64.includes(",") ? base64.split(",").pop() ?? "" : base64;
  try {
    return Buffer.from(normalized, "base64");
  } catch {
    return null;
  }
}

export const appRouter = router({
  system: systemRouter,

  notifications: notificationsRouter,
  paypal: paypalRouter,
  auth: router({
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email("Email inválido"),
          password: z.string().min(1, "Ingresa tu contraseña"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { verify } = await import("argon2");
        const localUser = await db.getLocalUserByEmail(input.email);

        if (!localUser) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciales incorrectas" });
        }

        const valid = await verify(localUser.passwordHash, input.password);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Credenciales incorrectas" });
        }

        if (localUser.status !== "active") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Tu cuenta está suspendida. Contacta al administrador." });
        }

        const openId = `local_${localUser.id}`;
        let user = await db.getUserByOpenId(openId);

        if (!user) {
          await db.upsertUser({
            openId,
            name: localUser.name,
            email: localUser.email,
            loginMethod: "email",
            lastSignedIn: new Date(),
          });
          user = await db.getUserByOpenId(openId);
        }

        if (!user) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al iniciar sesión" });
        }

        await db.updateLocalUserLastLogin(localUser.id);
        await db.upsertUser({ openId, lastSignedIn: new Date() });

        const { ONE_YEAR_MS } = await import("@shared/const");
        const sessionToken = await sdk.createSessionToken(openId, {
          name: localUser.name,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true };
      }),

    register: publicProcedure
      .input(
        z.object({
          email: z.string().email("Email inválido"),
          password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
          name: z.string().min(2, "Ingresa tu nombre completo"),
          businessName: z.string().min(2, "Ingresa el nombre de tu negocio").optional(),
          referralCode: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const existing = await db.getLocalUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Este email ya está registrado. ¿Quieres iniciar sesión?" });
        }

        const { hash } = await import("argon2");
        const passwordHash = await hash(input.password);

        const localUser = await db.createLocalUser({
          email: input.email,
          passwordHash,
          name: input.name,
          businessName: input.businessName,
        });

        const openId = `local_${localUser.id}`;
        await db.upsertUser({
          openId,
          name: input.name,
          email: input.email,
          loginMethod: "email",
          lastSignedIn: new Date(),
        });

        const user = await db.getUserByOpenId(openId);
        if (!user) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al crear la cuenta" });
        }

        const { ONE_YEAR_MS } = await import("@shared/const");
        const sessionToken = await sdk.createSessionToken(openId, {
          name: input.name,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true };
      }),

    me: publicProcedure.query(async (opts) => {
      const user = opts.ctx.user;
      if (!user?.id) return user;

      let programAccess = await db.getActiveProgramAccessByUserId(user.id);

      if (programAccess.length === 0) {
        const effectiveSubscription = await db.getEffectiveUserSubscription(user.id);
        const effectiveStatus = effectiveSubscription?.user?.effectiveSubscriptionStatus ?? effectiveSubscription?.user?.subscriptionStatus;

        if (effectiveStatus === "active" || user.role === "admin") {
          programAccess = [
            {
              id: 0,
              userId: user.id,
              programCode: "boutique",
              status: "active",
              accessSource: "subscription",
              startsAt: new Date(),
              endsAt: null,
              grantedByUserId: null,
              notes: "Acceso de compatibilidad mientras se migra el control por programa.",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ];
        }
      }

      return {
        ...user,
        programAccess,
      };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  branding: router({
    getActive: protectedProcedure.query(async () => {
      const ownerUser = await db.getUserByOpenId(ENV.ownerOpenId);
      if (!ownerUser) {
        return {
          appTitle: "Boutique POS",
          appSubtitle: "Centro de operación",
          bannerImageUrl: null,
          bannerAltText: null,
        };
      }

      const settings = await db.getSystemBrandingSettings(ownerUser.id);
      return {
        appTitle: settings?.appTitle ?? "Boutique POS",
        appSubtitle: settings?.appSubtitle ?? "Centro de operación",
        bannerImageUrl: settings?.bannerImageUrl ?? null,
        bannerAltText: settings?.bannerAltText ?? null,
      };
    }),

    update: ownerProcedure
      .input(
        z.object({
          appTitle: z.string().min(2).max(120),
          appSubtitle: z.string().min(2).max(180).optional(),
          bannerAltText: z.string().max(255).optional(),
          bannerFileBase64: z.string().optional(),
          bannerFileName: z.string().optional(),
          bannerMimeType: z.string().optional(),
          bannerImageUrl: z.string().url().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        let bannerImageUrl = input.bannerImageUrl ?? undefined;
        let bannerStorageKey: string | undefined;

        if (input.bannerFileBase64) {
          const fileBuffer = decodeBase64File(input.bannerFileBase64);
          if (!fileBuffer) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "No se pudo leer el banner enviado." });
          }

          const upload = await storagePut(
            `branding/${ctx.user.id}/${Date.now()}-${input.bannerFileName || "banner.jpg"}`,
            fileBuffer,
            input.bannerMimeType || "image/jpeg",
          );

          bannerImageUrl = upload.url;
          bannerStorageKey = upload.key;
        }

        const updated = await db.upsertSystemBrandingSettings({
          ownerUserId: ctx.user.id,
          appTitle: input.appTitle,
          appSubtitle: input.appSubtitle,
          bannerImageUrl,
          bannerStorageKey,
          bannerAltText: input.bannerAltText,
        });

        return {
          appTitle: updated?.appTitle ?? input.appTitle,
          appSubtitle: updated?.appSubtitle ?? input.appSubtitle ?? "Centro de operación",
          bannerImageUrl: updated?.bannerImageUrl ?? bannerImageUrl ?? null,
          bannerAltText: updated?.bannerAltText ?? input.bannerAltText ?? null,
        };
      }),
  }),

  subdomains: router({
    mine: protectedProcedure.query(async ({ ctx }) => {
      return await db.getSubdomainRequestsByUserId(ctx.user.id);
    }),

    createRequest: protectedProcedure
      .input(
        z.object({
          businessName: z.string().min(2).max(160),
          requestedSubdomain: z.string().min(3).max(120),
          contactWhatsApp: z.string().max(40).optional(),
          notes: z.string().max(1000).optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const effectiveSubscription = await db.getEffectiveUserSubscription(ctx.user.id);
        const normalizedSubdomain = normalizeSubdomain(input.requestedSubdomain);

        if (!normalizedSubdomain || normalizedSubdomain.length < 3) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Captura un nombre de subdominio válido." });
        }

        if ((effectiveSubscription?.user?.effectiveSubscriptionStatus ?? effectiveSubscription?.user?.subscriptionStatus) !== "active") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Solo los suscriptores activos pueden solicitar un subdominio." });
        }

        const created = await db.createSubdomainRequest({
          userId: ctx.user.id,
          businessName: input.businessName,
          requestedSubdomain: normalizedSubdomain,
          contactWhatsApp: input.contactWhatsApp,
          notes: input.notes,
          status: "pending",
          availabilityStatus: "unchecked",
          currency: "MXN",
        });

        await db.createNotificationForUser({
          userId: ctx.user.id,
          type: "system",
          title: "Solicitud de subdominio enviada",
          message: `Tu solicitud para ${normalizedSubdomain} quedó registrada. El dueño revisará disponibilidad y precio manualmente.`,
          relatedId: created?.id,
        });

        return created;
      }),

    adminList: ownerProcedure.query(async () => {
      return await db.getAllSubdomainRequests();
    }),

    reviewRequest: ownerProcedure
      .input(
        z.object({
          requestId: z.number(),
          status: z.enum(["pending", "quoted", "approved", "assigned", "rejected", "canceled"]),
          availabilityStatus: z.enum(["unchecked", "available", "unavailable", "reserved"]),
          quotedPrice: z.string().optional(),
          assignedSubdomain: z.string().optional(),
          adminNotes: z.string().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const existing = await db.getSubdomainRequestById(input.requestId);
        if (!existing) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Solicitud no encontrada." });
        }

        const normalizedAssignedSubdomain = input.assignedSubdomain
          ? normalizeSubdomain(input.assignedSubdomain)
          : existing.assignedSubdomain ?? undefined;

        const updated = await db.updateSubdomainRequest(input.requestId, {
          status: input.status,
          availabilityStatus: input.availabilityStatus,
          quotedPrice: input.quotedPrice,
          assignedSubdomain: normalizedAssignedSubdomain,
          adminNotes: input.adminNotes,
          reviewedByUserId: ctx.user.id,
          reviewedAt: new Date(),
          resolvedAt: input.status === "assigned" || input.status === "rejected" || input.status === "canceled" ? new Date() : null,
        });

        await db.createNotificationForUser({
          userId: existing.userId,
          type: "system",
          title: "Actualización de solicitud de subdominio",
          message:
            input.status === "assigned"
              ? `Tu subdominio ${normalizedAssignedSubdomain ?? existing.requestedSubdomain} ya fue asignado.`
              : input.status === "quoted"
                ? `Tu solicitud ${existing.requestedSubdomain} ya tiene una cotización disponible para revisión.`
                : input.status === "rejected"
                  ? `Tu solicitud ${existing.requestedSubdomain} fue rechazada. Revisa las notas administrativas para más detalle.`
                  : `Tu solicitud ${existing.requestedSubdomain} fue actualizada a estado ${input.status}.`,
          relatedId: existing.id,
        });

        return updated;
      }),
  }),

  users: router({
    list: adminProcedure.query(async ({ ctx }) => {
      return await db.getManagedStaffUsers(ctx.user.id);
    }),

    subscribers: adminProcedure.query(async ({ ctx }) => {
      return await db.getSubscriberAccessRecords(ctx.user.id);
    }),

    getAllUsers: adminProcedure.query(async () => {
      return await db.getAllUsersWithProgramAccess();
    }),

    accessLogs: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(200).default(50) }).optional())
      .query(async ({ input }) => {
        return await db.getUserAccessLogs(input?.limit ?? 50);
      }),

    myBranch: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserBranchAssignment(ctx.user.id);
    }),

    assignBranch: ownerProcedure
      .input(
        z.object({
          userId: z.number(),
          branchId: z.number().nullable(),
          role: z.enum(["admin", "cashier"]).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (input.role === "cashier" && input.branchId === null) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Un cajero debe quedar asignado a una sucursal.",
          });
        }

        if (input.branchId !== null) {
          const branch = await db.getBranchById(input.branchId, ctx.user.id);
          if (!branch) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Sucursal no encontrada" });
          }
        }

        const limits = getPlanLimits(ctx.user.subscriptionPlan);
        if (Number.isFinite(limits.maxUsers)) {
          const rows = await db.getUsersWithAssignedBranch();
          const managedUserIds = new Set(
            rows
              .filter(row => row.user.id === ctx.user.id || row.branch?.userId === ctx.user.id)
              .map(row => row.user.id)
          );
          managedUserIds.add(ctx.user.id);

          const willBelongToBusiness = input.userId === ctx.user.id || input.branchId !== null;
          const isAlreadyManaged = managedUserIds.has(input.userId);

          if (willBelongToBusiness && !isAlreadyManaged && managedUserIds.size >= limits.maxUsers) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Tu plan ${limits.planLabel} permite hasta ${limits.maxUsers} usuarios activos dentro del negocio. Actualiza tu suscripción para agregar más personal.`,
            });
          }
        }

        return await db.assignUserToBranch(input);
      }),

    resetPassword: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          newPassword: z.string().min(8),
        })
      )
      .mutation(async ({ input }) => {
        return { password: input.newPassword };
      }),

    toggleStatus: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        return { success: true };
      }),

    acceptTerms: protectedProcedure.mutation(async ({ ctx }) => {
      await db.upsertUser({ openId: ctx.user.openId, termsAcceptedAt: new Date() });
      return { ok: true };
    }),

    getTermsStatus: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserByOpenId(ctx.user.openId);
      return { accepted: !!user?.termsAcceptedAt };
    }),

    grantSpecialLicense: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          planCode: z.enum(["basic", "professional", "premium", "annual"]),
          months: z.number().int().min(1).max(24),
          mode: z.enum(["eco", "courtesy", "manual"]),
          notes: z.string().max(500).optional(),
          acceptedSocialConditions: z.boolean().default(false),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if ((input.mode === "eco" || input.mode === "courtesy") && !input.acceptedSocialConditions) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Debes confirmar que el usuario se suscribió al canal de YouTube, siguió la página de Facebook y compartió ambos perfiles.",
          });
        }

        return await db.grantSpecialLicense({
          userId: input.userId,
          grantedByUserId: ctx.user.id,
          planCode: input.planCode,
          months: input.months,
          mode: input.mode,
          notes: input.notes,
        });
      }),
  }),

  // ============ CATEGORIES ============
  categories: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getAllCategories(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return await db.createCategory(ctx.user.id, input.name, input.description);
      }),
  }),

  // ============ PRODUCTS ============
  products: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getAllProducts(ctx.user.id);
    }),

    search: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input, ctx }) => {
        return await db.searchProducts(ctx.user.id, input.query);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        return await db.getProductById(input.id, ctx.user.id);
      }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          categoryId: z.number(),
          brand: z.string().min(1),
          basePrice: z.string(),
          sku: z.string().min(1),
          description: z.string().optional(),
          branchIds: z.array(z.number().int().positive()).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const limits = getPlanLimits(ctx.user.subscriptionPlan);
          if (Number.isFinite(limits.maxProducts)) {
            const currentProducts = await db.countProductsByUserId(ctx.user.id);
            if (currentProducts >= limits.maxProducts) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: `Tu plan ${limits.planLabel} permite hasta ${limits.maxProducts} productos. Actualiza tu suscripción para seguir creciendo.`,
              });
            }
          }

        const availableBranches = await db.getBranchesByUserId(ctx.user.id);
        const availableBranchIds = new Set(availableBranches.map((branch) => branch.id));
        const requestedBranchIds = input.branchIds ?? [];

        if (requestedBranchIds.some((branchId) => !availableBranchIds.has(branchId))) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Solo puedes asignar el producto a sucursales de tu propio negocio.",
          });
        }

        return await db.createProduct(input);
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          categoryId: z.number().optional(),
          brand: z.string().optional(),
          basePrice: z.string().optional(),
          description: z.string().optional(),
          branchIds: z.array(z.number().int().positive()).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, branchIds, ...data } = input;

        if (branchIds) {
          const availableBranches = await db.getBranchesByUserId(ctx.user.id);
          const availableBranchIds = new Set(availableBranches.map((branch) => branch.id));
          if (branchIds.some((branchId) => !availableBranchIds.has(branchId))) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Solo puedes asignar el producto a sucursales de tu propio negocio.",
            });
          }
        }

        await db.updateProduct(id, ctx.user.id, { ...data, branchIds });
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteProduct(input.id, ctx.user.id);
        return { success: true };
      }),

    images: publicProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        return await db.getProductImagesByProductId(input.productId);
      }),

    addImage: adminProcedure
      .input(
        z.object({
          productId: z.number(),
          fileBase64: z.string().min(1),
          fileName: z.string().min(1),
          mimeType: z.string().default("image/jpeg"),
          altText: z.string().optional(),
          isPrimary: z.boolean().default(false),
        }),
      )
      .mutation(async ({ input }) => {
        const fileBuffer = decodeBase64File(input.fileBase64);
        if (!fileBuffer) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No se pudo leer la imagen." });
        }

        const upload = await storagePut(
          `products/${input.productId}/${Date.now()}-${input.fileName}`,
          fileBuffer,
          input.mimeType,
        );

        const currentImages = await db.getProductImagesByProductId(input.productId);
        const result = await db.createProductImage({
          productId: input.productId,
          imageUrl: upload.url,
          storageKey: upload.key,
          altText: input.altText,
          sortOrder: currentImages.length,
          isPrimary: input.isPrimary || currentImages.length === 0,
        });

        return result;
      }),

    removeImage: adminProcedure
      .input(z.object({ productId: z.number(), imageId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteProductImage(input.imageId, input.productId);
        return { success: true };
      }),

    setPrimaryImage: adminProcedure
      .input(z.object({ productId: z.number(), imageId: z.number() }))
      .mutation(async ({ input }) => {
        await db.setPrimaryProductImage(input.productId, input.imageId);
        return { success: true };
      }),
  }),

  // ============ PRODUCT VARIANTS ============
  variants: router({
    getByProductId: protectedProcedure
      .input(z.object({ productId: z.number(), branchId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        if (input.branchId) {
          return await db.getProductVariantsByProductIdAndBranch(input.productId, input.branchId, ctx.user.id);
        }
        return await db.getProductVariantsByProductId(input.productId, ctx.user.id);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        return await db.getProductVariantById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          productId: z.number(),
          size: z.string().min(1),
          color: z.string().min(1),
          stock: z.number().int().min(0),
          price: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const product = await db.getProductById(input.productId, ctx.user.id);
        if (!product) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Producto no encontrado" });
        }
        return await db.createProductVariant(input);
      }),

    updateStock: adminProcedure
      .input(
        z.object({
          id: z.number(),
          newStock: z.number().int().min(0),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const oldVariant = await db.getProductVariantById(input.id);
        if (!oldVariant) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const quantityChange = input.newStock - oldVariant.stock;
        await db.updateProductVariantStock(input.id, input.newStock);

        // Log the movement
        await db.createInventoryMovement({
          productVariantId: input.id,
          movementType: "adjustment",
          quantity: quantityChange,
          reason: input.reason,
          userId: ctx.user.id,
        });

        return { success: true };
      }),

    getLowStock: adminProcedure
      .input(z.object({ threshold: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.getVariantsWithLowStock(input.threshold || 5);
      }),
  }),

  // ============ BRANCHES / SUCURSALES ============
  branches: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === "admin") {
        return await db.getBranchesByUserId(ctx.user.id);
      }

      const assigned = await db.getUserBranchAssignment(ctx.user.id);
      return assigned?.branch ? [assigned.branch] : [];
    }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          code: z.string().min(1),
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zipCode: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().email().optional().or(z.literal("")),
          manager: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const limits = getPlanLimits(ctx.user.subscriptionPlan);
        if (Number.isFinite(limits.maxBranches)) {
          const currentBranches = await db.countBranchesByUserId(ctx.user.id);
          if (currentBranches >= limits.maxBranches) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Tu plan gratis permite una sola sucursal. Si necesitas más, sube de plan o solicita una licencia especial con CyberPiezas.",
            });
          }
        }

        return await db.createBranch({
          userId: ctx.user.id,
          name: input.name,
          code: input.code,
          address: input.address,
          city: input.city,
          state: input.state,
          zipCode: input.zipCode,
          phone: input.phone,
          email: input.email || undefined,
          manager: input.manager,
        });
      }),

    inventory: protectedProcedure
      .input(z.object({ branchId: z.number() }))
      .query(async ({ input, ctx }) => {
        const branch = await db.getBranchById(input.branchId, ctx.user.id);
        if (!branch) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Sucursal no encontrada" });
        }
        return await db.getBranchInventory(input.branchId);
      }),

    updateInventory: adminProcedure
      .input(
        z.object({
          branchId: z.number(),
          productVariantId: z.number(),
          newStock: z.number().int().min(0),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const branch = await db.getBranchById(input.branchId, ctx.user.id);
        if (!branch) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Sucursal no encontrada" });
        }

        await db.updateBranchInventoryStock(
          input.branchId,
          input.productVariantId,
          input.newStock,
          ctx.user.id,
          input.reason
        );

        return { success: true };
      }),

    transfers: protectedProcedure.query(async ({ ctx }) => {
      return await db.getTransfersByUserId(ctx.user.id);
    }),

    createTransfer: adminProcedure
      .input(
        z.object({
          fromBranchId: z.number(),
          toBranchId: z.number(),
          productVariantId: z.number(),
          quantity: z.number().int().min(1),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (input.fromBranchId === input.toBranchId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Las sucursales deben ser diferentes" });
        }

        const sourceBranch = await db.getBranchById(input.fromBranchId, ctx.user.id);
        const targetBranch = await db.getBranchById(input.toBranchId, ctx.user.id);
        if (!sourceBranch || !targetBranch) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Sucursal no encontrada" });
        }

        const sourceInventory = await db.getBranchInventoryItem(
          input.fromBranchId,
          input.productVariantId
        );

        if (!sourceInventory || sourceInventory.stock < input.quantity) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Stock insuficiente en la sucursal origen" });
        }

        await db.updateBranchInventoryStock(
          input.fromBranchId,
          input.productVariantId,
          sourceInventory.stock - input.quantity,
          ctx.user.id,
          `Salida por traspaso a sucursal ${targetBranch.name}`
        );

        const transfer = await db.createStockTransfer({
          fromBranchId: input.fromBranchId,
          toBranchId: input.toBranchId,
          productVariantId: input.productVariantId,
          quantity: input.quantity,
          reason: input.reason,
          initiatedByUserId: ctx.user.id,
        });

        return { success: true, transferId: transfer.id };
      }),

    receiveTransfer: adminProcedure
      .input(z.object({ transferId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const transfer = await db.receiveStockTransfer(input.transferId, ctx.user.id);
        return { success: true, transferId: transfer.id };
      }),
  }),

  // ============ SALES ============
  sales: router({
    create: cashierProcedure
      .input(
        z.object({
          branchId: z.number().optional(),
          items: z.array(
            z.object({
              variantId: z.number(),
              productName: z.string(),
              size: z.string(),
              color: z.string(),
              quantity: z.number().int().min(1),
              unitPrice: z.string(),
              lineTotal: z.string(),
            })
          ),
          subtotal: z.string(),
          discount: z.string(),
          tax: z.string(),
          total: z.string(),
          paymentMethod: z.enum(["cash", "card", "transfer"]),
          notes: z.string().optional(),
          transferReference: z.string().max(120).optional(),
          proofBase64: z.string().optional(),
          proofMimeType: z.string().optional(),
          proofFileName: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const limits = getPlanLimits(ctx.user.subscriptionPlan);
        let saleBranchOwnerId = ctx.user.id;
        let saleBranchName = "Mostrador";
        if (Number.isFinite(limits.maxMonthlySales)) {
          const monthStart = new Date();
          monthStart.setDate(1);
          monthStart.setHours(0, 0, 0, 0);
          const monthlySales = await db.countSalesForUserSince(ctx.user.id, monthStart);
          if (monthlySales >= limits.maxMonthlySales) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Tu plan ${limits.planLabel} alcanzó el límite de ${limits.maxMonthlySales} ventas mensuales. Actualiza tu plan para continuar vendiendo sin restricciones.`,
            });
          }
        }

        if (ctx.user.role === "cashier") {
          const assigned = await db.getUserBranchAssignment(ctx.user.id);
          if (!assigned?.branch) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Tu usuario no tiene una sucursal asignada.",
            });
          }

          if (!input.branchId || input.branchId !== assigned.branch.id) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Solo puedes operar en tu sucursal asignada.",
            });
          }
        }

        if (input.branchId) {
          const branchOwnerId = ctx.user.role === "admin" ? ctx.user.id : undefined;
          const branch = branchOwnerId
            ? await db.getBranchById(input.branchId, branchOwnerId)
            : (await db.getUserBranchAssignment(ctx.user.id))?.branch;

          if (!branch || branch.id !== input.branchId) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Sucursal no encontrada" });
          }

          saleBranchOwnerId = branch.userId;
          saleBranchName = branch.name;
        }

        const saleNumber = await db.generateSaleNumber();

        let proofUrl: string | null = null;
        if (input.paymentMethod === "transfer" && input.proofBase64) {
          const proofBuffer = decodeBase64Upload(input.proofBase64);
          if (!proofBuffer) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "No se pudo leer el comprobante de transferencia." });
          }

          const upload = await storagePut(
            `sales-transfer-proofs/user-${ctx.user.id}/${Date.now()}-${input.proofFileName || `${saleNumber}.jpg`}`,
            proofBuffer,
            input.proofMimeType || "image/jpeg",
          );
          proofUrl = upload.url;
        }

        const serializedNotes = serializeSaleTransferMetadata({
          customerNotes: input.notes,
          transferReference: input.transferReference,
          proofUrl,
          proofFileName: input.proofFileName,
          proofMimeType: input.proofMimeType,
        });

        const sale = await db.createSale({
          saleNumber,
          userId: ctx.user.id,
          subtotal: input.subtotal,
          discount: input.discount,
          tax: input.tax,
          total: input.total,
          paymentMethod: input.paymentMethod,
          notes: serializedNotes || undefined,
        });

        // Create sale details and update inventory
        for (const item of input.items) {
          await db.createSaleDetail({
            saleId: sale.id,
            productVariantId: item.variantId,
            productName: item.productName,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          });

          if (input.branchId) {
            try {
              await db.decrementBranchInventoryForSale({
                branchId: input.branchId,
                productVariantId: item.variantId,
                quantity: item.quantity,
                userId: ctx.user.id,
              });

              const updatedInventory = await db.getBranchInventoryItem(input.branchId, item.variantId);
              if (updatedInventory && updatedInventory.stock <= updatedInventory.minimumStock) {
                await db.createNotificationForUser({
                  userId: saleBranchOwnerId,
                  type: "low_stock",
                  title: "Stock bajo detectado",
                  message: `${item.productName} ${item.color} ${item.size} quedó con ${updatedInventory.stock} unidades en ${saleBranchName}.`,
                  relatedId: item.variantId,
                });
              }
            } catch {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Stock insuficiente en la sucursal para ${item.productName} ${item.color} ${item.size}`,
              });
            }
          } else {
            const variant = await db.getProductVariantById(item.variantId);
            if (variant) {
              const newStock = variant.stock - item.quantity;
              await db.updateProductVariantStock(item.variantId, newStock);

              await db.createInventoryMovement({
                productVariantId: item.variantId,
                movementType: "sale",
                quantity: -item.quantity,
                userId: ctx.user.id,
              });
            }
          }
        }

        await db.createNotificationForUser({
          userId: saleBranchOwnerId,
          type: "sale",
          title: "Nueva venta registrada",
          message: `Se registró la venta ${saleNumber} por ${input.total} en ${saleBranchName}.`,
          relatedId: sale.id,
        });

        return { saleId: sale.id, saleNumber };
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const sale = await db.getSaleById(input.id);
        if (!sale) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        const details = await db.getSaleDetailsBySaleId(input.id);
        return { ...sale, details };
      }),

    listToday: protectedProcedure.query(async () => {
      return await db.getTodaySales();
    }),

    listByDateRange: adminProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ input, ctx }) => {
        const user = await db.getUserById(ctx.user.id);
        const limits = getPlanLimits(user?.subscriptionPlan);
        
        // Enforce 30-day history limit for free plan
        if (limits.historyDays !== Infinity) {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - limits.historyDays);
          
          if (input.startDate < thirtyDaysAgo) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `El plan gratis solo permite ver historial de los últimos ${limits.historyDays} días. Actualiza tu plan para acceder a historial completo.`,
            });
          }
        }
        
        return await db.getSalesBetweenDates(input.startDate, input.endDate);
      }),

    registerCashMovement: cashierProcedure
      .input(
        z.object({
          branchId: z.number().optional(),
          movementType: z.enum(["entry", "exit"]),
          category: z.string().min(2).max(100).default("general"),
          amount: z.string(),
          reason: z.string().min(3),
          notes: z.string().optional(),
          relatedSaleId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        let resolvedBranchId = input.branchId ?? null;

        if (ctx.user.role === "cashier") {
          const assigned = await db.getUserBranchAssignment(ctx.user.id);
          if (!assigned?.branch) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Tu usuario no tiene una sucursal asignada." });
          }
          resolvedBranchId = assigned.branch.id;
        } else if (resolvedBranchId) {
          const branch = await db.getBranchById(resolvedBranchId, ctx.user.id);
          if (!branch) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Sucursal no encontrada" });
          }
        }

        const created = await db.createCashMovement({
          branchId: resolvedBranchId ?? undefined,
          userId: ctx.user.id,
          movementType: input.movementType,
          category: input.category,
          amount: input.amount,
          reason: input.reason,
          notes: input.notes,
          relatedSaleId: input.relatedSaleId,
        });

        return { id: created.id };
      }),

    listCashMovements: protectedProcedure.query(async ({ ctx }) => {
      const branchIds = ctx.user.role === "cashier"
        ? [((await db.getUserBranchAssignment(ctx.user.id))?.branch.id)].filter((value): value is number => Number.isInteger(value))
        : (await db.getBranchesByUserId(ctx.user.id)).map((branch) => branch.id);

      return await db.listCashMovementsByBranchIds(branchIds, 100);
    }),

    createReturn: cashierProcedure
      .input(
        z.object({
          saleId: z.number(),
          branchId: z.number().optional(),
          reason: z.string().min(3),
          notes: z.string().optional(),
          items: z.array(
            z.object({
              saleDetailId: z.number(),
              quantity: z.number().int().min(1),
            })
          ).min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const sale = await db.getSaleById(input.saleId);
        if (!sale) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Venta no encontrada" });
        }

        let resolvedBranchId = input.branchId ?? null;
        if (ctx.user.role === "cashier") {
          const assigned = await db.getUserBranchAssignment(ctx.user.id);
          if (!assigned?.branch) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Tu usuario no tiene una sucursal asignada." });
          }
          resolvedBranchId = assigned.branch.id;
        } else if (resolvedBranchId) {
          const branch = await db.getBranchById(resolvedBranchId, ctx.user.id);
          if (!branch) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Sucursal no encontrada" });
          }
        }

        const saleDetails = await db.getSaleDetailsBySaleId(input.saleId);
        const previousReturns = await db.getSaleReturnsBySaleId(input.saleId);
        const previousReturnDetails = (await Promise.all(
          previousReturns.map((entry) => db.getSaleReturnDetailsByReturnId(entry.id))
        )).flat();

        const returnedBySaleDetailId = new Map<number, number>();
        for (const detail of previousReturnDetails) {
          returnedBySaleDetailId.set(
            detail.saleDetailId,
            (returnedBySaleDetailId.get(detail.saleDetailId) ?? 0) + detail.quantity
          );
        }

        const normalizedItems = input.items.map((item) => {
          const original = saleDetails.find((detail) => detail.id === item.saleDetailId);
          if (!original) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Detalle de venta no encontrado" });
          }

          const alreadyReturned = returnedBySaleDetailId.get(item.saleDetailId) ?? 0;
          const available = original.quantity - alreadyReturned;
          if (item.quantity > available) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `La cantidad a devolver de ${original.productName} excede lo disponible para devolución.`,
            });
          }

          const unitPrice = Number(original.unitPrice);
          return {
            ...original,
            quantityToReturn: item.quantity,
            lineTotalToReturn: (unitPrice * item.quantity).toFixed(2),
          };
        });

        const subtotal = normalizedItems
          .reduce((acc, item) => acc + Number(item.lineTotalToReturn), 0)
          .toFixed(2);
        const returnNumber = await db.generateReturnNumber();
        const createdReturn = await db.createSaleReturn({
          saleId: input.saleId,
          branchId: resolvedBranchId ?? undefined,
          userId: ctx.user.id,
          returnNumber,
          subtotal,
          tax: "0.00",
          total: subtotal,
          reason: input.reason,
          notes: input.notes,
        });

        for (const item of normalizedItems) {
          await db.createSaleReturnDetail({
            saleReturnId: createdReturn.id,
            saleDetailId: item.id,
            productVariantId: item.productVariantId,
            productName: item.productName,
            size: item.size,
            color: item.color,
            quantity: item.quantityToReturn,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotalToReturn,
          });

          if (resolvedBranchId) {
            await db.incrementBranchInventoryForReturn({
              branchId: resolvedBranchId,
              productVariantId: item.productVariantId,
              quantity: item.quantityToReturn,
              userId: ctx.user.id,
              reason: input.reason,
            });
          } else {
            await db.incrementProductVariantStockForReturn({
              productVariantId: item.productVariantId,
              quantity: item.quantityToReturn,
              userId: ctx.user.id,
              reason: input.reason,
            });
          }
        }

        await db.createCashMovement({
          branchId: resolvedBranchId ?? undefined,
          userId: ctx.user.id,
          movementType: "exit",
          category: "refund",
          amount: subtotal,
          reason: `Devolución ${returnNumber}`,
          notes: input.reason,
          relatedSaleId: sale.id,
        });

        return { returnId: createdReturn.id, returnNumber };
      }),

    getReturnsBySaleId: protectedProcedure
      .input(z.object({ saleId: z.number() }))
      .query(async ({ input }) => {
        const returns = await db.getSaleReturnsBySaleId(input.saleId);
        const details = await Promise.all(
          returns.map(async (entry) => ({
            ...entry,
            details: await db.getSaleReturnDetailsByReturnId(entry.id),
          }))
        );
        return details;
      }),
  }),

  // ============ DASHBOARD ============
  dashboard: router({
    todayStats: protectedProcedure.query(async () => {
      return await db.getTodaysSalesStats();
    }),

    planUsage: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      const limits = getPlanLimits(user?.subscriptionPlan);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [productCount, branchCount, monthlySalesCount] = await Promise.all([
        db.countProductsByUserId(ctx.user.id),
        db.countBranchesByUserId(ctx.user.id),
        db.countSalesForUserSince(ctx.user.id, monthStart),
      ]);

      return {
        planCode: user?.subscriptionPlan ?? "free",
        usage: {
          products: productCount,
          branches: branchCount,
          monthlySales: monthlySalesCount,
        },
        limits: {
          products: Number.isFinite(limits.maxProducts) ? limits.maxProducts : null,
          branches: Number.isFinite(limits.maxBranches) ? limits.maxBranches : null,
          monthlySales: Number.isFinite(limits.maxMonthlySales) ? limits.maxMonthlySales : null,
          users: Number.isFinite(limits.maxUsers) ? limits.maxUsers : null,
          historyDays: Number.isFinite(limits.historyDays) ? limits.historyDays : null,
        },
      };
    }),

    topProducts: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.getTopSellingProducts(input.limit || 5);
      }),

    lowStockAlerts: adminProcedure.query(async () => {
      return await db.getVariantsWithLowStock(5);
    }),
    topProductsMonth: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return await db.getTopSellingProductsOfMonth(ctx.user.id, input.limit || 5);
      }),
    salesByVariant: protectedProcedure
      .input(z.object({ days: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return await db.getSalesByVariantAttributes(ctx.user.id, input.days || 30);
      }),
    productsWithoutMovement: protectedProcedure
      .input(z.object({ days: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return await db.getProductsWithoutMovement(ctx.user.id, input.days || 30);
      }),
    periodComparison: protectedProcedure.query(async ({ ctx }) => {
      return await db.getSalesPeriodComparison(ctx.user.id);
    }),
    returnsOfMonth: protectedProcedure.query(async ({ ctx }) => {
      return await db.getReturnsOfMonth(ctx.user.id);
    }),
  }),

  // ============ INVENTORY ============
  licenses: router({
    grantLicense: adminProcedure
      .input(z.object({
        userId: z.number(),
        planCode: z.enum(["free", "basic", "professional", "premium", "annual"]),
        licenseType: z.enum(["free_special", "promotional", "trial", "manual_grant"]),
        validFrom: z.date(),
        validUntil: z.date().optional(),
        requiresYouTube: z.boolean().optional(),
        requiresFacebook: z.boolean().optional(),
        youtubeVerified: z.boolean().optional(),
        facebookVerified: z.boolean().optional(),
        reason: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const isFreeSpecial = input.licenseType === "free_special";
        const requiresYouTube = isFreeSpecial ? true : (input.requiresYouTube ?? false);
        const requiresFacebook = isFreeSpecial ? true : (input.requiresFacebook ?? false);
        const youtubeVerified = isFreeSpecial ? (input.youtubeVerified ?? false) : (input.youtubeVerified ?? false);
        const facebookVerified = isFreeSpecial ? (input.facebookVerified ?? false) : (input.facebookVerified ?? false);

        if (isFreeSpecial && (!youtubeVerified || !facebookVerified)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Las licencias gratuitas especiales requieren validar YouTube y Facebook antes de otorgarlas.",
          });
        }

        const createdLicense = await db.grantManualLicense({
          userId: input.userId,
          grantedByUserId: ctx.user.id,
          planCode: input.planCode,
          licenseType: input.licenseType,
          status: "active",
          validFrom: input.validFrom,
          validUntil: input.validUntil,
          requiresYouTube: requiresYouTube,
          requiresFacebook: requiresFacebook,
          youtubeVerified,
          facebookVerified,
          reason: input.reason,
          notes: input.notes,
        });

        await db.createNotificationForUser({
          userId: input.userId,
          type: "subscription_change",
          title: "Licencia otorgada",
          message: `Tu licencia ${input.planCode} fue otorgada por administración y ya está disponible en tu cuenta.`,
          relatedId: createdLicense.id,
        });

        return createdLicense;
      }),

    getAllLicenses: adminProcedure.query(async () => {
      return await db.getAllManualLicenses();
    }),

    getLicensesByUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return await db.getManualLicensesByUserId(input.userId);
      }),

    updateLicenseStatus: adminProcedure
      .input(z.object({
        licenseId: z.number(),
        newStatus: z.enum(["active", "suspended", "revoked", "expired"]),
        changeReason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const updatedLicense = await db.updateLicenseStatus(
          input.licenseId,
          input.newStatus,
          ctx.user.id,
          input.changeReason
        );

        await db.createNotificationForUser({
          userId: updatedLicense.userId,
          type: "subscription_change",
          title: "Cambio de estado de licencia",
          message: `Tu licencia fue actualizada a estado ${input.newStatus}.`,
          relatedId: input.licenseId,
        });

        return updatedLicense;
      }),

    renewLicense: adminProcedure
      .input(z.object({
        licenseId: z.number(),
        validUntil: z.date(),
        renewalNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const renewedLicense = await db.renewManualLicense(
          input.licenseId,
          input.validUntil,
          ctx.user.id,
          input.renewalNotes,
        );

        await db.createNotificationForUser({
          userId: renewedLicense.userId,
          type: "subscription_change",
          title: "Licencia renovada",
          message: `Tu licencia fue renovada manualmente y ahora es válida hasta ${input.validUntil.toLocaleDateString("es-MX")}.`,
          relatedId: input.licenseId,
        });

        return renewedLicense;
      }),

    getLicenseHistory: adminProcedure
      .input(z.object({ licenseId: z.number() }))
      .query(async ({ input }) => {
        return await db.getLicenseGrantHistory(input.licenseId);
      }),
  }),

  featureRequests: router({
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(5, "El título debe tener al menos 5 caracteres"),
          description: z.string().min(20, "La descripción debe tener al menos 20 caracteres"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const request = await db.createFeatureRequest({
          userId: ctx.user.id,
          title: input.title,
          description: input.description,
        });

        await db.createNotificationForUser({
          userId: ctx.user.id,
          type: "system",
          title: "Solicitud recibida",
          message: `Tu solicitud "${input.title}" ha sido recibida. Nos pondremos en contacto pronto.`,
          relatedId: request.id,
        });

        return request;
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getFeatureRequestsByUserId(ctx.user.id);
    }),

    listAll: adminProcedure.query(async () => {
      return await db.getAllFeatureRequests();
    }),
  }),

  inventory: router({
    getMovementsByVariant: adminProcedure
      .input(z.object({ variantId: z.number() }))
      .query(async ({ input }) => {
        return await db.getInventoryMovementsByVariantId(input.variantId);
      }),

    initializeMissingBranchInventory: adminProcedure.mutation(async () => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get all branches
      const allBranches = await database.select().from(branches);

      if (allBranches.length === 0) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No hay sucursales creadas." });
      }

      // Get all product variants
      const allVariants = await database.select().from(productVariants);

      let totalCreated = 0;
      for (const variant of allVariants) {
        // Check if this variant already has inventory in all branches
        const existingCount = await database
          .select({ count: sql`COUNT(*)` })
          .from(branchInventory)
          .where(eq(branchInventory.productVariantId, variant.id));

        const existing = Number(existingCount[0]?.count) || 0;
        if (existing >= allBranches.length) continue;

        // Get branches that already have inventory for this variant
        const branchesWithInventory = await database
          .select({ branchId: branchInventory.branchId })
          .from(branchInventory)
          .where(eq(branchInventory.productVariantId, variant.id));

        const existingBranchIds = new Set(branchesWithInventory.map(r => r.branchId));

        // Create inventory for missing branches
        const missingBranches = allBranches.filter(b => !existingBranchIds.has(b.id));
        if (missingBranches.length > 0) {
          const inventoryRecords = missingBranches.map(branch => ({
            branchId: branch.id,
            productVariantId: variant.id,
            stock: variant.stock || 0,
            minimumStock: 5,
          }));

          await database.insert(branchInventory).values(inventoryRecords);
          totalCreated += inventoryRecords.length;
        }
      }

      return {
        message: `Inicializacion completada: ${totalCreated} registros de inventario creados.`,
        created: totalCreated,
      };
    }),
  }),
  
  programAccess: router({
    mine: protectedProcedure.query(async ({ ctx }) => {
      return db.getProgramAccessByUserId(ctx.user.id);
    }),

    visibleSystems: protectedProcedure.query(async ({ ctx }) => {
      const access = await db.getActiveProgramAccessByUserId(ctx.user.id);
      return access.map((item) => item.programCode);
    }),

    upsert: ownerProcedure
      .input(
        z.object({
          userId: z.number(),
          programCode: z.enum(["boutique", "abarrotes", "celine"]),
          status: z.enum(["active", "pending", "inactive", "suspended", "expired"]),
          accessSource: z.enum(["subscription", "manual_license", "trial", "referral", "admin_override"]).default("admin_override"),
          endsAt: z.coerce.date().nullable().optional(),
          notes: z.string().max(1000).optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        return db.upsertProgramAccess({
          userId: input.userId,
          programCode: input.programCode,
          status: input.status,
          accessSource: input.accessSource,
          startsAt: new Date(),
          endsAt: input.endsAt ?? null,
          grantedByUserId: ctx.user.id,
          notes: input.notes,
        });
      }),
  }),

  // ============================================================================
  // REFERRAL SYSTEM PROCEDURES
  // ============================================================================
  referrals: router({
    generateCode: protectedProcedure.mutation(async ({ ctx }) => {
      const userId = ctx.user.id;
      
      // Generar código único de referido (8 caracteres aleatorios)
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const referralCode = await db.createReferralCode({
        referrerId: userId,
        referralCode: code,
        isActive: true,
        freeMonthGranted: false,
      });
      
      return referralCode;
    }),
    
    getMyCode: protectedProcedure.query(async ({ ctx }) => {
      const codes = await db.getReferralCodesByReferrerId(ctx.user.id);
      return codes[0] || null;
    }),
    
    getMyReferrals: protectedProcedure.query(async ({ ctx }) => {
      const referrals = await db.getReferralTrackingByReferrerId(ctx.user.id);
      return referrals;
    }),
    
    getReferralStats: protectedProcedure.query(async ({ ctx }) => {
      const referrals = await db.getReferralTrackingByReferrerId(ctx.user.id);
      const successful = referrals.filter(r => r.status === "completed").length;
      const pending = referrals.filter(r => r.status === "pending").length;
      
      return {
        total: referrals.length,
        successful,
        pending,
        freeMonthsEarned: successful,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
