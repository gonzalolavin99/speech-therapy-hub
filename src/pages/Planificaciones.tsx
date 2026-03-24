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
  Upload,
  Sparkles,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlanningFormDialog } from "@/components/forms/PlanningFormDialog";
import { SessionFormDialog } from "@/components/forms/SessionFormDialog";
import { usePlannings, PlanningFormData } from "@/hooks/usePlannings";
import { useSessions, SessionFormData } from "@/hooks/useSessions";
import { usePatients } from "@/hooks/usePatients";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";
import { toast } from "sonner";
import { generatePlanningFromText, isAIConfigured } from "@/lib/ai-service";
import { DialogDescription } from "@/components/ui/dialog";

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

  // Import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importPatientId, setImportPatientId] = useState('');
  const [importSessions, setImportSessions] = useState('12');
  const [isImporting, setIsImporting] = useState(false);

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
      status: editingPlanning?.status === 'draft' ? 'active' : (editingPlanning?.status || "active"),
    };
    if (formMode === "edit" && editingPlanning) {
      updatePlanning.mutate({ id: editingPlanning.id, ...planningData });
    } else {
      createPlanning.mutate(planningData);
    }
  };

  const handleSaveDraft = (data: any) => {
    const draftData: PlanningFormData = {
      patient_id: data.patientId,
      intervention_approach: data.interventionApproach || 'Por definir',
      method: data.method || 'Por definir',
      modality: data.modality === "grupal" ? "group" : "individual",
      contents: data.contents || null,
      general_objective: data.generalObjective || 'Por definir',
      specific_objectives: data.specificObjectives || null,
      operational_objectives: data.operationalObjectives || null,
      general_plan: data.generalPlan || null,
      total_sessions: parseInt(data.totalSessions) || 12,
      frequency: data.frequency || '2 veces por semana',
      session_duration: data.sessionDuration || null,
      status: 'draft',
    };
    if (formMode === "edit" && editingPlanning) {
      updatePlanning.mutate({ id: editingPlanning.id, ...draftData });
    } else {
      createPlanning.mutate(draftData);
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

  const handleImportWithAI = async () => {
    if (!importPatientId) {
      toast.error('Selecciona un paciente');
      return;
    }
    if (!importText.trim()) {
      toast.error('Ingresa el texto de la planificación');
      return;
    }
    if (!isAIConfigured()) {
      toast.error('IA no configurada', { description: 'Configura VITE_OPENAI_API_KEY en tu archivo .env' });
      return;
    }

    setIsImporting(true);
    try {
      const patient = patients.find(p => p.id === importPatientId);
      const result = await generatePlanningFromText(
        importText,
        patient?.name,
        patient?.age,
        patient?.diagnosis
      );

      // Open the form pre-filled with AI-structured data for review
      setEditingPlanning({
        patient_id: importPatientId,
        intervention_approach: result.interventionApproach || '',
        method: result.method || '',
        modality: 'individual',
        contents: result.contents || '',
        general_objective: result.generalObjective || '',
        specific_objectives: result.specificObjectives || '',
        operational_objectives: result.operationalObjectives || '',
        general_plan: result.generalPlan || '',
        total_sessions: parseInt(importSessions) || 12,
        frequency: result.frequency || 'Semanal',
        session_duration: result.sessionDuration || 45,
      });
      setFormMode('create');
      setImportDialogOpen(false);
      setImportText('');
      setImportPatientId('');
      setImportSessions('12');
      setIsFormOpen(true);
      toast.success('IA estructuró la planificación. Revisa y ajusta antes de guardar.');
    } catch (error: any) {
      toast.error('Error al importar', { description: error.message });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportManual = () => {
    if (!importPatientId) {
      toast.error('Selecciona un paciente');
      return;
    }
    if (!importText.trim()) {
      toast.error('Ingresa el texto de la planificación');
      return;
    }

    // Open the planning form pre-filled with the raw text so user can organize it
    setEditingPlanning({
      patient_id: importPatientId,
      intervention_approach: '',
      method: '',
      modality: 'individual',
      contents: '',
      general_objective: '',
      specific_objectives: '',
      operational_objectives: '',
      general_plan: importText,
      total_sessions: parseInt(importSessions) || 12,
      frequency: 'Semanal',
      session_duration: 45,
    });
    setFormMode('create');
    setImportDialogOpen(false);
    setImportText('');
    setImportPatientId('');
    setImportSessions('12');
    setIsFormOpen(true);
    toast.info('Completa los campos de la planificación con la información del texto importado.');
  };

  const getPlanningSessions = (planningId: string) => {
    return sessions.filter(s => s.planning_id === planningId);
  };

  const getCompletedSessionsCount = (planningId: string) => {
    return sessions.filter(s => s.planning_id === planningId && s.status === 'completed').length;
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
      <div className="p-4 md:p-8 space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Planificaciones</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestiona las planificaciones de tus pacientes
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => setImportDialogOpen(true)}
            >
              <Upload className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Importar</span>
              <span className="sm:hidden">Importar</span>
            </Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 flex-1 sm:flex-none"
              onClick={() => {
                const activePlannings = plannings.filter(p => p.status === 'active').length;
                const check = canCreate('plannings', activePlannings);
                if (!check.allowed) {
                  setUpgradeMsg({ title: 'Limite de planificaciones', desc: 'Has alcanzado el maximo de planificaciones activas de tu plan.', usage: check.message || '' });
                  setUpgradeOpen(true);
                  return;
                }
                setFormMode('create'); setEditingPlanning(null); setIsFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Nueva
            </Button>
          </div>
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
                className="p-4 md:p-6 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() =>
                  setExpandedId(expandedId === planning.id ? null : planning.id)
                }
              >
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-card-foreground truncate">
                          {planning.patient_name}
                        </h3>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">
                          {planning.intervention_approach} - {planning.method}
                        </p>
                      </div>
                      {expandedId === planning.id ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {getStatusBadge(planning.status)}
                      <span className="text-xs md:text-sm font-medium text-card-foreground">
                        {getCompletedSessionsCount(planning.id)}/{planning.total_sessions} sesiones
                      </span>
                      <div className="w-16 md:w-24 h-1.5 md:h-2 bg-muted rounded-full">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{
                            width: `${getProgress(
                              getCompletedSessionsCount(planning.id),
                              planning.total_sessions
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedId === planning.id && (
                <div className="px-4 md:px-6 pb-4 md:pb-6 pt-2 border-t">
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
                  <div className="mb-6">
                    <div className="rounded-lg border overflow-hidden">
                      <div className="bg-primary/10 dark:bg-primary/15 px-4 py-2">
                        <p className="text-xs font-semibold text-primary uppercase tracking-wider">Objetivo General</p>
                      </div>
                      <div className="p-4 text-sm text-card-foreground">
                        {planning.general_objective}
                      </div>
                    </div>
                  </div>

                  {/* Contenidos */}
                  <div className="mb-6">
                    <div className="rounded-lg border overflow-hidden">
                      <div className="bg-primary/10 dark:bg-primary/15 px-4 py-2">
                        <p className="text-xs font-semibold text-primary uppercase tracking-wider">Contenidos</p>
                      </div>
                      <div className="p-4 text-sm text-card-foreground">
                        {(planning.contents || '').split('\n').filter(Boolean).map((c, i) => (
                          <div key={i} className="flex gap-2 py-0.5">
                            <span className="text-primary font-medium shrink-0">{i + 1}.</span>
                            <span>{c.replace(/^\d+[\.\)\-]\s*/, '')}</span>
                          </div>
                        ))}
                        {!(planning.contents || '').trim() && <span className="text-muted-foreground italic">-</span>}
                      </div>
                    </div>
                  </div>

                  {/* Objectives Table */}
                  <div className="mb-6 overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr>
                          <th className="text-left px-4 py-2 font-semibold text-primary bg-primary/10 dark:bg-primary/15 text-xs uppercase tracking-wider w-[50%] border-b border-r border-border">Objetivo Espec&iacute;fico</th>
                          <th className="text-left px-4 py-2 font-semibold text-primary bg-primary/10 dark:bg-primary/15 text-xs uppercase tracking-wider w-[50%] border-b border-border">Objetivo Operacional</th>
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
                            <tr key={i} className="border-b border-border last:border-b-0">
                              <td className="p-3 border-r border-border align-top text-card-foreground">
                                {specifics[i] ? (
                                  <span className="flex gap-2">
                                    <span className="text-primary font-medium shrink-0">{i + 1}.</span>
                                    <span>{specifics[i].replace(/^\d+[\.\)\-]\s*/, '')}</span>
                                  </span>
                                ) : <span className="text-muted-foreground italic">-</span>}
                              </td>
                              <td className="p-3 align-top text-card-foreground">
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

                  <div className="flex flex-wrap gap-2">
                    {planning.status === 'draft' ? (
                      <>
                        <Button size="sm" className="bg-primary hover:bg-primary/90 text-xs" onClick={() => handleEditPlanning(planning)}>
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          Continuar Editando
                        </Button>
                        <p className="text-xs text-muted-foreground self-center italic">Borrador — completa la planificación para activarla</p>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => handleViewSessions(planning)}>
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          Sesiones ({getPlanningSessions(planning.id).length})
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => handleEditPlanning(planning)}>
                          Editar
                        </Button>
                        <Button size="sm" className="bg-primary hover:bg-primary/90 text-xs" onClick={() => handleRegisterSession(planning)}>
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Registrar Sesion
                        </Button>
                      </>
                    )}
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
        onSaveDraft={handleSaveDraft}
        patients={patientOptions}
        mode={formMode}
        isDraft={editingPlanning?.status === 'draft'}
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

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => {
        if (!isImporting) {
          setImportDialogOpen(open);
          if (!open) { setImportText(''); setImportPatientId(''); setImportSessions('12'); }
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Importar Planificación Existente
            </DialogTitle>
            <DialogDescription>
              Pega el texto de una planificación que ya tenías y la IA la estructurará automáticamente, o impórtala de forma manual.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Patient Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Paciente *</label>
              <Select value={importPatientId} onValueChange={setImportPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Total sessions */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Total de sesiones planificadas</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={importSessions}
                onChange={(e) => setImportSessions(e.target.value)}
                placeholder="12"
              />
            </div>

            {/* Text area for plan */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Texto de la planificación *</label>
              <Textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={"Pega aquí tu planificación existente...\n\nEjemplo:\nObjetivo general: Mejorar habilidades comunicativas...\nObjetivos específicos:\n1. Aumentar vocabulario expresivo\n2. Mejorar estructuración de oraciones\n\nContenidos: Semántica, Morfosintaxis...\nFrecuencia: 2 veces por semana\nDuración: 45 minutos"}
                rows={10}
                className="resize-y min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground">
                {importText.length > 0 ? `${importText.length} caracteres` : 'Pega cualquier formato: Word, PDF copiado, notas, etc.'}
              </p>
            </div>

            {/* Tips */}
            <div className="rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/50 p-3">
              <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">💡 Tips para mejor resultado con IA:</p>
              <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-0.5 list-disc list-inside">
                <li>Incluye objetivos generales y específicos</li>
                <li>Menciona el enfoque o método de intervención</li>
                <li>Agrega frecuencia y duración de sesiones</li>
                <li>Incluye contenidos o áreas a trabajar</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleImportManual}
                disabled={isImporting}
              >
                <FileText className="h-4 w-4 mr-1.5" />
                Importar Manual
              </Button>
              <Button
                className="flex-1"
                onClick={handleImportWithAI}
                disabled={isImporting || !importText.trim() || !importPatientId}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Procesando con IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    Importar con IA
                  </>
                )}
              </Button>
            </div>
          </div>
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
