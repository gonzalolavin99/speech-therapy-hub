import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { toast } from 'sonner';
import { latestPaymentByCharge, type GatewayPayment } from '@/utils/payments';

interface RefundRequest {
  gatewayPaymentId: string;
  amount: number;
  reason?: string;
  idempotencyKey: string;
}

interface RefundResponse {
  refund_id: string;
  status: 'succeeded' | 'pending' | 'failed';
  amount: number;
}

export function useGatewayPayments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { log } = useAuditLog();

  // RLS: solo los pagos del profesional logueado
  const paymentsQuery = useQuery({
    queryKey: ['gateway-payments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gateway_payments')
        .select('id, charge_id, subscription_payment_id, provider_payment_id, state, amount, refunded_amount, currency, created_at, updated_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as GatewayPayment[];
    },
    enabled: !!user,
  });

  const requestRefund = useMutation({
    mutationFn: async ({ gatewayPaymentId, amount, reason, idempotencyKey }: RefundRequest) => {
      const { data, error } = await supabase.functions.invoke<RefundResponse>('payments-refund', {
        headers: { 'Idempotency-Key': idempotencyKey },
        body: { gateway_payment_id: gatewayPaymentId, amount, reason },
      });
      if (error || !data) {
        const context = (error as { context?: Response } | null)?.context;
        const body = context ? await context.json().catch(() => null) : null;
        throw new Error(body?.error || 'No se pudo procesar el reembolso');
      }
      return { ...data, gatewayPaymentId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gateway-payments'] });
      queryClient.invalidateQueries({ queryKey: ['portal-charges'] });
      if (data.status === 'pending') {
        toast.info('Reembolso en proceso', { description: 'MercadoPago aún no confirma. Lo verificaremos automáticamente.' });
      } else {
        toast.success('Reembolso realizado');
      }
      log({ action: 'UPDATE', entityType: 'payment', entityId: data.gatewayPaymentId, details: { refund_id: data.refund_id, amount: data.amount, status: data.status } });
    },
    onError: (error: Error) => {
      toast.error('Error al reembolsar', { description: error.message });
    },
  });

  const payments = paymentsQuery.data ?? [];

  return {
    payments,
    paymentsByCharge: latestPaymentByCharge(payments),
    isLoading: paymentsQuery.isLoading,
    requestRefund,
  };
}
