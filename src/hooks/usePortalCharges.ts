import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { toast } from 'sonner';

export interface PortalCharge {
  id: string;
  user_id: string;
  patient_id: string;
  payment_id: string | null;
  session_id: string | null;
  description: string;
  amount: number;
  status: 'pending' | 'paid' | 'confirmed' | 'cancelled';
  payment_method: string | null;
  payment_reference: string | null;
  patient_confirmed_at: string | null;
  professional_confirmed_at: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  patient_name?: string;
}

export interface PortalChargeFormData {
  patient_id: string;
  description: string;
  amount: number;
  due_date?: string | null;
  notes?: string | null;
  session_id?: string | null;
}

export function usePortalCharges() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { log } = useAuditLog();

  const chargesQuery = useQuery({
    queryKey: ['portal-charges', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('portal_charges')
        .select(`
          *,
          patients (name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((c: any) => ({
        ...c,
        patient_name: c.patients?.name || 'Paciente',
      })) as PortalCharge[];
    },
    enabled: !!user,
  });

  const createCharge = useMutation({
    mutationFn: async (charge: PortalChargeFormData) => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('portal_charges')
        .insert([{ ...charge, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data as PortalCharge;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['portal-charges'] });
      toast.success('Cobro creado exitosamente');
      log({
        action: 'CREATE',
        entityType: 'portal_charge',
        entityId: data.id,
        details: { amount: data.amount, description: data.description },
      });
    },
    onError: (error: Error) => {
      toast.error('Error al crear cobro', { description: error.message });
    },
  });

  const confirmCharge = useMutation({
    mutationFn: async (chargeId: string) => {
      const { data, error } = await supabase
        .from('portal_charges')
        .update({
          status: 'confirmed',
          professional_confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', chargeId)
        .select()
        .single();

      if (error) throw error;
      return data as PortalCharge;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['portal-charges'] });
      toast.success('Pago confirmado');
      log({
        action: 'UPDATE',
        entityType: 'portal_charge',
        entityId: data.id,
        details: { status: 'confirmed' },
      });
    },
    onError: (error: Error) => {
      toast.error('Error al confirmar pago', { description: error.message });
    },
  });

  const cancelCharge = useMutation({
    mutationFn: async (chargeId: string) => {
      const { data, error } = await supabase
        .from('portal_charges')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', chargeId)
        .select()
        .single();

      if (error) throw error;
      return data as PortalCharge;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['portal-charges'] });
      toast.success('Cobro anulado');
      log({
        action: 'UPDATE',
        entityType: 'portal_charge',
        entityId: data.id,
        details: { status: 'cancelled' },
      });
    },
    onError: (error: Error) => {
      toast.error('Error al anular cobro', { description: error.message });
    },
  });

  const deleteCharge = useMutation({
    mutationFn: async (chargeId: string) => {
      const { error } = await supabase
        .from('portal_charges')
        .delete()
        .eq('id', chargeId);

      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['portal-charges'] });
      toast.success('Cobro eliminado');
      log({
        action: 'DELETE',
        entityType: 'portal_charge',
        entityId: id,
      });
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar cobro', { description: error.message });
    },
  });

  return {
    charges: chargesQuery.data ?? [],
    isLoading: chargesQuery.isLoading,
    error: chargesQuery.error,
    createCharge,
    confirmCharge,
    cancelCharge,
    deleteCharge,
  };
}
