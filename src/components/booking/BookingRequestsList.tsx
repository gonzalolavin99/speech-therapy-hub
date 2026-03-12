import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CalendarCheck,
  CalendarX,
  Clock,
  Loader2,
  User,
  Phone,
  Mail,
  MessageCircle,
  CheckCircle2,
  XCircle,
  CalendarClock,
} from "lucide-react";
import { useBookingRequests, BookingRequest } from "@/hooks/useBookingRequests";
import { cn } from "@/lib/utils";

const SESSION_TYPE_LABELS: Record<string, string> = {
  therapy: 'Terapia',
  evaluation: 'Evaluación',
  followup: 'Seguimiento',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending: { label: 'Pendiente', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30', icon: Clock },
  confirmed: { label: 'Confirmada', color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30', icon: CheckCircle2 },
  rejected: { label: 'Rechazada', color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30', icon: XCircle },
  cancelled: { label: 'Cancelada', color: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/30', icon: CalendarX },
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatTime(timeStr: string) {
  return timeStr.slice(0, 5); // "09:00:00" -> "09:00"
}

function timeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

export function BookingRequestsWidget() {
  const { pendingBookings, pendingCount, isLoading, confirmBooking, rejectBooking } = useBookingRequests();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  if (isLoading) return null;
  if (pendingCount === 0) return null;

  const handleConfirm = (bookingId: string) => {
    confirmBooking.mutate(bookingId);
  };

  const handleReject = (bookingId: string) => {
    if (rejectingId === bookingId) {
      rejectBooking.mutate({ bookingId, reason: rejectReason });
      setRejectingId(null);
      setRejectReason('');
    } else {
      setRejectingId(bookingId);
    }
  };

  return (
    <div className="rounded-xl border bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          Solicitudes de Cita
          <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold">
            {pendingCount}
          </span>
        </h3>
      </div>

      <div className="space-y-3">
        {pendingBookings.slice(0, 5).map((booking) => (
          <BookingRequestCard
            key={booking.id}
            booking={booking}
            onConfirm={handleConfirm}
            onReject={handleReject}
            isConfirming={confirmBooking.isPending}
            isRejecting={rejectBooking.isPending}
            rejectingId={rejectingId}
            rejectReason={rejectReason}
            setRejectReason={setRejectReason}
          />
        ))}
        {pendingCount > 5 && (
          <p className="text-xs text-muted-foreground text-center">
            +{pendingCount - 5} solicitudes más
          </p>
        )}
      </div>
    </div>
  );
}

interface BookingCardProps {
  booking: BookingRequest;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
  isConfirming: boolean;
  isRejecting: boolean;
  rejectingId: string | null;
  rejectReason: string;
  setRejectReason: (v: string) => void;
}

function BookingRequestCard({
  booking,
  onConfirm,
  onReject,
  isConfirming,
  isRejecting,
  rejectingId,
  rejectReason,
  setRejectReason,
}: BookingCardProps) {
  const isRejectMode = rejectingId === booking.id;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{booking.patient_name}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarCheck className="h-3 w-3" />
              {formatDate(booking.requested_date)} a las {formatTime(booking.requested_start_time)}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
              {SESSION_TYPE_LABELS[booking.session_type] || booking.session_type}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {booking.patient_phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {booking.patient_phone}
              </span>
            )}
            {booking.patient_email && (
              <span className="flex items-center gap-1 break-all">
                <Mail className="h-3 w-3 shrink-0" />
                {booking.patient_email}
              </span>
            )}
          </div>
          {booking.notes && (
            <p className="text-xs text-muted-foreground/80 dark:text-muted-foreground flex items-start gap-1 mt-1">
              <MessageCircle className="h-3 w-3 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{booking.notes}</span>
            </p>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {timeAgo(booking.created_at)}
        </span>
      </div>

      {/* Reject reason input */}
      {isRejectMode && (
        <Input
          placeholder="Razón de rechazo (opcional)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          className="text-xs h-8"
          autoFocus
        />
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => onConfirm(booking.id)}
          disabled={isConfirming}
          className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
        >
          {isConfirming ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <CalendarCheck className="h-3 w-3 mr-1" />
          )}
          Confirmar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onReject(booking.id)}
          disabled={isRejecting}
          className="flex-1 h-8 text-xs text-destructive hover:text-destructive"
        >
          {isRejecting ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <CalendarX className="h-3 w-3 mr-1" />
          )}
          {isRejectMode ? 'Confirmar Rechazo' : 'Rechazar'}
        </Button>
        {booking.patient_phone && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-[#25D366]"
            onClick={() => {
              const phone = booking.patient_phone!.replace(/[^0-9+]/g, '');
              window.open(`https://wa.me/${phone}`, '_blank');
            }}
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
