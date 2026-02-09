import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { WeeklyCalendar } from "@/components/calendar/WeeklyCalendar";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Users, Calendar, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePatients } from "@/hooks/usePatients";
import { usePlannings } from "@/hooks/usePlannings";
import { usePayments } from "@/hooks/usePayments";
import { useSessions, SessionFormData } from "@/hooks/useSessions";
import { useAuth } from "@/contexts/AuthContext";
import { SessionFormDialog } from "@/components/forms/SessionFormDialog";

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSessionFormOpen, setIsSessionFormOpen] = useState(false);
  const { user } = useAuth();
  const { patients } = usePatients();
  const { plannings } = usePlannings();
  const { payments } = usePayments();
  const { sessions, createSession } = useSessions();

  const patientOptions = patients.map(p => ({ id: p.id, name: p.name }));

  const activePatients = patients.filter(p => p.status === 'active').length;
  const activePlannings = plannings.filter(p => p.status === 'active').length;
  const completedSessions = plannings.reduce((acc, p) => acc + p.completed_sessions, 0);
  const paidPayments = payments.filter(p => p.status === 'paid').length;

  const handleCreateSession = (data: any) => {
    const startDateTime = `${data.date}T${data.start_time}:00`;
    const endDateTime = `${data.date}T${data.end_time}:00`;
    
    const sessionData: SessionFormData = {
      patient_id: data.patient_id,
      title: data.title,
      session_type: data.session_type,
      start_time: startDateTime,
      end_time: endDateTime,
      notes: data.notes || null,
    };
    createSession.mutate(sessionData);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  const userName = user?.email?.split('@')[0] || 'Usuario';

  return (
    <AppLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {getGreeting()}, {userName} 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Aquí está el resumen de tu actividad
            </p>
          </div>
          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => setIsSessionFormOpen(true)}
          >
            + Nueva Cita
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Pacientes Activos"
            value={activePatients}
            description={`${patients.length} total registrados`}
            icon={Users}
            variant="primary"
          />
          <StatsCard
            title="Planificaciones Activas"
            value={activePlannings}
            description={`${plannings.length} total`}
            icon={Calendar}
            variant="info"
          />
          <StatsCard
            title="Sesiones Completadas"
            value={completedSessions}
            description="En todas las planificaciones"
            icon={CheckCircle}
            variant="success"
          />
          <StatsCard
            title="Pagos Realizados"
            value={paidPayments}
            description={`${payments.length} registros totales`}
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
            sessions={sessions}
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

      <SessionFormDialog
        open={isSessionFormOpen}
        onOpenChange={setIsSessionFormOpen}
        onSubmit={handleCreateSession}
        patients={patientOptions}
        isLoading={createSession.isPending}
      />
    </AppLayout>
  );
}
