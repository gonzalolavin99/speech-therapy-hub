import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type {
  PlanId,
  PlanLimits,
  Subscription,
  SubscriptionWithLimits,
  FeatureId,
} from '@/config/subscriptions';
import { isTrialExpired, getTrialDaysRemaining, planHasFeature } from '@/config/subscriptions';

export function useSubscription() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async (): Promise<SubscriptionWithLimits | null> => {
      if (!user) return null;

      const { data, error } = await supabase.rpc('get_my_subscription');

      if (error) throw error;
      if (!data) return null;

      return data as SubscriptionWithLimits;
    },
    enabled: !!user,
  });

  const subscription = query.data?.subscription ?? null;
  const limits = query.data?.limits ?? null;

  // If trial expired, treat as free plan for enforcement
  const effectivePlan: PlanId = (() => {
    if (!subscription) return 'free';
    if (subscription.plan === 'trial' && isTrialExpired(subscription)) return 'free';
    if (subscription.status === 'suspended' || subscription.status === 'canceled') return 'free';
    return subscription.plan;
  })();

  const trialDaysRemaining = getTrialDaysRemaining(subscription);
  const trialExpired = isTrialExpired(subscription);

  const hasFeature = (feature: FeatureId): boolean => {
    if (!limits) return false;
    // If trial expired, check free limits instead
    if (effectivePlan === 'free' && subscription?.plan === 'trial') {
      return false; // Free has very limited features; be safe
    }
    return planHasFeature(limits, feature);
  };

  const canCreate = (resource: 'patients' | 'sessions' | 'plannings' | 'ai_requests', currentCount: number): {
    allowed: boolean;
    current: number;
    max: number;
    message: string | null;
  } => {
    if (!limits) return { allowed: true, current: currentCount, max: -1, message: null };

    const limitMap: Record<string, number> = {
      patients: limits.max_patients,
      sessions: limits.max_sessions_per_month,
      plannings: limits.max_plannings,
      ai_requests: limits.max_ai_requests_per_month,
    };

    const max = limitMap[resource] ?? -1;
    const allowed = max === -1 || currentCount < max;

    const labelMap: Record<string, string> = {
      patients: 'pacientes',
      sessions: 'sesiones este mes',
      plannings: 'planificaciones',
      ai_requests: 'consultas IA este mes',
    };

    return {
      allowed,
      current: currentCount,
      max,
      message: max !== -1 ? `${currentCount}/${max} ${labelMap[resource]}` : null,
    };
  };

  return {
    subscription,
    limits,
    effectivePlan,
    trialDaysRemaining,
    trialExpired,
    hasFeature,
    canCreate,
    isLoading: query.isLoading,
    error: query.error,
  };
}
