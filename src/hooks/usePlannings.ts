import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Planning {
  id: string;
  user_id: string;
  patient_id: string;
  intervention_approach: string;
  method: string;
  modality: 'individual' | 'group';
  contents: string | null;
  general_objective: string;
  specific_objectives: string | null;
  operational_objectives: string | null;
  general_plan: string | null;
  total_sessions: number;
  completed_sessions: number;
  frequency: string;
  session_duration: number | null;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
  updated_at: string;
  // Joined field
  patient_name?: string;
}

export interface PlanningFormData {
  patient_id: string;
  intervention_approach: string;
  method: string;
  modality?: 'individual' | 'group';
  contents?: string;
  general_objective: string;
  specific_objectives?: string;
  operational_objectives?: string;
  general_plan?: string;
  total_sessions: number;
  frequency: string;
  session_duration?: number;
  status?: 'active' | 'completed' | 'paused';
}

export function usePlannings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const planningsQuery = useQuery({
    queryKey: ['plannings', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('plannings')
        .select(`
          *,
          patients (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map((p: any) => ({
        ...p,
        patient_name: p.patients?.name || 'Paciente',
      })) as Planning[];
    },
    enabled: !!user,
  });

  const createPlanning = useMutation({
    mutationFn: async (planning: PlanningFormData) => {
      if (!user) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('plannings')
        .insert([{ ...planning, user_id: user.id, completed_sessions: 0 }])
        .select()
        .single();

      if (error) throw error;
      return data as Planning;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plannings'] });
      toast.success('Planificación creada exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al crear planificación', { description: error.message });
    },
  });

  const updatePlanning = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlanningFormData> & { id: string }) => {
      const { data, error } = await supabase
        .from('plannings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Planning;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plannings'] });
      toast.success('Planificación actualizada');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar planificación', { description: error.message });
    },
  });

  const deletePlanning = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('plannings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plannings'] });
      toast.success('Planificación eliminada');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar planificación', { description: error.message });
    },
  });

  return {
    plannings: planningsQuery.data ?? [],
    isLoading: planningsQuery.isLoading,
    error: planningsQuery.error,
    createPlanning,
    updatePlanning,
    deletePlanning,
  };
}
