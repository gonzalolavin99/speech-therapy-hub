import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  User,
  Calendar,
  Target,
  FileText,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PlanningFormDialog } from "@/components/forms/PlanningFormDialog";
import { SessionFormDialog } from "@/components/forms/SessionFormDialog";
import { usePlannings, PlanningFormData } from "@/hooks/usePlannings";
import { useSessions, SessionFormData } from "@/hooks/useSessions";
import { usePatients } from "@/hooks/usePatients";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";

export default function Planificaciones() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingPlanning, setEditingPlanning] = useState<any>(null);
  const [sessionFormOpen, setSessionFormOpen] = useState(false);
  const [sessionsViewOpen, setSessionsViewOpen] = useState(false);
  const [activePlanningForSession, setActivePlanningForSession] = useState<any>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState({ title: '', desc: '', usage: '' });

  const { plannings, isLoading, createPlanning, updatePlanning } = usePlannings();
  const { sessions, createSession } = useSessions();
  const { patients, createPatient } = usePatients();
  const { canCreate } = useSubscription();

  const patientOptions = patients.map((p) => ({ id: p.id, name: p.name, diagnosis: p.diagnosis, age: p.age }));

  const filteredPlannings = plannings.filter(
    (planning) =>
      (planning.patient_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      planning.intervention_approach.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: any) => {
    const styles = {
      active: "bg-success/10 text-success",
      completed: "bg-info/10 text-info",
      paused: "bg-warning/10 text-warning",
    };
    const labels = {
      active: "Activa",
      completed: "Completada",
      paused: "Pausada",
    };
    return (
      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", styles[status])}>
        {labels[status]}
      </span>
    );
  };

  const getProgress = (completed: number, total: number) => {
    return Math.round((completed / total) * 100);
  };

  const handleFormSubmit = (data: any) => {
    const planningData: PlanningFormData = {
      patient_id: data.patientId,
      intervention_approach: data.interventionApproach,
      method: data.method,
      modality: data.modality === "grupal" ? "group" : "individual",
      contents: data.contents || null,
      general_objective: data.generalObjective,
      specific_objectives: data.specificObjectives || null,
      operational_objectives: data.operationalObjectives || null,
      general_plan: data.generalPlan || null,
      total_sessions: parseInt(data.totalSessions),
      frequency: data.frequency,
      session_duration: data.sessionDuration || null,
      status: editingPlanning?.status || "active",
    };
    if (formMode === "edit" && editingPlanning) {
      updatePlanning.mutate({ id: editingPlanning.id, ...planningData });
    } else {
      createPlanning.mutate(planningData);
    }
  };

  const handleEditPlanning = (planning: any) => {
    setEditingPlanning(planning);
    setFormMode("edit");
    setIsFormOpen(true);
  };

  const handleRegisterSession = (planning: any) => {
    setActivePlanningForSession(planning);
    setSessionFormOpen(true);
  };

  const handleViewSessions = (planning: any) => {
    setActivePlanningForSession(planning);
    setSessionsViewOpen(true);
  };

  const handleCreateSession = (data: any) => {
    if (!activePlanningForSession) return;
    const startDate = new Date(`${data.date}T${data.start_time}:00`);
    const endDate = new Date(`${data.date}T${data.end_time}:00`);
    const sessionData: SessionFormData = {
      patient_id: activePlanningForSession.patient_id,
      planning_id: activePlanningForSession.id,
      title: data.title || `${activePlanningForSession.intervention_approach} - ${activePlanningForSession.patient_name}`,
      session_type: data.session_type,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      notes: data.notes || null,
    };
    createSession.mutate(sessionData);
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

  const getPlanningSessions = (planningId: string) => {
    return sessions.filter(s => s.planning_id === planningId);
  };

  const getSessionStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'no_show': return <AlertCircle className="h-4 w-4 text-warning" />;
      default: return <Clock className="h-4 w-4 text-primary" />;
    }
  };

  const getSessionStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: 'Agendada', confirmed: 'Confirmada', completed: 'Completada',
      cancelled: 'Cancelada', no_show: 'No asisti\u00f3',
    };
    return labels[status] || status;
  };

  return (
    <AppLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Planificaciones</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona las planificaciones de intervenci&oacute;n de tus pacientes
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => {
              const activePlannings = plannings.filter(p => p.status === 'active').length;
              const check = canCreate('plannings', activePlannings);
              if (!check.allowed) {
                setUpgradeMsg({ title: 'Límite de planificaciones', desc: 'Has alcanzado el máximo de planificaciones activas de tu plan.', usage: check.message || '' });
                setUpgradeOpen(true);
                return;
              }
              setFormMode('create'); setEditingPlanning(null); setIsFormOpen(true);
            }}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Planificaci&oacute;n
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por paciente o enfoque..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Plannings List */}
        <div className="space-y-4">
          {filteredPlannings.length === 0 && (
            <div className="bg-card rounded-xl border p-12 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-lg font-medium text-muted-foreground">No hay planificaciones</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {searchQuery
                  ? "No se encontraron resultados para tu b\u00fasqueda"
                  : "Crea tu primera planificaci\u00f3n de intervenci\u00f3n para comenzar"}
              </p>
            </div>
          )}
          {filteredPlannings.map((planning) => (
            <div
              key={planning.id}
              className="bg-card rounded-xl border overflow-hidden"
            >
              {/* Header */}
              <div
                className="p-6 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() =>
                  setExpandedId(expandedId === planning.id ? null : planning.id)
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-card-foreground">
                        {planning.patient_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {planning.intervention_approach} - {planning.method}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(planning.status)}
                    <div className="text-right">
                      <p className="text-sm font-medium text-card-foreground">
                        {planning.completed_sessions}/{planning.total_sessions} sesiones
                      </p>
                      <div className="w-24 h-2 bg-muted rounded-full mt-1">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{
                            width: `${getProgress(
                              planning.completed_sessions,
                              planning.total_sessions
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                    {expandedId === planning.id ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedId === planning.id && (
                <div className="px-6 pb-6 pt-2 border-t">
                  {/* Info row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 mb-6">
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Modalidad</p>
                      <p className="text-sm font-medium text-card-foreground capitalize">{planning.modality === 'group' ? 'Grupal' : 'Individual'}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Frecuencia</p>
                      <p className="text-sm font-medium text-card-foreground">{planning.frequency}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Duraci&oacute;n sesi&oacute;n</p>
                      <p className="text-sm font-medium text-card-foreground">{planning.session_duration ? `${planning.session_duration} min` : '-'}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">M&eacute;todo</p>
                      <p className="text-sm font-medium text-card-foreground">{planning.method}</p>
                    </div>
                  </div>

                  {/* Objetivo General */}
                  <div className="mb-6 overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left p-3 font-semibold text-muted-foreground border text-xs uppercase tracking-wider">
                            Objetivo General
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-3 border text-card-foreground">
                            {planning.general_objective}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Contenidos */}
                  <div className="mb-6 overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left p-3 font-semibold text-muted-foreground border text-xs uppercase tracking-wider">
                            Contenidos
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-3 border text-card-foreground">
                            {(planning.contents || '').split('\n').filter(Boolean).map((c, i) => (
                              <div key={i} className="flex gap-2 py-0.5">
                                <span className="text-primary font-medium shrink-0">{i + 1}.</span>
                                <span>{c.replace(/^\d+[\.\)\-]\s*/, '')}</span>
                              </div>
                            ))}
                            {!(planning.contents || '').trim() && <span className="text-muted-foreground italic">-</span>}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Objectives Table */}
                  <div className="mb-6 overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left p-3 font-semibold text-muted-foreground border text-xs uppercase tracking-wider w-[50%]">Objetivo Espec&iacute;fico</th>
                          <th className="text-left p-3 font-semibold text-muted-foreground border text-xs uppercase tracking-wider w-[50%]">Objetivo Operacional</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const ROW_SEP = '|||';
                          const specifics = (planning.specific_objectives || '').split('\n').filter(Boolean);
                          const opRaw = planning.operational_objectives || '';
                          const opRows = opRaw.includes(ROW_SEP)
                            ? opRaw.split(ROW_SEP)
                            : opRaw.split('\n').filter(Boolean);
                          const maxRows = Math.max(specifics.length, opRows.length, 1);
                          return Array.from({ length: maxRows }, (_, i) => (
                            <tr key={i} className="border-b last:border-b-0">
                              <td className="p-3 border align-top text-card-foreground">
                                {specifics[i] ? (
                                  <span className="flex gap-2">
                                    <span className="text-primary font-medium shrink-0">{i + 1}.</span>
                                    <span>{specifics[i].replace(/^\d+[\.\)\-]\s*/, '')}</span>
                                  </span>
                                ) : <span className="text-muted-foreground italic">-</span>}
                              </td>
                              <td className="p-3 border align-top text-card-foreground">
                                {(opRows[i] || '').trim() ? (
                                  <div className="space-y-0.5">
                                    {opRows[i].trim().split('\n').filter(Boolean).map((op, j) => (
                                      <div key={j} className="flex gap-2">
                                        <span className="text-muted-foreground shrink-0 text-xs">{String.fromCharCode(97 + j)})</span>
                                        <span>{op.replace(/^\d+[\.\)\-]\s*/, '').replace(/^[a-z]\)\s*/, '')}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : <span className="text-muted-foreground italic">-</span>}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* General Plan */}
                  {planning.general_plan && (
                    <div className="mb-6">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Plan General de Intervenci&oacute;n</p>
                      <p className="text-sm text-card-foreground bg-muted/30 rounded-lg p-3 whitespace-pre-line">{planning.general_plan}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" size="sm" onClick={() => handleViewSessions(planning)}>
                      <Calendar className="h-4 w-4 mr-1" />
                      Ver Sesiones ({getPlanningSessions(planning.id).length})
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEditPlanning(planning)}>
                      Editar Planificaci&oacute;n
                    </Button>
                    <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => handleRegisterSession(planning)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Registrar Sesi&oacute;n
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <PlanningFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        patients={patientOptions}
        mode={formMode}
        initialData={editingPlanning ? {
          patientId: editingPlanning.patient_id,
          interventionApproach: editingPlanning.intervention_approach,
          method: editingPlanning.method,
          modality: editingPlanning.modality === 'group' ? 'grupal' as const : 'individual' as const,
          contents: editingPlanning.contents || '',
          generalObjective: editingPlanning.general_objective,
          specificObjectives: editingPlanning.specific_objectives || '',
          operationalObjectives: editingPlanning.operational_objectives || '',
          generalPlan: editingPlanning.general_plan || '',
          totalSessions: editingPlanning.total_sessions,
          frequency: editingPlanning.frequency,
          sessionDuration: editingPlanning.session_duration || 45,
        } : undefined}
      />

      <SessionFormDialog
        open={sessionFormOpen}
        onOpenChange={setSessionFormOpen}
        onSubmit={handleCreateSession}
        patients={patients.map(p => ({ id: p.id, name: p.name }))}
        initialData={activePlanningForSession ? {
          patient_id: activePlanningForSession.patient_id,
        } : undefined}
        isLoading={createSession.isPending}
        onQuickPatientCreate={handleQuickPatientCreate}
      />

      <Dialog open={sessionsViewOpen} onOpenChange={setSessionsViewOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Sesiones - {activePlanningForSession?.patient_name}
            </DialogTitle>
          </DialogHeader>
          {activePlanningForSession && (() => {
            const planningSessions = getPlanningSessions(activePlanningForSession.id);
            return planningSessions.length === 0 ? (
              <div className="py-8 text-center">
                <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No hay sesiones registradas para esta planificaci&oacute;n</p>
                <Button
                  size="sm"
                  className="mt-4"
                  onClick={() => { setSessionsViewOpen(false); handleRegisterSession(activePlanningForSession); }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Registrar primera sesi&oacute;n
                </Button>
              </div>
            ) : (
              <div className="space-y-3 py-2">
                {planningSessions
                  .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
                  .map(session => (
                    <div key={session.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                      {getSessionStatusIcon(session.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{session.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.start_time).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {' '}
                          {new Date(session.start_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                          {' - '}
                          {new Date(session.end_time).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full font-medium",
                        session.status === 'completed' && "bg-success/10 text-success",
                        session.status === 'cancelled' && "bg-destructive/10 text-destructive",
                        session.status === 'no_show' && "bg-warning/10 text-warning",
                        (session.status === 'scheduled' || session.status === 'confirmed') && "bg-primary/10 text-primary",
                      )}>
                        {getSessionStatusLabel(session.status)}
                      </span>
                    </div>
                  ))}
                <div className="pt-2 border-t">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => { setSessionsViewOpen(false); handleRegisterSession(activePlanningForSession); }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Registrar nueva sesi&oacute;n
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

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
