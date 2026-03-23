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
import { Dumbbell } from "lucide-react";

const CATEGORIES = [
  { value: "articulacion", label: "Articulación" },
  { value: "lenguaje", label: "Lenguaje" },
  { value: "voz", label: "Voz" },
  { value: "deglucion", label: "Deglución" },
  { value: "respiracion", label: "Respiración" },
  { value: "motricidad", label: "Motricidad" },
  { value: "otro", label: "Otro" },
];

const DIFFICULTIES = [
  { value: "easy", label: "Fácil" },
  { value: "medium", label: "Medio" },
  { value: "hard", label: "Difícil" },
];

const TARGET_AGES = [
  { value: "infantil", label: "Infantil" },
  { value: "adolescente", label: "Adolescente" },
  { value: "adulto", label: "Adulto" },
  { value: "todos", label: "Todos" },
];

const exerciseSchema = z.object({
  title: z.string().min(1, "Título requerido"),
  description: z.string().optional(),
  instructions: z.string().optional(),
  category: z.string().min(1, "Categoría requerida"),
  difficulty: z.string().default("medium"),
  target_age: z.string().optional(),
  materials: z.string().optional(),
  duration_minutes: z.coerce.number().min(1).optional().or(z.literal("")),
  video_url: z.string().url("URL inválida").optional().or(z.literal("")),
});

type ExerciseFormValues = z.infer<typeof exerciseSchema>;

interface ExerciseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  mode: "create" | "edit";
  initialData?: any;
}

export function ExerciseFormDialog({
  open,
  onOpenChange,
  onSubmit,
  mode,
  initialData,
}: ExerciseFormDialogProps) {
  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      title: "",
      description: "",
      instructions: "",
      category: "",
      difficulty: "medium",
      target_age: "todos",
      materials: "",
      duration_minutes: "" as any,
      video_url: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          title: initialData.title || "",
          description: initialData.description || "",
          instructions: initialData.instructions || "",
          category: initialData.category || "",
          difficulty: initialData.difficulty || "medium",
          target_age: initialData.target_age || "todos",
          materials: initialData.materials || "",
          duration_minutes: initialData.duration_minutes || ("" as any),
          video_url: initialData.video_url || "",
        });
      } else {
        form.reset({
          title: "",
          description: "",
          instructions: "",
          category: "",
          difficulty: "medium",
          target_age: "todos",
          materials: "",
          duration_minutes: "" as any,
          video_url: "",
        });
      }
    }
  }, [open, initialData, form]);

  const handleSubmit = (data: ExerciseFormValues) => {
    const cleanData = {
      title: data.title,
      description: data.description || null,
      instructions: data.instructions || null,
      category: data.category,
      difficulty: data.difficulty || "medium",
      target_age: data.target_age || null,
      materials: data.materials || null,
      duration_minutes: data.duration_minutes ? Number(data.duration_minutes) : null,
      video_url: data.video_url || null,
    };
    onSubmit(cleanData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            {mode === "create" ? "Nuevo Ejercicio" : "Editar Ejercicio"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Agrega un ejercicio a tu biblioteca personal"
              : "Modifica los datos del ejercicio"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-2">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Praxias linguales frente al espejo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category + Difficulty row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
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
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dificultad</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DIFFICULTIES.map((d) => (
                          <SelectItem key={d.value} value={d.value}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Target Age + Duration row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="target_age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Edad objetivo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "todos"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TARGET_AGES.map((age) => (
                          <SelectItem key={age.value} value={age.value}>
                            {age.label}
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
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={120}
                        placeholder="15"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Breve descripción del ejercicio..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Instructions */}
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instrucciones paso a paso</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={"1. Sentarse frente al espejo\n2. Abrir la boca\n3. Sacar la lengua hacia adelante\n4. Mantener 5 segundos\n5. Repetir 10 veces"}
                      rows={5}
                      className="resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Materials */}
            <FormField
              control={form.control}
              name="materials"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Materiales necesarios</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Espejo, baja lenguas, cronómetro"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Video URL */}
            <FormField
              control={form.control}
              name="video_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link a video (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://youtube.com/watch?v=..."
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
                {mode === "create" ? "Crear Ejercicio" : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
