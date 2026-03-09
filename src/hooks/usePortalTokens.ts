import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PortalToken {
  id: string;
  user_id: string;
  patient_id: string;
  token: string;
  is_active: boolean;
  expires_at: string | null;
  last_accessed_at: string | null;
  access_count: number;
  created_at: string;
  updated_at: string;
}

export function usePortalTokens() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const tokensQuery = useQuery({
    queryKey: ['portal-tokens', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('patient_portal_tokens')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PortalToken[];
    },
    enabled: !!user,
  });

  const generateToken = useMutation({
    mutationFn: async (patientId: string) => {
      const { data, error } = await supabase
        .rpc('generate_portal_token', { p_patient_id: patientId });

      if (error) throw error;
      const result = data as any;
      if (result?.error) throw new Error(result.error);
      return result as { token: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-tokens'] });
      toast.success('Enlace del portal generado');
    },
    onError: (error: Error) => {
      toast.error('Error al generar enlace', { description: error.message });
    },
  });

  const deactivateToken = useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase
        .from('patient_portal_tokens')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', tokenId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-tokens'] });
      toast.success('Acceso al portal desactivado');
    },
    onError: (error: Error) => {
      toast.error('Error al desactivar', { description: error.message });
    },
  });

  const getTokenForPatient = (patientId: string): PortalToken | undefined => {
    return tokensQuery.data?.find(t => t.patient_id === patientId && t.is_active);
  };

  return {
    tokens: tokensQuery.data ?? [],
    isLoading: tokensQuery.isLoading,
    generateToken,
    deactivateToken,
    getTokenForPatient,
  };
}
