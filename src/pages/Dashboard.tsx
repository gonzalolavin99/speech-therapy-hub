import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { WeeklyCalendar } from "@/components/calendar/WeeklyCalendar";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ReminderWidget } from "@/components/dashboard/ReminderWidget";
import { Users, Calendar, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePatients } from "@/hooks/usePatients";
import { usePlannings } from "@/hooks/usePlannings";
import { usePayments } from "@/hooks/usePayments";
import { useSessions, SessionFormData } from "@/hooks/useSessions";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { SessionFormDialog } from "@/components/forms/SessionFormDialog";
import { PendingSessionsModal } from "@/components/sessions/PendingSessionsModal";
import { SessionDetailModal } from "@/components/sessions/SessionDetailModal";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Session } from "@/hooks/useSessions";

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSessionFormOpen, setIsSessionFormOpen] = useState(false);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [pendingSessionsChecked, setPendingSessionsChecked] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { patients } = usePatients();
  const { plannings } = usePlannings();
  const { payments } = usePayments();
  const { sessions, createSession, updateSession, deleteSession } = useSessions();
  const { createPayment } = usePayments();
  const { isConnected: isGoogleConnected, createEvent } = useGoogleCalendar();

  const patientOptions = patients.map(p => ({ id: p.id, name: p.name }));

  // Detectar sesiones pasadas que aún están en 'scheduled'
  const now = new Date();
  const pendingSessions = sessions.filter(session => {
    const sessionEnd = new Date(session.end_time);
    return session.status === 'scheduled' && sessionEnd < now;
  });

  // Mostrar modal de confirmación automáticamente si hay sesiones pendientes
  useEffect(() => {
    if (pendingSessions.length > 0 && !pendingSessionsChecked) {
      setIsPendingModalOpen(true);
      setPendingSessionsChecked(true);
    }
  }, [pendingSessions.length, pendingSessionsChecked]);

  const handleConfirmPendingSession = async (sessionId: string, completed: boolean, amount?: number) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    // Actualizar estado de la sesión
    updateSession.mutate({
      id: sessionId,
      status: completed ? 'completed' : 'no_show',
    });

    // Si se completó, crear pago pendiente
    if (completed && amount && amount > 0) {
      createPayment.mutate({
        patient_id: session.patient_id,
        session_id: sessionId,
        amount: amount,
        session_date: session.start_time.split('T')[0],
        status: 'pending',
      });
    }
  };

  const activePatients = patients.filter(p => p.status === 'active').length;
  const activePlannings = plannings.filter(p => p.status === 'active').length;
  const completedSessions = plannings.reduce((acc, p) => acc + p.completed_sessions, 0);
  const paidPayments = payments.filter(p => p.status === 'paid').length;

  const handleCreateSession = async (data: any) => {
    // Crear fechas como hora local y convertir a ISO con timezone
    const startDate = new Date(`${data.date}T${data.start_time}:00`);
    const endDate = new Date(`${data.date}T${data.end_time}:00`);
    const startDateTime = startDate.toISOString();
    const endDateTime = endDate.toISOString();
    
    const sessionData: SessionFormData = {
      patient_id: data.patient_id,
      title: data.title,
      session_type: data.session_type,
      start_time: startDateTime,
      end_time: endDateTime,
      notes: data.notes || null,
    };
    
    createSession.mutate(sessionData, {
      onSuccess: async () => {
        // Sync to Google Calendar if connected
        if (isGoogleConnected) {
          const success = await createEvent({
            title: data.title,
            description: data.notes || `Cita con paciente - ${data.session_type}`,
            startTime: startDateTime,
            endTime: endDateTime,
          });
          
          if (success) {
            toast.success('Cita sincronizada con Google Calendar');
          }
        }
      }
    });
  };

  // Handlers para el modal de detalle de sesión
  const handleSessionClick = (session: any) => {
    // Buscar la sesión completa en el array de sessions
    const fullSession = sessions.find(s => s.id === session.id);
    if (fullSession) {
      setSelectedSession(fullSession);
      setIsDetailModalOpen(true);
    }
  };

  const handleConfirmSession = (sessionId: string) => {
    updateSession.mutate(
      { id: sessionId, status: 'confirmed' },
      { onSuccess: () => setSelectedSession(prev => prev ? { ...prev, status: 'confirmed' } : null) }
    );
  };

  const handleCancelSession = (sessionId: string) => {
    updateSession.mutate(
      { id: sessionId, status: 'cancelled' },
      { onSuccess: () => {
        setSelectedSession(prev => prev ? { ...prev, status: 'cancelled' } : null);
      }}
    );
  };

  const handleCompleteSession = (sessionId: string) => {
    updateSession.mutate(
      { id: sessionId, status: 'completed' },
      { onSuccess: () => {
        setSelectedSession(prev => prev ? { ...prev, status: 'completed' } : null);
      }}
    );
  };

  const handleDeleteSession = (sessionId: string) => {
    deleteSession.mutate(sessionId);
    setIsDetailModalOpen(false);
  };

  const handleUpdateNotes = (sessionId: string, notes: string) => {
    updateSession.mutate(
      { id: sessionId, notes },
      { onSuccess: () => {
        setSelectedSession(prev => prev ? { ...prev, notes } : null);
        toast.success('Notas actualizadas');
      }}
    );
  };

  const handleViewPayment = (patientId: string) => {
    setIsDetailModalOpen(false);
    navigate('/pagos');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  // Obtener nombre del usuario: primero del perfil profesional, luego user_metadata, luego email
  const userName = profile?.full_name 
    || user?.user_metadata?.full_name 
    || user?.user_metadata?.name 
    || user?.email?.split('@')[0] 
    || 'Usuario';

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

        {/* Stats Grid with Reminders */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
          <ReminderWidget />
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
            onSessionClick={handleSessionClick}
            onDeleteSession={handleDeleteSession}
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

      <PendingSessionsModal
        open={isPendingModalOpen}
        onOpenChange={setIsPendingModalOpen}
        pendingSessions={pendingSessions}
        onConfirmSession={handleConfirmPendingSession}
        defaultSessionPrice={30000}
      />

      <SessionDetailModal
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        session={selectedSession}
        onConfirm={handleConfirmSession}
        onCancel={handleCancelSession}
        onComplete={handleCompleteSession}
        onDelete={handleDeleteSession}
        onUpdateNotes={handleUpdateNotes}
        onViewPayment={handleViewPayment}
        isLoading={updateSession.isPending}
      />
    </AppLayout>
  );
}
