import { describe, expect, it } from "vitest";
import { routeProductScannerCode } from "../client/src/lib/barcodeRouting";

describe("routeProductScannerCode", () => {
  it("envía el código escaneado al formulario cuando el alta de producto está abierta", () => {
    const result = routeProductScannerCode({
      scannedCode: " BTQ-9001 ",
      isCreateDialogOpen: true,
    });

    expect(result).toEqual({
      mode: "form",
      nextSku: "BTQ-9001",
    });
  });

  it("envía el código escaneado a la búsqueda cuando no hay formulario abierto", () => {
    const result = routeProductScannerCode({
      scannedCode: "750101234567",
      isCreateDialogOpen: false,
    });

    expect(result).toEqual({
      mode: "search",
      nextSearchQuery: "750101234567",
    });
  });

  it("ignora lecturas vacías o con solo espacios", () => {
    expect(
      routeProductScannerCode({
        scannedCode: "   ",
        isCreateDialogOpen: true,
      }),
    ).toBeNull();
  });
});
