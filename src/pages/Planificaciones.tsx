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
      general_objective: data.generalObjective,
      total_sessions: parseInt(data.totalSessions),
      frequency: data.frequency,
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Target className="h-4 w-4" />
                        <span className="text-sm font-medium">Objetivo General</span>
                      </div>
                      <p className="text-card-foreground">{planning.general_objective}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm font-medium">Frecuencia</span>
                      </div>
                      <p className="text-card-foreground">{planning.frequency}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm font-medium">Modalidad</span>
                      </div>
                      <p className="text-card-foreground capitalize">{planning.modality}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
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