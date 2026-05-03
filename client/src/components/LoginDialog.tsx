import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocation } from "wouter";

interface LoginDialogProps {
  title?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

/** Diálogo que invita al usuario a iniciar sesión. */
export function LoginDialog({
  title,
  open = false,
  onOpenChange,
  onClose,
}: LoginDialogProps) {
  const [internalOpen, setInternalOpen] = useState(open);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!onOpenChange) setInternalOpen(open);
  }, [open, onOpenChange]);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange ? onOpenChange(nextOpen) : setInternalOpen(nextOpen);
    if (!nextOpen) onClose?.();
  };

  return (
    <Dialog
      open={onOpenChange ? open : internalOpen}
      onOpenChange={handleOpenChange}
    >
      <DialogContent className="py-5 bg-card rounded-[20px] w-[400px] shadow-lg border border-border p-0 gap-0 text-center">
        <div className="flex flex-col items-center gap-2 p-5 pt-12">
          {title && (
            <DialogTitle className="text-xl font-semibold text-foreground leading-[26px]">
              {title}
            </DialogTitle>
          )}
          <DialogDescription className="text-sm text-muted-foreground">
            Inicia sesión para continuar
          </DialogDescription>
        </div>

        <DialogFooter className="px-5 py-5">
          <Button
            onClick={() => {
              handleOpenChange(false);
              navigate("/login");
            }}
            className="w-full h-10"
          >
            Iniciar sesión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
