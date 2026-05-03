import { Bell, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LIVE_REFETCH_MS = 3000;

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const liveQueryOptions = {
    refetchInterval: LIVE_REFETCH_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  } as const;

  const { data: notifications, isLoading } = trpc.notifications.getAll.useQuery(
    { limit: 10, unreadOnly: false },
    liveQueryOptions,
  );

  const { data: unreadCount } = trpc.notifications.getUnreadCount.useQuery(
    undefined,
    liveQueryOptions,
  );

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.getUnreadCount.invalidate();
      utils.notifications.getAll.invalidate();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.getUnreadCount.invalidate();
      utils.notifications.getAll.invalidate();
    },
  });

  const deleteNotificationMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      utils.notifications.getAll.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "sale":
        return "🛍️";
      case "low_stock":
        return "📦";
      case "payment_received":
        return "💳";
      case "subscription_change":
        return "📋";
      default:
        return "ℹ️";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "sale":
        return "bg-blue-50 border-blue-200";
      case "low_stock":
        return "bg-yellow-50 border-yellow-200";
      case "payment_received":
        return "bg-green-50 border-green-200";
      case "subscription_change":
        return "bg-purple-50 border-purple-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5" />
          {unreadCount && unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h3 className="font-semibold text-sm">Notificaciones</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">Actualización automática cada 3 segundos</p>
          </div>
          {unreadCount && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              className="text-xs"
            >
              Marcar todas como leídas
            </Button>
          )}
        </div>

        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Cargando...
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No hay notificaciones
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 border-l-4 cursor-pointer hover:bg-gray-50 transition-colors",
                    getNotificationColor(notification.type),
                    !notification.isRead && "border-l-primary bg-primary/5"
                  )}
                  onClick={() => {
                    if (!notification.isRead) {
                      markAsReadMutation.mutate({ id: notification.id });
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <p className="font-medium text-sm truncate">
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.createdAt).toLocaleString(
                          "es-MX"
                        )}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotificationMutation.mutate({
                          id: notification.id,
                        });
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              setIsOpen(false);
              navigate("/notifications");
            }}
          >
            Ver todas las notificaciones
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
