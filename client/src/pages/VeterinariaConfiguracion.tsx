import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Settings2,
  Stethoscope,
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function VeterinariaConfiguracion() {
  const { user } = useAuth();

  // Estado local del formulario - en una version futura esto vendria de BD
  const [clinicName, setClinicName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [openingHours, setOpeningHours] = useState("Lun-Vie 9am-7pm, Sab 9am-2pm");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!clinicName || !phone) {
      toast.error("Nombre y telefono son obligatorios");
      return;
    }
    setIsSaving(true);
    // TODO: cuando exista el endpoint trpc.veterinaria.config.update lo conectamos
    await new Promise((r) => setTimeout(r, 800));
    toast.success("Configuracion guardada (sera persistente cuando conectemos el endpoint)");
    setIsSaving(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Settings2 className="w-7 h-7 text-emerald-500" />
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Configuracion clinica
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Datos generales de tu veterinaria - aparecen en recibos y agendas
          </p>
        </div>

        {/* Aviso de version */}
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="pt-5 pb-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-foreground mb-1">
                Configuracion local (version inicial)
              </p>
              <p className="text-xs text-muted-foreground">
                Estos datos por ahora se guardan localmente. En la siguiente version 
                conectaremos persistencia en BD para que aparezcan en recibos automaticamente.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Datos de la clinica */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Stethoscope className="w-5 h-5 text-emerald-500" />
              Datos de la clinica
            </CardTitle>
            <CardDescription>
              Informacion que aparece en facturas, recibos y citas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="flex items-center gap-1.5 mb-1.5">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                Nombre de la clinica *
              </Label>
              <Input
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="Ej: Veterinaria San Francisco"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1.5 mb-1.5">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  Telefono principal *
                </Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+52 777 123 4567"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1.5 mb-1.5">
                  <Phone className="w-3.5 h-3.5 text-rose-500" />
                  Telefono de emergencia
                </Label>
                <Input
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="Para clientes en urgencias"
                />
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-1.5 mb-1.5">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                Email de contacto
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contacto@miveterinaria.com"
              />
            </div>

            <div>
              <Label className="flex items-center gap-1.5 mb-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                Direccion
              </Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Calle Principal 123, Cuernavaca, Morelos"
              />
            </div>

            <div>
              <Label className="flex items-center gap-1.5 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                Horarios de atencion
              </Label>
              <Input
                value={openingHours}
                onChange={(e) => setOpeningHours(e.target.value)}
                placeholder="Lun-Vie 9am-7pm, Sab 9am-2pm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Datos del titular (read-only) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Titular de la cuenta</CardTitle>
            <CardDescription>
              Datos del administrador principal - no editables aqui
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <span className="font-bold text-emerald-600">
                  {user?.name?.charAt(0).toUpperCase() ?? "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{user?.name ?? "Sin nombre"}</p>
                <p className="text-sm text-muted-foreground truncate">{user?.email ?? "Sin correo"}</p>
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                Admin
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Acciones */}
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold h-11 px-6"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar configuracion
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
