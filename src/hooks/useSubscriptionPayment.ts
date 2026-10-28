import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { PlanId } from '@/config/subscriptions';

export interface SubscriptionPayment {
  id: string;
  user_id: string;
  plan: PlanId;
  billing_period: 'monthly' | 'yearly';
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'in_process' | 'refunded';
  mp_preference_id: string | null;
  mp_payment_id: string | null;
  mp_status: string | null;
  mp_external_reference: string | null;
  mp_init_point: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  updated_at: string;
}

export function useSubscriptionPayment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get payment history
  const paymentsQuery = useQuery({
    queryKey: ['subscription-payments', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('subscription_payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as SubscriptionPayment[];
    },
    enabled: !!user,
  });

  // Create checkout and redirect to MercadoPago
  const checkout = useMutation({
    mutationFn: async ({ plan, billingPeriod }: { plan: PlanId; billingPeriod: 'monthly' | 'yearly' }) => {
      // Use supabase.functions.invoke() which handles auth headers automatically.
      // Misma clave para el mismo plan y período: un doble clic no crea dos pagos.
      const { data, error } = await supabase.functions.invoke('subscription-checkout', {
        headers: { 'Idempotency-Key': `sub-${plan}-${billingPeriod}` },
        body: {
          plan,
          billing_period: billingPeriod,
          success_url: `${window.location.origin}/planes?payment=success`,
          failure_url: `${window.location.origin}/planes?payment=failure`,
        },
      });

      if (error) {
        throw new Error(error.message || 'Error al crear checkout');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data as {
        init_point: string;
        preference_id: string;
        payment_id: string;
        amount: number;
        plan: string;
        billing_period: string;
      };
    },
    onSuccess: (data) => {
      // Redirect to MercadoPago
      window.location.href = data.init_point;
    },
    onError: (error: Error) => {
      toast.error('Error al procesar pago', {
        description: error.message,
      });
    },
  });

  return {
    payments: paymentsQuery.data || [],
    isLoadingPayments: paymentsQuery.isLoading,
    checkout,
    isCheckingOut: checkout.isPending,
    invalidatePayments: () => queryClient.invalidateQueries({ queryKey: ['subscription-payments'] }),
  };
}
