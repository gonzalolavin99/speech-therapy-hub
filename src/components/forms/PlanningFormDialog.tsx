import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { generatePlanningSuggestions, isAIConfigured } from "@/lib/ai-service";

const planningSchema = z.object({
  patientId: z.string().min(1, "Seleccione un paciente"),
  interventionApproach: z.string().min(1, "Enfoque requerido"),
  method: z.string().min(1, "Método requerido"),
  modality: z.enum(["individual", "grupal"]),
  contents: z.string().min(1, "Contenidos requeridos"),
  generalObjective: z.string().min(1, "Objetivo general requerido"),
  specificObjectives: z.string().min(1, "Objetivos específicos requeridos"),
  operationalObjectives: z.string().min(1, "Objetivos operacionales requeridos"),
  generalPlan: z.string().optional(),
  totalSessions: z.number().min(1, "Mínimo 1 sesión"),
  frequency: z.string().min(1, "Frecuencia requerida"),
  sessionDuration: z.number().min(15, "Mínimo 15 minutos"),
});

type PlanningFormData = z.infer<typeof planningSchema>;

interface PlanningFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PlanningFormData) => void;
  patients: { id: string; name: string; diagnosis?: string | null; age?: number | null }[];
  mode: "create" | "edit";
  initialData?: Partial<PlanningFormData>;
}

export function PlanningFormDialog({
  open,
  onOpenChange,
  onSubmit,
  patients,
  mode,
  initialData,
}: PlanningFormDialogProps) {
  const form = useForm<PlanningFormData>({
    resolver: zodResolver(planningSchema),
    defaultValues: {
      patientId: initialData?.patientId || "",
      interventionApproach: initialData?.interventionApproach || "",
      method: initialData?.method || "",
      modality: initialData?.modality || "individual",
      contents: initialData?.contents || "",
      generalObjective: initialData?.generalObjective || "",
      specificObjectives: initialData?.specificObjectives || "",
      operationalObjectives: initialData?.operationalObjectives || "",
      generalPlan: initialData?.generalPlan || "",
      totalSessions: initialData?.totalSessions || 12,
      frequency: initialData?.frequency || "2 veces por semana",
      sessionDuration: initialData?.sessionDuration || 45,
    },
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = (data: PlanningFormData) => {
    onSubmit(data);
    toast.success(mode === "create" ? "Planificación creada exitosamente" : "Planificación actualizada");
    onOpenChange(false);
    form.reset();
  };

  const handleAIGenerate = async () => {
    const patientId = form.getValues("patientId");
    const approach = form.getValues("interventionApproach");
    if (!patientId) {
      toast.error("Selecciona un paciente primero");
      return;
    }
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    setIsGenerating(true);
    try {
      const suggestion = await generatePlanningSuggestions(
        patient.name,
        patient.age,
        patient.diagnosis,
        approach || undefined
      );
      form.setValue("contents", suggestion.contents);
      form.setValue("generalObjective", suggestion.generalObjective);
      form.setValue("specificObjectives", suggestion.specificObjectives);
      form.setValue("operationalObjectives", suggestion.operationalObjectives);
      form.setValue("generalPlan", suggestion.generalPlan);
      if (suggestion.recommendedMethod) {
        form.setValue("method", suggestion.recommendedMethod);
      }
      toast.success("Sugerencias generadas por IA");
    } catch (err: any) {
      toast.error("Error al generar con IA", { description: err.message });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nueva Planificación" : "Editar Planificación"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Datos Generales */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Datos Generales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paciente *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar paciente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {patients.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id}>
                              {patient.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="modality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modalidad *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="individual">Individual</SelectItem>
                          <SelectItem value="grupal">Grupal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="interventionApproach"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enfoque de Intervención *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar enfoque" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fonologico">Enfoque Fonológico</SelectItem>
                          <SelectItem value="pragmatico">Enfoque Pragmático</SelectItem>
                          <SelectItem value="semantico">Enfoque Semántico</SelectItem>
                          <SelectItem value="morfosintactico">Enfoque Morfosintáctico</SelectItem>
                          <SelectItem value="fluencia">Fluencia</SelectItem>
                          <SelectItem value="motricidad">Motricidad Orofacial</SelectItem>
                          <SelectItem value="deglusion">Deglución</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Método *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar método" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ciclos">Ciclos</SelectItem>
                          <SelectItem value="pares_minimos">Pares Mínimos</SelectItem>
                          <SelectItem value="modelado">Modelado</SelectItem>
                          <SelectItem value="interaccionista">Interaccionista</SelectItem>
                          <SelectItem value="conductual">Conductual</SelectItem>
                          <SelectItem value="naturalista">Naturalista</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contenidos y Objetivos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Contenidos y Objetivos</h3>
                {isAIConfigured() && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAIGenerate}
                    disabled={isGenerating || !form.getValues("patientId")}
                    className="text-xs border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-950/30"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {isGenerating ? "Generando..." : "Generar con IA"}
                  </Button>
                )}
              </div>
              
              <FormField
                control={form.control}
                name="contents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contenidos a Intervenir *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Ej: Fonemas velares /k/ y /g/, estructuras silábicas CVC..." 
                        rows={2}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="generalObjective"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objetivo General *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Objetivo principal de la intervención" 
                        rows={2}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specificObjectives"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objetivos Específicos *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Lista de objetivos específicos (uno por línea)" 
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="operationalObjectives"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objetivos Operacionales *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Objetivos operacionales medibles (uno por línea)" 
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Planificación General */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Planificación General</h3>
              
              <FormField
                control={form.control}
                name="generalPlan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción de la Planificación</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descripción general del plan de intervención" 
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="totalSessions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total de Sesiones *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1}
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frecuencia *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1 vez por semana">1 vez por semana</SelectItem>
                          <SelectItem value="2 veces por semana">2 veces por semana</SelectItem>
                          <SelectItem value="3 veces por semana">3 veces por semana</SelectItem>
                          <SelectItem value="Quincenal">Quincenal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sessionDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duración (min) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={15}
                          step={15}
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {mode === "create" ? "Crear Planificación" : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
