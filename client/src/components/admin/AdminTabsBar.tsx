import { Users, Briefcase, Clock } from "lucide-react";

export type AdminTabKey = "suscriptores" | "pagos" | "operaciones";

export type AdminTabsBarProps = {
  activeTab: AdminTabKey;
  onChange: (tab: AdminTabKey) => void;
  // Opcional: cantidad de pagos pendientes para mostrar como badge en la tab
  pendingPaymentsCount?: number;
};

export default function AdminTabsBar({
  activeTab,
  onChange,
  pendingPaymentsCount,
}: AdminTabsBarProps) {
  return (
    <div className="flex gap-1 border-b border-slate-700 overflow-x-auto">
      <button
        onClick={() => onChange("suscriptores")}
        className={
          "px-4 py-3 font-semibold flex items-center gap-2 transition-colors relative whitespace-nowrap " +
          (activeTab === "suscriptores"
            ? "text-purple-300"
            : "text-slate-400 hover:text-slate-200")
        }
      >
        <Users className="w-4 h-4" />
        Suscriptores
        {activeTab === "suscriptores" && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400 rounded-t" />
        )}
      </button>

      <button
        onClick={() => onChange("pagos")}
        className={
          "px-4 py-3 font-semibold flex items-center gap-2 transition-colors relative whitespace-nowrap " +
          (activeTab === "pagos"
            ? "text-amber-300"
            : "text-slate-400 hover:text-slate-200")
        }
      >
        <Clock className="w-4 h-4" />
        Pagos pendientes
        {pendingPaymentsCount !== undefined && pendingPaymentsCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold bg-amber-500/30 text-amber-200 border border-amber-500/50">
            {pendingPaymentsCount}
          </span>
        )}
        {activeTab === "pagos" && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-t" />
        )}
      </button>

      <button
        onClick={() => onChange("operaciones")}
        className={
          "px-4 py-3 font-semibold flex items-center gap-2 transition-colors relative whitespace-nowrap " +
          (activeTab === "operaciones"
            ? "text-purple-300"
            : "text-slate-400 hover:text-slate-200")
        }
      >
        <Briefcase className="w-4 h-4" />
        Operaciones
        {activeTab === "operaciones" && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400 rounded-t" />
        )}
      </button>
    </div>
  );
}
