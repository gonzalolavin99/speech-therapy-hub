import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { toast } from 'sonner';

export type BoletaStatus = 'draft' | 'pending_sii' | 'emitted' | 'voided';

export interface BoletaHonorarios {
  id: string;
  user_id: string;
  payment_id: string | null;
  patient_id: string | null;
  boleta_number: string;
  sii_folio: string | null;
  amount_bruto: number;
  retencion_percent: number;
  retencion_amount: number;
  amount_liquido: number;
  description: string;
  service_date: string;
  emission_date: string | null;
  status: BoletaStatus;
  professional_rut: string | null;
  professional_name: string;
  patient_rut: string | null;
  patient_name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoletaFormData {
  payment_id?: string | null;
  patient_id?: string | null;
  boleta_number: string;
  amount_bruto: number;
  retencion_percent: number;
  retencion_amount: number;
  amount_liquido: number;
  description: string;
  service_date: string;
  status?: BoletaStatus;
  professional_rut?: string | null;
  professional_name: string;
  patient_rut?: string | null;
  patient_name: string;
  notes?: string | null;
}

export function generateBoletaNumber(): string {
  const date = new Date();
  const yy = date.getFullYear().toString().slice(-2);
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `BH-${yy}${mm}-${rand}`;
}

export function useBoletas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { log } = useAuditLog();

  const boletasQuery = useQuery({
    queryKey: ['boletas', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('boletas_honorarios')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as BoletaHonorarios[];
    },
    enabled: !!user,
  });

  const createBoleta = useMutation({
    mutationFn: async (boleta: BoletaFormData) => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('boletas_honorarios')
        .insert([{ ...boleta, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data as BoletaHonorarios;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['boletas'] });
      toast.success('Boleta creada exitosamente');
      log({
        action: 'CREATE',
        entityType: 'boleta',
        entityId: data.id,
        details: { boleta_number: data.boleta_number, amount_bruto: data.amount_bruto, status: data.status },
      });
    },
    onError: (error: Error) => {
      toast.error('Error al crear boleta', { description: error.message });
    },
  });

  const updateBoleta = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BoletaFormData> & { id: string }) => {
      const { data, error } = await supabase
        .from('boletas_honorarios')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as BoletaHonorarios;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['boletas'] });
      toast.success('Boleta actualizada');
      log({
        action: 'UPDATE',
        entityType: 'boleta',
        entityId: data.id,
        details: { boleta_number: data.boleta_number, status: data.status },
      });
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar boleta', { description: error.message });
    },
  });

  const markAsEmitted = useMutation({
    mutationFn: async ({ id, sii_folio, emission_date }: { id: string; sii_folio?: string; emission_date?: string }) => {
      const { data, error } = await supabase
        .from('boletas_honorarios')
        .update({
          status: 'emitted',
          sii_folio: sii_folio || null,
          emission_date: emission_date || new Date().toISOString().split('T')[0],
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as BoletaHonorarios;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['boletas'] });
      toast.success('Boleta marcada como emitida en el SII');
      log({
        action: 'UPDATE',
        entityType: 'boleta',
        entityId: data.id,
        details: { boleta_number: data.boleta_number, status: 'emitted', sii_folio: data.sii_folio },
      });
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar boleta', { description: error.message });
    },
  });

  const voidBoleta = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('boletas_honorarios')
        .update({ status: 'voided' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as BoletaHonorarios;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['boletas'] });
      toast.success('Boleta anulada');
      log({
        action: 'UPDATE',
        entityType: 'boleta',
        entityId: data.id,
        details: { boleta_number: data.boleta_number, status: 'voided' },
      });
    },
    onError: (error: Error) => {
      toast.error('Error al anular boleta', { description: error.message });
    },
  });

  const deleteBoleta = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('boletas_honorarios')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['boletas'] });
      toast.success('Borrador eliminado');
      log({
        action: 'DELETE',
        entityType: 'boleta',
        entityId: id,
      });
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar boleta', { description: error.message });
    },
  });

  return {
    boletas: boletasQuery.data ?? [],
    isLoading: boletasQuery.isLoading,
    error: boletasQuery.error,
    createBoleta,
    updateBoleta,
    markAsEmitted,
    voidBoleta,
    deleteBoleta,
  };
}
