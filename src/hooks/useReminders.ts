import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Reminder {
  id: string;
  user_id: string;
  session_id: string | null;
  patient_id: string;
  patient_name: string;
  method: 'whatsapp' | 'email' | 'sms';
  contact: string;
  session_date: string;
  session_time: string;
  message: string | null;
  status: 'pending' | 'sent' | 'confirmed' | 'failed';
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReminderFormData {
  patient_id: string;
  patient_name: string;
  session_id?: string | null;
  method: 'whatsapp' | 'email' | 'sms';
  contact: string;
  session_date: string;
  session_time: string;
  message?: string | null;
  status?: 'pending' | 'sent' | 'confirmed' | 'failed';
}

export function useReminders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const remindersQuery = useQuery({
    queryKey: ['reminders', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .order('session_date', { ascending: true });

      if (error) throw error;
      return (data || []) as Reminder[];
    },
    enabled: !!user,
  });

  const createReminder = useMutation({
    mutationFn: async (reminder: ReminderFormData) => {
      if (!user) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('reminders')
        .insert([{ ...reminder, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data as Reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Recordatorio creado');
    },
    onError: (error: Error) => {
      toast.error('Error al crear recordatorio', { description: error.message });
    },
  });

  const updateReminder = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ReminderFormData> & { id: string }) => {
      const { data, error } = await supabase
        .from('reminders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Recordatorio actualizado');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar recordatorio', { description: error.message });
    },
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Recordatorio eliminado');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar recordatorio', { description: error.message });
    },
  });

  const markAsSent = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('reminders')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Recordatorio marcado como enviado');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar recordatorio', { description: error.message });
    },
  });

  return {
    reminders: remindersQuery.data ?? [],
    isLoading: remindersQuery.isLoading,
    error: remindersQuery.error,
    createReminder,
    updateReminder,
    deleteReminder,
    markAsSent,
  };
}
