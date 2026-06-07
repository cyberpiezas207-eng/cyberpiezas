// >>> ESTE ARCHIVO ES NUEVO. CREALO EN: client/src/pages/InboxAgenda.tsx <<<
// ============================================================================
// AGENDA DE LA ESPOSA - calendario dentro de su pagina del buzon
// ----------------------------------------------------------------------------
// Mini-calendario mensual donde ella ve y agrega sus dias importantes (cuando
// le pagan, citas, pendientes). Arriba, un aviso visual de lo que viene hoy y
// manana. Todo con su token (sin login).
//
// Se monta dentro de PublicInbox como <InboxAgenda token={token} />.
// Usa los endpoints publicos: personalInboxPublic.agendaList / agendaUpcoming /
// agendaCreate / agendaUpdate / agendaSetDone / agendaDelete.
//
// Mobile-first, calido, simple. Comentarios SIN ACENTOS.
// ============================================================================

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  CalendarDays,
  Bell,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  Trash2,
  X,
  Banknote,
  ClipboardList,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Helpers de fecha (todo en string YYYY-MM-DD para no pelear con zonas)
// ----------------------------------------------------------------------------

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayYMD(): string {
  return ymd(nowMexico());
}

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const DIAS = ["D", "L", "M", "M", "J", "V", "S"];

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);

