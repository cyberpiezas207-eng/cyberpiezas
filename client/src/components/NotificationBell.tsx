// =============================================================================
// NotificationBell - FIX para coincidir con el import de DashboardLayout
// =============================================================================
// PROBLEMA: DashboardLayout.tsx hace:
//   import { NotificationBell } from "./NotificationBell";   <- con llaves
// 
// SOLUCION: Esta version usa NAMED EXPORT en lugar de default export
// =============================================================================

import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Bell,
  CheckCheck,
  Trash2,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  CreditCard,
  Settings,
} from "lucide-react";

const typeStyles: Record<string, { icon: any; bg: string; text: string; toastVariant: "success" | "info" | "warning" | "error" }> = {
  sale: { icon: ShoppingCart, bg: "bg-emerald-100", text: "text-emerald-600", toastVariant: "success" },
  low_stock: { icon: AlertTriangle, bg: "bg-amber-100", text: "text-amber-600", toastVariant: "warning" },
  payment_received: { icon: DollarSign, bg: "bg-emerald-100", text: "text-emerald-600", toastVariant: "success" },
  subscription_change: { icon: CreditCard, bg: "bg-blue-100", text: "text-blue-600", toastVariant: "info" },
  system: { icon: Settings, bg: "bg-blue-100", text: "text-blue-600", toastVariant: "info" },
};

function formatTimeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "ahora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + "m";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + "h";
  const days = Math.floor(hours / 24);
  if (days < 7) return days + "d";
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

// NAMED EXPORT (con "export" sin "default")
export function NotificationBell() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastNotifIdRef = useRef<number | null>(null);
  const utils = trpc.useUtils();

  const listQuery = trpc.notifications.list.useQuery(
    { limit: 20, onlyUnread: false },
    { refetchInterval: 30000 },
  );
  const countQuery = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      toast.success("Marcadas como leidas");
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const deleteNotif = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const notifications = listQuery.data ?? [];
  const unreadCount = countQuery.data ?? 0;

  useEffect(() => {
    if (notifications.length === 0) return;
    const newest = notifications[0];
    if (lastNotifIdRef.current !== null && newest.id > lastNotifIdRef.current && !newest.isRead) {
      const style = typeStyles[newest.type] || typeStyles.system;
      const TypeIcon = style.icon;
      const showToast = ({
        success: toast.success,
        warning: toast.warning,
        info: toast.info,
        error: toast.error,
      } as any)[style.toastVariant] || toast;
      showToast(newest.title, {
        description: newest.message,
        icon: <TypeIcon className="w-5 h-5" />,
        duration: 5000,
      });
    }
    lastNotifIdRef.current = newest.id;
  }, [notifications]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleNotifClick = (n: any) => {
    if (!n.isRead) markRead.mutate({ id: n.id });
    let targetUrl: string | null = null;
    switch (n.type) {
      case "sale":
      case "low_stock":
        targetUrl = "/dashboard";
        break;
      case "payment_received":
      case "subscription_change":
        targetUrl = "/sistemas";
        break;
      default:
        targetUrl = null;
    }
    if (targetUrl) {
      setLocation(targetUrl);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
        title="Notificaciones"
      >
        <Bell className="w-5 h-5 text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div>
              <p className="font-bold text-slate-900">Notificaciones</p>
              <p className="text-xs text-slate-500">
                {unreadCount > 0 ? unreadCount + " sin leer" : "Estas al dia"}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-[480px] overflow-y-auto">
            {listQuery.isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block w-7 h-7 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin"></div>
                <p className="text-xs text-slate-500 mt-3">Cargando...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12 px-6">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                  <Bell className="w-7 h-7 text-slate-400" />
                </div>
                <p className="font-bold text-slate-700 text-sm">No hay notificaciones</p>
                <p className="text-xs text-slate-500 mt-1">Te avisaremos cuando algo importante pase.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((n: any) => {
                  const style = typeStyles[n.type] || typeStyles.system;
                  const TypeIcon = style.icon;
                  return (
                    <li
                      key={n.id}
                      className={
                        "px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors relative group " +
                        (!n.isRead ? "bg-blue-50/40" : "")
                      }
                      onClick={() => handleNotifClick(n)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={"w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 " + style.bg}>
                          <TypeIcon className={"w-4 h-4 " + style.text} />
                        </div>
                        <div className="flex-1 min-w-0 pr-4">
                          <p className={"text-sm " + (!n.isRead ? "font-bold text-slate-900" : "font-medium text-slate-700")}>
                            {n.title}
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1.5 font-medium uppercase tracking-wider">
                            {formatTimeAgo(n.createdAt)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotif.mutate({ id: n.id });
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-200 absolute right-3 top-3"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                        {!n.isRead && (
                          <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full group-hover:opacity-0 transition-opacity" />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-500 text-center">
                Mostrando las {notifications.length} mas recientes
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
