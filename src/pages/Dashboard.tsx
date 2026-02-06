import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { WeeklyCalendar } from "@/components/calendar/WeeklyCalendar";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Users, Calendar, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());

  return (
    <AppLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Buenos días 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Aquí está el resumen de tu semana
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            + Nueva Cita
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Pacientes Activos"
            value={24}
            description="Total en tratamiento"
            icon={Users}
            variant="primary"
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title="Citas Esta Semana"
            value={18}
            description="5 evaluaciones, 13 terapias"
            icon={Calendar}
            variant="info"
          />
          <StatsCard
            title="Sesiones Completadas"
            value={156}
            description="Este mes"
            icon={CheckCircle}
            variant="success"
            trend={{ value: 8, isPositive: true }}
          />
          <StatsCard
            title="Próxima Cita"
            value="09:00"
            description="María García - Evaluación"
            icon={Clock}
            variant="warning"
          />
        </div>

        {/* Calendar */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Calendario Semanal
          </h2>
          <WeeklyCalendar
            currentDate={currentDate}
            onDateChange={setCurrentDate}
          />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-info" />
            <span className="text-muted-foreground">Evaluación</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">Terapia</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-muted-foreground">Seguimiento</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