// Etiqueta humana para una fecha relativa a hoy.
function relativeLabel(dateStr: string): string {
  const today = todayYMD();
  const t = new Date(today + "T12:00:00");
  const d = new Date(dateStr + "T12:00:00");
  const diff = Math.round((d.getTime() - t.getTime()) / 86_400_000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Manana";
  if (diff === -1) return "Ayer";
  if (diff > 1) return `En ${diff} dias`;
  return `Hace ${Math.abs(diff)} dias`;
}

const KIND_UI: Record<string, { label: string; icon: any; dot: string }> = {
  income: { label: "Ingreso", icon: Banknote, dot: "#10b981" },
  reminder: { label: "Recordatorio", icon: Bell, dot: "#f59e0b" },
  task: { label: "Pendiente", icon: ClipboardList, dot: "#6366f1" },
};

// ----------------------------------------------------------------------------
// Componente
// ----------------------------------------------------------------------------

export default function InboxAgenda({ token }: { token: string }) {
  const utils = trpc.useUtils();
  const today = nowMexico();

  // Mes que se esta viendo
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1); // 1-12
  const [selectedDate, setSelectedDate] = useState<string>(todayYMD());

  // Form de alta
  const [showForm, setShowForm] = useState(false);
  const [fTitle, setFTitle] = useState("");
  const [fKind, setFKind] = useState<"income" | "reminder" | "task">(
    "reminder",
  );
  const [fAmount, setFAmount] = useState("");

  // Rango del mes visible
  const first = `${viewYear}-${String(viewMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(viewYear, viewMonth, 0).getDate();
  const last = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const listQuery = trpc.personalInboxPublic.agendaList.useQuery(
    { token, from: first, to: last },
    { enabled: !!token, refetchOnWindowFocus: false },
  );
  const upcomingQuery = trpc.personalInboxPublic.agendaUpcoming.useQuery(
    { token, days: 1 },
    { enabled: !!token, refetchOnWindowFocus: false },
  );

  function refresh() {
    utils.personalInboxPublic.agendaList.invalidate();
    utils.personalInboxPublic.agendaUpcoming.invalidate();
  }

  const createM = trpc.personalInboxPublic.agendaCreate.useMutation({
    onSuccess: () => {
      setFTitle("");
      setFAmount("");
      setShowForm(false);
      refresh();
    },
  });
  const doneM = trpc.personalInboxPublic.agendaSetDone.useMutation({
    onSuccess: refresh,
  });
  const deleteM = trpc.personalInboxPublic.agendaDelete.useMutation({
    onSuccess: refresh,
  });

  const events = (listQuery.data ?? []) as any[];
  const upcoming = (upcomingQuery.data ?? []) as any[];

  // Mapa fecha -> eventos (para pintar puntos en el calendario)
  const byDate = new Map<string, any[]>();
  for (const e of events) {
    const k = e.eventDate;
    if (!byDate.has(k)) byDate.set(k, []);
    byDate.get(k)!.push(e);
  }

  const selectedEvents = byDate.get(selectedDate) ?? [];

  // Construir la grilla del mes (con huecos antes del dia 1)
  const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay(); // 0=Dom
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) {
    cells.push(
      `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    );
  }

  function prevMonth() {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }
  function nextMonth() {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function handleCreate() {
    const t = fTitle.trim();
    if (!t) return;
    const amt =
      fKind === "income" && fAmount
        ? Number(fAmount.replace(/[^0-9.]/g, ""))
        : null;
    createM.mutate({
      token,
      title: t,
      eventDate: selectedDate,
      kind: fKind,
      amount: amt && Number.isFinite(amt) && amt > 0 ? amt : null,
    });
  }

  const todayStr = todayYMD();

  return (
    <section className="bg-white rounded-3xl shadow-md border border-stone-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-500 to-fuchsia-500 px-5 py-4 flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-white" />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-100">
            Mi calendario
          </p>
          <h2 className="text-base font-bold text-white">Mis dias y pendientes</h2>
        </div>
      </div>

      {/* Aviso visual: lo de hoy y manana */}
      {upcoming.length > 0 && (
        <div className="mx-4 mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-3.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Bell className="w-4 h-4 text-amber-600" />
            <p className="text-xs font-bold text-amber-900">No se te olvide</p>
          </div>
          <div className="space-y-1.5">
            {upcoming.map((e: any) => (
              <div key={e.id} className="flex items-center gap-2 text-sm">
                <span className="text-[11px] font-bold text-amber-700 bg-amber-100 rounded px-1.5 py-0.5 shrink-0">
                  {relativeLabel(e.eventDate)}
                </span>
                <span className="text-amber-900 font-medium truncate">
                  {e.title}
                </span>
                {e.amount != null && e.amount > 0 && (
                  <span className="text-emerald-700 font-bold ml-auto shrink-0">
                    {fmtMoney(e.amount)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navegacion del mes */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={prevMonth}
          className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-slate-600"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <p className="text-sm font-bold text-slate-900">
          {MESES[viewMonth - 1]} {viewYear}
        </p>
        <button
          onClick={nextMonth}
          className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-slate-600"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendario */}
      <div className="px-3 pb-3">
        {/* Encabezado de dias */}
        <div className="grid grid-cols-7 mb-1">
          {DIAS.map((d, i) => (
            <div
              key={i}
              className="text-center text-[10px] font-bold text-slate-400 py-1"
            >
              {d}
            </div>
          ))}
        </div>
        {/* Celdas */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (cell == null) return <div key={`e${i}`} />;
            const dayNum = Number(cell.slice(8, 10));
            const isToday = cell === todayStr;
            const isSelected = cell === selectedDate;
            const dayEvents = byDate.get(cell) ?? [];
            return (
              <button
                key={cell}
                onClick={() => {
                  setSelectedDate(cell);
                  setShowForm(false);
                }}
                className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all ${
                  isSelected
                    ? "bg-violet-500 text-white font-bold"
                    : isToday
                      ? "bg-violet-100 text-violet-700 font-bold"
                      : "hover:bg-stone-100 text-slate-700"
                }`}
              >
                <span>{dayNum}</span>
                {dayEvents.length > 0 && (
                  <span className="absolute bottom-1 flex gap-0.5">
                    {dayEvents.slice(0, 3).map((e: any, j: number) => (
                      <span
                        key={j}
                        className="w-1 h-1 rounded-full"
                        style={{
                          backgroundColor: isSelected
                            ? "#ffffff"
                            : (KIND_UI[e.kind]?.dot ?? "#6366f1"),
                        }}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Eventos del dia seleccionado */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-slate-900">
            {relativeLabel(selectedDate)} · {selectedDate.slice(8, 10)}{" "}
            {MESES[Number(selectedDate.slice(5, 7)) - 1]}
          </p>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-1 text-[12px] font-bold text-violet-700 bg-violet-100 hover:bg-violet-200 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showForm ? "Cancelar" : "Agregar"}
          </button>
        </div>

        {/* Form de alta */}
        {showForm && (
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 mb-3 space-y-2">
            <input
              type="text"
              value={fTitle}
              onChange={(e) => setFTitle(e.target.value)}
              placeholder="Que vas a hacer ese dia"
              maxLength={160}
              className="w-full h-11 px-3 rounded-xl border border-stone-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <div className="grid grid-cols-3 gap-1.5">
              {(["reminder", "income", "task"] as const).map((k) => {
                const ui = KIND_UI[k];
                const active = fKind === k;
                return (
                  <button
                    key={k}
                    onClick={() => setFKind(k)}
                    className={`flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-bold border transition-all ${
                      active
                        ? "bg-violet-500 text-white border-violet-500"
                        : "bg-white text-slate-600 border-stone-300"
                    }`}
                  >
                    <ui.icon className="w-3.5 h-3.5" />
                    {ui.label}
                  </button>
                );
              })}
            </div>
            {fKind === "income" && (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={fAmount}
                  onChange={(e) => setFAmount(e.target.value)}
                  placeholder="Cuanto te pagan (opcional)"
                  className="w-full h-11 pl-7 pr-3 rounded-xl border border-stone-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            )}
            <button
              onClick={handleCreate}
              disabled={createM.isPending || !fTitle.trim()}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold disabled:opacity-50 active:scale-[0.98] transition-all"
            >
              {createM.isPending ? "Guardando..." : "Guardar en mi dia"}
            </button>
          </div>
        )}

        {/* Lista de eventos del dia */}
        {selectedEvents.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">
            Nada agendado este dia.
          </p>
        ) : (
          <div className="space-y-2">
            {selectedEvents.map((e: any) => {
              const ui = KIND_UI[e.kind] ?? KIND_UI.reminder;
              return (
                <div
                  key={e.id}
                  className={`flex items-center gap-2.5 rounded-2xl border p-3 ${
                    e.done
                      ? "bg-stone-50 border-stone-200 opacity-60"
                      : "bg-white border-stone-200"
                  }`}
                >
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: (ui.dot ?? "#6366f1") + "22" }}
                  >
                    <ui.icon
                      className="w-4 h-4"
                      style={{ color: ui.dot ?? "#6366f1" }}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-bold text-slate-900 truncate ${e.done ? "line-through" : ""}`}
                    >
                      {e.title}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span>{ui.label}</span>
                      {e.amount != null && e.amount > 0 && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-emerald-600 font-bold">
                            {fmtMoney(e.amount)}
                          </span>
                        </>
                      )}
                      {e.createdBy && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span>{e.createdBy}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      doneM.mutate({ token, id: e.id, done: !e.done })
                    }
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      e.done
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-stone-100 text-slate-400 hover:text-emerald-600"
                    }`}
                    aria-label="Marcar hecho"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Borrar "${e.title}"?`))
                        deleteM.mutate({ token, id: e.id });
                    }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-slate-300 hover:text-rose-500 transition-colors"
                    aria-label="Borrar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
