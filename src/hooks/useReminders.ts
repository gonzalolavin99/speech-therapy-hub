import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface GenerateRemindersResult {
  created: number;
  skippedNoPhone: number;
  skippedExisting: number;
  skippedCancelled: number;
}

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
        .eq('user_id', user.id)
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

  const generateReminders = useMutation({
    mutationFn: async ({ date, messageTemplate }: { date: string; messageTemplate: string }): Promise<GenerateRemindersResult> => {
      if (!user) throw new Error('No user');

      // 1. Fetch sessions for the target date with patient data
      const startOfDay = `${date}T00:00:00`;
      const endOfDay = `${date}T23:59:59`;

      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, patient_id, start_time, end_time, status, title, session_type, patients (name, phone, email)')
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay)
        .in('status', ['scheduled', 'confirmed']);

      if (sessionsError) throw sessionsError;
      if (!sessions || sessions.length === 0) {
        return { created: 0, skippedNoPhone: 0, skippedExisting: 0, skippedCancelled: 0 };
      }

      // 2. Fetch existing reminders for these sessions
      const sessionIds = sessions.map((s: any) => s.id);
      const { data: existingReminders, error: remindersError } = await supabase
        .from('reminders')
        .select('session_id')
        .in('session_id', sessionIds);

      if (remindersError) throw remindersError;
      const existingSessionIds = new Set((existingReminders || []).map((r: any) => r.session_id));

      // 3. Build batch of new reminders
      let created = 0;
      let skippedNoPhone = 0;
      let skippedExisting = 0;
      let skippedCancelled = 0;
      const toInsert: ReminderFormData[] = [];

      for (const session of sessions as any[]) {
        if (session.status === 'cancelled' || session.status === 'no_show') {
          skippedCancelled++;
          continue;
        }
        if (existingSessionIds.has(session.id)) {
          skippedExisting++;
          continue;
        }

        const patientName = session.patients?.name || 'Paciente';
        const patientPhone = session.patients?.phone;

        if (!patientPhone) {
          skippedNoPhone++;
          continue;
        }

        const sessionStart = new Date(session.start_time);
        const timeStr = sessionStart.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
        const dateStr = sessionStart.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

        const message = messageTemplate
          .replace(/{nombre}/g, patientName)
          .replace(/{fecha}/g, dateStr)
          .replace(/{hora}/g, timeStr)
          .replace(/{tipo}/g, session.session_type === 'evaluation' ? 'evaluación' : session.session_type === 'therapy' ? 'terapia' : 'control');

        toInsert.push({
          patient_id: session.patient_id,
          patient_name: patientName,
          session_id: session.id,
          method: 'whatsapp',
          contact: patientPhone,
          session_date: date,
          session_time: timeStr,
          message,
          status: 'pending',
        });
      }

      // 4. Batch insert
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('reminders')
          .insert(toInsert.map(r => ({ ...r, user_id: user.id })));

        if (insertError) throw insertError;
        created = toInsert.length;
      }

      return { created, skippedNoPhone, skippedExisting, skippedCancelled };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      if (result.created > 0) {
        toast.success(`${result.created} recordatorio${result.created > 1 ? 's' : ''} creado${result.created > 1 ? 's' : ''}`);
      }
      if (result.skippedNoPhone > 0) {
        toast.warning(`${result.skippedNoPhone} paciente${result.skippedNoPhone > 1 ? 's' : ''} sin teléfono`);
      }
      if (result.created === 0 && result.skippedExisting > 0) {
        toast.info('Todos los recordatorios ya existían');
      }
    },
    onError: (error: Error) => {
      toast.error('Error al generar recordatorios', { description: error.message });
    },
  });

  const markAsSentBatch = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('reminders')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar recordatorios', { description: error.message });
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
    generateReminders,
    markAsSentBatch,
  };
}
