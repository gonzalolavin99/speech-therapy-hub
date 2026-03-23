import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { UserPlus } from "lucide-react";

const FREQUENCIES = [
  { value: "diario", label: "Diario" },
  { value: "3_veces_semana", label: "3 veces por semana" },
  { value: "semanal", label: "Semanal" },
];

const assignSchema = z.object({
  patient_id: z.string().min(1, "Seleccione un paciente"),
  frequency: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  notes: z.string().optional(),
});

type AssignFormValues = z.infer<typeof assignSchema>;

interface AssignExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  exerciseTitle: string;
  exerciseId: string;
  patients: { id: string; name: string }[];
}

export function AssignExerciseDialog({
  open,
  onOpenChange,
  onSubmit,
  exerciseTitle,
  exerciseId,
  patients,
}: AssignExerciseDialogProps) {
  const form = useForm<AssignFormValues>({
    resolver: zodResolver(assignSchema),
    defaultValues: {
      patient_id: "",
      frequency: "semanal",
      start_date: "",
      end_date: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        patient_id: "",
        frequency: "semanal",
        start_date: "",
        end_date: "",
        notes: "",
      });
    }
  }, [open, form]);

  const handleSubmit = (data: AssignFormValues) => {
    onSubmit({
      patient_id: data.patient_id,
      exercise_id: exerciseId,
      frequency: data.frequency || null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      notes: data.notes || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Asignar Ejercicio
          </DialogTitle>
          <DialogDescription>
            Asignar &quot;{exerciseTitle}&quot; a un paciente
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-2">
            {/* Patient select */}
            <FormField
              control={form.control}
              name="patient_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paciente *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar paciente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {patients.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Frequency */}
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frecuencia recomendada</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "semanal"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FREQUENCIES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dates row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha inicio</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha fin</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas para el paciente</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Indicaciones especiales para este paciente..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                Asignar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
