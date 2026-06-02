// ============================================================================
// MONTH INSIGHT LINE
// ----------------------------------------------------------------------------
// Componente compacto que muestra narrativa contextual del mes actual.
// Una sola linea horizontal con:
//   - Dia X · Mes (texto)
//   - Dias restantes del mes
//   - Estado general del mes (basado en datos opcionales)
//
// Ejemplo:
//   "Día 2 de junio · 28 días para cerrar el mes · vas al 7%"
//
// Pure component. Sin queries. Solo recibe stats opcionales como props.
// Comentarios SIN ACENTOS por convencion del proyecto.
// ============================================================================

import { Calendar, TrendingUp } from "lucide-react";

const MONTH_NAMES_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function nowMexico(): Date {
  return new Date(Date.now() - 6 * 60 * 60 * 1000);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export default function MonthInsightLine() {
  const now = nowMexico();
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthName = MONTH_NAMES_ES[month - 1];
  const totalDays = daysInMonth(year, month);
  const daysRemaining = totalDays - day + 1;
  const progressPct = Math.round((day / totalDays) * 100);

  // Narrativa contextual segun el momento del mes
  let phase: string;
  if (progressPct <= 25) phase = "arrancando";
  else if (progressPct <= 50) phase = "en marcha";
  else if (progressPct <= 75) phase = "ya bien avanzado";
  else phase = "cerrando";

  return (
    <div className="inline-flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
      <span className="inline-flex items-center gap-1">
        <Calendar className="w-3 h-3 text-indigo-400/70" />
        Dia {day} de {monthName}
      </span>
      <span className="text-slate-600">·</span>
      <span>
        {daysRemaining} dia{daysRemaining === 1 ? "" : "s"} para cerrar el mes
      </span>
      <span className="text-slate-600">·</span>
      <span className="inline-flex items-center gap-1">
        <TrendingUp className="w-3 h-3 text-cyan-400/70" />
        Tu mes va {phase} ({progressPct}%)
      </span>
    </div>
  );
}
