import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BookingRequest {
  id: string;
  user_id: string;
  patient_name: string;
  patient_phone: string | null;
  patient_email: string | null;
  patient_id: string | null;
  session_type: string;
  requested_date: string;
  requested_start_time: string;
  slot_duration: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled';
  notes: string | null;
  rejection_reason: string | null;
  session_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useBookingRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const bookingsQuery = useQuery({
    queryKey: ['booking-requests', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user');

      const { data, error } = await supabase
        .from('booking_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as BookingRequest[];
    },
    enabled: !!user,
  });

  const confirmBooking = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase
        .rpc('confirm_booking', { p_booking_id: bookingId });

      if (error) throw error;

      const result = data as { error?: string; status?: string; message?: string };
      if (result?.error) throw new Error(result.error);

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-requests'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast.success('Cita confirmada exitosamente');
    },
    onError: (error: Error) => {
      toast.error('Error al confirmar cita', { description: error.message });
    },
  });

  const rejectBooking = useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: string; reason?: string }) => {
      const { data, error } = await supabase
        .rpc('reject_booking', {
          p_booking_id: bookingId,
          p_reason: reason || null,
        });

      if (error) throw error;

      const result = data as { error?: string; status?: string };
      if (result?.error) throw new Error(result.error);

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-requests'] });
      toast.success('Solicitud rechazada');
    },
    onError: (error: Error) => {
      toast.error('Error al rechazar solicitud', { description: error.message });
    },
  });

  const pendingBookings = bookingsQuery.data?.filter((b) => b.status === 'pending') ?? [];

  return {
    bookings: bookingsQuery.data ?? [],
    pendingBookings,
    pendingCount: pendingBookings.length,
    isLoading: bookingsQuery.isLoading,
    confirmBooking,
    rejectBooking,
  };
}
