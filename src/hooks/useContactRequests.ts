import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ContactRequest {
  id: string;
  professional_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  message: string | null;
  service_type: string;
  status: 'pending' | 'read' | 'contacted' | 'archived';
  created_at: string;
}

export function useContactRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['contact-requests', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('contact_requests')
        .select('*')
        .eq('professional_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ContactRequest[];
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ContactRequest['status'] }) => {
      if (!user) throw new Error('No user');

      const { error } = await supabase
        .from('contact_requests')
        .update({ status })
        .eq('id', id)
        .eq('professional_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-requests'] });
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar solicitud', { description: error.message });
    },
  });

  const pendingCount = (query.data || []).filter(r => r.status === 'pending').length;

  return {
    requests: query.data || [],
    isLoading: query.isLoading,
    pendingCount,
    updateStatus,
  };
}
