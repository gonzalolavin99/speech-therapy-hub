import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Package,
  Plus,
  Minus,
  XCircle,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionPack } from "@/hooks/useSessionPacks";

interface SessionPacksListProps {
  packs: SessionPack[];
  onUseSession: (packId: string) => void;
  onCancel: (packId: string) => void;
  onDelete: (packId: string) => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
  }).format(amount);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const statusConfig = {
  active: {
    label: "Activo",
    icon: CheckCircle,
    className: "bg-success/10 text-success border-success/20",
  },
  completed: {
    label: "Completado",
    icon: CheckCircle,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200",
  },
  cancelled: {
    label: "Cancelado",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  expired: {
    label: "Expirado",
    icon: AlertTriangle,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200",
  },
};

const paymentStatusConfig = {
  pending: { label: "Pendiente", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  partial: { label: "Pago parcial", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  paid: { label: "Pagado", className: "bg-success/10 text-success" },
};

export function SessionPacksList({
  packs,
  onUseSession,
  onCancel,
  onDelete,
}: SessionPacksListProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "use" | "cancel" | "delete";
    packId: string;
    packName: string;
  }>({ open: false, type: "use", packId: "", packName: "" });

  const handleConfirm = () => {
    switch (confirmDialog.type) {
      case "use":
        onUseSession(confirmDialog.packId);
        break;
      case "cancel":
        onCancel(confirmDialog.packId);
        break;
      case "delete":
        onDelete(confirmDialog.packId);
        break;
    }
    setConfirmDialog({ open: false, type: "use", packId: "", packName: "" });
  };

  if (packs.length === 0) {
    return (
      <div className="bg-card rounded-xl border p-12 text-center">
        <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">
          No hay packs de sesiones
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Crea un pack para ofrecer descuentos por volumen a tus pacientes
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {packs.map((pack) => {
          const remaining = pack.total_sessions - pack.used_sessions;
          const progress = (pack.used_sessions / pack.total_sessions) * 100;
          const status = statusConfig[pack.status];
          const StatusIcon = status.icon;
          const payStatus = paymentStatusConfig[pack.payment_status];
          const isActive = pack.status === "active";

          return (
            <div
              key={pack.id}
              className={cn(
                "bg-card rounded-xl border p-5 space-y-4 transition-all",
                isActive && "hover:shadow-md",
                !isActive && "opacity-70"
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-card-foreground truncate">
                    {pack.name}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span className="truncate">{pack.patient_name}</span>
                  </div>
                </div>
                <Badge variant="outline" className={cn("text-[10px] shrink-0 ml-2", status.className)}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
              </div>

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progreso</span>
                  <span className="font-semibold">
                    {pack.used_sessions}/{pack.total_sessions} sesiones
                  </span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      progress >= 100
                        ? "bg-blue-500"
                        : progress >= 75
                        ? "bg-amber-500"
                        : "bg-primary"
                    )}
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
                {isActive && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {remaining} sesion{remaining !== 1 ? "es" : ""} restante{remaining !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              {/* Pricing */}
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-semibold ml-1">{formatCurrency(pack.price_total)}</span>
                </div>
                {pack.discount_percent > 0 && (
                  <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    -{Math.round(pack.discount_percent)}% dcto
                  </Badge>
                )}
              </div>

              {/* Payment status & dates */}
              <div className="flex items-center justify-between text-xs">
                <Badge variant="secondary" className={cn("text-[10px]", payStatus.className)}>
                  {payStatus.label}
                </Badge>
                {pack.expires_at && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Vence: {formatDate(pack.expires_at)}
                  </span>
                )}
              </div>

              {/* Actions */}
              {isActive && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      setConfirmDialog({
                        open: true,
                        type: "use",
                        packId: pack.id,
                        packName: pack.name,
                      })
                    }
                    disabled={remaining <= 0}
                  >
                    <Minus className="h-3.5 w-3.5 mr-1" />
                    Usar Sesion
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      setConfirmDialog({
                        open: true,
                        type: "cancel",
                        packId: pack.id,
                        packName: pack.name,
                      })
                    }
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {(pack.status === "cancelled" || pack.status === "completed") && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 text-destructive hover:text-destructive text-xs"
                    onClick={() =>
                      setConfirmDialog({
                        open: true,
                        type: "delete",
                        packId: pack.id,
                        packName: pack.name,
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Eliminar
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.type === "use" && "Registrar sesion"}
              {confirmDialog.type === "cancel" && "Cancelar pack"}
              {confirmDialog.type === "delete" && "Eliminar pack"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.type === "use" &&
                `Se descontara 1 sesion del pack "${confirmDialog.packName}". Esta accion no se puede deshacer.`}
              {confirmDialog.type === "cancel" &&
                `Se cancelara el pack "${confirmDialog.packName}". Las sesiones restantes no podran ser usadas.`}
              {confirmDialog.type === "delete" &&
                `Se eliminara permanentemente el pack "${confirmDialog.packName}".`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog((prev) => ({ ...prev, open: false }))
              }
            >
              Cancelar
            </Button>
            <Button
              variant={confirmDialog.type === "use" ? "default" : "destructive"}
              onClick={handleConfirm}
            >
              {confirmDialog.type === "use" && "Registrar"}
              {confirmDialog.type === "cancel" && "Cancelar Pack"}
              {confirmDialog.type === "delete" && "Eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
