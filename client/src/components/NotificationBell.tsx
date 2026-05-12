// =============================================================================
// NotificationBell - VERSION PLACEHOLDER (sin trpc, sin sonner)
// =============================================================================
// Esta version es solo la CAMPANA VISUAL para verificar que compila.
// Si esta version SI compila, el problema esta en trpc.notifications.
// Si esta version NO compila, el problema es OTRA cosa distinta.
// =============================================================================

import { useState } from "react";
import { Bell } from "lucide-react";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
        title="Notificaciones"
      >
        <Bell className="w-5 h-5 text-slate-700" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-[300px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 p-6 text-center">
          <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-700">Sin notificaciones</p>
          <p className="text-xs text-slate-500 mt-1">
            Sistema en construccion.
          </p>
        </div>
      )}
    </div>
  );
}
