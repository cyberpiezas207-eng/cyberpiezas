import { describe, expect, it } from "vitest";
import { filterMenuItemsByAccess } from "./DashboardLayout";

describe("filterMenuItemsByAccess", () => {
  it("muestra únicamente módulos boutique para un usuario con acceso boutique activo", () => {
    const items = filterMenuItemsByAccess({
      role: "user",
      programAccess: [{ programCode: "boutique", status: "active" }],
    });

    const labels = items.map((item) => item.label);

    expect(labels).toContain("Centro Cyberpiezas");
    expect(labels).toContain("Punto de Venta");
    expect(labels).toContain("Ventas");
    expect(labels).not.toContain("Abarrotes - POS");
    expect(labels).not.toContain("Abarrotes - Productos");
  });

  it("oculta módulos boutique cuando el usuario no tiene acceso activo a ese sistema", () => {
    const items = filterMenuItemsByAccess({
      role: "user",
      programAccess: [{ programCode: "abarrotes", status: "active" }],
    });

    const labels = items.map((item) => item.label);

    expect(labels).toContain("Centro Cyberpiezas");
    expect(labels).not.toContain("Punto de Venta");
    expect(labels).not.toContain("Ventas");
  });

  it("permite al administrador ver todo el menú sin depender del acceso por programa", () => {
    const items = filterMenuItemsByAccess({
      role: "admin",
      programAccess: [],
    });

    const labels = items.map((item) => item.label);

    expect(labels).toContain("Punto de Venta");
    expect(labels).toContain("Abarrotes - POS");
    expect(labels).toContain("Dashboard interno");
  });
});
