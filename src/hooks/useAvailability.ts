import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Availability {
  id: string;
  user_id: string;
  day_of_week: number; // 0=Monday, 6=Sunday
  start_time: string; // "09:00:00"
  end_time: string;   // "18:00:00"
  is_active: boolean;
  slot_duration: number; // minutes
}

export interface AvailabilityFormData {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  slot_duration: number;
}

const DAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function useAvailability() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const availabilityQuery = useQuery({
    queryKey: ['availability', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('professional_availability')
        .select('*')
        .eq('user_id', user.id)
        .order('day_of_week', { ascending: true });

      if (error) throw error;
      return (data || []) as Availability[];
    },
    enabled: !!user,
  });

  const upsertAvailability = useMutation({
    mutationFn: async (items: AvailabilityFormData[]) => {
      if (!user) throw new Error('No user');

      // Upsert all 7 days at once
      const rows = items.map((item) => ({
        user_id: user.id,
        day_of_week: item.day_of_week,
        start_time: item.start_time,
        end_time: item.end_time,
        is_active: item.is_active,
        slot_duration: item.slot_duration,
      }));

      const { error } = await supabase
        .from('professional_availability')
        .upsert(rows, { onConflict: 'user_id,day_of_week' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      toast.success('Disponibilidad actualizada');
    },
    onError: (error: Error) => {
      toast.error('Error al guardar disponibilidad', { description: error.message });
    },
  });

  return {
    availability: availabilityQuery.data ?? [],
    isLoading: availabilityQuery.isLoading,
    upsertAvailability,
    DAY_LABELS,
  };
}
