import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { toast } from 'sonner';

export interface SessionPack {
  id: string;
  user_id: string;
  patient_id: string;
  name: string;
  total_sessions: number;
  used_sessions: number;
  price_total: number;
  price_per_session: number;
  original_price_per_session: number;
  discount_percent: number;
  status: 'active' | 'completed' | 'cancelled' | 'expired';
  payment_status: 'pending' | 'partial' | 'paid';
  notes: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  patient_name?: string;
}

export interface SessionPackFormData {
  patient_id: string;
  name: string;
  total_sessions: number;
  price_total: number;
  original_price_per_session: number;
  payment_status?: 'pending' | 'partial' | 'paid';
  notes?: string | null;
  expires_at?: string | null;
}

export function useSessionPacks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { log } = useAuditLog();

  const packsQuery = useQuery({
    queryKey: ['session-packs', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('session_packs')
        .select(`
          *,
          patients (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((p: any) => ({
        ...p,
        patient_name: p.patients?.name || 'Paciente',
      })) as SessionPack[];
    },
    enabled: !!user,
  });

  const createPack = useMutation({
    mutationFn: async (pack: SessionPackFormData) => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('session_packs')
        .insert([{ ...pack, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data as SessionPack;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['session-packs'] });
      toast.success('Pack creado exitosamente');
      log({
        action: 'CREATE',
        entityType: 'payment',
        entityId: data.id,
        details: { type: 'session_pack', total_sessions: data.total_sessions, price: data.price_total },
      });
    },
    onError: (error: Error) => {
      toast.error('Error al crear pack', { description: error.message });
    },
  });

  const updatePack = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SessionPackFormData> & { id: string }) => {
      const { data, error } = await supabase
        .from('session_packs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SessionPack;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-packs'] });
      toast.success('Pack actualizado');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar pack', { description: error.message });
    },
  });

  const useSession = useMutation({
    mutationFn: async (packId: string) => {
      // Get current pack
      const { data: pack, error: fetchErr } = await supabase
        .from('session_packs')
        .select('used_sessions, total_sessions, status')
        .eq('id', packId)
        .single();

      if (fetchErr) throw fetchErr;
      if (!pack) throw new Error('Pack no encontrado');
      if (pack.status !== 'active') throw new Error('El pack no está activo');
      if (pack.used_sessions >= pack.total_sessions) throw new Error('No quedan sesiones en el pack');

      const { data, error } = await supabase
        .from('session_packs')
        .update({ used_sessions: pack.used_sessions + 1 })
        .eq('id', packId)
        .select()
        .single();

      if (error) throw error;
      return data as SessionPack;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['session-packs'] });
      const remaining = data.total_sessions - data.used_sessions;
      if (remaining === 0) {
        toast.success('Pack completado! Todas las sesiones fueron usadas.');
      } else {
        toast.success(`Sesion registrada. Quedan ${remaining} sesion${remaining !== 1 ? 'es' : ''}.`);
      }
    },
    onError: (error: Error) => {
      toast.error('Error al usar sesion', { description: error.message });
    },
  });

  const cancelPack = useMutation({
    mutationFn: async (packId: string) => {
      const { data, error } = await supabase
        .from('session_packs')
        .update({ status: 'cancelled' })
        .eq('id', packId)
        .select()
        .single();

      if (error) throw error;
      return data as SessionPack;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-packs'] });
      toast.success('Pack cancelado');
    },
    onError: (error: Error) => {
      toast.error('Error al cancelar pack', { description: error.message });
    },
  });

  const deletePack = useMutation({
    mutationFn: async (packId: string) => {
      const { error } = await supabase
        .from('session_packs')
        .delete()
        .eq('id', packId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-packs'] });
      toast.success('Pack eliminado');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar pack', { description: error.message });
    },
  });

  // Helper: get active packs for a specific patient
  const getActivePacksForPatient = (patientId: string) => {
    return (packsQuery.data ?? []).filter(
      (p) => p.patient_id === patientId && p.status === 'active'
    );
  };

  return {
    packs: packsQuery.data ?? [],
    isLoading: packsQuery.isLoading,
    error: packsQuery.error,
    createPack,
    updatePack,
    useSession,
    cancelPack,
    deletePack,
    getActivePacksForPatient,
  };
}
