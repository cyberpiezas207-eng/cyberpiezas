import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Share2, Users, Gift, TrendingUp, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ReferralCode {
  id: number;
  referralCode: string;
  isActive: boolean;
  freeMonthGranted: boolean;
  createdAt: Date;
}

interface ReferralStats {
  total: number;
  successful: number;
  pending: number;
  freeMonthsEarned: number;
}

// Mock data - en producción vendrá de la API
const mockCode: ReferralCode = {
  id: 1,
  referralCode: "DAVID2024",
  isActive: true,
  freeMonthGranted: false,
  createdAt: new Date(),
};

const mockStats: ReferralStats = {
  total: 3,
  successful: 2,
  pending: 1,
  freeMonthsEarned: 2,
};

const mockReferrals = [
  {
    id: 1,
    referredName: "Juan García",
    referredEmail: "juan@example.com",
    planCode: "basic",
    status: "completed",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    id: 2,
    referredName: "María López",
    referredEmail: "maria@example.com",
    planCode: "professional",
    status: "completed",
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
  },
  {
    id: 3,
    referredName: "Carlos Rodríguez",
    referredEmail: "carlos@example.com",
    planCode: "basic",
    status: "pending",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
];

export default function ReferralPanel() {
  const [referralCode] = useState<ReferralCode | null>(mockCode);
  const [stats] = useState<ReferralStats>(mockStats);

  const handleCopyCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode.referralCode);
      toast.success("Código copiado al portapapeles");
    }
  };

  const handleShareCode = () => {
    if (referralCode) {
      const message = `Únete a Cyberpiezas usando mi código de referido: ${referralCode.referralCode}. ¡Ambos obtenemos 1 mes gratis!`;
      const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
    }
  };

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case "basic":
        return "Básico";
      case "professional":
        return "Profesional";
      case "premium":
        return "Premium";
      default:
        return plan;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completado</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Sistema de Referidos</h1>
        <p className="text-slate-600 mt-2">Gana 1 mes gratis por cada amigo que invites</p>
      </div>

      {/* Tu Código de Referido */}
      {referralCode && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              Tu Código de Referido
            </CardTitle>
            <CardDescription>
              Comparte este código con tus amigos para que ambos obtengan 1 mes gratis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 bg-white p-4 rounded-lg border-2 border-primary/20">
              <code className="flex-1 text-2xl font-bold text-primary tracking-widest">
                {referralCode.referralCode}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyCode}
                className="gap-2"
              >
                <Copy className="w-4 h-4" />
                Copiar
              </Button>
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                onClick={handleShareCode}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Compartir por WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total de Referidos</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Exitosos</p>
                <p className="text-2xl font-bold text-green-600">{stats.successful}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-yellow-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Meses Gratis</p>
                <p className="text-2xl font-bold text-primary">{stats.freeMonthsEarned}</p>
              </div>
              <Gift className="w-8 h-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historial de Referidos */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Referidos</CardTitle>
          <CardDescription>
            Lista de amigos que se han registrado usando tu código
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mockReferrals.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-600">Aún no tienes referidos. ¡Comparte tu código!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mockReferrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{referral.referredName}</p>
                    <p className="text-sm text-slate-600">{referral.referredEmail}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Plan: {getPlanLabel(referral.planCode)} •{" "}
                      {referral.createdAt.toLocaleDateString("es-MX")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(referral.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información */}
      <Card className="border-accent/20 bg-accent/5">
        <CardHeader>
          <CardTitle className="text-lg">¿Cómo funciona?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
              1
            </div>
            <div>
              <p className="font-semibold text-slate-900">Comparte tu código</p>
              <p className="text-sm text-slate-600">
                Envía tu código de referido a tus amigos por WhatsApp, email o redes sociales
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
              2
            </div>
            <div>
              <p className="font-semibold text-slate-900">Tu amigo se registra</p>
              <p className="text-sm text-slate-600">
                Cuando tu amigo se registra usando tu código, ambos reciben 1 mes gratis
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
              3
            </div>
            <div>
              <p className="font-semibold text-slate-900">Acumula meses gratis</p>
              <p className="text-sm text-slate-600">
                Cada referido exitoso te da 1 mes gratis adicional en tu suscripción
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
