// OAuth routes removed — authentication is now handled via
// tRPC auth.login and auth.register mutations in server/routers.ts
import type { Express } from "express";

export function registerOAuthRoutes(_app: Express) {
  // No-op: all auth is via tRPC mutations
}
