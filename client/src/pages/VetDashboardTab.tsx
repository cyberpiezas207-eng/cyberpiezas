// =============================================================================
// VetDashboardTab - Dashboard de bienvenida para Veterinaria
// -----------------------------------------------------------------------------
// Se renderiza cuando el usuario entra a /veterinaria-pos (sin sufijo de tab).
// Muestra:
//   - Saludo personalizado al doctor
//   - Card destacada NEGRA: "Ventas del mes"
//   - 2 cards laterales: "Citas proximas (30 dias)" + "Ventas (count)"
//   - Hero sage "Cobrar" -> /veterinaria-pos/caja
//   - Card "Citas de hoy" con lista
//   - Card "Proximas citas" (siguientes 5)
//
// Tema: Sage Garden (verde + naranja tierra + crema).
// Microanimaciones: hover lift, fade-in al cargar.
// =============================================================================

import { useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Stethoscope,
  PawPrint,
  Calendar,
  Plus,
  Clock,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Users,
} from "lucide-react";

export default function VetDashboardTab() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // -------------------------------------------------------------------------
  // QUERIES
  // -------------------------------------------------------------------------

  // Stats del mes (totalRevenue + totalSales)
  const statsQuery = trpc.veterinaria.sales.stats.useQuery();

  // Citas proximas (next 30 days, no canceladas)
  const upcomingQuery = trpc.veterinaria.appointments.upcoming.useQuery();

  // Citas de hoy (filtrar por rango)
  const todayRange = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
  }, []);

  const todayApsQuery = trpc.veterinaria.appointments.list.useQuery({
    from: todayRange.from,
    to: todayRange.to,
  });

  // -------------------------------------------------------------------------
  // DATA EXTRACTION
  // -------------------------------------------------------------------------

  const firstName = useMemo(() => {
    if (!user?.name) return "Doctor";
    return user.name.split(" ")[0];
  }, [user?.name]);

  const todayDateLabel = useMemo(() => {
    const t = new Date();
    return t.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }, []);

  const totalRevenue = useMemo(() => {
    if (!statsQuery.data) return 0;
    const v = parseFloat(statsQuery.data.totalRevenue ?? "0");
    return isNaN(v) ? 0 : v;
  }, [statsQuery.data]);

  const totalSales = statsQuery.data?.totalSales ?? 0;
  const upcomingCount = upcomingQuery.data?.length ?? 0;
  const todayCount = todayApsQuery.data?.length ?? 0;

  // Proximas 5 citas para preview
  const next5Appointments = useMemo(() => {
    if (!upcomingQuery.data) return [];
    return upcomingQuery.data.slice(0, 5);
  }, [upcomingQuery.data]);

  // Citas de hoy ordenadas por hora
  const todayAppointments = useMemo(() => {
    if (!todayApsQuery.data) return [];
    return todayApsQuery.data;
  }, [todayApsQuery.data]);

  // -------------------------------------------------------------------------
  // HELPERS
  // -------------------------------------------------------------------------

  const formatTime = (d: Date | string) => {
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDateShort = (d: Date | string) => {
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
    });
  };

  const totalRevenueLabel = useMemo(() => {
    if (totalRevenue >= 1000) {
      return `$${(totalRevenue / 1000).toFixed(1)}k`;
    }
    return `$${totalRevenue.toFixed(0)}`;
  }, [totalRevenue]);

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  return (
    <div className="vt-dash" data-fade-in>
      <style>{VET_DASHBOARD_STYLES}</style>

      {/* HEADER - saludo */}
      <header className="vt-dash-header">
        <div>
          <h1 className="vt-dash-greeting">
            Hola <em>Dr. {firstName}</em>
          </h1>
          <p className="vt-dash-greeting-sub">{todayDateLabel}</p>
        </div>
      </header>

      {/* STATS ROW */}
      <div className="vt-dash-stats">
        <div className="vt-dash-stat vt-dash-stat-featured">
          <p className="vt-dash-stat-label">Ventas del mes</p>
          <p className="vt-dash-stat-value">{totalRevenueLabel}</p>
          <p className="vt-dash-stat-delta">
            {totalSales} {totalSales === 1 ? "venta" : "ventas"}
          </p>
        </div>
        <div className="vt-dash-stat">
          <p className="vt-dash-stat-label">Citas hoy</p>
          <p className="vt-dash-stat-value">{todayCount}</p>
          <p className="vt-dash-stat-delta">
            {todayCount === 0 ? "Sin citas hoy" : todayCount === 1 ? "Agendada" : "Agendadas"}
          </p>
        </div>
        <div className="vt-dash-stat">
          <p className="vt-dash-stat-label">Proximas 30 dias</p>
          <p className="vt-dash-stat-value">{upcomingCount}</p>
          <p className="vt-dash-stat-delta">
            {upcomingCount === 0 ? "Agenda libre" : "En agenda"}
          </p>
        </div>
      </div>

      {/* HERO ACTION - cobrar */}
      <button
        type="button"
        className="vt-dash-hero"
        onClick={() => setLocation("/veterinaria-pos/caja")}
        aria-label="Ir a la caja registradora"
      >
        <div className="vt-dash-hero-text">
          <h3>Cobrar / Vender</h3>
          <p>Caja registradora con consultas, productos y servicios</p>
        </div>
        <div className="vt-dash-hero-cta">
          <ArrowRight className="vt-dash-hero-arrow" />
          <span>Abrir caja</span>
        </div>
      </button>

      {/* GRID INFERIOR: 2 cards en desktop, 1 columna mobile */}
      <div className="vt-dash-grid">
        {/* CITAS DE HOY */}
        <div className="vt-dash-card">
          <div className="vt-dash-card-head">
            <p className="vt-dash-card-title">
              <Clock size={14} className="vt-dash-card-icon" />
              Citas de hoy
            </p>
            <button
              type="button"
              className="vt-dash-card-action"
              onClick={() => setLocation("/veterinaria-pos/citas")}
            >
              Ver agenda
            </button>
          </div>

          {todayApsQuery.isLoading ? (
            <div className="vt-dash-empty">Cargando...</div>
          ) : todayAppointments.length === 0 ? (
            <div className="vt-dash-empty">
              <PawPrint size={24} className="vt-dash-empty-icon" />
              <p className="vt-dash-empty-text">Sin citas agendadas para hoy</p>
              <button
                className="vt-dash-empty-cta"
                onClick={() => setLocation("/veterinaria-pos/citas")}
              >
                <Plus size={14} /> Agendar primera cita
              </button>
            </div>
          ) : (
            <div className="vt-dash-list">
              {todayAppointments.map((row: any) => {
                const ap = row.appointment;
                const pet = row.pet;
                const customer = row.customer;
                return (
                  <div key={ap.id} className="vt-dash-list-item">
                    <div className="vt-dash-list-time">
                      {formatTime(ap.appointmentAt)}
                    </div>
                    <div className="vt-dash-list-content">
                      <div className="vt-dash-list-pet">
                        {pet?.name ?? "Sin mascota"}
                      </div>
                      <div className="vt-dash-list-customer">
                        {customer?.name ?? "Cliente"}
                      </div>
                    </div>
                    <div className={`vt-dash-list-status status-${ap.status}`}>
                      {ap.status}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PROXIMAS CITAS */}
        <div className="vt-dash-card">
          <div className="vt-dash-card-head">
            <p className="vt-dash-card-title">
              <Calendar size={14} className="vt-dash-card-icon" />
              Proximas citas
            </p>
            <button
              type="button"
              className="vt-dash-card-action"
              onClick={() => setLocation("/veterinaria-pos/citas")}
            >
              Ver todas
            </button>
          </div>

          {upcomingQuery.isLoading ? (
            <div className="vt-dash-empty">Cargando...</div>
          ) : next5Appointments.length === 0 ? (
            <div className="vt-dash-empty">
              <Calendar size={24} className="vt-dash-empty-icon" />
              <p className="vt-dash-empty-text">No hay citas en los proximos 30 dias</p>
            </div>
          ) : (
            <div className="vt-dash-list">
              {next5Appointments.map((row: any) => {
                const ap = row.appointment;
                const pet = row.pet;
                return (
                  <div key={ap.id} className="vt-dash-list-item">
                    <div className="vt-dash-list-time vt-dash-list-time-date">
                      {formatDateShort(ap.appointmentAt)}
                      <span className="vt-dash-list-time-hour">
                        {formatTime(ap.appointmentAt)}
                      </span>
                    </div>
                    <div className="vt-dash-list-content">
                      <div className="vt-dash-list-pet">
                        {pet?.name ?? "Sin mascota"}
                      </div>
                      <div className="vt-dash-list-customer">
                        {ap.notes
                          ? ap.notes.substring(0, 40) + (ap.notes.length > 40 ? "..." : "")
                          : "Sin notas"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="vt-dash-quickactions">
        <button
          className="vt-dash-qa"
          onClick={() => setLocation("/veterinaria-pos/mascotas")}
        >
          <PawPrint size={18} />
          <span>Mascotas</span>
        </button>
        <button
          className="vt-dash-qa"
          onClick={() => setLocation("/veterinaria-pos/clientes")}
        >
          <Users size={18} />
          <span>Clientes</span>
        </button>
        <button
          className="vt-dash-qa"
          onClick={() => setLocation("/veterinaria-pos/citas")}
        >
          <Calendar size={18} />
          <span>Agenda</span>
        </button>
        <button
          className="vt-dash-qa"
          onClick={() => setLocation("/veterinaria-pos/servicios")}
        >
          <Stethoscope size={18} />
          <span>Servicios</span>
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// ESTILOS DEL DASHBOARD (Sage Garden)
// =============================================================================

const VET_DASHBOARD_STYLES = `
.vt-dash {
  display: flex;
  flex-direction: column;
  gap: 14px;
  animation: vtDashFade 0.5s ease;
}
@keyframes vtDashFade {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.vt-dash-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 4px 2px 2px;
}
.vt-dash-greeting {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 28px;
  font-weight: 500;
  color: #2D3B2D;
  margin: 0;
  letter-spacing: -0.01em;
}
.vt-dash-greeting em {
  color: #5A8B5A;
  font-style: normal;
}
.vt-dash-greeting-sub {
  font-size: 13px;
  color: #6B7A6B;
  margin: 3px 0 0;
  text-transform: capitalize;
}

.vt-dash-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
@media (max-width: 768px) {
  .vt-dash-stats {
    grid-template-columns: 1fr 1fr;
  }
  .vt-dash-stat-featured {
    grid-column: span 2;
  }
}
.vt-dash-stat {
  background: #F4F0E8;
  border-radius: 14px;
  padding: 16px 18px;
  transition: all 0.25s ease;
}
.vt-dash-stat:hover {
  transform: translateY(-2px);
}
.vt-dash-stat-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  color: #6B7A6B;
  margin: 0 0 6px;
  font-weight: 500;
}
.vt-dash-stat-value {
  font-size: 30px;
  font-weight: 500;
  color: #2D3B2D;
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  letter-spacing: -0.01em;
  line-height: 1.05;
}
.vt-dash-stat-delta {
  font-size: 12px;
  color: #6B7A6B;
  margin: 6px 0 0;
  font-weight: 500;
}
.vt-dash-stat-featured {
  background: #2D3B2D;
  color: white;
}
.vt-dash-stat-featured .vt-dash-stat-label {
  color: rgba(255,255,255,0.65);
}
.vt-dash-stat-featured .vt-dash-stat-value {
  color: white;
}
.vt-dash-stat-featured .vt-dash-stat-delta {
  color: #E8A87C;
}

.vt-dash-hero {
  background: #5A8B5A;
  border-radius: 16px;
  padding: 18px 22px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.25s ease;
  border: none;
  width: 100%;
  text-align: left;
  color: white;
  font-family: inherit;
}
.vt-dash-hero:hover {
  background: #466F46;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(90,139,90,0.32);
}
.vt-dash-hero:active {
  transform: translateY(0);
}
.vt-dash-hero-text {
  flex: 1;
  min-width: 0;
}
.vt-dash-hero-text h3 {
  margin: 0;
  font-size: 19px;
  font-weight: 500;
  color: white;
  font-family: Georgia, "Times New Roman", serif;
  letter-spacing: -0.01em;
}
.vt-dash-hero-text p {
  margin: 4px 0 0;
  font-size: 13px;
  color: rgba(255,255,255,0.88);
}
.vt-dash-hero-cta {
  background: white;
  color: #466F46;
  padding: 11px 18px;
  border-radius: 10px;
  font-weight: 500;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
  transition: transform 0.2s ease;
}
.vt-dash-hero:hover .vt-dash-hero-cta {
  transform: scale(1.04);
}
.vt-dash-hero-arrow {
  width: 16px;
  height: 16px;
}

.vt-dash-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 768px) {
  .vt-dash-grid {
    grid-template-columns: 1fr;
  }
}
.vt-dash-card {
  background: #FFFFFF;
  border: 0.5px solid rgba(45,59,45,0.08);
  border-radius: 14px;
  padding: 16px 18px;
  min-height: 180px;
  display: flex;
  flex-direction: column;
}
.vt-dash-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 0.5px solid rgba(45,59,45,0.08);
}
.vt-dash-card-title {
  font-size: 13px;
  font-weight: 500;
  color: #2D3B2D;
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
}
.vt-dash-card-icon {
  color: #5A8B5A;
}
.vt-dash-card-action {
  background: none;
  border: none;
  color: #5A8B5A;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s ease;
}
.vt-dash-card-action:hover {
  background: #E8F0E8;
}

.vt-dash-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 20px 10px;
  gap: 10px;
}
.vt-dash-empty-icon {
  color: rgba(90,139,90,0.4);
}
.vt-dash-empty-text {
  font-size: 13px;
  color: #6B7A6B;
  margin: 0;
}
.vt-dash-empty-cta {
  background: #5A8B5A;
  color: white;
  border: none;
  padding: 9px 14px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}
.vt-dash-empty-cta:hover {
  background: #466F46;
  transform: translateY(-1px);
}

.vt-dash-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.vt-dash-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 10px;
  border-radius: 9px;
  background: #F4F0E8;
  transition: all 0.18s ease;
}
.vt-dash-list-item:hover {
  background: #E8F0E8;
}
.vt-dash-list-time {
  font-size: 13px;
  font-weight: 500;
  color: #5A8B5A;
  min-width: 56px;
  font-family: Georgia, "Times New Roman", serif;
}
.vt-dash-list-time-date {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  line-height: 1.15;
}
.vt-dash-list-time-hour {
  font-size: 10px;
  font-weight: 400;
  color: #6B7A6B;
  font-family: inherit;
  margin-top: 2px;
}
.vt-dash-list-content {
  flex: 1;
  min-width: 0;
}
.vt-dash-list-pet {
  font-size: 13px;
  font-weight: 500;
  color: #2D3B2D;
  line-height: 1.2;
}
.vt-dash-list-customer {
  font-size: 11px;
  color: #6B7A6B;
  line-height: 1.2;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vt-dash-list-status {
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(90,139,90,0.12);
  color: #2D5A2D;
}
.vt-dash-list-status.status-confirmada {
  background: rgba(90,139,90,0.18);
  color: #2D5A2D;
}
.vt-dash-list-status.status-pendiente {
  background: rgba(232,168,124,0.2);
  color: #8B5C30;
}
.vt-dash-list-status.status-completada {
  background: rgba(45,59,45,0.1);
  color: #6B7A6B;
}
.vt-dash-list-status.status-cancelada {
  background: rgba(220,80,80,0.12);
  color: #B43E3E;
}

.vt-dash-quickactions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
@media (max-width: 768px) {
  .vt-dash-quickactions {
    grid-template-columns: 1fr 1fr;
  }
}
.vt-dash-qa {
  background: #FFFFFF;
  border: 0.5px solid rgba(45,59,45,0.08);
  border-radius: 11px;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  color: #2D3B2D;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}
.vt-dash-qa:hover {
  background: #E8F0E8;
  color: #2D5A2D;
  border-color: #5A8B5A;
  transform: translateY(-2px);
}
`;
