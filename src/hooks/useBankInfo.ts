import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BankInfo {
  id: string;
  user_id: string;
  bank_name: string;
  account_type: string;
  account_number: string;
  holder_rut: string;
  holder_name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface BankInfoFormData {
  bank_name: string;
  account_type: string;
  account_number: string;
  holder_rut: string;
  holder_name: string;
  email: string;
}

export function useBankInfo() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const bankInfoQuery = useQuery({
    queryKey: ['bank-info', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('professional_bank_info')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as BankInfo | null;
    },
    enabled: !!user,
  });

  const saveBankInfo = useMutation({
    mutationFn: async (formData: BankInfoFormData) => {
      if (!user) throw new Error('No user');

      // Upsert: insert or update
      const { data: existing } = await supabase
        .from('professional_bank_info')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('professional_bank_info')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        return data as BankInfo;
      } else {
        const { data, error } = await supabase
          .from('professional_bank_info')
          .insert([{ ...formData, user_id: user.id }])
          .select()
          .single();

        if (error) throw error;
        return data as BankInfo;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-info'] });
      toast.success('Datos bancarios guardados');
    },
    onError: (error: Error) => {
      toast.error('Error al guardar datos bancarios', { description: error.message });
    },
  });

  return {
    bankInfo: bankInfoQuery.data,
    isLoading: bankInfoQuery.isLoading,
    saveBankInfo,
  };
}
