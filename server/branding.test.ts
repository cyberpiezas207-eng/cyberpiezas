import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMock = vi.hoisted(() => ({
  getUserByOpenId: vi.fn(),
  getSystemBrandingSettings: vi.fn(),
  upsertSystemBrandingSettings: vi.fn(),
}));

const storageMock = vi.hoisted(() => ({
  storagePut: vi.fn(),
}));

vi.mock("./db", () => dbMock);
vi.mock("./storage", () => storageMock);
vi.mock("./_core/env", () => ({
  ENV: {
    ownerOpenId: "owner-open-id",
  },
}));

import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(userOverrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user = {
    id: 1,
    openId: "owner-open-id",
    email: "owner@example.com",
    name: "Owner",
    loginMethod: "email",
    role: "admin",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionPlan: "annual",
    subscriptionStatus: "active",
    subscriptionStartDate: null,
    subscriptionEndDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...userOverrides,
  } satisfies AuthenticatedUser;

  return {
    user,
    req: {
      protocol: "https",
      headers: { origin: "https://boutiquepos.test" },
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("branding router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve valores por defecto cuando todavía no existe branding guardado", async () => {
    dbMock.getUserByOpenId.mockResolvedValue(null);

    const caller = appRouter.createCaller(createContext());
    const result = await caller.branding.getActive();

    expect(result).toEqual({
      appTitle: "Boutique POS",
      appSubtitle: "Centro de operación",
      bannerImageUrl: null,
      bannerAltText: null,
    });
  });

  it("permite al dueño actualizar título y banner usando una imagen subida", async () => {
    dbMock.getUserByOpenId.mockResolvedValue({ id: 1 });
    storageMock.storagePut.mockResolvedValue({
      key: "branding/1/banner.jpg",
      url: "https://cdn.example.com/banner.jpg",
    });
    dbMock.upsertSystemBrandingSettings.mockResolvedValue({
      appTitle: "Mi POS Boutique",
      appSubtitle: "Panel principal",
      bannerImageUrl: "https://cdn.example.com/banner.jpg",
      bannerAltText: "Banner principal",
    });

    const caller = appRouter.createCaller(createContext());
    const result = await caller.branding.update({
      appTitle: "Mi POS Boutique",
      appSubtitle: "Panel principal",
      bannerAltText: "Banner principal",
      bannerFileBase64: Buffer.from("banner de prueba").toString("base64"),
      bannerFileName: "banner.jpg",
      bannerMimeType: "image/jpeg",
    });

    expect(storageMock.storagePut).toHaveBeenCalledTimes(1);
    expect(dbMock.upsertSystemBrandingSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: 1,
        appTitle: "Mi POS Boutique",
        appSubtitle: "Panel principal",
        bannerImageUrl: "https://cdn.example.com/banner.jpg",
      }),
    );
    expect(result).toEqual({
      appTitle: "Mi POS Boutique",
      appSubtitle: "Panel principal",
      bannerImageUrl: "https://cdn.example.com/banner.jpg",
      bannerAltText: "Banner principal",
    });
  });

  it("bloquea a un administrador que no es el dueño principal cuando intenta cambiar el branding", async () => {
    const caller = appRouter.createCaller(
      createContext({ id: 9, openId: "otro-admin", email: "admin2@example.com" }),
    );

    await expect(
      caller.branding.update({
        appTitle: "No permitido",
        appSubtitle: "Bloqueado",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
