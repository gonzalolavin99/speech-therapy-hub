// Helpers de UI para pagos de MercadoPago (estado en gateway_payments)

export type GatewayPaymentState =
  | 'pending'
  | 'processing'
  | 'requires_action'
  | 'under_review'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'disputed'
  | 'refunded'
  | 'partially_refunded'
  | 'charged_back'
  | 'unknown';

export interface GatewayPayment {
  id: string;
  charge_id: string | null;
  subscription_payment_id: string | null;
  provider_payment_id: string;
  state: GatewayPaymentState;
  amount: number;
  refunded_amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export const PAYMENT_STATE_LABELS: Record<GatewayPaymentState, string> = {
  pending: 'Pendiente',
  processing: 'En proceso',
  requires_action: 'Requiere acción',
  under_review: 'En revisión',
  succeeded: 'Pagado',
  failed: 'Rechazado',
  cancelled: 'Cancelado',
  disputed: 'En disputa',
  refunded: 'Reembolsado',
  partially_refunded: 'Reembolso parcial',
  charged_back: 'Contracargo',
  unknown: 'Desconocido',
};

export function isRefundable(payment: GatewayPayment | null | undefined): boolean {
  return !!payment && ['succeeded', 'partially_refunded'].includes(payment.state) && refundableAmount(payment) > 0;
}

export function refundableAmount(payment: GatewayPayment | null | undefined): number {
  if (!payment) return 0;
  return Math.max(Number(payment.amount) - Number(payment.refunded_amount), 0);
}

// Valida el monto ingresado en el diálogo de reembolso (CLP, enteros)
export function validateRefundAmount(value: string, maxAmount: number): { valid: boolean; amount?: number; error?: string } {
  const amount = Number(value);
  if (!value.trim() || !Number.isInteger(amount) || amount <= 0) {
    return { valid: false, error: 'Ingresa un monto entero mayor a 0' };
  }
  if (amount > maxAmount) {
    return { valid: false, error: `El máximo a reembolsar es ${maxAmount.toLocaleString('es-CL')}` };
  }
  return { valid: true, amount };
}

// Clave de idempotencia para una operación lógica (se reutiliza en reintentos)
export function newIdempotencyKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

// Último pago relevante de un cobro: el exitoso si existe, si no el más reciente
export function latestPaymentByCharge(payments: GatewayPayment[]): Map<string, GatewayPayment> {
  const byCharge = new Map<string, GatewayPayment>();
  const rank = (p: GatewayPayment) => (['succeeded', 'partially_refunded', 'refunded', 'disputed', 'charged_back'].includes(p.state) ? 1 : 0);
  for (const payment of payments) {
    if (!payment.charge_id) continue;
    const current = byCharge.get(payment.charge_id);
    if (
      !current ||
      rank(payment) > rank(current) ||
      (rank(payment) === rank(current) && payment.updated_at > current.updated_at)
    ) {
      byCharge.set(payment.charge_id, payment);
    }
  }
  return byCharge;
}
