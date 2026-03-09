import { useState } from "react";
import type { PortalCharge, PortalBankInfo } from "@/hooks/usePatientPortal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  Copy,
  Loader2,
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  charges: PortalCharge[];
  bankInfo: PortalBankInfo | null;
  onConfirmPayment: (chargeId: string, reference?: string) => void;
  isConfirming: boolean;
}

export function PortalCharges({ charges, bankInfo, onConfirmPayment, isConfirming }: Props) {
  const [selectedCharge, setSelectedCharge] = useState<PortalCharge | null>(null);
  const [reference, setReference] = useState("");

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(amount);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
    pending: { label: 'Pendiente', icon: Clock, className: 'bg-warning/10 text-warning' },
    paid: { label: 'Pago informado', icon: Banknote, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    confirmed: { label: 'Confirmado', icon: CheckCircle, className: 'bg-success/10 text-success' },
    cancelled: { label: 'Anulado', icon: XCircle, className: 'bg-muted text-muted-foreground' },
  };

  const pending = charges.filter(c => c.status === 'pending');
  const others = charges.filter(c => c.status !== 'pending');
  const totalPending = pending.reduce((sum, c) => sum + c.amount, 0);

  const handleConfirm = () => {
    if (selectedCharge) {
      onConfirmPayment(selectedCharge.id, reference || undefined);
      setSelectedCharge(null);
      setReference("");
    }
  };

  if (charges.length === 0) {
    return (
      <div className="text-center py-12">
        <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No hay cobros registrados</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Los cobros de tu profesional aparecerán aquí
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen */}
      {pending.length > 0 && (
        <div className="bg-warning/5 border border-warning/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total por pagar</p>
              <p className="text-2xl font-bold text-warning">{formatCurrency(totalPending)}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-warning" />
            </div>
          </div>
        </div>
      )}

      {/* Datos bancarios */}
      {bankInfo && pending.length > 0 && (
        <div className="bg-card rounded-xl border p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            Datos para transferencia
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              { label: 'Banco', value: bankInfo.bank_name },
              { label: 'Tipo de cuenta', value: bankInfo.account_type },
              { label: 'N° de cuenta', value: bankInfo.account_number },
              { label: 'RUT', value: bankInfo.holder_rut },
              { label: 'Nombre', value: bankInfo.holder_name },
              { label: 'Email', value: bankInfo.email },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="font-medium text-foreground">{item.value}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => copyToClipboard(item.value)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cobros pendientes */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Pendientes de pago</h3>
          <div className="space-y-2">
            {pending.map((charge) => (
              <div key={charge.id} className="bg-card rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground">{charge.description}</p>
                    <p className="text-lg font-bold text-warning mt-1">{formatCurrency(charge.amount)}</p>
                    {charge.due_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Vence: {formatDate(charge.due_date)}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setSelectedCharge(charge)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Informar pago
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial de cobros */}
      {others.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Historial</h3>
          <div className="space-y-2">
            {others.map((charge) => {
              const sc = statusConfig[charge.status] || statusConfig.pending;
              const Icon = sc.icon;
              return (
                <div key={charge.id} className="bg-card rounded-lg border p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{charge.description}</p>
                    <p className="text-sm font-semibold text-card-foreground">{formatCurrency(charge.amount)}</p>
                  </div>
                  <span className={cn("flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full", sc.className)}>
                    <Icon className="h-3 w-3" />
                    {sc.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialog para confirmar pago */}
      <Dialog open={!!selectedCharge} onOpenChange={(open) => !open && setSelectedCharge(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Informar pago</DialogTitle>
            <DialogDescription>
              Confirma que realizaste la transferencia por{" "}
              <span className="font-semibold">{selectedCharge ? formatCurrency(selectedCharge.amount) : ''}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reference">N° de comprobante (opcional)</Label>
              <Input
                id="reference"
                placeholder="Ej: 123456789"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Ingresa el número de comprobante de tu transferencia para facilitar la verificación
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCharge(null)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={isConfirming}>
              {isConfirming && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
