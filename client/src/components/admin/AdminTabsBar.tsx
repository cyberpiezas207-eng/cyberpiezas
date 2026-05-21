import { Users, Briefcase } from "lucide-react";

export type AdminTabKey = "suscriptores" | "operaciones";

export type AdminTabsBarProps = {
  activeTab: AdminTabKey;
  onChange: (tab: AdminTabKey) => void;
};

export default function AdminTabsBar({ activeTab, onChange }: AdminTabsBarProps) {
  return (
    <div className="flex gap-1 border-b border-slate-700">
      <button
        onClick={() => onChange("suscriptores")}
        className={
          "px-4 py-3 font-semibold flex items-center gap-2 transition-colors relative " +
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
        onClick={() => onChange("operaciones")}
        className={
          "px-4 py-3 font-semibold flex items-center gap-2 transition-colors relative " +
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
