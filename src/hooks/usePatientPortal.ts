import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Types for portal data returned by get_portal_data RPC
export interface PortalPatient {
  name: string;
  status: 'active' | 'inactive' | 'completed';
}

export interface PortalSession {
  id: string;
  type: 'evaluation' | 'therapy' | 'follow_up';
  date: string;
  time: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
}

export interface PortalPlanning {
  id: string;
  intervention_approach: string;
  method: string;
  total_sessions: number;
  completed_sessions: number;
  frequency: string;
  status: 'active' | 'completed';
}

export interface PortalCharge {
  id: string;
  description: string;
  amount: number;
  status: 'pending' | 'paid' | 'confirmed' | 'cancelled';
  due_date: string | null;
  patient_confirmed_at: string | null;
  professional_confirmed_at: string | null;
  created_at: string;
}

export interface PortalMessage {
  id: string;
  sender_type: 'patient' | 'professional';
  message: string;
  read_at: string | null;
  created_at: string;
}

export interface PortalProfessional {
  full_name: string;
  profession: string;
  specialties: string | null;
  photo_url: string | null;
  institution: string | null;
  portal_welcome_message: string | null;
}

export interface PortalBankInfo {
  bank_name: string;
  account_type: string;
  account_number: string;
  holder_rut: string;
  holder_name: string;
  email: string;
}

export interface PortalData {
  patient: PortalPatient;
  professional: PortalProfessional | null;
  sessions: PortalSession[];
  plannings: PortalPlanning[];
  charges: PortalCharge[];
  messages: PortalMessage[];
  bank_info: PortalBankInfo | null;
  mp_enabled?: boolean;
}

export function usePatientPortal(token: string | undefined) {
  const queryClient = useQueryClient();

  const portalQuery = useQuery({
    queryKey: ['portal', token],
    queryFn: async () => {
      if (!token) return null;

      const { data, error } = await supabase
        .rpc('get_portal_data', { p_token: token });

      if (error) throw error;

      const result = data as any;
      if (result?.error === 'invalid_token') {
        return null;
      }
      if (result?.error) throw new Error(result.error);

      // Check if MercadoPago is enabled for this professional
      const portalData = result as PortalData;
      try {
        const { data: mpData } = await supabase
          .rpc('get_mp_payment_link', { p_token: token, p_charge_id: portalData.charges[0]?.id || '00000000-0000-0000-0000-000000000000' });
        portalData.mp_enabled = mpData?.mp_enabled === true;
      } catch {
        portalData.mp_enabled = false;
      }

      return portalData;
    },
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  });

  const confirmPayment = useMutation({
    mutationFn: async ({ chargeId, reference }: { chargeId: string; reference?: string }) => {
      const { data, error } = await supabase
        .rpc('portal_confirm_payment', {
          p_token: token!,
          p_charge_id: chargeId,
          p_reference: reference || null,
        });

      if (error) throw error;
      const result = data as any;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', token] });
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const { data, error } = await supabase
        .rpc('portal_send_message', {
          p_token: token!,
          p_message: message,
        });

      if (error) throw error;
      const result = data as any;
      if (result?.error) {
        if (result.error === 'rate_limited') {
          throw new Error('Has enviado muchos mensajes. Intenta de nuevo en unos minutos.');
        }
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', token] });
    },
  });

  return {
    data: portalQuery.data,
    isLoading: portalQuery.isLoading,
    error: portalQuery.error,
    invalidToken: !portalQuery.isLoading && !portalQuery.data,
    confirmPayment,
    sendMessage,
    refetch: portalQuery.refetch,
  };
}
