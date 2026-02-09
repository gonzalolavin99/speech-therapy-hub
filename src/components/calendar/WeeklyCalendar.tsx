import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CalendarSession {
  id: string;
  patient_name?: string;
  start_time: string;
  end_time: string;
  session_type: 'evaluation' | 'therapy' | 'followup';
  title: string;
}

const timeSlots = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

interface WeeklyCalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  sessions?: CalendarSession[];
}

export function WeeklyCalendar({ currentDate, onDateChange, sessions = [] }: WeeklyCalendarProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getSessionsForDay = (date: Date) => {
    return sessions.filter((session) => {
      const sessionDate = new Date(session.start_time);
      return isSameDay(sessionDate, date);
    });
  };

  const getSessionTime = (session: CalendarSession) => {
    const date = new Date(session.start_time);
    return format(date, "HH:00");
  };

  const getSessionStyle = (type: string) => {
    switch (type) {
      case "evaluation":
        return "bg-info/10 border-info text-info";
      case "therapy":
        return "bg-primary/10 border-primary text-primary";
      case "followup":
        return "bg-success/10 border-success text-success";
      default:
        return "bg-muted border-muted-foreground text-muted-foreground";
    }
  };

  const getSessionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      evaluation: "Evaluación",
      therapy: "Terapia",
      followup: "Seguimiento",
    };
    return labels[type] || type;
  };

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-card-foreground">
          {format(currentDate, "MMMM yyyy", { locale: es })}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onDateChange(addDays(currentDate, -7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => onDateChange(new Date())}
            className="px-4"
          >
            Hoy
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onDateChange(addDays(currentDate, 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Day Headers */}
          <div className="grid grid-cols-8 border-b">
            <div className="p-3 text-xs font-medium text-muted-foreground border-r" />
            {weekDays.map((day, index) => (
              <div
                key={index}
                className={cn(
                  "p-3 text-center border-r last:border-r-0",
                  isSameDay(day, new Date()) && "bg-primary/5"
                )}
              >
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  {format(day, "EEE", { locale: es })}
                </p>
                <p
                  className={cn(
                    "text-lg font-semibold mt-1",
                    isSameDay(day, new Date())
                      ? "text-primary"
                      : "text-card-foreground"
                  )}
                >
                  {format(day, "d")}
                </p>
              </div>
            ))}
          </div>

          {/* Time Slots */}
          <div className="divide-y">
            {timeSlots.map((time) => (
              <div key={time} className="grid grid-cols-8 min-h-[60px]">
                <div className="p-2 text-xs text-muted-foreground border-r flex items-start justify-end pr-3">
                  {time}
                </div>
                {weekDays.map((day, dayIndex) => {
                  const daySessions = getSessionsForDay(day).filter(
                    (session) => getSessionTime(session) === time
                  );
                  return (
                    <div
                      key={dayIndex}
                      className={cn(
                        "p-1 border-r last:border-r-0 relative",
                        isSameDay(day, new Date()) && "bg-primary/5"
                      )}
                    >
                      {daySessions.map((session) => (
                        <div
                          key={session.id}
                          className={cn(
                            "rounded-lg border-l-2 px-2 py-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity",
                            getSessionStyle(session.session_type)
                          )}
                        >
                          <p className="font-medium truncate">{session.patient_name || session.title}</p>
                          <p className="opacity-75">{getSessionTypeLabel(session.session_type)}</p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
