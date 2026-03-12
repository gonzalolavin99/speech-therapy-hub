import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { WeeklyCalendar } from "@/components/calendar/WeeklyCalendar";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ReminderWidget } from "@/components/dashboard/ReminderWidget";
import { ContactRequestsWidget } from "@/components/dashboard/ContactRequestsWidget";
import { BookingRequestsWidget } from "@/components/booking/BookingRequestsList";
import { Users, Calendar, CheckCircle, Clock, Sparkles, Loader2, Brain } from "lucide-react";
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
import { generateProgressAnalysis, isAIConfigured } from "@/lib/ai-service";
import { TrialBanner } from "@/components/subscription/TrialBanner";
import { ClinicInviteBanner } from "@/components/clinic/ClinicInviteBanner";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSessionFormOpen, setIsSessionFormOpen] = useState(false);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [pendingSessionsChecked, setPendingSessionsChecked] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState({ title: '', desc: '', usage: '' });
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { patients, createPatient } = usePatients();
  const { plannings } = usePlannings();
  const { payments } = usePayments();
  const { sessions, createSession, updateSession, deleteSession } = useSessions();
  const { createPayment } = usePayments();
  const { isConnected: isGoogleConnected, createEvent } = useGoogleCalendar();
  const { canCreate } = useSubscription();

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

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

  const activePatients = patients.filter(p => p.status === 'active').length;
  const activePlannings = plannings.filter(p => p.status === 'active').length;
  const completedSessions = plannings.reduce((acc, p) => acc + p.completed_sessions, 0);
  const paidPayments = payments.filter(p => p.status === 'paid').length;

  // Count sessions this week
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  const weekSessions = sessions.filter(s => {
    const d = new Date(s.start_time);
    return d >= startOfWeek && d < endOfWeek;
  }).length;

  const handleGenerateInsight = async () => {
    setIsGeneratingInsight(true);
    try {
      const insight = await generateProgressAnalysis(
        activePatients, patients.length, activePlannings,
        completedSessions, weekSessions, paidPayments, payments.length
      );
      setAiInsight(insight);
    } catch (err: any) {
      toast.error('Error al generar análisis', { description: err.message });
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  const handleQuickPatientCreate = async (data: { name: string; phone: string }): Promise<{ id: string; name: string } | null> => {
    try {
      const newPatient = await createPatient.mutateAsync({
        name: data.name,
        rut: "Por completar",
        phone: data.phone || null,
        status: 'active',
      });
      return { id: newPatient.id, name: newPatient.name };
    } catch {
      return null;
    }
  };

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
            onClick={() => {
              const thisMonthSessions = sessions.filter(s => {
                const d = new Date(s.start_time);
                const n = new Date();
                return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
              }).length;
              const check = canCreate('sessions', thisMonthSessions);
              if (!check.allowed) {
                setUpgradeMsg({ title: 'Límite de sesiones alcanzado', desc: 'Has alcanzado el máximo de sesiones mensuales de tu plan.', usage: check.message || '' });
                setUpgradeOpen(true);
                return;
              }
              setIsSessionFormOpen(true);
            }}
          >
            + Nueva Cita
          </Button>
        </div>

        {/* Banners */}
        <TrialBanner />
        <ClinicInviteBanner />

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

        {/* AI Insight */}
        {isAIConfigured() && (
          <div className="rounded-xl border bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Brain className="h-5 w-5 text-violet-600" />
                Análisis de Actividad IA
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateInsight}
                disabled={isGeneratingInsight}
                className="text-xs border-violet-300 text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:text-violet-400"
              >
                {isGeneratingInsight ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                )}
                {isGeneratingInsight ? "Analizando..." : aiInsight ? "Actualizar" : "Generar Análisis"}
              </Button>
            </div>
            {isGeneratingInsight && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analizando métricas de tu práctica...
              </div>
            )}
            {aiInsight && !isGeneratingInsight && (
              <div className="animate-in fade-in-0 duration-500">
                <p className="text-sm text-violet-900 dark:text-violet-200 leading-relaxed">{aiInsight}</p>
                <p className="text-[10px] text-muted-foreground italic mt-2">Generado por IA basado en tus métricas actuales.</p>
              </div>
            )}
            {!aiInsight && !isGeneratingInsight && (
              <p className="text-sm text-muted-foreground">Obtén un análisis inteligente de tu actividad clínica semanal.</p>
            )}
          </div>
        )}

        {/* Booking Requests */}
        <BookingRequestsWidget />

        {/* Contact Requests */}
        <ContactRequestsWidget />

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
        onQuickPatientCreate={handleQuickPatientCreate}
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

      <UpgradePrompt
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        title={upgradeMsg.title}
        description={upgradeMsg.desc}
        currentUsage={upgradeMsg.usage || undefined}
      />
    </AppLayout>
  );
}
