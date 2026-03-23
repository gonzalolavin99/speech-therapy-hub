import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  Dumbbell,
  Edit2,
  Trash2,
  UserPlus,
  Clock,
  CheckCircle2,
  PlayCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Users,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExercises, ExerciseFormData, AssignmentFormData } from "@/hooks/useExercises";
import { usePatients } from "@/hooks/usePatients";
import { ExerciseFormDialog } from "@/components/forms/ExerciseFormDialog";
import { AssignExerciseDialog } from "@/components/forms/AssignExerciseDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CATEGORIES = [
  { value: "all", label: "Todas las categorías" },
  { value: "articulacion", label: "Articulación" },
  { value: "lenguaje", label: "Lenguaje" },
  { value: "voz", label: "Voz" },
  { value: "deglucion", label: "Deglución" },
  { value: "respiracion", label: "Respiración" },
  { value: "motricidad", label: "Motricidad" },
  { value: "otro", label: "Otro" },
];

const CATEGORY_LABELS: Record<string, string> = {
  articulacion: "Articulación",
  lenguaje: "Lenguaje",
  voz: "Voz",
  deglucion: "Deglución",
  respiracion: "Respiración",
  motricidad: "Motricidad",
  otro: "Otro",
};

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string }> = {
  easy: { label: "Fácil", color: "bg-success/10 text-success" },
  medium: { label: "Medio", color: "bg-warning/10 text-warning" },
  hard: { label: "Difícil", color: "bg-destructive/10 text-destructive" },
};

const AGE_LABELS: Record<string, string> = {
  infantil: "Infantil",
  adolescente: "Adolescente",
  adulto: "Adulto",
  todos: "Todos",
};

const FREQUENCY_LABELS: Record<string, string> = {
  diario: "Diario",
  "3_veces_semana": "3 veces/semana",
  semanal: "Semanal",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  assigned: { label: "Asignado", color: "bg-primary/10 text-primary", icon: UserPlus },
  in_progress: { label: "En progreso", color: "bg-warning/10 text-warning", icon: PlayCircle },
  completed: { label: "Completado", color: "bg-success/10 text-success", icon: CheckCircle2 },
};

