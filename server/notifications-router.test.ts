import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbModuleMock = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock("./db", () => dbModuleMock);

import { notificationsRouter } from "./routers/notifications";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

type NotificationRow = {
  id: number;
  userId: number;
  type: "sale" | "low_stock" | "payment_received" | "subscription_change" | "system";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  relatedId?: number | null;
  readAt?: Date | null;
};

function createContext(userId = 9): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `Usuario ${userId}`,
    loginMethod: "email",
    role: "admin",
    subscriptionPlan: "premium",
    subscriptionStatus: "active",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStartDate: null,
    subscriptionEndDate: null,
    subscriptionCancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: { origin: "https://boutiquepos.test" } } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createListDbMock(notifications: NotificationRow[]) {
  const selectWhere = vi.fn(() => ({
    orderBy: vi.fn(() => ({
      limit: vi.fn(() => ({
        offset: vi.fn().mockResolvedValue(notifications),
      })),
    })),
  }));

  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: selectWhere,
      })),
    })),
    __spies: {
      selectWhere,
    },
  };
}

function createOwnershipDbMock(ownershipRows: Array<{ id: number; userId: number }>) {
  const selectWhere = vi.fn(() => ({
    limit: vi.fn().mockResolvedValue(ownershipRows),
  }));
  const updateWhere = vi.fn().mockResolvedValue({ affectedRows: ownershipRows.length || 1 });
  const deleteWhere = vi.fn().mockResolvedValue({ affectedRows: ownershipRows.length || 1 });

  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: selectWhere,
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: updateWhere,
      })),
    })),
    delete: vi.fn(() => ({
      where: deleteWhere,
    })),
    __spies: {
      selectWhere,
      updateWhere,
      deleteWhere,
    },
  };
}

describe("notifications router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lista las notificaciones creadas para el usuario actual", async () => {
    const rows: NotificationRow[] = [
      {
        id: 1,
        userId: 9,
        type: "sale",
        title: "Nueva venta registrada",
        message: "Se registró la venta VTA-001 por 799 en Matriz.",
        isRead: false,
        createdAt: new Date("2026-04-29T10:00:00.000Z"),
      },
      {
        id: 2,
        userId: 9,
        type: "low_stock",
        title: "Stock bajo detectado",
        message: "Blusa Rosa quedó con 2 piezas en Matriz.",
        isRead: true,
        createdAt: new Date("2026-04-29T09:00:00.000Z"),
      },
    ];
    const dbMock = createListDbMock(rows);
    dbModuleMock.getDb.mockResolvedValue(dbMock as any);

    const caller = notificationsRouter.createCaller(createContext(9));
    const result = await caller.getAll({ limit: 100, offset: 0, unreadOnly: false });

    expect(result).toEqual(rows);
    expect(dbModuleMock.getDb).toHaveBeenCalledTimes(1);
    expect(dbMock.__spies.selectWhere).toHaveBeenCalledTimes(1);
  });

  it("cuenta solamente las notificaciones sin leer del usuario", async () => {
    const unreadRows: NotificationRow[] = [
      {
        id: 7,
        userId: 9,
        type: "payment_received",
        title: "Pago recibido",
        message: "Tu pago fue validado correctamente.",
        isRead: false,
        createdAt: new Date("2026-04-29T08:00:00.000Z"),
      },
      {
        id: 8,
        userId: 9,
        type: "subscription_change",
        title: "Suscripción activada",
        message: "Tu plan anual ya está activo.",
        isRead: false,
        createdAt: new Date("2026-04-29T08:05:00.000Z"),
      },
    ];

    const dbMock = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue(unreadRows),
        })),
      })),
    };
    dbModuleMock.getDb.mockResolvedValue(dbMock as any);

    const caller = notificationsRouter.createCaller(createContext(9));
    const result = await caller.getUnreadCount();

    expect(result).toBe(2);
  });

  it("marca como leída una notificación propia y persiste la actualización", async () => {
    const dbMock = createOwnershipDbMock([{ id: 12, userId: 9 }]);
    dbModuleMock.getDb.mockResolvedValue(dbMock as any);

    const caller = notificationsRouter.createCaller(createContext(9));
    const result = await caller.markAsRead({ id: 12 });

    expect(result).toEqual({ success: true });
    expect(dbMock.__spies.updateWhere).toHaveBeenCalledTimes(1);
  });

  it("rechaza eliminar una notificación ajena aunque exista en la base de datos", async () => {
    const dbMock = createOwnershipDbMock([{ id: 15, userId: 999 }]);
    dbModuleMock.getDb.mockResolvedValue(dbMock as any);

    const caller = notificationsRouter.createCaller(createContext(9));

    await expect(caller.delete({ id: 15 })).rejects.toThrow("Unauthorized");
    expect(dbMock.__spies.deleteWhere).not.toHaveBeenCalled();
  });
});
