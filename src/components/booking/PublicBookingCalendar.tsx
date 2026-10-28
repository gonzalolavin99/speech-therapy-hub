import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Send,
  CheckCircle2,
  User,
  Phone,
  Mail,
} from "lucide-react";
import { usePublicBooking, AvailableSlot } from "@/hooks/usePublicBooking";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface PublicBookingCalendarProps {
  slug: string;
  professionalName: string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DAY_HEADERS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

function formatTime(time: string) {
  // "09:00:00" or "09:00" -> "09:00"
  return time.slice(0, 5);
}

type BookingStep = 'date' | 'slot' | 'form' | 'success';

export function PublicBookingCalendar({ slug, professionalName }: PublicBookingCalendarProps) {
  const { createBooking } = usePublicBooking(slug);

  const [step, setStep] = useState<BookingStep>('date');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    session_type: 'therapy',
    notes: '',
  });

  // Fetch available slots for selected date
  const slotsQuery = useQuery({
    queryKey: ['available-slots', slug, selectedDate],
    queryFn: async () => {
      if (!slug || !selectedDate) return { slots: [], slot_duration: 45 };
      const { data, error } = await supabase.rpc('get_available_slots', {
        p_slug: slug,
        p_date: selectedDate,
      });
      if (error) throw error;
      const result = data as { slots?: AvailableSlot[]; slot_duration?: number; error?: string };
      if (result?.error) throw new Error(result.error);
      return {
        slots: (result?.slots || []) as AvailableSlot[],
        slot_duration: result?.slot_duration || 45,
      };
    },
    enabled: !!slug && !!selectedDate,
    staleTime: 30 * 1000,
  });

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday-based: getDay() gives 0=Sunday, we want 0=Monday
    const startDow = (firstDay.getDay() + 6) % 7;
    const days: (number | null)[] = [];

    // Leading empty cells
    for (let i = 0; i < startDow; i++) days.push(null);

    // Days of month
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);

    // Trailing empty cells
    while (days.length % 7 !== 0) days.push(null);

    return days;
  }, [currentMonth]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60); // Allow booking up to 60 days ahead

  const isDateSelectable = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date >= today && date <= maxDate;
  };

  const handleDateSelect = (day: number) => {
    if (!isDateSelectable(day)) return;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];
    setSelectedDate(dateStr);
    setSelectedSlot(null);
    setStep('slot');
  };

  const handleSlotSelect = (slot: AvailableSlot) => {
    setSelectedSlot(slot);
    setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedSlot || !formData.name.trim()) return;

    try {
      await createBooking.mutateAsync({
        slug,
        name: formData.name,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        session_type: formData.session_type,
        date: selectedDate,
        start_time: selectedSlot.start_time,
        notes: formData.notes || undefined,
      });
      setStep('success');
      toast.success('Solicitud de cita enviada');
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar solicitud');
    }
  };

  const handleBack = () => {
    if (step === 'slot') {
      setStep('date');
      setSelectedSlot(null);
    } else if (step === 'form') {
      setStep('slot');
    }
  };

  const prevMonth = () => {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  };

  const canGoPrev = currentMonth > new Date(today.getFullYear(), today.getMonth(), 1);
  const canGoNext = currentMonth < new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

  // Format selected date for display
  const selectedDateDisplay = selectedDate
    ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : '';

  // Success state
  if (step === 'success') {
    return (
      <div className="rounded-xl border bg-green-50/50 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/50 p-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">
          Solicitud enviada
        </h3>
        <p className="text-sm text-green-700 dark:text-green-400 mb-1">
          Tu solicitud de cita para el{' '}
          <strong className="capitalize">{selectedDateDisplay}</strong> a las{' '}
          <strong>{formatTime(selectedSlot?.start_time || '')}</strong> ha sido enviada.
        </p>
        <p className="text-sm text-green-700 dark:text-green-400">
          {professionalName} revisará tu solicitud y te confirmará pronto.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <h3 className="font-semibold text-card-foreground flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          Agendar Cita Online
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {step === 'date' && 'Selecciona un día disponible'}
          {step === 'slot' && (
            <>
              <button onClick={handleBack} className="text-primary hover:underline">
                &larr; Volver
              </button>
              {' '}&middot; Selecciona un horario para el{' '}
              <span className="capitalize font-medium">{selectedDateDisplay}</span>
            </>
          )}
          {step === 'form' && (
            <>
              <button onClick={handleBack} className="text-primary hover:underline">
                &larr; Volver
              </button>
              {' '}&middot; Completa tus datos para confirmar
            </>
          )}
        </p>
      </div>

      <div className="p-5">
        {/* Step 1: Date selection — mini calendar */}
        {step === 'date' && (
          <div>
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={prevMonth}
                disabled={!canGoPrev}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold text-card-foreground">
                {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={nextMonth}
                disabled={!canGoNext}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAY_HEADERS.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs font-medium text-muted-foreground py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                if (day === null) {
                  return <div key={`empty-${i}`} className="h-9" />;
                }

                const selectable = isDateSelectable(day);
                const isToday =
                  day === today.getDate() &&
                  currentMonth.getMonth() === today.getMonth() &&
                  currentMonth.getFullYear() === today.getFullYear();

                const dateStr = new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth(),
                  day
                )
                  .toISOString()
                  .split('T')[0];
                const isSelected = dateStr === selectedDate;

                // Weekend check (Saturday=5, Sunday=6 in our 0=Monday system)
                const dow = (new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).getDay() + 6) % 7;
                const isWeekend = dow >= 5;

                return (
                  <button
                    key={`day-${day}`}
                    onClick={() => selectable && handleDateSelect(day)}
                    disabled={!selectable}
                    className={cn(
                      'h-9 w-full rounded-md text-sm font-medium transition-colors',
                      selectable
                        ? 'hover:bg-primary/10 cursor-pointer'
                        : 'text-muted-foreground/30 cursor-not-allowed',
                      isToday && !isSelected && 'ring-1 ring-primary/50',
                      isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90',
                      isWeekend && selectable && !isSelected && 'text-muted-foreground'
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Slot selection */}
        {step === 'slot' && (
          <div>
            {slotsQuery.isLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Buscando horarios disponibles...</span>
              </div>
            ) : slotsQuery.data?.slots.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No hay horarios disponibles para este día.
                </p>
                <Button variant="outline" size="sm" onClick={handleBack} className="mt-3">
                  Elegir otro día
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slotsQuery.data?.slots.map((slot) => (
                  <button
                    key={slot.start_time}
                    onClick={() => handleSlotSelect(slot)}
                    className={cn(
                      'px-3 py-2.5 rounded-lg border text-sm font-medium transition-all',
                      'hover:border-primary hover:bg-primary/5 hover:text-primary',
                      selectedSlot?.start_time === slot.start_time
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-card-foreground'
                    )}
                  >
                    {formatTime(slot.start_time)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Booking form */}
        {step === 'form' && selectedSlot && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Selected time summary */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <Clock className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm">
                <span className="capitalize font-medium">{selectedDateDisplay}</span>
                {' '}a las{' '}
                <span className="font-semibold text-primary">{formatTime(selectedSlot.start_time)}</span>
                {' - '}
                <span className="font-semibold text-primary">{formatTime(selectedSlot.end_time)}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium flex items-center gap-1">
                  <User className="h-3 w-3" /> Nombre *
                </label>
                <Input
                  required
                  placeholder="Tu nombre completo"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Teléfono
                </label>
                <Input
                  placeholder="+56 9 1234 5678"
                  value={formData.phone}
                  onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </label>
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Tipo de servicio</label>
                <Select
                  value={formData.session_type}
                  onValueChange={(v) => setFormData((p) => ({ ...p, session_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="therapy">Sesión de terapia</SelectItem>
                    <SelectItem value="evaluation">Evaluación diagnóstica</SelectItem>
                    <SelectItem value="followup">Seguimiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Mensaje (opcional)</label>
              <Textarea
                placeholder="Cuéntanos brevemente el motivo de tu consulta..."
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={createBooking.isPending || !formData.name.trim()}
            >
              {createBooking.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Solicitar Cita
            </Button>

            <p className="text-[10px] text-muted-foreground text-center">
              Tu solicitud será revisada por {professionalName}. Te confirmarán la cita pronto.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
