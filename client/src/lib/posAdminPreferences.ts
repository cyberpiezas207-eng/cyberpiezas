export const POS_ADMIN_PREFERENCES_KEY = "boutique-pos-admin-preferences";

export type PosAdminPreferences = {
  activeBranchId: number | null;
};

export const defaultPosAdminPreferences: PosAdminPreferences = {
  activeBranchId: null,
};

export function getPosAdminPreferences(): PosAdminPreferences {
  if (typeof window === "undefined") {
    return defaultPosAdminPreferences;
  }

  const raw = window.localStorage.getItem(POS_ADMIN_PREFERENCES_KEY);
  if (!raw) {
    return defaultPosAdminPreferences;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PosAdminPreferences>;
    return {
      activeBranchId:
        typeof parsed.activeBranchId === "number" && Number.isFinite(parsed.activeBranchId)
          ? parsed.activeBranchId
          : null,
    };
  } catch {
    return defaultPosAdminPreferences;
  }
}

export function savePosAdminPreferences(preferences: PosAdminPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(POS_ADMIN_PREFERENCES_KEY, JSON.stringify(preferences));
}

export function getActivePosBranchId() {
  return getPosAdminPreferences().activeBranchId;
}

export function saveActivePosBranchId(branchId: number | null) {
  savePosAdminPreferences({ activeBranchId: branchId });
}
