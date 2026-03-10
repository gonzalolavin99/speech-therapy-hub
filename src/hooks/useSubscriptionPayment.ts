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
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      // Get the user's session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No hay sesión activa');

      const response = await fetch(`${supabaseUrl}/functions/v1/subscription-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          plan,
          billing_period: billingPeriod,
          success_url: `${window.location.origin}/planes?payment=success`,
          failure_url: `${window.location.origin}/planes?payment=failure`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al crear checkout');
      }

      return response.json() as Promise<{
        init_point: string;
        preference_id: string;
        payment_id: string;
        amount: number;
        plan: string;
        billing_period: string;
      }>;
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
