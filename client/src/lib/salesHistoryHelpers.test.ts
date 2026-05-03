import { buildSalesSummary, filterSalesByPaymentMethod, getRecentCashMovements, paginateSales } from "./salesHistoryHelpers";

describe("salesHistoryHelpers", () => {
  const sales = [
    {
      id: 1,
      saleNumber: "SALE-001",
      total: "150.00",
      paymentMethod: "cash" as const,
      createdAt: new Date("2026-04-29T10:00:00Z"),
    },
    {
      id: 2,
      saleNumber: "SALE-002",
      total: "300.00",
      paymentMethod: "card" as const,
      createdAt: new Date("2026-04-29T11:00:00Z"),
    },
    {
      id: 3,
      saleNumber: "SALE-003",
      total: "200.00",
      paymentMethod: "transfer" as const,
      createdAt: new Date("2026-04-29T12:00:00Z"),
    },
  ];

  const cashMovements = [
    { id: 1, amount: "80.00", movementType: "entry" as const },
    { id: 2, amount: "30.00", movementType: "exit" as const },
    { id: 3, amount: "50.00", movementType: "entry" as const },
  ];

  it("filtra ventas por método de pago", () => {
    expect(filterSalesByPaymentMethod(sales, "cash")).toHaveLength(1);
    expect(filterSalesByPaymentMethod(sales, "card")[0]?.saleNumber).toBe("SALE-002");
    expect(filterSalesByPaymentMethod(sales, "all")).toHaveLength(3);
  });

  it("construye el resumen del historial con total del periodo y entradas de caja", () => {
    expect(buildSalesSummary(sales, cashMovements)).toEqual({
      totalAmount: 650,
      cashCount: 1,
      totalCashEntries: 130,
    });
  });

  it("pagina ventas y conserva solo el tramo solicitado", () => {
    expect(paginateSales(sales, 1, 2).map((sale) => sale.saleNumber)).toEqual(["SALE-001", "SALE-002"]);
    expect(paginateSales(sales, 2, 2).map((sale) => sale.saleNumber)).toEqual(["SALE-003"]);
  });

  it("limita la caja reciente al número configurado", () => {
    expect(getRecentCashMovements(cashMovements, 2)).toEqual(cashMovements.slice(0, 2));
  });
});
