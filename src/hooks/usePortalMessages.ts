import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PortalMessageRow {
  id: string;
  user_id: string;
  patient_id: string;
  sender_type: 'patient' | 'professional';
  message: string;
  read_at: string | null;
  created_at: string;
  // Joined
  patient_name?: string;
}

export function usePortalMessages(patientId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Mensajes de un paciente específico
  const messagesQuery = useQuery({
    queryKey: ['portal-messages', user?.id, patientId],
    queryFn: async () => {
      if (!user || !patientId) throw new Error('No user or patient');

      const { data, error } = await supabase
        .from('portal_messages')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as PortalMessageRow[];
    },
    enabled: !!user && !!patientId,
  });

  // Resumen de mensajes no leídos por paciente
  const unreadQuery = useQuery({
    queryKey: ['portal-messages-unread', user?.id],
    queryFn: async () => {
      if (!user) return {};

      const { data, error } = await supabase
        .from('portal_messages')
        .select('patient_id')
        .eq('sender_type', 'patient')
        .is('read_at', null);

      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach((m: any) => {
        counts[m.patient_id] = (counts[m.patient_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!user,
  });

  const sendMessage = useMutation({
    mutationFn: async ({ patientId: pid, message }: { patientId: string; message: string }) => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('portal_messages')
        .insert([{
          user_id: user.id,
          patient_id: pid,
          sender_type: 'professional' as const,
          message: message.trim().substring(0, 2000),
        }])
        .select()
        .single();

      if (error) throw error;
      return data as PortalMessageRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-messages'] });
      toast.success('Mensaje enviado');
    },
    onError: (error: Error) => {
      toast.error('Error al enviar mensaje', { description: error.message });
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (pid: string) => {
      if (!user) throw new Error('No user');

      const { error } = await supabase
        .from('portal_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('patient_id', pid)
        .eq('sender_type', 'patient')
        .is('read_at', null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-messages'] });
      queryClient.invalidateQueries({ queryKey: ['portal-messages-unread'] });
    },
  });

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    unreadCounts: unreadQuery.data ?? {},
    sendMessage,
    markAsRead,
  };
}
