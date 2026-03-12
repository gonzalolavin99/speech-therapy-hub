import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface PublicProfileData {
  id: string;
  full_name: string;
  profession: string;
  city: string | null;
  specialties: string | null;
  bio: string | null;
  photo_url: string | null;
  sis_registration: string | null;
  session_duration: number;
  session_price: number;
  evaluation_price: number;
  institution: string | null;
  slug: string;
  public_phone: string | null;
  public_email: string | null;
  show_public_prices: boolean;
}

export interface ContactRequestData {
  professional_id: string;
  name: string;
  phone?: string;
  email?: string;
  message?: string;
  service_type?: string;
}

export function usePublicProfile(slug: string | undefined) {
  const profileQuery = useQuery({
    queryKey: ['public-profile', slug],
    queryFn: async () => {
      if (!slug) return null;

      const { data, error } = await supabase
        .rpc('get_public_profile', { profile_slug: slug });

      if (error) throw error;
      if (!data) return null;

      return data as PublicProfileData;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes cache for public profiles
  });

  const sendContactRequest = useMutation({
    mutationFn: async (request: ContactRequestData) => {
      const { data, error } = await supabase
        .rpc('submit_contact_request', {
          p_professional_id: request.professional_id,
          p_name: request.name,
          p_phone: request.phone || null,
          p_email: request.email || null,
          p_message: request.message || null,
          p_service_type: request.service_type || 'session',
        });

      if (error) throw error;

      // Check if the RPC returned an error in the JSON
      const result = data as { error?: string; id?: string; status?: string };
      if (result?.error) throw new Error(result.error);

      return result;
    },
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    notFound: !profileQuery.isLoading && !profileQuery.data,
    sendContactRequest,
  };
}
