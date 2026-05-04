import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { playScanSuccess } from "@/lib/scannerSound";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X, ScanLine } from "lucide-react";

interface BarcodeCameraScannerProps {
  open: boolean;
  onClose: () => void;
  onDetected: (barcode: string) => void;
}

export function BarcodeCameraScanner({ open, onClose, onDetected }: BarcodeCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!open) {
      if (readerRef.current) {
        BrowserMultiFormatReader.releaseAllStreams();
        readerRef.current = null;
      }
      setError(null);
      setScanning(false);
      return;
    }

    const startScanner = async () => {
      try {
        setScanning(true);
        setError(null);

        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (devices.length === 0) {
          setError("No se encontró ninguna cámara en este dispositivo.");
          setScanning(false);
          return;
        }

        // Preferir cámara trasera
        const backCamera = devices.find(
          (d) =>
            d.label.toLowerCase().includes("back") ||
            d.label.toLowerCase().includes("trasera") ||
            d.label.toLowerCase().includes("environment") ||
            d.label.toLowerCase().includes("rear")
        );
        const deviceId = backCamera?.deviceId ?? devices[devices.length - 1].deviceId;

        if (!videoRef.current) return;

        await reader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
          if (result) {
            const code = result.getText();
            BrowserMultiFormatReader.releaseAllStreams();
            readerRef.current = null;
            playScanSuccess();
            onDetected(code);
            onClose();
          } else if (err) {
            // NotFoundException es normal mientras no hay código en el encuadre — solo logueamos otros errores
            const msg = err instanceof Error ? err.message : String(err);
            if (!msg.toLowerCase().includes("notfound") && !msg.toLowerCase().includes("no multiformat")) {
              console.warn("Scanner error:", err);
            }
          }
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        if (message.toLowerCase().includes("permission") || message.toLowerCase().includes("denied")) {
          setError("Permiso de cámara denegado. Ve a Configuración del navegador y permite el acceso.");
        } else if (message.toLowerCase().includes("notfound") || message.toLowerCase().includes("no device")) {
          setError("No se encontró ninguna cámara disponible.");
        } else {
          setError(`No se pudo iniciar el escáner: ${message}`);
        }
        setScanning(false);
      }
    };

    startScanner();

    return () => {
      BrowserMultiFormatReader.releaseAllStreams();
      readerRef.current = null;
    };
  }, [open, onClose, onDetected]);

  const handleClose = () => {
    BrowserMultiFormatReader.releaseAllStreams();
    readerRef.current = null;
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Camera className="h-5 w-5 text-purple-400" />
            Escanear código de barras
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {error ? (
            <div className="w-full rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-center text-sm text-red-400">
              {error}
            </div>
          ) : (
            <div className="relative w-full overflow-hidden rounded-xl bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-xl"
                style={{ maxHeight: 280, objectFit: "cover" }}
              />
              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-48 h-32">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-purple-400 rounded-tl" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-purple-400 rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-purple-400 rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-purple-400 rounded-br" />
                    <div className="absolute left-2 right-2 h-0.5 bg-purple-400/70 animate-bounce" style={{ top: "50%" }} />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <ScanLine className="h-4 w-4 text-purple-400" />
            {scanning && !error ? "Apunta la cámara al código de barras" : "Listo para escanear"}
          </div>

          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 gap-2"
          >
            <X className="h-4 w-4" />
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
