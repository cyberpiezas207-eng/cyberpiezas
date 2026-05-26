import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  PawPrint,
  Syringe,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  MapPin,
  Heart,
  Lock,
  Sparkles,
} from "lucide-react";

// ============================================================================
// P5 - PUBLIC PET PORTAL (Vet Owner Portal MVP)
// ----------------------------------------------------------------------------
// Pagina publica que se accede vivia cyberpiezas.com/mi-mascota/:token
// Es lo que Sra. Perez (dueno final, cliente de Ana Karen) ve en su celular
// cuando abre el link que Ana Karen le mando por WhatsApp.
//
// Sin login, sin password. El token ES la credencial.
//
// Solo muestra datos NO sensibles: mascotas, vacunas, citas, visitas
// resumidas (sin diagnosticos, sin notas internas, sin costos).
//
// Mobile-first, sage garden, emocional, profesional.
// ============================================================================

export default function PublicPetPortal() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  const portalQuery = trpc.veterinaria.publicView.getByToken.useQuery(
    { token },
    {
      enabled: !!token && token.length >= 20,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  // ============================================================
  // ESTADO: cargando
  // ============================================================
  if (portalQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-stone-50 to-emerald-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-emerald-500/30 animate-pulse">
            <PawPrint className="w-8 h-8 text-white" />
          </div>
          <p className="text-emerald-900 font-semibold mb-1">Cargando portal...</p>
          <p className="text-sm text-emerald-700">Un momento por favor</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // ESTADO: error (token invalido, revocado, expirado, etc.)
  // ============================================================
  if (portalQuery.isError) {
    const errMessage = portalQuery.error?.message || "Hubo un problema al cargar el portal";
    const isNotFound = portalQuery.error?.data?.code === "NOT_FOUND";
    const isExpired = errMessage.toLowerCase().includes("expir");
    const isRevoked = errMessage.toLowerCase().includes("desactivado") || errMessage.toLowerCase().includes("revoca");
    const isRateLimited = portalQuery.error?.data?.code === "TOO_MANY_REQUESTS";

    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-stone-100 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden">
          <div className="bg-gradient-to-br from-amber-100 via-rose-50 to-amber-50 px-6 pt-10 pb-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-white flex items-center justify-center shadow-lg mb-3">
              {isNotFound ? (
                <XCircle className="w-8 h-8 text-rose-500" />
              ) : isRateLimited ? (
                <Clock className="w-8 h-8 text-amber-500" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-1">
              {isNotFound
                ? "Link no encontrado"
                : isExpired
                ? "Link expirado"
                : isRevoked
                ? "Link desactivado"
                : isRateLimited
                ? "Demasiados intentos"
                : "Algo salio mal"}
            </h1>
            <p className="text-sm text-slate-600 max-w-xs mx-auto leading-relaxed">{errMessage}</p>
          </div>

          <div className="px-6 py-6 space-y-3">
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
              <p className="text-sm font-bold text-slate-900 mb-1.5">¿Que puedes hacer?</p>
              <ul className="text-xs text-slate-700 space-y-1.5 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span>Verifica que copiaste el link completo de tu WhatsApp.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  <span>Contacta a tu veterinaria para que te envien un nuevo link.</span>
                </li>
                {isRateLimited && (
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>Espera 1 minuto e intenta de nuevo.</span>
                  </li>
                )}
              </ul>
            </div>

            <div className="text-center pt-2">
              <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                <Lock className="w-3 h-3" />
                Portal privado y seguro
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // ESTADO: OK - mostrar portal
  // ============================================================
  const data = portalQuery.data;
  if (!data) {
    return null;
  }

  const { clinic, customer, pets, vaccinations, appointments, visits } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-stone-50 to-emerald-50 pb-24">
      {/* ========== HEADER CLINICA ========== */}
      <header className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 text-white shadow-xl">
        <div className="max-w-2xl mx-auto px-5 py-7">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
              <PawPrint className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-100">
                Portal de mascotas
              </p>
              <h1 className="text-xl font-bold tracking-tight truncate">
                {clinic?.clinicName || "Clinica Veterinaria"}
              </h1>
            </div>
          </div>
          {clinic?.doctorName && (
            <p className="text-xs text-emerald-100 mt-1 ml-15">Atiende: {clinic.doctorName}</p>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-5 py-6 space-y-5">
        {/* ========== SALUDO ========== */}
        <section className="bg-white rounded-3xl shadow-md border border-stone-200 px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="text-3xl">👋</div>
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-0.5">Hola</p>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {customer?.name || "Bienvenido"}
              </h2>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                Estas son tus mascotas registradas en{" "}
                <span className="font-bold text-emerald-700">{clinic?.clinicName || "la clinica"}</span>.
              </p>
            </div>
          </div>
        </section>

        {/* ========== MASCOTAS ========== */}
        <section>
          <div className="flex items-baseline justify-between mb-3 px-1">
            <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2">
              <PawPrint className="w-4 h-4" />
              Tus mascotas
            </h3>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              {pets.length}
            </span>
          </div>

          {pets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 px-5 py-10 text-center">
              <div className="text-4xl mb-2 opacity-50">🐾</div>
              <p className="text-sm text-slate-500">Aun no hay mascotas registradas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pets.map((pet: any) => (
                <PetCard key={pet.id} pet={pet} />
              ))}
            </div>
          )}
        </section>

        {/* ========== PROXIMAS CITAS ========== */}
        {appointments.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2 mb-3 px-1">
              <Calendar className="w-4 h-4" />
              Proximas citas
            </h3>
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm divide-y divide-stone-100 overflow-hidden">
              {appointments.map((apt: any) => (
                <AppointmentRow key={apt.id} appointment={apt} pets={pets} />
              ))}
            </div>
          </section>
        )}

        {/* ========== VACUNAS ========== */}
        {vaccinations.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2 mb-3 px-1">
              <Syringe className="w-4 h-4" />
              Cartilla de vacunacion
            </h3>
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm divide-y divide-stone-100 overflow-hidden">
              {vaccinations.map((vac: any) => (
                <VaccinationRow key={vac.id} vaccination={vac} pets={pets} />
              ))}
            </div>
          </section>
        )}

        {/* ========== VISITAS RECIENTES ========== */}
        {visits.length > 0 && (
          <section>
            <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2 mb-3 px-1">
              <Clock className="w-4 h-4" />
              Ultimas visitas
            </h3>
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm divide-y divide-stone-100 overflow-hidden">
              {visits.map((visit: any) => (
                <VisitRow key={visit.id} visit={visit} pets={pets} />
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2 px-1 italic">
              Las consultas detalladas se discuten directamente con tu veterinaria.
            </p>
          </section>
        )}

        {/* ========== INFO CLINICA ========== */}
        {clinic && (clinic.phone || clinic.email || clinic.address) && (
          <section>
            <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2 mb-3 px-1">
              <Heart className="w-4 h-4" />
              Tu clinica
            </h3>
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 space-y-2.5">
                {clinic.phone && (
                  <div className="flex items-center gap-3 text-sm text-slate-700">
                    <Phone className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="font-medium">{clinic.phone}</span>
                  </div>
                )}
                {clinic.email && (
                  <div className="flex items-center gap-3 text-sm text-slate-700">
                    <Mail className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="font-medium truncate">{clinic.email}</span>
                  </div>
                )}
                {clinic.address && (
                  <div className="flex items-start gap-3 text-sm text-slate-700">
                    <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span className="font-medium leading-snug">{clinic.address}</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ========== FOOTER ========== */}
        <footer className="pt-4 pb-2 text-center">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3" />
            Portal privado y seguro · Tu link es unico
          </p>
        </footer>
      </main>

      {/* ========== BOTON WHATSAPP FIJO ========== */}
      {clinic?.phone && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-gradient-to-t from-stone-100 via-stone-100/95 to-transparent pt-6 pb-4 px-4 pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <a
              href={buildWhatsAppUrl(clinic.phone, customer?.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold h-14 rounded-2xl shadow-2xl shadow-green-500/40 active:scale-[0.98] transition-all"
            >
              <span className="text-xl">💬</span>
              Escribir por WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTES
// ============================================================================

function PetCard({ pet }: { pet: any }) {
  const speciesEmoji: Record<string, string> = {
    perro: "🐶",
    gato: "🐱",
    conejo: "🐰",
    ave: "🦜",
    reptil: "🦎",
    otro: "🐾",
  };
  const emoji = speciesEmoji[String(pet.species ?? "").toLowerCase()] || "🐾";
  const age = calculateAge(pet.birthDate);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden hover:shadow-md hover:border-emerald-300 transition-all">
      <div className="px-4 py-4 flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-cyan-100 border border-emerald-200 flex items-center justify-center text-3xl flex-shrink-0">
          {pet.photoUrl ? (
            <img
              src={pet.photoUrl}
              alt={pet.name}
              className="w-full h-full rounded-2xl object-cover"
            />
          ) : (
            emoji
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-bold text-slate-900 truncate">{pet.name}</h4>
          <p className="text-xs text-slate-500 truncate">
            {capitalize(pet.species)}
            {pet.breed ? " · " + pet.breed : ""}
          </p>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600">
            {age && <span className="font-semibold">{age}</span>}
            {pet.sex && (
              <span className="bg-stone-100 px-1.5 py-0.5 rounded text-[10px] font-medium">
                {pet.sex === "macho" ? "♂ Macho" : pet.sex === "hembra" ? "♀ Hembra" : capitalize(pet.sex)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AppointmentRow({ appointment, pets }: { appointment: any; pets: any[] }) {
  const pet = pets.find((p: any) => p.id === appointment.petId);
  const date = new Date(appointment.appointmentAt);
  const daysFromNow = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const relativeText =
    daysFromNow === 0
      ? "Hoy"
      : daysFromNow === 1
      ? "Manana"
      : daysFromNow > 0
      ? "En " + daysFromNow + " dias"
      : "Hace " + Math.abs(daysFromNow) + " dias";

  return (
    <div className="px-4 py-3 flex items-center gap-3 hover:bg-stone-50/50 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0">
        <Calendar className="w-5 h-5 text-emerald-700" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900 truncate">
          {appointment.reason || "Consulta"}
        </p>
        <p className="text-xs text-slate-500 truncate">
          {pet ? pet.name + " · " : ""}
          {date.toLocaleDateString("es-MX", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
          {" · "}
          {date.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" })}
        </p>
      </div>
      <span
        className={
          "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full flex-shrink-0 " +
          (daysFromNow <= 0
            ? "bg-rose-100 text-rose-700"
            : daysFromNow <= 3
            ? "bg-amber-100 text-amber-700"
            : "bg-emerald-100 text-emerald-700")
        }
      >
        {relativeText}
      </span>
    </div>
  );
}

function VaccinationRow({ vaccination, pets }: { vaccination: any; pets: any[] }) {
  const pet = pets.find((p: any) => p.id === vaccination.petId);
  const appliedDate = vaccination.appliedDate ? new Date(vaccination.appliedDate) : null;
  const nextDate = vaccination.nextDoseDate ? new Date(vaccination.nextDoseDate) : null;
  const now = Date.now();

  // Estado de vigencia
  let statusLabel = "Aplicada";
  let statusBg = "bg-emerald-100 text-emerald-700";
  let statusIcon = <CheckCircle2 className="w-3 h-3" />;
  let relativeText = "";

  if (nextDate) {
    const daysToNext = Math.ceil((nextDate.getTime() - now) / (1000 * 60 * 60 * 24));
    if (daysToNext < 0) {
      statusLabel = "Vencida";
      statusBg = "bg-rose-100 text-rose-700";
      statusIcon = <XCircle className="w-3 h-3" />;
      relativeText = "Vencio hace " + Math.abs(daysToNext) + " dias";
    } else if (daysToNext <= 30) {
      statusLabel = "Proxima";
      statusBg = "bg-amber-100 text-amber-700";
      statusIcon = <AlertTriangle className="w-3 h-3" />;
      relativeText = daysToNext === 0 ? "Hoy" : "En " + daysToNext + " dias";
    } else {
      statusLabel = "Vigente";
      statusBg = "bg-emerald-100 text-emerald-700";
      statusIcon = <CheckCircle2 className="w-3 h-3" />;
      relativeText = "Proxima dosis en " + Math.ceil(daysToNext / 30) + " meses";
    }
  }

  return (
    <div className="px-4 py-3 flex items-center gap-3 hover:bg-stone-50/50 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center flex-shrink-0">
        <Syringe className="w-5 h-5 text-purple-700" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900 truncate">{vaccination.vaccineName}</p>
        <p className="text-xs text-slate-500 truncate">
          {pet ? pet.name + " · " : ""}
          {appliedDate
            ? "Aplicada " +
              appliedDate.toLocaleDateString("es-MX", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : ""}
        </p>
        {relativeText && (
          <p className="text-[11px] text-slate-500 mt-0.5 italic">{relativeText}</p>
        )}
      </div>
      <span
        className={
          "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full flex-shrink-0 flex items-center gap-1 " +
          statusBg
        }
      >
        {statusIcon}
        {statusLabel}
      </span>
    </div>
  );
}

function VisitRow({ visit, pets }: { visit: any; pets: any[] }) {
  const pet = pets.find((p: any) => p.id === visit.petId);
  const date = visit.visitDate ? new Date(visit.visitDate) : null;

  return (
    <div className="px-4 py-3 flex items-center gap-3 hover:bg-stone-50/50 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-4 h-4 text-stone-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900 truncate">
          {visit.reason || "Consulta"}
        </p>
        <p className="text-xs text-slate-500 truncate">
          {pet ? pet.name + " · " : ""}
          {date
            ? date.toLocaleDateString("es-MX", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : ""}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function calculateAge(birthDate: any): string | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years === 0) {
    return months === 0 ? "Recien nacido" : months + " " + (months === 1 ? "mes" : "meses");
  }
  if (years === 1) return "1 ano";
  return years + " anos";
}

function capitalize(s: any): string {
  if (!s || typeof s !== "string") return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function buildWhatsAppUrl(phone: string, customerName?: string): string {
  // Limpiar telefono (solo digitos)
  const cleanPhone = phone.replace(/\D/g, "");
  // Si no tiene codigo pais y son 10 digitos (MX), agregar 52
  const finalPhone = cleanPhone.length === 10 ? "52" + cleanPhone : cleanPhone;
  const greeting = customerName ? "Hola, soy " + customerName + ". " : "Hola, ";
  const text = greeting + "Quiero consultar sobre mi mascota.";
  return "https://wa.me/" + finalPhone + "?text=" + encodeURIComponent(text);
}
