import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Send,
  RefreshCw,
} from "lucide-react";
import { useBookingRequests, BookingRequest } from "@/hooks/useBookingRequests";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

function buildWhatsAppUrl(phone: string, message: string) {
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encoded}`;
}

function buildMailtoUrl(email: string, subject: string, body: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function BookingRequestsWidget() {
  const { pendingBookings, pendingCount, isLoading, confirmBooking, rejectBooking } = useBookingRequests();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectMode, setRejectMode] = useState<'reject' | 'reschedule'>('reject');
  const [suggestedDate, setSuggestedDate] = useState('');
  const [suggestedTime, setSuggestedTime] = useState('');
  const [showNotifyId, setShowNotifyId] = useState<string | null>(null);
  const [notifyAction, setNotifyAction] = useState<'confirmed' | 'rejected'>('confirmed');
  const [lastBooking, setLastBooking] = useState<BookingRequest | null>(null);

  if (isLoading) return null;
  if (pendingCount === 0) return null;

  const handleConfirm = (booking: BookingRequest) => {
    confirmBooking.mutate(booking.id, {
      onSuccess: () => {
        setLastBooking(booking);
        setNotifyAction('confirmed');
        setShowNotifyId(booking.id);
      }
    });
  };

  const handleStartReject = (bookingId: string, mode: 'reject' | 'reschedule') => {
    if (rejectingId === bookingId && rejectMode === mode) {
      // Cancel the reject mode if clicking same action again
      setRejectingId(null);
      setRejectReason('');
      setSuggestedDate('');
      setSuggestedTime('');
    } else {
      setRejectingId(bookingId);
      setRejectMode(mode);
      setRejectReason('');
      setSuggestedDate('');
      setSuggestedTime('');
    }
  };

  const handleCancelReject = () => {
    setRejectingId(null);
    setRejectReason('');
    setSuggestedDate('');
    setSuggestedTime('');
  };

  const handleConfirmReject = (booking: BookingRequest) => {
    let reason = rejectReason;
    if (rejectMode === 'reschedule' && suggestedDate) {
      reason = `${rejectReason ? rejectReason + '. ' : ''}Horario alternativo sugerido: ${formatDate(suggestedDate)}${suggestedTime ? ` a las ${suggestedTime}` : ''}`;
    }
    rejectBooking.mutate(
      { bookingId: booking.id, reason },
      {
        onSuccess: () => {
          setLastBooking(booking);
          setNotifyAction('rejected');
          setShowNotifyId(booking.id);
          setRejectingId(null);
          setRejectReason('');
          setSuggestedDate('');
          setSuggestedTime('');
        }
      }
    );
  };

  const getConfirmMessage = (booking: BookingRequest) => {
    return `Hola ${booking.patient_name}, tu cita de ${SESSION_TYPE_LABELS[booking.session_type] || booking.session_type} ha sido confirmada para el ${formatDate(booking.requested_date)} a las ${formatTime(booking.requested_start_time)}. Te esperamos!`;
  };

  const getRejectMessage = (booking: BookingRequest) => {
    let msg = `Hola ${booking.patient_name}, lamentablemente no podemos confirmar tu cita de ${SESSION_TYPE_LABELS[booking.session_type] || booking.session_type} para el ${formatDate(booking.requested_date)} a las ${formatTime(booking.requested_start_time)}.`;
    if (rejectMode === 'reschedule' && suggestedDate) {
      msg += ` Te proponemos el ${formatDate(suggestedDate)}${suggestedTime ? ` a las ${suggestedTime}` : ''}. ¿Te parece bien?`;
    } else if (rejectReason) {
      msg += ` Motivo: ${rejectReason}.`;
    }
    msg += ' Puedes reagendar en nuestro perfil o contactarnos directamente.';
    return msg;
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
            onConfirm={() => handleConfirm(booking)}
            onStartReject={(mode) => handleStartReject(booking.id, mode)}
            onCancelReject={handleCancelReject}
            onConfirmReject={() => handleConfirmReject(booking)}
            isConfirming={confirmBooking.isPending}
            isRejecting={rejectBooking.isPending}
            rejectingId={rejectingId}
            rejectMode={rejectMode}
            rejectReason={rejectReason}
            setRejectReason={setRejectReason}
            suggestedDate={suggestedDate}
            setSuggestedDate={setSuggestedDate}
            suggestedTime={suggestedTime}
            setSuggestedTime={setSuggestedTime}
            showNotify={showNotifyId === booking.id}
            notifyAction={notifyAction}
            confirmMessage={getConfirmMessage(booking)}
            rejectMessage={getRejectMessage(booking)}
            onDismissNotify={() => setShowNotifyId(null)}
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
  onConfirm: () => void;
  onStartReject: (mode: 'reject' | 'reschedule') => void;
  onCancelReject: () => void;
  onConfirmReject: () => void;
  isConfirming: boolean;
  isRejecting: boolean;
  rejectingId: string | null;
  rejectMode: 'reject' | 'reschedule';
  rejectReason: string;
  setRejectReason: (v: string) => void;
  suggestedDate: string;
  setSuggestedDate: (v: string) => void;
  suggestedTime: string;
  setSuggestedTime: (v: string) => void;
  showNotify: boolean;
  notifyAction: 'confirmed' | 'rejected';
  confirmMessage: string;
  rejectMessage: string;
  onDismissNotify: () => void;
}

function BookingRequestCard({
  booking,
  onConfirm,
  onStartReject,
  onCancelReject,
  onConfirmReject,
  isConfirming,
  isRejecting,
  rejectingId,
  rejectMode,
  rejectReason,
  setRejectReason,
  suggestedDate,
  setSuggestedDate,
  suggestedTime,
  setSuggestedTime,
  showNotify,
  notifyAction,
  confirmMessage,
  rejectMessage,
  onDismissNotify,
}: BookingCardProps) {
  const isRejectMode = rejectingId === booking.id;

  // Show notification prompt after confirm/reject
  if (showNotify) {
    const message = notifyAction === 'confirmed' ? confirmMessage : rejectMessage;
    const subject = notifyAction === 'confirmed'
      ? 'Cita Confirmada'
      : 'Respuesta a tu solicitud de cita';

    return (
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          {notifyAction === 'confirmed' ? (
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          )}
          <span className="font-medium text-sm">
            Cita {notifyAction === 'confirmed' ? 'confirmada' : 'rechazada'} — {booking.patient_name}
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          Envía una notificación al paciente:
        </p>

        <div className="flex flex-wrap gap-2">
          {booking.patient_phone && (
            <Button
              size="sm"
              className="h-8 text-xs bg-[#25D366] hover:bg-[#20BD5A] text-white"
              onClick={() => {
                window.open(buildWhatsAppUrl(booking.patient_phone!, message), '_blank');
                onDismissNotify();
              }}
            >
              <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
              WhatsApp
            </Button>
          )}
          {booking.patient_email && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                window.open(buildMailtoUrl(booking.patient_email!, subject, message), '_blank');
                onDismissNotify();
              }}
            >
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              Email
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => {
              navigator.clipboard.writeText(message);
              toast.success('Mensaje copiado al portapapeles');
            }}
          >
            Copiar mensaje
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-muted-foreground"
            onClick={onDismissNotify}
          >
            Omitir
          </Button>
        </div>
      </div>
    );
  }

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

      {/* Reject/Reschedule form */}
      {isRejectMode && (
        <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-dashed">
          {rejectMode === 'reschedule' ? (
            <>
              <p className="text-xs font-medium text-foreground">Sugerir horario alternativo:</p>
              <div className="flex flex-wrap gap-2">
                <Input
                  type="date"
                  value={suggestedDate}
                  onChange={(e) => setSuggestedDate(e.target.value)}
                  className="text-xs h-8 w-auto flex-1 min-w-[140px]"
                  min={new Date().toISOString().split('T')[0]}
                />
                <Input
                  type="time"
                  value={suggestedTime}
                  onChange={(e) => setSuggestedTime(e.target.value)}
                  className="text-xs h-8 w-auto flex-1 min-w-[100px]"
                />
              </div>
              <Input
                placeholder="Mensaje adicional (opcional)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="text-xs h-8"
              />
            </>
          ) : (
            <Input
              placeholder="Razón de rechazo (opcional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="text-xs h-8"
              autoFocus
            />
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onConfirmReject}
              disabled={isRejecting || (rejectMode === 'reschedule' && !suggestedDate)}
              className="h-7 text-xs flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isRejecting ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : rejectMode === 'reschedule' ? (
                <RefreshCw className="h-3 w-3 mr-1" />
              ) : (
                <XCircle className="h-3 w-3 mr-1" />
              )}
              {rejectMode === 'reschedule' ? 'Rechazar y Sugerir' : 'Confirmar Rechazo'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancelReject}
              className="h-7 text-xs"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!isRejectMode && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isConfirming}
            className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700 text-white min-w-[100px]"
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
            onClick={() => onStartReject('reject')}
            disabled={isRejecting}
            className="h-8 text-xs text-destructive hover:text-destructive min-w-[80px]"
          >
            <CalendarX className="h-3 w-3 mr-1" />
            Rechazar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStartReject('reschedule')}
            disabled={isRejecting}
            className="h-8 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 min-w-[100px]"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Reagendar
          </Button>
          {booking.patient_phone && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-[#25D366]"
              title="Contactar por WhatsApp"
              onClick={() => {
                const phone = booking.patient_phone!.replace(/[^0-9+]/g, '');
                window.open(`https://wa.me/${phone}`, '_blank');
              }}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
