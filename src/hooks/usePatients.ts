import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Patient {
  id: string;
  user_id: string;
  name: string;
  rut: string;
  birth_date: string | null;
  age: number | null;
  phone: string | null;
  email: string | null;
  diagnosis: string | null;
  status: 'active' | 'inactive' | 'completed';
  consult_reason: string | null;
  referred_by: string | null;
  perinatal_history: string | null;
  psychomotor_dev: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientFormData {
  name: string;
  rut: string;
  birth_date?: string | null;
  age?: number | null;
  phone?: string | null;
  email?: string | null;
  diagnosis?: string | null;
  status?: 'active' | 'inactive' | 'completed';
  consult_reason?: string | null;
  referred_by?: string | null;
  perinatal_history?: string | null;
  psychomotor_dev?: string | null;
  observations?: string | null;
}

export function usePatients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const patientsQuery = useQuery({
    queryKey: ['patients', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Patient[];
    },
    enabled: !!user,
  });

  const createPatient = useMutation({
    mutationFn: async (patient: PatientFormData) => {
      if (!user) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('patients')
        .insert([{ ...patient, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data as Patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast.success('Paciente creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al crear paciente', { description: error.message });
    },
  });

  const updatePatient = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PatientFormData> & { id: string }) => {
      const { data, error } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast.success('Paciente actualizado exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar paciente', { description: error.message });
    },
  });

  const deletePatient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast.success('Paciente eliminado');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar paciente', { description: error.message });
    },
  });

  return {
    patients: patientsQuery.data ?? [],
    isLoading: patientsQuery.isLoading,
    error: patientsQuery.error,
    createPatient,
    updatePatient,
    deletePatient,
  };
}
