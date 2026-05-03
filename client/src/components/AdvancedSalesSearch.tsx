import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, X } from "lucide-react";

interface AdvancedSearchFilters {
  saleNumber?: string;
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
}

interface AdvancedSalesSearchProps {
  onSearch: (filters: AdvancedSearchFilters) => void;
  onClear: () => void;
}

export function AdvancedSalesSearch({ onSearch, onClear }: AdvancedSalesSearchProps) {
  const [filters, setFilters] = useState<AdvancedSearchFilters>({});
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleClear = () => {
    setFilters({});
    onClear();
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined && v !== "");

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-primary flex items-center gap-2">
              <Search className="h-5 w-5" />
              Búsqueda Avanzada
            </CardTitle>
            <CardDescription>
              Filtra ventas por número, monto o fecha
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Contraer" : "Expandir"}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sale Number */}
            <div>
              <Label htmlFor="saleNumber" className="text-foreground font-semibold">
                Número de Venta
              </Label>
              <Input
                id="saleNumber"
                type="text"
                placeholder="Ej: VTA-001"
                value={filters.saleNumber || ""}
                onChange={(e) =>
                  setFilters({ ...filters, saleNumber: e.target.value })
                }
                className="mt-2"
              />
            </div>

            {/* Min Amount */}
            <div>
              <Label htmlFor="minAmount" className="text-foreground font-semibold">
                Monto Mínimo
              </Label>
              <Input
                id="minAmount"
                type="number"
                placeholder="$0.00"
                value={filters.minAmount || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    minAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                className="mt-2"
              />
            </div>

            {/* Max Amount */}
            <div>
              <Label htmlFor="maxAmount" className="text-foreground font-semibold">
                Monto Máximo
              </Label>
              <Input
                id="maxAmount"
                type="number"
                placeholder="$9999.99"
                value={filters.maxAmount || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    maxAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                className="mt-2"
              />
            </div>

            {/* Start Date */}
            <div>
              <Label htmlFor="startDate" className="text-foreground font-semibold">
                Fecha Inicio
              </Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate || ""}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
                className="mt-2"
              />
            </div>

            {/* End Date */}
            <div>
              <Label htmlFor="endDate" className="text-foreground font-semibold">
                Fecha Fin
              </Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate || ""}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
                className="mt-2"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={handleClear}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Limpiar Filtros
              </Button>
            )}
            <Button
              onClick={handleSearch}
              className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
            >
              <Search className="h-4 w-4" />
              Buscar
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
