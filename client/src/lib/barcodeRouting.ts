export type ProductScannerRouteResult =
  | { mode: "form"; nextSku: string; nextSearchQuery?: undefined }
  | { mode: "search"; nextSku?: undefined; nextSearchQuery: string };

export function routeProductScannerCode(params: {
  scannedCode: string;
  isCreateDialogOpen: boolean;
}): ProductScannerRouteResult | null {
  const normalized = params.scannedCode.trim();
  if (!normalized) return null;

  if (params.isCreateDialogOpen) {
    return {
      mode: "form",
      nextSku: normalized,
    };
  }

  return {
    mode: "search",
    nextSearchQuery: normalized,
  };
}