export default function Ejercicios() {
  const [activeTab, setActiveTab] = useState<"biblioteca" | "asignados">("biblioteca");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningExercise, setAssigningExercise] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<"exercise" | "assignment">("exercise");

  const {
    exercises,
    assignments,
    isLoading,
    createExercise,
    updateExercise,
    deleteExercise,
    assignExercise,
    updateAssignment,
    deleteAssignment,
  } = useExercises();
  const { patients } = usePatients();

  // Filter exercises
  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch =
      ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ex.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || ex.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Group assignments by patient
  const assignmentsByPatient = assignments.reduce((acc, a) => {
    const name = a.patient_name || "Sin paciente";
    if (!acc[name]) acc[name] = [];
    acc[name].push(a);
    return acc;
  }, {} as Record<string, typeof assignments>);

  const handleFormSubmit = (data: any) => {
    if (formMode === "edit" && editingExercise) {
      updateExercise.mutate({ id: editingExercise.id, ...data });
    } else {
      createExercise.mutate(data as ExerciseFormData);
    }
  };

  const handleEditExercise = (exercise: any) => {
    setEditingExercise(exercise);
    setFormMode("edit");
    setIsFormOpen(true);
  };

  const handleAssignExercise = (exercise: any) => {
    setAssigningExercise(exercise);
    setAssignDialogOpen(true);
  };

  const handleAssignSubmit = (data: AssignmentFormData) => {
    assignExercise.mutate(data);
  };

  const handleDeleteClick = (id: string, type: "exercise" | "assignment") => {
    setDeletingId(id);
    setDeleteType(type);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deletingId) return;
    if (deleteType === "exercise") {
      deleteExercise.mutate(deletingId);
    } else {
      deleteAssignment.mutate(deletingId);
    }
    setDeleteDialogOpen(false);
    setDeletingId(null);
  };

  const handleMarkCompleted = (id: string) => {
    updateAssignment.mutate({ id, status: "completed" });
  };

  const activeAssignments = assignments.filter((a) => a.status !== "completed");
  const completedAssignments = assignments.filter((a) => a.status === "completed");

  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Biblioteca de Ejercicios</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Crea y asigna ejercicios terapéuticos a tus pacientes
            </p>
          </div>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 self-start sm:self-auto"
            onClick={() => {
              setFormMode("create");
              setEditingExercise(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Nuevo Ejercicio
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
          <button
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === "biblioteca"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("biblioteca")}
          >
            <Dumbbell className="h-4 w-4 inline-block mr-1.5" />
            Biblioteca ({exercises.length})
          </button>
          <button
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === "asignados"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("asignados")}
          >
            <Users className="h-4 w-4 inline-block mr-1.5" />
            Asignados ({activeAssignments.length})
          </button>
        </div>

        {/* TAB: Biblioteca */}
        {activeTab === "biblioteca" && (
          <>
            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar ejercicios..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Exercise List */}
            <div className="space-y-3">
              {isLoading && (
                <div className="bg-card rounded-xl border p-12 text-center">
                  <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30 animate-pulse" />
                  <p className="text-muted-foreground">Cargando ejercicios...</p>
                </div>
              )}

              {!isLoading && filteredExercises.length === 0 && (
                <div className="bg-card rounded-xl border p-12 text-center">
                  <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-lg font-medium text-muted-foreground">No hay ejercicios</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    {searchQuery || categoryFilter !== "all"
                      ? "No se encontraron resultados para tu búsqueda"
                      : "Crea tu primer ejercicio para comenzar a armar tu biblioteca"}
                  </p>
                  {!searchQuery && categoryFilter === "all" && (
                    <Button
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        setFormMode("create");
                        setEditingExercise(null);
                        setIsFormOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Crear primer ejercicio
                    </Button>
                  )}
                </div>
              )}

              {filteredExercises.map((exercise) => {
                const isExpanded = expandedId === exercise.id;
                const diff = DIFFICULTY_CONFIG[exercise.difficulty] || DIFFICULTY_CONFIG.medium;
                const assignmentCount = assignments.filter(
                  (a) => a.exercise_id === exercise.id && a.status !== "completed"
                ).length;

                return (
                  <div key={exercise.id} className="bg-card rounded-xl border overflow-hidden">
                    {/* Card Header */}
                    <div
                      className="p-4 md:p-5 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : exercise.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Dumbbell className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-card-foreground truncate">
                              {exercise.title}
                            </h3>
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              {CATEGORY_LABELS[exercise.category] || exercise.category}
                            </span>
                            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", diff.color)}>
                              {diff.label}
                            </span>
                            {exercise.target_age && exercise.target_age !== "todos" && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                {AGE_LABELS[exercise.target_age] || exercise.target_age}
                              </span>
                            )}
                            {exercise.duration_minutes && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {exercise.duration_minutes} min
                              </span>
                            )}
                            {assignmentCount > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {assignmentCount} asignado{assignmentCount > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-4 md:px-5 pb-4 md:pb-5 pt-2 border-t space-y-4">
                        {exercise.description && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                              Descripción
                            </p>
                            <p className="text-sm text-card-foreground">{exercise.description}</p>
                          </div>
                        )}

                        {exercise.instructions && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                              Instrucciones
                            </p>
                            <div className="text-sm text-card-foreground bg-muted/30 rounded-lg p-3 whitespace-pre-line">
                              {exercise.instructions}
                            </div>
                          </div>
                        )}

                        {exercise.materials && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                              Materiales
                            </p>
                            <p className="text-sm text-card-foreground">{exercise.materials}</p>
                          </div>
                        )}

                        {exercise.video_url && (
                          <div>
                            <a
                              href={exercise.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Ver video demostrativo
                            </a>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssignExercise(exercise);
                            }}
                          >
                            <UserPlus className="h-3.5 w-3.5 mr-1" />
                            Asignar a Paciente
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditExercise(exercise);
                            }}
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(exercise.id, "exercise");
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* TAB: Asignados */}
        {activeTab === "asignados" && (
          <div className="space-y-6">
            {activeAssignments.length === 0 && completedAssignments.length === 0 && (
              <div className="bg-card rounded-xl border p-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-lg font-medium text-muted-foreground">No hay ejercicios asignados</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Asigna ejercicios desde la pestaña Biblioteca
                </p>
              </div>
            )}

            {/* Active assignments grouped by patient */}
            {Object.entries(assignmentsByPatient)
              .filter(([, items]) => items.some((a) => a.status !== "completed"))
              .map(([patientName, items]) => {
                const activeItems = items.filter((a) => a.status !== "completed");
                if (activeItems.length === 0) return null;

                return (
                  <div key={patientName} className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      {patientName}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({activeItems.length} ejercicio{activeItems.length > 1 ? "s" : ""})
                      </span>
                    </h3>

                    {activeItems.map((assignment) => {
                      const status = STATUS_CONFIG[assignment.status] || STATUS_CONFIG.assigned;
                      const StatusIcon = status.icon;

                      return (
                        <div
                          key={assignment.id}
                          className="bg-card rounded-xl border p-4 flex items-center gap-3"
                        >
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Dumbbell className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-card-foreground truncate">
                              {assignment.exercise_title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", status.color)}>
                                <StatusIcon className="h-3 w-3 inline-block mr-1" />
                                {status.label}
                              </span>
                              {assignment.frequency && (
                                <span className="text-xs text-muted-foreground">
                                  {FREQUENCY_LABELS[assignment.frequency] || assignment.frequency}
                                </span>
                              )}
                              {assignment.start_date && (
                                <span className="text-xs text-muted-foreground">
                                  Desde {new Date(assignment.start_date).toLocaleDateString("es-CL")}
                                </span>
                              )}
                            </div>
                            {assignment.notes && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {assignment.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8"
                              onClick={() => handleMarkCompleted(assignment.id)}
                              title="Marcar como completado"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteClick(assignment.id, "assignment")}
                              title="Eliminar asignación"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

            {/* Completed assignments */}
            {completedAssignments.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Completados ({completedAssignments.length})
                </h3>
                {completedAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="bg-card rounded-xl border p-4 flex items-center gap-3 opacity-60"
                  >
                    <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground truncate line-through">
                        {assignment.exercise_title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {assignment.patient_name}
                        {assignment.completed_at &&
                          ` · Completado ${new Date(assignment.completed_at).toLocaleDateString("es-CL")}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClick(assignment.id, "assignment")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ExerciseFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        mode={formMode}
        initialData={editingExercise}
      />

      {assigningExercise && (
        <AssignExerciseDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          onSubmit={handleAssignSubmit}
          exerciseTitle={assigningExercise.title}
          exerciseId={assigningExercise.id}
          patients={patients.map((p) => ({ id: p.id, name: p.name }))}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteType === "exercise" ? "Eliminar ejercicio" : "Eliminar asignación"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === "exercise"
                ? "Se eliminará el ejercicio y todas sus asignaciones. Esta acción no se puede deshacer."
                : "Se eliminará esta asignación. Esta acción no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
