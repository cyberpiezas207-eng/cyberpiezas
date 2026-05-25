@@ -3,6 +3,7 @@ import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import AccessDeniedScreen from "@/components/AccessDeniedScreen";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
@@ -233,68 +234,25 @@ export function VerduleriaPOS() {
  }

  // Sin acceso activo: pantalla amigable con CTAs a planes
  // V1.6 refactor: usa componente compartido AccessDeniedScreen.
  // mode="embedded" porque va envuelto en DashboardLayout (que tiene su
  // propio fondo y sidebar). El AccessDeniedScreen no debe importar
  // DashboardLayout, asi que se mantiene fuera.
  if (access && !access.hasAccess) {
    return (
      <DashboardLayout>
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header con gradiente verde tipico de Verduleria */}
            <div className="bg-gradient-to-br from-emerald-500 via-green-600 to-teal-600 px-8 pt-12 pb-14 text-center relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-300/30 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-green-400/20 rounded-full blur-3xl" />
              <div className="relative">
                <div className="text-7xl mb-3">🥕</div>
                <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">Verduleria</h1>
                <p className="text-emerald-50 text-sm font-medium">Punto de venta visual</p>
              </div>
            </div>

            {/* Body */}
            <div className="px-8 py-8 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-slate-900">
                  Necesitas una suscripcion activa
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Para usar este punto de venta necesitas estar suscrito a Verduleria.
                  Cobra ventas, controla tu inventario y revisa tus ingresos diarios.
                </p>
              </div>

              {/* Highlights del plan */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-emerald-900">
                  <span className="text-base">✓</span>
                  <span>Catalogo ilimitado por categorias</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-emerald-900">
                  <span className="text-base">✓</span>
                  <span>Ventas rapidas y reportes diarios</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-emerald-900">
                  <span className="text-base">✓</span>
                  <span>$300/mes o $3,000/ano</span>
                </div>
              </div>

              {/* CTAs */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => setLocation("/pricing?posCode=verduleria")}
                  className="w-full h-12 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-all"
                >
                  Ver planes
                </button>
                <button
                  onClick={() => setLocation("/sistemas")}
                  className="w-full h-12 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-all"
                >
                  Volver a mi panel
                </button>
              </div>
            </div>
          </div>
        </div>
        <AccessDeniedScreen
          posCode="verduleria"
          description="Para usar este punto de venta necesitas estar suscrito a Verduleria. Cobra ventas, controla tu inventario y revisa tus ingresos diarios."
          benefits={[
            "Catalogo ilimitado por categorias",
            "Ventas rapidas y reportes diarios",
            "$300/mes o $3,000/ano",
          ]}
          onViewPlans={() => setLocation("/pricing?posCode=verduleria")}
          onBack={() => setLocation("/sistemas")}
          mode="embedded"
        />
      </DashboardLayout>
    );
  }
