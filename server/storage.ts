/**
 * Almacenamiento local de archivos para Boutique POS.
 * Guarda los archivos en disco local y los sirve como estáticos.
 * Para producción en Hostinger VPS, los archivos van a /uploads/
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

// Directorio base donde se guardan los archivos
// En producción: /var/www/boutique-pos/uploads (o la raíz del proyecto)
const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve(process.cwd(), "uploads");

// URL pública base donde se sirven los archivos
// Debe coincidir con la ruta estática configurada en el servidor Express
const PUBLIC_URL_BASE = process.env.UPLOADS_PUBLIC_URL ?? "/uploads";

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastSlash = relKey.lastIndexOf("/");
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1 || lastDot <= lastSlash) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

/**
 * Guarda un archivo en disco y devuelve su key y URL pública.
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const filePath = path.join(UPLOADS_DIR, key);

  // Crear subdirectorios si no existen
  ensureDir(path.dirname(filePath));

  // Escribir el archivo
  fs.writeFileSync(
    filePath,
    typeof data === "string" ? Buffer.from(data) : Buffer.from(data)
  );

  const url = `${PUBLIC_URL_BASE}/${key}`;
  return { key, url };
}

/**
 * Devuelve la URL pública de un archivo ya guardado.
 */
export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return {
    key,
    url: `${PUBLIC_URL_BASE}/${key}`,
  };
}

export { UPLOADS_DIR };
