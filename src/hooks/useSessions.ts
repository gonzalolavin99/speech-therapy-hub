import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { toast } from 'sonner';

export interface Session {
  id: string;
  user_id: string;
  patient_id: string;
  planning_id: string | null;
  title: string;
  session_type: 'evaluation' | 'therapy' | 'followup';
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  patient_name?: string;
}

export interface SessionFormData {
  patient_id: string;
  planning_id?: string | null;
  title: string;
  session_type: 'evaluation' | 'therapy' | 'followup';
  start_time: string;
  end_time: string;
  status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string | null;
}

export function useSessions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { log } = useAuditLog();

  const sessionsQuery = useQuery({
    queryKey: ['sessions', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          patients (name)
        `)
        .order('start_time', { ascending: true });

      if (error) throw error;
      
      return (data || []).map((s: any) => ({
        ...s,
        patient_name: s.patients?.name || 'Paciente',
      })) as Session[];
    },
    enabled: !!user,
  });

  const createSession = useMutation({
    mutationFn: async (session: SessionFormData) => {
      if (!user) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('sessions')
        .insert([{ ...session, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data as Session;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Cita creada exitosamente');
      log({
        action: 'CREATE',
        entityType: 'session',
        entityId: data.id,
        entityName: data.title,
        details: { patient_id: data.patient_id, start_time: data.start_time }
      });
    },
    onError: (error: Error) => {
      toast.error('Error al crear cita', { description: error.message });
    },
  });

  const updateSession = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SessionFormData> & { id: string }) => {
      const { data, error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Session;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Cita actualizada');
      log({
        action: 'UPDATE',
        entityType: 'session',
        entityId: data.id,
        entityName: data.title,
        details: { status: data.status }
      });
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar cita', { description: error.message });
    },
  });

  const deleteSession = useMutation({
    mutationFn: async (id: string) => {
      // Primero eliminar pagos asociados a esta sesión
      const { error: paymentError } = await supabase
        .from('payments')
        .delete()
        .eq('session_id', id);

      if (paymentError) {
        console.warn('Error al eliminar pagos asociados:', paymentError);
      }

      // Luego eliminar la sesión
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Cita y pagos asociados eliminados');
      log({
        action: 'DELETE',
        entityType: 'session',
        entityId: id,
      });
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar cita', { description: error.message });
    },
  });

  // Get sessions for a specific date range (for calendar)
  const getSessionsForWeek = (startDate: Date) => {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
    
    return sessionsQuery.data?.filter((session) => {
      const sessionDate = new Date(session.start_time);
      return sessionDate >= startDate && sessionDate < endDate;
    }) || [];
  };

  return {
    sessions: sessionsQuery.data ?? [],
    isLoading: sessionsQuery.isLoading,
    error: sessionsQuery.error,
    createSession,
    updateSession,
    deleteSession,
    getSessionsForWeek,
  };
}
