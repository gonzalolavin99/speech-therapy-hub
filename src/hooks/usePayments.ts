import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { toast } from 'sonner';

export interface Payment {
  id: string;
  user_id: string;
  patient_id: string;
  session_id: string | null;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  session_date: string;
  payment_date: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined field
  patient_name?: string;
}

export interface PaymentFormData {
  patient_id: string;
  session_id?: string | null;
  amount: number;
  status?: 'paid' | 'pending' | 'overdue';
  session_date: string;
  payment_date?: string | null;
  payment_method?: string | null;
  notes?: string | null;
}

export function usePayments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { log } = useAuditLog();

  const paymentsQuery = useQuery({
    queryKey: ['payments', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          patients (name)
        `)
        .order('session_date', { ascending: false });

      if (error) throw error;
      
      return (data || []).map((p: any) => ({
        ...p,
        patient_name: p.patients?.name || 'Paciente',
      })) as Payment[];
    },
    enabled: !!user,
  });

  const createPayment = useMutation({
    mutationFn: async (payment: PaymentFormData) => {
      if (!user) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('payments')
        .insert([{ ...payment, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data as Payment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Pago registrado exitosamente');
      log({
        action: 'CREATE',
        entityType: 'payment',
        entityId: data.id,
        details: { amount: data.amount, status: data.status }
      });
    },
    onError: (error: Error) => {
      toast.error('Error al registrar pago', { description: error.message });
    },
  });

  const updatePayment = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PaymentFormData> & { id: string }) => {
      const { data, error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Payment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Pago actualizado');
      log({
        action: 'UPDATE',
        entityType: 'payment',
        entityId: data.id,
        details: { amount: data.amount, status: data.status, payment_method: data.payment_method }
      });
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar pago', { description: error.message });
    },
  });

  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Pago eliminado');
      log({
        action: 'DELETE',
        entityType: 'payment',
        entityId: id,
      });
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar pago', { description: error.message });
    },
  });

  return {
    payments: paymentsQuery.data ?? [],
    isLoading: paymentsQuery.isLoading,
    error: paymentsQuery.error,
    createPayment,
    updatePayment,
    deletePayment,
  };
}
