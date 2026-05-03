import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  BellRing,
  Check,
  CheckCheck,
  Inbox,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";

const LIVE_REFETCH_MS = 3000;

export default function NotificationsCenter() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<
    "all" | "sale" | "low_stock" | "payment_received" | "subscription_change"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: notifications, isLoading } = trpc.notifications.getAll.useQuery(
    {
      limit: 100,
      unreadOnly: filter === "unread",
    },
    {
      refetchInterval: LIVE_REFETCH_MS,
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: true,
    },
  );

  const utils = trpc.useUtils();

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.getAll.invalidate();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.getAll.invalidate();
    },
  });

  const deleteNotificationMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      utils.notifications.getAll.invalidate();
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
        return "border-l-sky-500";
      case "low_stock":
        return "border-l-amber-500";
      case "payment_received":
        return "border-l-emerald-500";
      case "subscription_change":
        return "border-l-violet-500";
      default:
        return "border-l-slate-400";
    }
  };

  const filteredNotifications = notifications?.filter((notification) => {
    const matchesSearch =
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" ? true : notification.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const unreadCount = notifications?.filter((notification) => !notification.isRead).length ?? 0;
  const totalCount = notifications?.length ?? 0;
  const visibleCount = filteredNotifications?.length ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-border bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Bandeja central
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Centro de notificaciones
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
                Consulta alertas operativas, cobros, movimientos y cambios de suscripción desde una sola vista con filtros rápidos y lectura organizada.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background/80 p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Totales</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{totalCount}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/80 p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sin leer</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{unreadCount}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/80 p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Visibles</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{visibleCount}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
          <Card className="flex-1 border-border/80 shadow-sm">
            <CardHeader>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <CardTitle className="text-primary">Filtros y búsqueda</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Localiza notificaciones por texto, estado o tipo sin salir de esta bandeja.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Actualización automática cada 3 segundos y al volver al foco.
                  </p>
                </div>
                {filteredNotifications?.some((notification) => !notification.isRead) && (
                  <Button
                    onClick={() => markAllAsReadMutation.mutate()}
                    variant="outline"
                    className="gap-2"
                    disabled={markAllAsReadMutation.isPending}
                  >
                    <CheckCheck className="h-4 w-4" />
                    {markAllAsReadMutation.isPending ? "Marcando..." : "Marcar todas como leídas"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px] xl:grid-cols-[minmax(0,1fr)_220px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título o mensaje..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="sale">Ventas</SelectItem>
                    <SelectItem value="low_stock">Stock bajo</SelectItem>
                    <SelectItem value="payment_received">Pagos</SelectItem>
                    <SelectItem value="subscription_change">Suscripciones</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={filter} onValueChange={(value) => setFilter(value as "all" | "unread")}> 
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="unread">No leídas</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-4 space-y-3">
            {isLoading ? (
              <Card className="border-border/80 shadow-sm">
                <CardContent className="flex min-h-48 items-center justify-center text-center text-muted-foreground">
                  Cargando notificaciones...
                </CardContent>
              </Card>
            ) : !filteredNotifications || filteredNotifications.length === 0 ? (
              <Card className="border-border/80 shadow-sm">
                <CardContent className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
                  <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
                    <Inbox className="h-7 w-7" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">No hay notificaciones para este filtro</h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                    Ajusta la búsqueda o cambia el filtro de tipo para volver a mostrar actividad. Cuando existan nuevas alertas operativas, aparecerán aquí automáticamente.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={cn(
                    "border-l-4 border-border/80 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                    getNotificationColor(notification.type),
                    !notification.isRead && "bg-primary/5 ring-1 ring-primary/20",
                  )}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">{notification.title}</h3>
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              {notification.type.replaceAll("_", " ")}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <Badge variant="default" className="ml-auto lg:ml-0">
                              Nuevo
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">{notification.message}</p>
                        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                          <BellRing className="h-3.5 w-3.5" />
                          {new Date(notification.createdAt).toLocaleString("es-MX")}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end lg:self-start">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2"
                            onClick={() => markAsReadMutation.mutate({ id: notification.id })}
                            disabled={markAsReadMutation.isPending}
                          >
                            <Check className="h-4 w-4" />
                            Leer
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-destructive hover:text-destructive"
                          onClick={() => deleteNotificationMutation.mutate({ id: notification.id })}
                          disabled={deleteNotificationMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
