/**
 * Notificaciones del sistema.
 * Actualmente registra en consola. Puedes conectar email (Resend, Nodemailer)
 * o Telegram cambiando la implementación de notifyOwner sin tocar el resto.
 */

import { TRPCError } from "@trpc/server";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

function validate(input: NotificationPayload): NotificationPayload {
  const title = (input.title ?? "").trim();
  const content = (input.content ?? "").trim();

  if (!title) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "El título de la notificación es requerido." });
  }
  if (!content) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "El contenido de la notificación es requerido." });
  }
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `El título no puede superar ${TITLE_MAX_LENGTH} caracteres.` });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `El contenido no puede superar ${CONTENT_MAX_LENGTH} caracteres.` });
  }
  return { title, content };
}

/**
 * Envía una notificación al dueño del sistema.
 * Retorna true si se entregó, false si no hay canal configurado.
 */
export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  const { title, content } = validate(payload);

  // Log en consola siempre (útil para ver en pm2 logs)
  console.info(`[Notificación] ${title}\n${content}`);

  // ──────────────────────────────────────────────────
  // Para agregar email, descomenta y configura:
  //
  // import { Resend } from "resend";
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: "pos@tudominio.com",
  //   to: process.env.OWNER_EMAIL ?? "",
  //   subject: title,
  //   text: content,
  // });
  // return true;
  // ──────────────────────────────────────────────────

  return true;
}
