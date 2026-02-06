import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  patientName: string;
  time: string;
  duration: number;
  type: string;
  date: Date;
}

const mockAppointments: Appointment[] = [
  {
    id: "1",
    patientName: "María García",
    time: "09:00",
    duration: 45,
    type: "Evaluación",
    date: new Date(),
  },
  {
    id: "2",
    patientName: "Juan Pérez",
    time: "10:00",
    duration: 45,
    type: "Terapia",
    date: new Date(),
  },
  {
    id: "3",
    patientName: "Ana Rodríguez",
    time: "11:30",
    duration: 45,
    type: "Seguimiento",
    date: addDays(new Date(), 1),
  },
  {
    id: "4",
    patientName: "Carlos López",
    time: "14:00",
    duration: 45,
    type: "Terapia",
    date: addDays(new Date(), 2),
  },
  {
    id: "5",
    patientName: "Laura Martínez",
    time: "16:00",
    duration: 45,
    type: "Evaluación",
    date: addDays(new Date(), 3),
  },
];

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
}

export function WeeklyCalendar({ currentDate, onDateChange }: WeeklyCalendarProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getAppointmentsForDay = (date: Date) => {
    return mockAppointments.filter((apt) => isSameDay(apt.date, date));
  };

  const getAppointmentStyle = (type: string) => {
    switch (type) {
      case "Evaluación":
        return "bg-info/10 border-info text-info";
      case "Terapia":
        return "bg-primary/10 border-primary text-primary";
      case "Seguimiento":
        return "bg-success/10 border-success text-success";
      default:
        return "bg-muted border-muted-foreground text-muted-foreground";
    }
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
                  const dayAppointments = getAppointmentsForDay(day).filter(
                    (apt) => apt.time === time
                  );
                  return (
                    <div
                      key={dayIndex}
                      className={cn(
                        "p-1 border-r last:border-r-0 relative",
                        isSameDay(day, new Date()) && "bg-primary/5"
                      )}
                    >
                      {dayAppointments.map((apt) => (
                        <div
                          key={apt.id}
                          className={cn(
                            "rounded-lg border-l-2 px-2 py-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity",
                            getAppointmentStyle(apt.type)
                          )}
                        >
                          <p className="font-medium truncate">{apt.patientName}</p>
                          <p className="opacity-75">{apt.type}</p>
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
