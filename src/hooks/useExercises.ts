import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Exercise {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  category: string;
  difficulty: string;
  target_age: string | null;
  materials: string | null;
  duration_minutes: number | null;
  image_url: string | null;
  video_url: string | null;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExerciseFormData {
  title: string;
  description?: string;
  instructions?: string;
  category: string;
  difficulty?: string;
  target_age?: string;
  materials?: string;
  duration_minutes?: number;
  video_url?: string;
}

export interface ExerciseAssignment {
  id: string;
  user_id: string;
  patient_id: string;
  exercise_id: string;
  status: 'assigned' | 'in_progress' | 'completed';
  frequency: string | null;
  notes: string | null;
  start_date: string | null;
  end_date: string | null;
  completed_at: string | null;
  created_at: string;
  // Joined fields
  exercise_title?: string;
  exercise_category?: string;
  patient_name?: string;
}

export interface AssignmentFormData {
  patient_id: string;
  exercise_id: string;
  frequency?: string;
  notes?: string;
  start_date?: string;
  end_date?: string;
}

export function useExercises() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all exercises
  const exercisesQuery = useQuery({
    queryKey: ['exercises', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Exercise[];
    },
    enabled: !!user,
  });

  // Fetch all assignments with exercise and patient info
  const assignmentsQuery = useQuery({
    queryKey: ['exercise-assignments', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('exercise_assignments')
        .select(`
          *,
          exercises (title, category),
          patients (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((a: any) => ({
        ...a,
        exercise_title: a.exercises?.title || 'Ejercicio',
        exercise_category: a.exercises?.category || 'otro',
        patient_name: a.patients?.name || 'Paciente',
      })) as ExerciseAssignment[];
    },
    enabled: !!user,
  });

  // Create exercise
  const createExercise = useMutation({
    mutationFn: async (exercise: ExerciseFormData) => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('exercises')
        .insert([{ ...exercise, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data as Exercise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast.success('Ejercicio creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al crear ejercicio', { description: error.message });
    },
  });

  // Update exercise
  const updateExercise = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ExerciseFormData> & { id: string }) => {
      const { data, error } = await supabase
        .from('exercises')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Exercise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast.success('Ejercicio actualizado');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar ejercicio', { description: error.message });
    },
  });

  // Delete exercise
  const deleteExercise = useMutation({
    mutationFn: async (id: string) => {
      // First delete any assignments for this exercise
      await supabase
        .from('exercise_assignments')
        .delete()
        .eq('exercise_id', id);

      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-assignments'] });
      toast.success('Ejercicio eliminado');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar ejercicio', { description: error.message });
    },
  });

  // Assign exercise to patient
  const assignExercise = useMutation({
    mutationFn: async (assignment: AssignmentFormData) => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('exercise_assignments')
        .insert([{ ...assignment, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data as ExerciseAssignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-assignments'] });
      toast.success('Ejercicio asignado al paciente');
    },
    onError: (error: Error) => {
      toast.error('Error al asignar ejercicio', { description: error.message });
    },
  });

  // Update assignment (e.g., mark as completed)
  const updateAssignment = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ExerciseAssignment> & { id: string }) => {
      const updateData: any = { ...updates };
      if (updates.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('exercise_assignments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ExerciseAssignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-assignments'] });
      toast.success('Asignación actualizada');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar asignación', { description: error.message });
    },
  });

  // Delete assignment
  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exercise_assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise-assignments'] });
      toast.success('Asignación eliminada');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar asignación', { description: error.message });
    },
  });

  return {
    exercises: exercisesQuery.data ?? [],
    assignments: assignmentsQuery.data ?? [],
    isLoading: exercisesQuery.isLoading,
    isLoadingAssignments: assignmentsQuery.isLoading,
    createExercise,
    updateExercise,
    deleteExercise,
    assignExercise,
    updateAssignment,
    deleteAssignment,
  };
}
