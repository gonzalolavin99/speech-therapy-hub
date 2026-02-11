import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TestResult {
  id: string;
  user_id: string;
  patient_id: string;
  test_type: 'mbgr' | 'tar' | 'teprosif';
  test_name: string;
  evaluation_date: string;
  score: string | null;
  status: 'pending' | 'completed';
  results_data: any | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
  // Joined field
  patient_name?: string;
}

export interface TestResultFormData {
  patient_id: string;
  test_type: 'mbgr' | 'mmbgr-lactantes' | 'tar' | 'teprosif';
  test_name: string;
  evaluation_date: string;
  score?: string | null;
  status?: 'pending' | 'completed';
  results_data?: any | null;
  observations?: string | null;
}

export function useTestResults() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const testResultsQuery = useQuery({
    queryKey: ['test_results', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('test_results')
        .select(`
          *,
          patients (name)
        `)
        .order('evaluation_date', { ascending: false });

      if (error) throw error;
      
      return (data || []).map((t: any) => ({
        ...t,
        patient_name: t.patients?.name || 'Paciente',
      })) as TestResult[];
    },
    enabled: !!user,
  });

  const createTestResult = useMutation({
    mutationFn: async (testResult: TestResultFormData) => {
      if (!user) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('test_results')
        .insert([{ ...testResult, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data as TestResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test_results'] });
      toast.success('Test registrado exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al registrar test', { description: error.message });
    },
  });

  const updateTestResult = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TestResultFormData> & { id: string }) => {
      const { data, error } = await supabase
        .from('test_results')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as TestResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test_results'] });
      toast.success('Test actualizado');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar test', { description: error.message });
    },
  });

  const deleteTestResult = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('test_results')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test_results'] });
      toast.success('Test eliminado');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar test', { description: error.message });
    },
  });

  return {
    testResults: testResultsQuery.data ?? [],
    isLoading: testResultsQuery.isLoading,
    error: testResultsQuery.error,
    createTestResult,
    updateTestResult,
    deleteTestResult,
  };
}
