import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Download, Upload, RefreshCw, Cloud, Wifi, WifiOff } from 'lucide-react';
import { downloadOfflineDatabase, uploadOfflineDatabase, exportToCSV } from '@/lib/offlineDataExport';
import { getSyncStatus, initOfflineDB } from '@/lib/offlineSync';
import { getCurrentConnectivityStatus, getDesktopPlatform, isDesktopEnvironment, subscribeToConnectivityChanges } from '@/lib/desktopBridge';
import { toast } from 'sonner';

export function OfflineSyncSettings() {
  const [isOnline, setIsOnline] = useState(getCurrentConnectivityStatus());
  const [syncStatus, setSyncStatus] = useState({
    unsyncedProducts: 0,
    unsyncedVariants: 0,
    unsyncedSales: 0,
    unsyncedDetails: 0,
    totalUnsynced: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [fileInput, setFileInput] = useState<HTMLInputElement | null>(null);

  useEffect(() => {
    setIsOnline(getCurrentConnectivityStatus());
    return subscribeToConnectivityChanges(setIsOnline);
  }, []);

  useEffect(() => {
    const updateSyncStatus = async () => {
      const status = await getSyncStatus();
      setSyncStatus(status);
    };

    updateSyncStatus();
    const interval = setInterval(updateSyncStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const result = await downloadOfflineDatabase();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInput?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const result = await uploadOfflineDatabase(file);
      if (result.success) {
        toast.success(result.message);
        const status = await getSyncStatus();
        setSyncStatus(status);
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Estado de Conectividad */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="h-5 w-5 text-green-600" />
                Conectado
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5 text-red-600" />
                Sin conexión
              </>
            )}
          </CardTitle>
          <CardDescription>
            {isOnline
              ? 'Tienes conexión a internet. Los datos se sincronizarán automáticamente.'
              : 'Sin conexión a internet. Puedes seguir operando. Los datos se sincronizarán cuando regreses en línea.'}
            {isDesktopEnvironment()
              ? ` Estás usando la app de escritorio en ${getDesktopPlatform()}.`
              : ' Estás usando la versión web del sistema.'}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Estado de Sincronización */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Estado de Sincronización
          </CardTitle>
          <CardDescription>Datos pendientes de sincronizar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">{syncStatus.unsyncedProducts}</div>
              <div className="text-sm text-slate-600">Productos</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">{syncStatus.unsyncedVariants}</div>
              <div className="text-sm text-slate-600">Variantes</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">{syncStatus.unsyncedSales}</div>
              <div className="text-sm text-slate-600">Ventas</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">{syncStatus.totalUnsynced}</div>
              <div className="text-sm text-slate-600">Total</div>
            </div>
          </div>

          {syncStatus.totalUnsynced > 0 && isOnline && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Tienes {syncStatus.totalUnsynced} registros pendientes de sincronizar. La sincronización ocurrirá automáticamente.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Opciones de Backup y Restauración */}
      <Card>
        <CardHeader>
          <CardTitle>Backup y Restauración</CardTitle>
          <CardDescription>Descarga o restaura tus datos completos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Button
              onClick={handleDownload}
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              {isLoading ? 'Descargando...' : 'Descargar Backup'}
            </Button>

            <Button
              onClick={handleUploadClick}
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              <Upload className="mr-2 h-4 w-4" />
              {isLoading ? 'Importando...' : 'Restaurar desde Backup'}
            </Button>

            <input
              ref={setFileInput}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Los backups contienen todos tus datos (productos, variantes, ventas, categorías). Descárgalos regularmente para proteger tu información.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alcance actual de la sincronización</CardTitle>
          <CardDescription>Estado real de la primera iteración desktop/offline</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              En esta iteración, las ventas generadas sin internet sí se guardan localmente y se sincronizan automáticamente cuando vuelve la conexión. El catálogo y los ajustes finos de inventario todavía requieren una siguiente fase para sincronización automática completa.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Información de Sincronización Offline */}
      <Card>
        <CardHeader>
          <CardTitle>Cómo funciona la sincronización offline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Operación sin internet:</h4>
            <p className="text-slate-600">
              Cuando no tienes conexión, todos tus datos se guardan localmente en tu navegador. Puedes crear ventas, agregar productos y realizar todas las operaciones normalmente.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Sincronización automática:</h4>
            <p className="text-slate-600">
              Cuando regresas en línea, los datos se sincronizan automáticamente con el servidor. No necesitas hacer nada especial.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Backup regular:</h4>
            <p className="text-slate-600">
              Descarga backups regularmente para proteger tus datos. Puedes restaurarlos en cualquier momento si es necesario.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Conflictos de datos:</h4>
            <p className="text-slate-600">
              Si el mismo dato se modifica en múltiples dispositivos, la versión más reciente prevalece. Los cambios locales se preservan durante la sincronización.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
