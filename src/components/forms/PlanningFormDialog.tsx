import { useState, useEffect } from "react";
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
import { Sparkles, Loader2, Plus, Trash2 } from "lucide-react";
import { generatePlanningSuggestions, isAIConfigured } from "@/lib/ai-service";
import { useProfession } from "@/contexts/ProfessionContext";

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
  const { config: profConfig } = useProfession();
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

  // Each row: 1 specific objective + N operational objectives (individual inputs)
  interface ObjectiveRow {
    specificObjective: string;
    operationalObjectives: string[];
  }

  const ROW_SEPARATOR = '|||';

  const parseObjRows = (specific?: string, operational?: string): ObjectiveRow[] => {
    const s = (specific || '').split('\n').filter(Boolean);
    const oRows = (operational || '').includes(ROW_SEPARATOR)
      ? (operational || '').split(ROW_SEPARATOR)
      : (operational || '').split('\n').filter(Boolean);
    const maxLen = Math.max(s.length, oRows.length, 1);
    return Array.from({ length: maxLen }, (_, i) => ({
      specificObjective: s[i] || '',
      operationalObjectives: (oRows[i] || '').trim()
        ? (oRows[i] || '').trim().split('\n').filter(Boolean)
        : [''],
    }));
  };

  const [objRows, setObjRows] = useState<ObjectiveRow[]>(() =>
    parseObjRows(initialData?.specificObjectives, initialData?.operationalObjectives)
  );

  const syncObjRowsToForm = (updatedRows: ObjectiveRow[]) => {
    form.setValue('specificObjectives', updatedRows.map(r => r.specificObjective).filter(Boolean).join('\n'), { shouldValidate: true });
    form.setValue('operationalObjectives', updatedRows.map(r => r.operationalObjectives.filter(Boolean).join('\n')).join(ROW_SEPARATOR), { shouldValidate: true });
  };

  const updateSpecific = (rowIdx: number, value: string) => {
    const updated = [...objRows];
    updated[rowIdx] = { ...updated[rowIdx], specificObjective: value };
    setObjRows(updated);
    syncObjRowsToForm(updated);
  };

  const updateOperational = (rowIdx: number, opIdx: number, value: string) => {
    const updated = [...objRows];
    const ops = [...updated[rowIdx].operationalObjectives];
    ops[opIdx] = value;
    updated[rowIdx] = { ...updated[rowIdx], operationalObjectives: ops };
    setObjRows(updated);
    syncObjRowsToForm(updated);
  };

  const addOperational = (rowIdx: number) => {
    const updated = [...objRows];
    updated[rowIdx] = { ...updated[rowIdx], operationalObjectives: [...updated[rowIdx].operationalObjectives, ''] };
    setObjRows(updated);
  };

  const removeOperational = (rowIdx: number, opIdx: number) => {
    const updated = [...objRows];
    const ops = updated[rowIdx].operationalObjectives.filter((_, i) => i !== opIdx);
    updated[rowIdx] = { ...updated[rowIdx], operationalObjectives: ops.length ? ops : [''] };
    setObjRows(updated);
    syncObjRowsToForm(updated);
  };

  const addObjRow = () => {
    const updated = [...objRows, { specificObjective: '', operationalObjectives: [''] }];
    setObjRows(updated);
    syncObjRowsToForm(updated);
  };

  const removeObjRow = (index: number) => {
    if (objRows.length <= 1) return;
    const updated = objRows.filter((_, i) => i !== index);
    setObjRows(updated);
    syncObjRowsToForm(updated);
  };

  useEffect(() => {
    if (open) {
      form.reset({
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
      });
      setObjRows(parseObjRows(initialData?.specificObjectives, initialData?.operationalObjectives));
    }
  }, [open, initialData]);

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
      setObjRows(parseObjRows(suggestion.specificObjectives, suggestion.operationalObjectives));
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
                          {profConfig.approaches.map((a) => (
                            <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                          ))}
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
                          {profConfig.methods.map((m) => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
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

              {/* Contenidos - standalone textarea */}
              <FormField
                control={form.control}
                name="contents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contenidos *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={"1. Fonético-fonológico\n2. Semántico\n3. Morfosintáctico\n4. Pragmático"}
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <p className="text-[11px] text-muted-foreground">Un contenido por línea</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Objectives: individual inputs per operational objective */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Objetivos Específicos y Operacionales</p>
                  <Button type="button" size="sm" variant="outline" onClick={addObjRow}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Nuevo objetivo
                  </Button>
                </div>

                <div className="space-y-4">
                  {objRows.map((row, i) => (
                    <div key={i} className="rounded-lg border overflow-hidden">
                      {/* Header: number + specific objective + delete */}
                      <div className="flex items-start gap-3 bg-muted/40 p-3">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-1">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
                            Objetivo Específico
                          </label>
                          <Input
                            value={row.specificObjective}
                            onChange={(e) => updateSpecific(i, e.target.value)}
                            placeholder="Ej: Que el paciente logre producir fonemas velares /k/ y /g/"
                            className="text-sm bg-background"
                          />
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 mt-4"
                          onClick={() => removeObjRow(i)}
                          disabled={objRows.length <= 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Operational objectives list */}
                      <div className="p-3 space-y-2">
                        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                          Objetivos Operacionales
                        </label>
                        {row.operationalObjectives.map((op, j) => (
                          <div key={j} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-medium w-5 text-right shrink-0">
                              {String.fromCharCode(97 + j)})
                            </span>
                            <Input
                              value={op}
                              onChange={(e) => updateOperational(i, j, e.target.value)}
                              placeholder={`Objetivo operacional ${j + 1}`}
                              className="text-sm flex-1"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => removeOperational(i, j)}
                              disabled={row.operationalObjectives.length <= 1}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-xs text-primary hover:text-primary/80 h-7 px-2"
                          onClick={() => addOperational(i)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Agregar operacional
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {form.formState.errors.specificObjectives && (
                  <p className="text-sm text-destructive">{form.formState.errors.specificObjectives.message}</p>
                )}
              </div>
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
