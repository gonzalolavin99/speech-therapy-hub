import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarClock, Save, Loader2, Clock, Globe } from "lucide-react";
import { useAvailability, AvailabilityFormData } from "@/hooks/useAvailability";
import { useProfile } from "@/hooks/useProfile";

const DAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const TIME_OPTIONS = Array.from({ length: 27 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7; // 07:00 to 20:00
  const min = i % 2 === 0 ? '00' : '30';
  return `${String(hour).padStart(2, '0')}:${min}`;
});

interface DayConfig {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  slot_duration: number;
}

export function AvailabilitySettings() {
  const { availability, isLoading, upsertAvailability } = useAvailability();
  const { profile, updateProfile } = useProfile();
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [days, setDays] = useState<DayConfig[]>([]);
  const [slotDuration, setSlotDuration] = useState(45);

  // Initialize from DB or defaults
  useEffect(() => {
    if (profile) {
      setBookingEnabled(profile.booking_enabled ?? false);
    }
  }, [profile]);

  useEffect(() => {
    const defaultDays: DayConfig[] = Array.from({ length: 7 }, (_, i) => ({
      day_of_week: i,
      start_time: '09:00',
      end_time: '18:00',
      is_active: i < 5, // Mon-Fri active by default
      slot_duration: 45,
    }));

    if (availability.length > 0) {
      const merged = defaultDays.map((def) => {
        const existing = availability.find((a) => a.day_of_week === def.day_of_week);
        if (existing) {
          return {
            day_of_week: existing.day_of_week,
            start_time: existing.start_time.slice(0, 5), // "09:00:00" -> "09:00"
            end_time: existing.end_time.slice(0, 5),
            is_active: existing.is_active,
            slot_duration: existing.slot_duration,
          };
        }
        return def;
      });
      setDays(merged);
      // Use first active day's slot_duration
      const firstActive = availability.find((a) => a.is_active);
      if (firstActive) setSlotDuration(firstActive.slot_duration);
    } else {
      setDays(defaultDays);
    }
  }, [availability]);

  const handleDayToggle = (dayIdx: number, active: boolean) => {
    setDays((prev) =>
      prev.map((d) => (d.day_of_week === dayIdx ? { ...d, is_active: active } : d))
    );
  };

  const handleTimeChange = (dayIdx: number, field: 'start_time' | 'end_time', value: string) => {
    setDays((prev) =>
      prev.map((d) => (d.day_of_week === dayIdx ? { ...d, [field]: value } : d))
    );
  };

  const handleSave = async () => {
    // Save booking_enabled to profile
    updateProfile.mutate({ booking_enabled: bookingEnabled } as any);

    // Save availability
    const items: AvailabilityFormData[] = days.map((d) => ({
      ...d,
      slot_duration: slotDuration,
    }));
    upsertAvailability.mutate(items);
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border p-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Cargando disponibilidad...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Agenda Pública Online
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Permite que los pacientes agenden citas directamente desde tu perfil público
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="booking-toggle" className="text-sm text-muted-foreground">
            {bookingEnabled ? 'Activada' : 'Desactivada'}
          </Label>
          <Switch
            id="booking-toggle"
            checked={bookingEnabled}
            onCheckedChange={setBookingEnabled}
          />
        </div>
      </div>

      {bookingEnabled && (
        <div className="space-y-6">
          {/* Link info */}
          {profile?.slug && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <Globe className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm text-muted-foreground">
                Los pacientes podrán agendar desde:{" "}
                <span className="font-medium text-primary">
                  {window.location.origin}/p/{profile.slug}
                </span>
              </p>
            </div>
          )}

          {/* Slot Duration */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Duración de cada bloque:</Label>
            </div>
            <Select
              value={String(slotDuration)}
              onValueChange={(v) => setSlotDuration(Number(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="45">45 min</SelectItem>
                <SelectItem value="60">60 min</SelectItem>
                <SelectItem value="90">90 min</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Weekly Schedule */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Horario Semanal</Label>
            <div className="space-y-2">
              {days.map((day) => (
                <div
                  key={day.day_of_week}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    day.is_active
                      ? 'bg-background border-border'
                      : 'bg-muted/30 border-transparent'
                  }`}
                >
                  <Switch
                    checked={day.is_active}
                    onCheckedChange={(v) => handleDayToggle(day.day_of_week, v)}
                  />
                  <span
                    className={`w-24 text-sm font-medium ${
                      day.is_active ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {DAY_LABELS[day.day_of_week]}
                  </span>

                  {day.is_active ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Select
                        value={day.start_time}
                        onValueChange={(v) =>
                          handleTimeChange(day.day_of_week, 'start_time', v)
                        }
                      >
                        <SelectTrigger className="w-24 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground text-xs">a</span>
                      <Select
                        value={day.end_time}
                        onValueChange={(v) =>
                          handleTimeChange(day.day_of_week, 'end_time', v)
                        }
                      >
                        <SelectTrigger className="w-24 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No disponible</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={upsertAvailability.isPending || updateProfile.isPending}
            className="w-full sm:w-auto"
          >
            {upsertAvailability.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Disponibilidad
          </Button>
        </div>
      )}
    </div>
  );
}
