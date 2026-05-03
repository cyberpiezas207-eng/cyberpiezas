import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMock = vi.hoisted(() => ({
  grantManualLicense: vi.fn(),
  createNotificationForUser: vi.fn(),
  renewManualLicense: vi.fn(),
  updateLicenseStatus: vi.fn(),
  getAllManualLicenses: vi.fn(),
  getManualLicensesByUserId: vi.fn(),
  getLicenseGrantHistory: vi.fn(),
}));

vi.mock("./db", () => dbMock);

import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `admin-${userId}`,
    email: `admin${userId}@example.com`,
    name: `Admin ${userId}`,
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

describe("license management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.getAllManualLicenses.mockResolvedValue([]);
    dbMock.getManualLicensesByUserId.mockResolvedValue([]);
    dbMock.getLicenseGrantHistory.mockResolvedValue([]);
  });

  it("rechaza licencias gratuitas especiales si no se verifican YouTube y Facebook", async () => {
    const caller = appRouter.createCaller(createAdminContext(9));

    await expect(
      caller.licenses.grantLicense({
        userId: 77,
        planCode: "free",
        licenseType: "free_special",
        validFrom: new Date("2026-04-01T00:00:00.000Z"),
        requiresYouTube: true,
        requiresFacebook: true,
        youtubeVerified: true,
        facebookVerified: false,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(dbMock.grantManualLicense).not.toHaveBeenCalled();
    expect(dbMock.createNotificationForUser).not.toHaveBeenCalled();
  });

  it("crea notificación cuando se otorga una licencia válida", async () => {
    dbMock.grantManualLicense.mockResolvedValue({ id: 31 });

    const caller = appRouter.createCaller(createAdminContext(2));

    const result = await caller.licenses.grantLicense({
      userId: 15,
      planCode: "professional",
      licenseType: "manual_grant",
      validFrom: new Date("2026-04-01T00:00:00.000Z"),
      validUntil: new Date("2026-12-31T00:00:00.000Z"),
      requiresYouTube: false,
      requiresFacebook: false,
      youtubeVerified: false,
      facebookVerified: false,
      reason: "Cliente activo",
    });

    expect(result).toEqual({ id: 31 });
    expect(dbMock.grantManualLicense).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 15,
        grantedByUserId: 2,
        planCode: "professional",
        licenseType: "manual_grant",
      }),
    );
    expect(dbMock.createNotificationForUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 15,
        type: "subscription_change",
        title: "Licencia otorgada",
        relatedId: 31,
      }),
    );
  });

  it("renueva una licencia manual y notifica al usuario", async () => {
    dbMock.renewManualLicense.mockResolvedValue({ userId: 48 });

    const caller = appRouter.createCaller(createAdminContext(5));
    const validUntil = new Date("2027-01-31T00:00:00.000Z");

    await caller.licenses.renewLicense({
      licenseId: 88,
      validUntil,
      renewalNotes: "Pago confirmado por transferencia",
    });

    expect(dbMock.renewManualLicense).toHaveBeenCalledWith(
      88,
      validUntil,
      5,
      "Pago confirmado por transferencia",
    );
    expect(dbMock.createNotificationForUser).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 48,
        type: "subscription_change",
        title: "Licencia renovada",
        relatedId: 88,
      }),
    );
  });
});
