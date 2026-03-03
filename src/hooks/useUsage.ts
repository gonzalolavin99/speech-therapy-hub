import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { UsageRecord } from '@/config/subscriptions';

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function useUsage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const period = getCurrentPeriod();

  const query = useQuery({
    queryKey: ['usage', user?.id, period],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!user) return {};

      const { data, error } = await supabase
        .from('usage_tracking')
        .select('metric, count')
        .eq('user_id', user.id)
        .eq('period', period);

      if (error) throw error;

      const map: Record<string, number> = {};
      (data as UsageRecord[]).forEach((r) => {
        map[r.metric] = r.count;
      });
      return map;
    },
    enabled: !!user,
  });

  const incrementUsage = useMutation({
    mutationFn: async (metric: string) => {
      if (!user) throw new Error('No user');

      const { error } = await supabase
        .from('usage_tracking')
        .upsert(
          {
            user_id: user.id,
            metric,
            period,
            count: 1,
          },
          {
            onConflict: 'user_id,metric,period',
          }
        );

      if (error) {
        // If upsert doesn't increment, do a manual update
        const { data: existing } = await supabase
          .from('usage_tracking')
          .select('count')
          .eq('user_id', user.id)
          .eq('metric', metric)
          .eq('period', period)
          .maybeSingle();

        const newCount = (existing?.count || 0) + 1;
        const { error: updateError } = await supabase
          .from('usage_tracking')
          .update({ count: newCount })
          .eq('user_id', user.id)
          .eq('metric', metric)
          .eq('period', period);

        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usage'] });
    },
  });

  return {
    usage: query.data ?? {},
    isLoading: query.isLoading,
    incrementUsage: incrementUsage.mutate,
  };
}
