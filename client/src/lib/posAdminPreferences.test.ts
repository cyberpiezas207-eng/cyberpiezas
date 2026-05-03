import {
  POS_ADMIN_PREFERENCES_KEY,
  defaultPosAdminPreferences,
  getActivePosBranchId,
  getPosAdminPreferences,
  saveActivePosBranchId,
  savePosAdminPreferences,
} from "@/lib/posAdminPreferences";
import { beforeEach, describe, expect, it } from "vitest";

describe("posAdminPreferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("expone una configuración por defecto sin sucursal activa", () => {
    expect(getPosAdminPreferences()).toEqual(defaultPosAdminPreferences);
    expect(getActivePosBranchId()).toBeNull();
  });

  it("persiste y recupera la sucursal activa del POS para administradores", () => {
    savePosAdminPreferences({ activeBranchId: 12 });

    expect(window.localStorage.getItem(POS_ADMIN_PREFERENCES_KEY)).toContain("12");
    expect(getPosAdminPreferences()).toEqual({ activeBranchId: 12 });
    expect(getActivePosBranchId()).toBe(12);
  });

  it("permite actualizar directamente la sucursal activa", () => {
    saveActivePosBranchId(7);
    expect(getActivePosBranchId()).toBe(7);

    saveActivePosBranchId(null);
    expect(getActivePosBranchId()).toBeNull();
  });

  it("tolera contenido inválido en localStorage y regresa a una configuración segura", () => {
    window.localStorage.setItem(POS_ADMIN_PREFERENCES_KEY, "{no-json}");

    expect(getPosAdminPreferences()).toEqual(defaultPosAdminPreferences);
  });
});
