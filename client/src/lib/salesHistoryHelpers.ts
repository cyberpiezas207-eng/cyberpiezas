export type SalesHistoryPaymentMethod = "cash" | "card" | "transfer";

export type SalesHistorySale = {
  id: number;
  saleNumber: string;
  total: string | number;
  paymentMethod: SalesHistoryPaymentMethod;
  createdAt: string | Date;
};

export type SalesHistoryCashMovement = {
  id: number;
  amount: string | number;
  movementType: "entry" | "exit";
};

export function filterSalesByPaymentMethod(
  sales: SalesHistorySale[],
  paymentMethodFilter: string,
) {
  if (paymentMethodFilter === "all") return sales;
  return sales.filter((sale) => sale.paymentMethod === paymentMethodFilter);
}

export function buildSalesSummary(
  sales: SalesHistorySale[],
  cashMovements: SalesHistoryCashMovement[],
) {
  const totalAmount = sales.reduce((acc, sale) => acc + Number(sale.total || 0), 0);
  const cashCount = sales.filter((sale) => sale.paymentMethod === "cash").length;
  const totalCashEntries = cashMovements
    .filter((movement) => movement.movementType === "entry")
    .reduce((acc, movement) => acc + Number(movement.amount || 0), 0);

  return {
    totalAmount,
    cashCount,
    totalCashEntries,
  };
}

export function paginateSales<T>(sales: T[], currentPage: number, pageSize: number) {
  const start = (currentPage - 1) * pageSize;
  return sales.slice(start, start + pageSize);
}

export function getRecentCashMovements<T>(cashMovements: T[], maxItems = 6) {
  return cashMovements.slice(0, maxItems);
}
