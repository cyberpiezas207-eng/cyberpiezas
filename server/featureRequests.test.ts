import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1, role: "admin" | "cashier" = "cashier"): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `User ${userId}`,
    loginMethod: "email",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("featureRequests", () => {
  it("should allow authenticated users to create a feature request", async () => {
    const ctx = createAuthContext(1, "cashier");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.featureRequests.create({
      title: "Integración con WhatsApp",
      description: "Me gustaría poder enviar mensajes a clientes directamente desde el POS para confirmar pedidos y promociones.",
    });

    expect(result).toBeDefined();
    expect(result.userId).toBe(1);
    expect(result.title).toBe("Integración con WhatsApp");
    expect(result.status).toBe("pending");
  });

  it("should reject feature requests with short title", async () => {
    const ctx = createAuthContext(1, "cashier");
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.featureRequests.create({
        title: "API",
        description: "Me gustaría poder enviar mensajes a clientes directamente desde el POS para confirmar pedidos.",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toContain("al menos 5 caracteres");
    }
  });

  it("should reject feature requests with short description", async () => {
    const ctx = createAuthContext(1, "cashier");
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.featureRequests.create({
        title: "Integración con WhatsApp",
        description: "Quiero más features",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toContain("al menos 20 caracteres");
    }
  });

  it("should allow authenticated users to list their own feature requests", async () => {
    const ctx = createAuthContext(1, "cashier");
    const caller = appRouter.createCaller(ctx);

    // Create a request first
    await caller.featureRequests.create({
      title: "Integración con WhatsApp",
      description: "Me gustaría poder enviar mensajes a clientes directamente desde el POS para confirmar pedidos.",
    });

    // List requests
    const requests = await caller.featureRequests.list();

    expect(Array.isArray(requests)).toBe(true);
    expect(requests.length).toBeGreaterThan(0);
    expect(requests[0]?.userId).toBe(1);
  });

  it("should allow admin to list all feature requests", async () => {
    const ctx = createAuthContext(1, "admin");
    const caller = appRouter.createCaller(ctx);

    // Create a request as the same user (since we don't have multiple users in test DB)
    await caller.featureRequests.create({
      title: "Integración con Telegram",
      description: "Me gustaría poder recibir notificaciones de ventas en Telegram para estar siempre actualizado.",
    });

    // List all requests as admin
    const allRequests = await caller.featureRequests.listAll();

    expect(Array.isArray(allRequests)).toBe(true);
    expect(allRequests.length).toBeGreaterThan(0);
  });

  it("should not allow unauthenticated users to create feature requests", async () => {
    const ctx: TrpcContext = {
      user: undefined,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    try {
      await caller.featureRequests.create({
        title: "Integración con WhatsApp",
        description: "Me gustaría poder enviar mensajes a clientes directamente desde el POS.",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.code).toBe("UNAUTHORIZED");
    }
  });
});
