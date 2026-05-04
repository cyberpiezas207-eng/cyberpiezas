import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

export type RunningServer = {
  app: express.Express;
  server: ReturnType<typeof createServer>;
  port: number;
  url: string;
};

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.log("[Migrations] No DATABASE_URL found, skipping migrations.");
    return;
  }
  try {
    const { drizzle } = await import("drizzle-orm/mysql2");
    const { migrate } = await import("drizzle-orm/mysql2/migrator");
    // Resolve the drizzle/ folder relative to the project root (two levels up from server/_core/)
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const migrationsFolder = path.resolve(__dirname, "../../drizzle");
    const db = drizzle(process.env.DATABASE_URL);
    await migrate(db, { migrationsFolder });
    console.log("[Migrations] All migrations applied successfully.");
  } catch (err) {
    // Non-fatal: server will still start even if migrations fail
    console.error("[Migrations] Migration error (non-fatal):", err);
  }
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(`No available port found starting from ${startPort}`);
}

export async function startServer(): Promise<RunningServer> {
  // Run database migrations before starting the server
  await runMigrations();

  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  app.get("/api/stripe/webhook", (_req, res) => {
    res.json({
      message: "Stripe webhook endpoint",
      method: "POST",
      note: "Use POST method with Stripe signature header",
    });
  });

  // Serve uploaded files (product images, banners, etc.) as static assets
  const { UPLOADS_DIR } = await import("../storage");
  const expressStatic = (await import("express")).static;
  app.use("/uploads", expressStatic(UPLOADS_DIR, { maxAge: "7d" }));

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = Number.parseInt(process.env.PORT || "3000", 10);
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      resolve();
    });
  });

  const url = `http://localhost:${port}/`;
  console.log(`Server running on ${url}`);

  return {
    app,
    server,
    port,
    url,
  };
}
