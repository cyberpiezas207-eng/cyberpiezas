import { describe, expect, it } from "vitest";
import { filterMenuItemsByAccess } from "../client/src/components/DashboardLayout";

describe("filterMenuItemsByAccess", () => {
  it("deja visible Boutique POS cuando la cuenta solo tiene acceso boutique activo", () => {
    const labels = filterMenuItemsByAccess({
      role: "user",
      programAccess: [{ programCode: "boutique", status: "active" }],
    }).map((item) => item.label);

    expect(labels).toContain("Centro Cyberpiezas");
    expect(labels).toContain("Punto de Venta");
    expect(labels).toContain("Ventas");
    expect(labels).not.toContain("Abarrotes - POS");
  });

  it("oculta Boutique POS cuando la cuenta no tiene ese sistema activo", () => {
    const labels = filterMenuItemsByAccess({
      role: "user",
      programAccess: [{ programCode: "celine", status: "active" }],
    }).map((item) => item.label);

    expect(labels).toContain("Centro Cyberpiezas");
    expect(labels).not.toContain("Punto de Venta");
    expect(labels).not.toContain("Ventas");
  });

  it("permite al administrador ver los módulos internos de Boutique aunque no existan accesos cargados", () => {
    const labels = filterMenuItemsByAccess({
      role: "admin",
      programAccess: [],
    }).map((item) => item.label);

    expect(labels).toContain("Punto de Venta");
    expect(labels).toContain("Sucursales");
    expect(labels).toContain("Dashboard interno");
    expect(labels).not.toContain("Abarrotes - POS");
  });
});
