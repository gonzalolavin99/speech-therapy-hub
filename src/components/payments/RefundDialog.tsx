import { useEffect, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  newIdempotencyKey,
  refundableAmount,
  validateRefundAmount,
  type GatewayPayment,
} from "@/utils/payments";

interface RefundDialogProps {
  payment: GatewayPayment | null;
  description?: string;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { amount: number; reason?: string; idempotencyKey: string }) => void;
}

const formatCLP = (value: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);

export function RefundDialog({ payment, description, isSubmitting, onOpenChange, onSubmit }: RefundDialogProps) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  // Una clave por reembolso: si el usuario reintenta o hace doble clic, se reutiliza
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const maxAmount = refundableAmount(payment);

  useEffect(() => {
    if (payment) {
      setAmount(String(refundableAmount(payment)));
      setReason("");
      setIdempotencyKey(newIdempotencyKey("refund"));
    }
  }, [payment]);

  const validation = validateRefundAmount(amount, maxAmount);

  const handleSubmit = () => {
    if (!validation.valid || isSubmitting) return;
    onSubmit({ amount: validation.amount, reason: reason.trim() || undefined, idempotencyKey });
  };

  return (
    <Dialog open={!!payment} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reembolsar pago</DialogTitle>
          <DialogDescription>
            {description ? `${description}. ` : ""}
            El dinero se devuelve al medio de pago del paciente a través de MercadoPago.
          </DialogDescription>
        </DialogHeader>

        {payment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Pagado</p>
                <p className="font-medium text-foreground">{formatCLP(Number(payment.amount))}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Disponible para reembolsar</p>
                <p className="font-medium text-foreground">{formatCLP(maxAmount)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund-amount">Monto a reembolsar (CLP)</Label>
              <Input
                id="refund-amount"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                aria-invalid={!validation.valid}
              />
              {!validation.valid && <p className="text-xs text-destructive">{validation.error}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund-reason">Motivo (opcional)</Label>
              <Textarea
                id="refund-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={!validation.valid || isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
            Reembolsar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
