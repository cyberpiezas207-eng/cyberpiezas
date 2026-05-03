import ExcelJS from "exceljs";

export type SubscriberUserRecord = {
  user?: {
    id: number;
    name?: string | null;
    email?: string | null;
  };
};

export type SubscriberLicenseRecord = {
  id: number;
  userId: number;
  planCode: string;
  licenseType: string;
  status: string;
  validFrom: Date | string | number;
  validUntil?: Date | string | number | null;
  requiresYouTube?: boolean | null;
  requiresFacebook?: boolean | null;
  youtubeVerified?: boolean | null;
  facebookVerified?: boolean | null;
  reason?: string | null;
  notes?: string | null;
  createdAt?: Date | string | number | null;
};

export type SubscriberExportRow = {
  licenseId: number;
  userName: string;
  userEmail: string;
  planCode: string;
  licenseType: string;
  status: string;
  validFrom: string;
  validUntil: string;
  youtubeRequirement: string;
  facebookRequirement: string;
  reason: string;
  notes: string;
};

function normalizeDate(value?: Date | string | number | null) {
  if (!value) return "Sin límite";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin límite";
  return date.toLocaleDateString("es-MX");
}

export function buildSubscriberExportRows(
  licenses: SubscriberLicenseRecord[],
  users: SubscriberUserRecord[],
): SubscriberExportRow[] {
  return licenses.map((license) => {
    const userRecord = users.find((row) => row.user?.id === license.userId)?.user;
    const youtubeRequirement = license.requiresYouTube
      ? license.youtubeVerified
        ? "Requerido y verificado"
        : "Requerido y pendiente"
      : "No requerido";
    const facebookRequirement = license.requiresFacebook
      ? license.facebookVerified
        ? "Requerido y verificado"
        : "Requerido y pendiente"
      : "No requerido";

    return {
      licenseId: license.id,
      userName: userRecord?.name?.trim() || `Usuario ${license.userId}`,
      userEmail: userRecord?.email?.trim() || "Sin correo",
      planCode: license.planCode,
      licenseType: license.licenseType.replace(/_/g, " "),
      status: license.status,
      validFrom: normalizeDate(license.validFrom),
      validUntil: normalizeDate(license.validUntil),
      youtubeRequirement,
      facebookRequirement,
      reason: license.reason?.trim() || "",
      notes: license.notes?.trim() || "",
    };
  });
}

export async function exportSubscribersToExcel(
  licenses: SubscriberLicenseRecord[],
  users: SubscriberUserRecord[],
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Boutique POS";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.subject = "Gestión de suscriptores Boutique POS";
  workbook.title = "Listado de suscriptores";

  const rows = buildSubscriberExportRows(licenses, users);
  const activeCount = licenses.filter((license) => license.status === "active").length;
  const suspendedOrRevokedCount = licenses.filter((license) => ["suspended", "revoked"].includes(license.status)).length;
  const pendingRequirementCount = licenses.filter(
    (license) =>
      (license.requiresYouTube && !license.youtubeVerified) ||
      (license.requiresFacebook && !license.facebookVerified),
  ).length;

  const overview = workbook.addWorksheet("Resumen", {
    views: [{ state: "frozen", ySplit: 5 }],
  });
  overview.columns = [
    { key: "label", width: 28 },
    { key: "value", width: 18 },
  ];

  overview.getCell("B2").value = "Listado de suscriptores";
  overview.getCell("B2").font = { name: "Arial", size: 18, bold: true, color: { argb: "FF722F37" } };
  overview.getCell("B3").value = "Resumen operativo exportado desde Boutique POS";
  overview.getCell("B3").font = { name: "Arial", size: 11, color: { argb: "FF555555" } };

  const summaryStartRow = 6;
  const summaryRows = [
    ["Total de licencias", licenses.length],
    ["Licencias activas", activeCount],
    ["Suspendidas o revocadas", suspendedOrRevokedCount],
    ["Pendientes de requisito", pendingRequirementCount],
    ["Fecha de generación", new Date().toLocaleString("es-MX")],
  ];

  summaryRows.forEach((entry, index) => {
    const rowNumber = summaryStartRow + index;
    overview.getCell(`B${rowNumber}`).value = entry[0];
    overview.getCell(`C${rowNumber}`).value = entry[1];
    overview.getCell(`B${rowNumber}`).font = { bold: true, color: { argb: "FF2D2D2D" } };
    overview.getCell(`B${rowNumber}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF4E7EA" },
    };
  });

  overview.getCell("B13").value = "Notas clave";
  overview.getCell("B13").font = { name: "Arial", size: 13, bold: true, color: { argb: "FF722F37" } };
  overview.getCell("B14").value = "• Las licencias gratuitas especiales deben validarse contra YouTube y Facebook antes de otorgarse.";
  overview.getCell("B15").value = "• El estado y la vigencia exportados corresponden al momento exacto de la descarga.";
  overview.getCell("B16").value = "• Usa la hoja 'Suscriptores' para filtrar por plan, estado o requisitos pendientes.";

  const detailSheet = workbook.addWorksheet("Suscriptores", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  detailSheet.columns = [
    { header: "ID Licencia", key: "licenseId", width: 14 },
    { header: "Usuario", key: "userName", width: 24 },
    { header: "Correo", key: "userEmail", width: 28 },
    { header: "Plan", key: "planCode", width: 14 },
    { header: "Tipo", key: "licenseType", width: 18 },
    { header: "Estado", key: "status", width: 14 },
    { header: "Válido desde", key: "validFrom", width: 16 },
    { header: "Válido hasta", key: "validUntil", width: 16 },
    { header: "YouTube", key: "youtubeRequirement", width: 22 },
    { header: "Facebook", key: "facebookRequirement", width: 22 },
    { header: "Razón", key: "reason", width: 28 },
    { header: "Notas", key: "notes", width: 32 },
  ];

  detailSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  detailSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF722F37" },
  };
  detailSheet.autoFilter = {
    from: "A1",
    to: "L1",
  };

  rows.forEach((row) => {
    detailSheet.addRow(row);
  });

  detailSheet.eachRow((row, rowNumber) => {
    row.alignment = { vertical: "middle", wrapText: true };
    if (rowNumber > 1) {
      const statusCell = row.getCell(6);
      if (statusCell.value === "active") {
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7F7ED" } };
      } else if (statusCell.value === "suspended") {
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF4D6" } };
      } else if (statusCell.value === "revoked") {
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDE8E8" } };
      }
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `suscriptores-boutique-pos-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
