import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  User,
  Calendar,
  Target,
  FileText,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PlanningFormDialog } from "@/components/forms/PlanningFormDialog";
import { usePlannings, PlanningFormData } from "@/hooks/usePlannings";
import { usePatients } from "@/hooks/usePatients";

export default function Planificaciones() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { plannings, isLoading, createPlanning } = usePlannings();
  const { patients } = usePatients();

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
      status: "active",
    };
    createPlanning.mutate(planningData);
  };

  return (
    <AppLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Planificaciones</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona las planificaciones de intervención de tus pacientes
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Planificación
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
                      <p className="text-xs text-muted-foreground mb-1">Duración sesión</p>
                      <p className="text-sm font-medium text-card-foreground">{planning.session_duration ? `${planning.session_duration} min` : '-'}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Método</p>
                      <p className="text-sm font-medium text-card-foreground">{planning.method}</p>
                    </div>
                  </div>

                  {/* Contenidos */}
                  {planning.contents && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Contenidos a Intervenir</p>
                      <p className="text-sm text-card-foreground bg-primary/5 rounded-lg p-3 border border-primary/10">{planning.contents}</p>
                    </div>
                  )}

                  {/* Objectives Table */}
                  <div className="mb-6 overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left p-3 font-semibold text-muted-foreground border text-xs uppercase tracking-wider">Objetivo General</th>
                          <th className="text-left p-3 font-semibold text-muted-foreground border text-xs uppercase tracking-wider">Objetivos Específicos</th>
                          <th className="text-left p-3 font-semibold text-muted-foreground border text-xs uppercase tracking-wider">Objetivos Operacionales</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-3 border align-top text-card-foreground">
                            {planning.general_objective}
                          </td>
                          <td className="p-3 border align-top text-card-foreground">
                            {planning.specific_objectives ? (
                              <ul className="space-y-1.5">
                                {planning.specific_objectives.split('\n').filter(Boolean).map((obj, i) => (
                                  <li key={i} className="flex gap-2">
                                    <span className="text-primary font-medium shrink-0">{i + 1}.</span>
                                    <span>{obj.replace(/^\d+[\.\)\-]\s*/, '')}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-muted-foreground italic">Sin registrar</span>
                            )}
                          </td>
                          <td className="p-3 border align-top text-card-foreground">
                            {planning.operational_objectives ? (
                              <ul className="space-y-1.5">
                                {planning.operational_objectives.split('\n').filter(Boolean).map((obj, i) => (
                                  <li key={i} className="flex gap-2">
                                    <span className="text-primary font-medium shrink-0">{i + 1}.</span>
                                    <span>{obj.replace(/^\d+[\.\)\-]\s*/, '')}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-muted-foreground italic">Sin registrar</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* General Plan */}
                  {planning.general_plan && (
                    <div className="mb-6">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Plan General de Intervención</p>
                      <p className="text-sm text-card-foreground bg-muted/30 rounded-lg p-3 whitespace-pre-line">{planning.general_plan}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" size="sm">
                      Ver Sesiones
                    </Button>
                    <Button variant="outline" size="sm">
                      Editar Planificación
                    </Button>
                    <Button size="sm" className="bg-primary hover:bg-primary/90">
                      Registrar Sesión
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
        mode="create"
      />
    </AppLayout>
  );
}