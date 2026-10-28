import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AvailableSlot {
  start_time: string; // "09:00:00"
  end_time: string;   // "09:45:00"
}

export interface BookingFormData {
  slug: string;
  name: string;
  phone?: string;
  email?: string;
  session_type: string;
  date: string; // "2024-03-15"
  start_time: string; // "09:00:00"
  notes?: string;
}

export function usePublicBooking(slug: string | undefined) {
  const createBooking = useMutation({
    mutationFn: async (booking: BookingFormData) => {
      const { data, error } = await supabase
        .rpc('create_booking_request', {
          p_slug: booking.slug,
          p_name: booking.name,
          p_phone: booking.phone || null,
          p_email: booking.email || null,
          p_session_type: booking.session_type,
          p_date: booking.date,
          p_start_time: booking.start_time,
          p_notes: booking.notes || null,
        });

      if (error) throw error;

      const result = data as { error?: string; id?: string; status?: string; message?: string };
      if (result?.error) throw new Error(result.error);

      return result;
    },
  });

  return {
    createBooking,
  };
}
