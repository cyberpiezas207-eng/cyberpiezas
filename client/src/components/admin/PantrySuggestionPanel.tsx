// ============================================================================
// PANEL "Agregar a alacena" - sugerencia desde un gasto recien capturado
// ----------------------------------------------------------------------------
// Aparece debajo de la captura cuando el motor detecta productos en el texto.
// Muestra checkboxes (todos pre-seleccionados), marca Nuevo / Reponer, permite
// asignar precio aproximado (total / cantidad) y confirma en bulk.
// NUNCA modifica la alacena sin confirmacion explicita del usuario.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Package, X, Check, Sparkles } from "lucide-react";

interface Props {
  detectedItems: string[];
  expenseId: number;
  storeId: number | null;
  storeName?: string | null;
  totalAmount: number;
  defaultCategoryId?: number | null;
  onClose: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Math.round(n));

// Normaliza simple (mismo espiritu que normalizeText del servidor)
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export default function PantrySuggestionPanel({
  detectedItems,
  expenseId,
  storeId,
  storeName,
  totalAmount,
  defaultCategoryId,
  onClose,
}: Props) {
  const utils = trpc.useUtils();

  // Quitar duplicados (mismo nombre normalizado) manteniendo orden
  const uniqueItems = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const it of detectedItems) {
      const norm = normalize(it);
      if (norm && !seen.has(norm)) {
        seen.add(norm);
        out.push(it.trim());
      }
    }
    return out;
  }, [detectedItems]);

  // Por defecto todos seleccionados
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(uniqueItems),
  );
  const [assignPrice, setAssignPrice] = useState(true);

  // Saber cuales ya existen en la alacena (badge Nuevo / Reponer)
  const itemsQuery = trpc.personalPantry.items.list.useQuery({ limit: 500 });
  const existingNormalized = useMemo(() => {
    const set = new Set<string>();
    (itemsQuery.data ?? []).forEach((it) => {
      if (it.normalizedName) set.add(it.normalizedName);
    });
    return set;
  }, [itemsQuery.data]);

  const accept = trpc.personalPantrySuggestions.accept.useMutation({
    onSuccess: (res) => {
      const parts: string[] = [];
      if (res.created > 0) parts.push(`${res.created} nuevo(s)`);
      if (res.restocked > 0) parts.push(`${res.restocked} repuesto(s)`);
      toast.success(
        parts.length > 0
          ? `Alacena actualizada: ${parts.join(", ")}`
          : "Alacena actualizada",
      );
      utils.personalPantry.items.list.invalidate();
      utils.personalPantry.stats.get.invalidate();
      utils.personalPantry.shoppingList.list.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message || "No se pudo actualizar"),
  });

  if (uniqueItems.length === 0) return null;

  const selectedList = Array.from(selected);
  const pricePerUnit =
    assignPrice && selectedList.length > 0 && totalAmount > 0
      ? Math.round((totalAmount / selectedList.length) * 100) / 100
      : null;

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function handleAccept() {
    if (selectedList.length === 0) return;
    accept.mutate({
      products: selectedList.map((name) => ({
        name,
        pricePerUnit,
        categoryId: defaultCategoryId ?? null,
      })),
      storeId: storeId ?? null,
      expenseId,
      defaultCategoryId: defaultCategoryId ?? null,
    });
  }

  return (
    <Card className="bg-slate-800 border border-emerald-500/40 shadow-lg">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Detecte productos en tu gasto
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Marca lo que quieras agregar o reponer en tu alacena.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 p-1"
            title="Ignorar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {uniqueItems.map((item) => {
            const isExisting = existingNormalized.has(normalize(item));
            const isChecked = selected.has(item);
            return (
              <label
                key={item}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                  isChecked
                    ? "bg-emerald-500/10 border-emerald-500/40"
                    : "bg-slate-900 border-slate-700 hover:border-slate-600"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(item)}
                  className="accent-emerald-500 w-4 h-4"
                />
                <span className="flex-1 text-sm text-slate-200 truncate capitalize">
                  {item}
                </span>
                {isExisting ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 shrink-0">
                    Reponer
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 shrink-0">
                    Nuevo
                  </span>
                )}
              </label>
            );
          })}
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={assignPrice}
            onChange={(e) => setAssignPrice(e.target.checked)}
            className="accent-emerald-500 w-4 h-4"
          />
          <span>Asignar precio aproximado por producto</span>
          {pricePerUnit !== null && (
            <span className="text-slate-400">
              ({fmt(pricePerUnit)} c/u, dividiendo el gasto)
            </span>
          )}
        </label>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleAccept}
            disabled={accept.isPending || selectedList.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Check className="w-4 h-4 mr-1" />
            {accept.isPending
              ? "Agregando..."
              : `Agregar a alacena (${selectedList.length})`}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
          >
            Ignorar
          </Button>
          {storeName && (
            <span className="text-xs text-slate-500 ml-auto flex items-center gap-1">
              <Package className="w-3 h-3" />
              Tienda: {storeName}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
