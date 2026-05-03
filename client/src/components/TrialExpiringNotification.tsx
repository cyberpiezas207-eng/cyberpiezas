import { useEffect, useState } from "react";
import { AlertCircle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface TrialExpiringNotificationProps {
  trialStartDate?: string | Date;
  trialDays?: number;
}

export function TrialExpiringNotification({
  trialStartDate = new Date(),
  trialDays = 30,
}: TrialExpiringNotificationProps) {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (!trialStartDate) return;

    const startDate = new Date(trialStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + trialDays);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const remaining = Math.ceil(
      (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    setDaysRemaining(remaining);

    // Mostrar notificación si quedan 7 días o menos
    if (remaining >= 0 && remaining <= 7) {
      setShowNotification(true);
    }

    // Mostrar notificación si ya venció
    if (remaining < 0) {
      setShowNotification(true);
    }
  }, [trialStartDate, trialDays]);

  if (!showNotification || daysRemaining === null) {
    return null;
  }

  if (daysRemaining < 0) {
    return (
      <Alert className="border-red-200 bg-red-50 mb-4">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>Tu prueba gratis ha vencido.</strong> Realiza una transferencia para continuar usando el sistema.
          <Button size="sm" variant="outline" className="ml-2 text-red-600 border-red-600 hover:bg-red-50">
            Ver datos bancarios
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (daysRemaining === 0) {
    return (
      <Alert className="border-orange-200 bg-orange-50 mb-4">
        <Clock className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>¡Hoy vence tu prueba gratis!</strong> Realiza tu transferencia ahora para no perder acceso.
          <Button size="sm" variant="outline" className="ml-2 text-orange-600 border-orange-600 hover:bg-orange-50">
            Pagar ahora
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-yellow-200 bg-yellow-50 mb-4">
      <Clock className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="text-yellow-800">
        <strong>Tu prueba gratis vence en {daysRemaining} día{daysRemaining !== 1 ? "s" : ""}.</strong> Prepárate para realizar tu transferencia.
        <Button size="sm" variant="outline" className="ml-2 text-yellow-600 border-yellow-600 hover:bg-yellow-50">
          Ver planes
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export default TrialExpiringNotification;
