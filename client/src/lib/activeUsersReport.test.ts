import { buildActiveUsersReportRows } from "./activeUsersReport";
import { describe, expect, it } from "vitest";

describe("activeUsersReport", () => {
  it("incluye solo usuarios con acceso activo y normaliza el reporte comercial", () => {
    const rows = buildActiveUsersReportRows([
      {
        user: {
          id: 7,
          name: "Boutique Morelos",
          email: "boutique@example.com",
          effectiveSubscriptionPlan: "annual",
          effectiveSubscriptionStatus: "active",
          effectiveSubscriptionStartDate: new Date("2026-04-01T00:00:00.000Z"),
          effectiveSubscriptionEndDate: new Date("2027-04-01T00:00:00.000Z"),
        },
        activeLicense: {
          licenseType: "manual_grant",
          requiresYouTube: true,
          youtubeVerified: false,
          requiresFacebook: true,
          facebookVerified: true,
        },
      },
      {
        user: {
          id: 8,
          name: "Suspendido",
          email: "suspendido@example.com",
          effectiveSubscriptionPlan: "basic",
          effectiveSubscriptionStatus: "suspended",
        },
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      userId: 7,
      userName: "Boutique Morelos",
      userEmail: "boutique@example.com",
      effectivePlan: "Anual",
      effectiveStatus: "Activo",
      accessOrigin: "manual grant",
      pendingRequirements: "YouTube pendiente",
    });
    expect(rows[0].validFrom).toContain("2026");
    expect(rows[0].validUntil).toContain("2027");
  });

  it("usa datos base y mensajes seguros cuando faltan campos opcionales", () => {
    const rows = buildActiveUsersReportRows([
      {
        user: {
          id: 15,
          subscriptionPlan: "free",
          subscriptionStatus: "active",
        },
        activeLicense: null,
      },
    ]);

    expect(rows).toEqual([
      expect.objectContaining({
        userId: 15,
        userName: "Usuario 15",
        userEmail: "Sin correo",
        effectivePlan: "Gratis",
        effectiveStatus: "Activo",
        accessOrigin: "Suscripción base",
        pendingRequirements: "Sin requisitos adicionales",
        validFrom: "Sin límite",
        validUntil: "Sin límite",
      }),
    ]);
  });
});
