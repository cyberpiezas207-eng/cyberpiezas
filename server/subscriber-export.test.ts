import { describe, expect, it } from "vitest";
import { buildSubscriberExportRows } from "../client/src/lib/subscriberExport";

describe("subscriber export", () => {
  it("convierte licencias y usuarios en filas exportables con requisitos legibles", () => {
    const rows = buildSubscriberExportRows(
      [
        {
          id: 7,
          userId: 22,
          planCode: "free",
          licenseType: "free_special",
          status: "active",
          validFrom: "2026-04-01T00:00:00.000Z",
          validUntil: "2026-05-01T00:00:00.000Z",
          requiresYouTube: true,
          requiresFacebook: true,
          youtubeVerified: true,
          facebookVerified: false,
          reason: "Promoción ecológica",
          notes: "Seguimiento pendiente",
        },
      ],
      [
        {
          user: {
            id: 22,
            name: "María López",
            email: "maria@example.com",
          },
        },
      ],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      licenseId: 7,
      userName: "María López",
      userEmail: "maria@example.com",
      planCode: "free",
      licenseType: "free special",
      status: "active",
      youtubeRequirement: "Requerido y verificado",
      facebookRequirement: "Requerido y pendiente",
      reason: "Promoción ecológica",
      notes: "Seguimiento pendiente",
    });
  });

  it("asigna valores por defecto cuando faltan datos del usuario o vigencia final", () => {
    const rows = buildSubscriberExportRows(
      [
        {
          id: 9,
          userId: 99,
          planCode: "basic",
          licenseType: "manual_grant",
          status: "suspended",
          validFrom: "2026-06-10T00:00:00.000Z",
          validUntil: null,
          requiresYouTube: false,
          requiresFacebook: false,
        },
      ],
      [],
    );

    expect(rows[0].userName).toBe("Usuario 99");
    expect(rows[0].userEmail).toBe("Sin correo");
    expect(rows[0].validUntil).toBe("Sin límite");
    expect(rows[0].youtubeRequirement).toBe("No requerido");
    expect(rows[0].facebookRequirement).toBe("No requerido");
  });
});
