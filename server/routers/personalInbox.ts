// >>> ESTE ARCHIVO VA EN: server/routers/personalInboxPublic.ts <<<
// ============================================================================
// ROUTER PUBLICO BUZON (formato esposa) - Paso 2b + tipos (Paso 1 ampliacion)
// ----------------------------------------------------------------------------
// Endpoints SIN login (publicProcedure). Los usa quien tenga el link secreto
// (token) para mandar algo. NO crea gastos reales: solo deja un PENDIENTE
// que el dueno revisa despues en su panel (router ownerOnly).
//
// AMPLIACION (tipos): ahora el envio puede traer un campo "meta" opcional con
// el tipo (gasto/gasolina/ingreso/deseo) y datos extra (odometro, fecha de
// pago, fecha del deseo). Se serializa a JSON y se guarda en rawText, SIN
// tocar la tabla. Si no viene meta, es un gasto normal (compatible con lo
// que ya existia).
//
// SEGURIDAD:
//   - El token viaja en el body (no en la URL) para no filtrarse en logs.
//   - Si el token no existe o esta revocado -> UNAUTHORIZED. No se filtra
//     ninguna pista de a quien pertenece.
//   - Limites de longitud en todos los campos para evitar payloads gigantes.
//   - check: solo dice si el link sirve. NO devuelve el userId ni datos del
//     dueno.
//
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../_core/trpc";
import {
  getActiveTokenByString,
  createSubmission,
} from "../personalInboxDb";

// ----------------------------------------------------------------------------
// Schemas de entrada
// ----------------------------------------------------------------------------
const tokenSchema = z.string().min(10).max(200);

const checkSchema = z.object({
  token: tokenSchema,
});

// meta: datos del tipo de envio. Todo opcional para mantener compatibilidad.
// kind decide que es; los demas campos aplican segun el kind.
const metaSchema = z
  .object({
    kind: z.enum(["gasto", "gasolina", "ingreso", "deseo"]).optional(),
    // gasolina
    odometer: z.number().nonnegative().max(99999999).nullable().optional(),
    liters: z.number().nonnegative().max(9999).nullable().optional(),
    pricePerLiter: z.number().nonnegative().max(999).nullable().optional(),
    // ingreso
    incomeDate: z.string().max(10).nullable().optional(),
    // deseo
    wishWhen: z.string().max(10).nullable().optional(),
    wishNote: z.string().max(255).nullable().optional(),
  })
  .optional();

const submitSchema = z.object({
  token: tokenSchema,
  senderName: z.string().max(80).nullable().optional(),
  description: z.string().min(1).max(255),
  amount: z.number().nonnegative().max(9999999).nullable().optional(),
  storeName: z.string().max(120).nullable().optional(),
  rawText: z.string().max(500).nullable().optional(),
  meta: metaSchema,
});

// ----------------------------------------------------------------------------
// Router publico (sin auth)
// ----------------------------------------------------------------------------
export const personalInboxPublicRouter = router({
  // Verifica si el link secreto sirve. Lo usa la pagina publica para decidir
  // si muestra el formulario o un mensaje de "link invalido".
  // Responde SOLO con { valid, label }. Nunca expone el userId.
  check: publicProcedure.input(checkSchema).query(async ({ input }) => {
    const tk = await getActiveTokenByString(input.token);
    if (!tk) {
      return { valid: false as const, label: null };
    }
    return { valid: true as const, label: tk.label ?? null };
  }),

  // Recibe un envio de quien tenga el link. Crea un PENDIENTE (no un gasto).
  submit: publicProcedure.input(submitSchema).mutation(async ({ input }) => {
    const tk = await getActiveTokenByString(input.token);
    if (!tk) {
      // Mismo mensaje generico: no revelamos si el token existio antes.
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "El enlace no es valido o fue desactivado.",
      });
    }

    // Si viene meta, la guardamos como JSON en rawText (sin tocar la tabla).
    // Si el remitente tambien mando rawText libre, lo conservamos dentro del
    // JSON bajo "note" para no perderlo.
    let rawToStore: string | null = input.rawText ?? null;
    if (input.meta && input.meta.kind) {
      const metaObj: Record<string, any> = { ...input.meta };
      if (input.rawText) metaObj.note = input.rawText;
      try {
        rawToStore = JSON.stringify(metaObj).slice(0, 500);
      } catch {
        rawToStore = input.rawText ?? null;
      }
    }

    const result = await createSubmission(tk.userId, tk.id, {
      senderName: input.senderName ?? null,
      description: input.description.trim(),
      amount: input.amount ?? null,
      storeName: input.storeName ?? null,
      rawText: rawToStore,
    });

    // Respuesta minima: confirmacion de que llego, sin datos internos.
    return { ok: true as const, id: result.id };
  }),
});
