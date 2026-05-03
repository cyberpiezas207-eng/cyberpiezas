import ExcelJS from "exceljs";

export type ActiveUserAccessRecord = {
  user?: {
    id: number;
    name?: string | null;
    email?: string | null;
    effectiveSubscriptionPlan?: string | null;
    subscriptionPlan?: string | null;
    effectiveSubscriptionStatus?: string | null;
    subscriptionStatus?: string | null;
    effectiveSubscriptionStartDate?: Date | string | number | null;
    subscriptionStartDate?: Date | string | number | null;
    effectiveSubscriptionEndDate?: Date | string | number | null;
    subscriptionEndDate?: Date | string | number | null;
  };
  activeLicense?: {
    licenseType?: string | null;
    requiresYouTube?: boolean | null;
    requiresFacebook?: boolean | null;
    youtubeVerified?: boolean | null;
    facebookVerified?: boolean | null;
  } | null;
};

export type ActiveUserReportRow = {
  userId: number;
  userName: string;
  userEmail: string;
  effectivePlan: string;
  effectiveStatus: string;
  validFrom: string;
  validUntil: string;
  accessOrigin: string;
  pendingRequirements: string;
};

function normalizeDate(value?: Date | string | number | null) {
  if (!value) return "Sin límite";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin límite";
  return date.toLocaleDateString("es-MX");
}

function normalizePlanLabel(plan?: string | null) {
  switch (plan) {
    case "basic":
      return "Básico";
    case "professional":
      return "Profesional";
    case "premium":
      return "Premium";
    case "annual":
      return "Anual";
    case "free":
    default:
      return "Gratis";
  }
}

function normalizeStatusLabel(status?: string | null) {
  switch (status) {
    case "active":
      return "Activo";
    case "suspended":
      return "Suspendido";
    case "expired":
      return "Expirado";
    case "pending_review":
      return "Pendiente de revisión";
    case "rejected":
      return "Rechazado";
    default:
      return "Pendiente";
  }
}

function buildPendingRequirements(record: ActiveUserAccessRecord) {
  const license = record.activeLicense;
  if (!license) return "Sin requisitos adicionales";

  const pending: string[] = [];
  if (license.requiresYouTube && !license.youtubeVerified) pending.push("YouTube pendiente");
  if (license.requiresFacebook && !license.facebookVerified) pending.push("Facebook pendiente");

  return pending.length ? pending.join(" · ") : "Sin pendientes";
}

export function buildActiveUsersReportRows(records: ActiveUserAccessRecord[]): ActiveUserReportRow[] {
  return records
    .filter((record) => (record.user?.effectiveSubscriptionStatus ?? record.user?.subscriptionStatus) === "active")
    .map((record) => ({
      userId: record.user?.id ?? 0,
      userName: record.user?.name?.trim() || `Usuario ${record.user?.id ?? "sin-id"}`,
      userEmail: record.user?.email?.trim() || "Sin correo",
      effectivePlan: normalizePlanLabel(record.user?.effectiveSubscriptionPlan ?? record.user?.subscriptionPlan),
      effectiveStatus: normalizeStatusLabel(record.user?.effectiveSubscriptionStatus ?? record.user?.subscriptionStatus),
      validFrom: normalizeDate(record.user?.effectiveSubscriptionStartDate ?? record.user?.subscriptionStartDate),
      validUntil: normalizeDate(record.user?.effectiveSubscriptionEndDate ?? record.user?.subscriptionEndDate),
      accessOrigin: record.activeLicense?.licenseType ? record.activeLicense.licenseType.replace(/_/g, " ") : "Suscripción base",
      pendingRequirements: buildPendingRequirements(record),
    }));
}

export async function exportActiveUsersToExcel(records: ActiveUserAccessRecord[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Boutique POS";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.subject = "Reporte de usuarios activos Boutique POS";
  workbook.title = "Usuarios activos";

  const rows = buildActiveUsersReportRows(records);
  const worksheet = workbook.addWorksheet("Usuarios activos", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  worksheet.columns = [
    { header: "ID Usuario", key: "userId", width: 12 },
    { header: "Nombre", key: "userName", width: 26 },
    { header: "Correo", key: "userEmail", width: 28 },
    { header: "Plan efectivo", key: "effectivePlan", width: 18 },
    { header: "Estado", key: "effectiveStatus", width: 16 },
    { header: "Válido desde", key: "validFrom", width: 16 },
    { header: "Válido hasta", key: "validUntil", width: 16 },
    { header: "Origen del acceso", key: "accessOrigin", width: 22 },
    { header: "Pendientes", key: "pendingRequirements", width: 26 },
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF722F37" },
  };
  worksheet.autoFilter = {
    from: "A1",
    to: "I1",
  };

  rows.forEach((row) => {
    worksheet.addRow(row);
  });

  worksheet.eachRow((row, rowNumber) => {
    row.alignment = { vertical: "middle", wrapText: true };
    if (rowNumber > 1) {
      row.getCell(5).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE7F7ED" },
      };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `usuarios-activos-boutique-pos-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
