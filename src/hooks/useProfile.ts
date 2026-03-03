import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { ProfessionId } from '@/config/professions';

export interface ProfessionalProfile {
  id: string;
  user_id: string;
  full_name: string;
  rut: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  institution: string | null;
  specialties: string | null;
  bio: string | null;
  photo_url: string | null;
  sis_registration: string | null;
  session_duration: number;
  session_price: number;
  evaluation_price: number;
  onboarding_completed: boolean;
  profession: ProfessionId;
  approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileFormData {
  full_name: string;
  rut?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  institution?: string | null;
  specialties?: string | null;
  bio?: string | null;
  photo_url?: string | null;
  sis_registration?: string | null;
  session_duration?: number;
  session_price?: number;
  evaluation_price?: number;
  onboarding_completed?: boolean;
  profession?: ProfessionId;
}

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('professional_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as ProfessionalProfile | null;
    },
    enabled: !!user,
  });

  const createProfile = useMutation({
    mutationFn: async (profile: ProfileFormData) => {
      if (!user) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('professional_profiles')
        .insert([{ ...profile, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data as ProfessionalProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Perfil creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al crear perfil', { description: error.message });
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<ProfileFormData>) => {
      if (!user) throw new Error('No user');
      
      const { data, error } = await supabase
        .from('professional_profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as ProfessionalProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Perfil actualizado');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar perfil', { description: error.message });
    },
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    needsOnboarding: !profileQuery.isLoading && !profileQuery.data?.onboarding_completed,
    createProfile,
    updateProfile,
  };
}
