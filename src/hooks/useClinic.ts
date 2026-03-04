import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { ProfessionId } from '@/config/professions';

export interface Clinic {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClinicMember {
  id: string;
  clinic_id: string;
  user_id: string | null;
  email: string;
  role: 'clinic_admin' | 'member';
  status: 'invited' | 'active' | 'suspended' | 'removed';
  invited_by: string | null;
  invited_at: string;
  joined_at: string | null;
  full_name?: string;
  profession?: ProfessionId;
}

export interface PendingInvitation {
  id: string;
  clinic_id: string;
  clinic_name: string;
  role: string;
  invited_at: string;
}

export interface ClinicData {
  clinic: Clinic | null;
  membership: ClinicMember | null;
  members: ClinicMember[];
  pending_invitations: PendingInvitation[];
}

export function useClinic() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['clinic', user?.id],
    queryFn: async (): Promise<ClinicData> => {
      if (!user) return { clinic: null, membership: null, members: [], pending_invitations: [] };

      const { data, error } = await supabase.rpc('get_my_clinic');

      if (error) throw error;
      if (!data) return { clinic: null, membership: null, members: [], pending_invitations: [] };

      return data as ClinicData;
    },
    enabled: !!user,
  });

  const createClinic = useMutation({
    mutationFn: async (params: {
      name: string;
      slug: string;
      address?: string;
      city?: string;
      phone?: string;
      email?: string;
    }) => {
      const { data, error } = await supabase.rpc('create_clinic', {
        clinic_name: params.name,
        clinic_slug: params.slug,
        clinic_address: params.address || null,
        clinic_city: params.city || null,
        clinic_phone: params.phone || null,
        clinic_email: params.email || null,
      });
      if (error) throw error;
      return data as Clinic;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic'] });
      toast.success('Clínica creada exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al crear clínica', { description: error.message });
    },
  });

  const inviteMember = useMutation({
    mutationFn: async (params: { clinicId: string; email: string; role?: string }) => {
      const { data, error } = await supabase.rpc('invite_clinic_member', {
        p_clinic_id: params.clinicId,
        p_email: params.email,
        p_role: params.role || 'member',
      });
      if (error) throw error;
      return data as ClinicMember;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic'] });
      toast.success('Invitación enviada');
    },
    onError: (error: Error) => {
      toast.error('Error al invitar', { description: error.message });
    },
  });

  const acceptInvitation = useMutation({
    mutationFn: async (clinicId: string) => {
      const { data, error } = await supabase.rpc('accept_clinic_invitation', {
        p_clinic_id: clinicId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toast.success('Te has unido a la clínica');
    },
    onError: (error: Error) => {
      toast.error('Error al aceptar invitación', { description: error.message });
    },
  });

  const updateMember = useMutation({
    mutationFn: async (params: { memberId: string; status?: string; role?: string }) => {
      const { data, error } = await supabase.rpc('update_clinic_member', {
        p_member_id: params.memberId,
        p_status: params.status || null,
        p_role: params.role || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic'] });
      toast.success('Miembro actualizado');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar miembro', { description: error.message });
    },
  });

  const updateClinic = useMutation({
    mutationFn: async (params: Partial<Clinic> & { id: string }) => {
      const { id, ...updates } = params;
      const { error } = await supabase
        .from('clinics')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic'] });
      toast.success('Clínica actualizada');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar clínica', { description: error.message });
    },
  });

  const clinicData = query.data ?? { clinic: null, membership: null, members: [], pending_invitations: [] };

  return {
    clinic: clinicData.clinic,
    membership: clinicData.membership,
    members: clinicData.members,
    pendingInvitations: clinicData.pending_invitations,
    isClinicAdmin: clinicData.membership?.role === 'clinic_admin',
    isClinicMember: !!clinicData.membership,
    isLoading: query.isLoading,
    createClinic,
    inviteMember,
    acceptInvitation,
    updateMember,
    updateClinic,
  };
}
