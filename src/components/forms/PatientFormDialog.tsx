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

const patientSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  rut: z.string().min(9, "RUT inválido").max(12),
  birthDate: z.string().min(1, "Fecha requerida"),
  phone: z.string().min(9, "Teléfono inválido").max(15),
  email: z.string().email("Email inválido").max(255),
  address: z.string().max(200).optional(),
  guardianName: z.string().max(100).optional(),
  guardianPhone: z.string().max(15).optional(),
  diagnosis: z.string().min(1, "Diagnóstico requerido"),
  consultReason: z.string().min(1, "Motivo de consulta requerido"),
  referredBy: z.string().max(100).optional(),
  perinatalHistory: z.string().max(500).optional(),
  psychomotorDev: z.string().max(500).optional(),
  observations: z.string().max(1000).optional(),
  status: z.enum(["active", "inactive", "completed"]),
});

type PatientFormData = z.infer<typeof patientSchema>;

interface PatientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PatientFormData) => void;
  initialData?: Partial<PatientFormData>;
  mode: "create" | "edit";
}

export function PatientFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  mode,
}: PatientFormDialogProps) {
  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: initialData?.name || "",
      rut: initialData?.rut || "",
      birthDate: initialData?.birthDate || "",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      address: initialData?.address || "",
      guardianName: initialData?.guardianName || "",
      guardianPhone: initialData?.guardianPhone || "",
      diagnosis: initialData?.diagnosis || "",
      consultReason: initialData?.consultReason || "",
      referredBy: initialData?.referredBy || "",
      perinatalHistory: initialData?.perinatalHistory || "",
      psychomotorDev: initialData?.psychomotorDev || "",
      observations: initialData?.observations || "",
      status: initialData?.status || "active",
    },
  });

  const handleSubmit = (data: PatientFormData) => {
    onSubmit(data);
    toast.success(mode === "create" ? "Paciente creado exitosamente" : "Paciente actualizado");
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nuevo Paciente" : "Editar Paciente"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Datos Personales */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Datos Personales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre Completo *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre y apellidos" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RUT *</FormLabel>
                      <FormControl>
                        <Input placeholder="12.345.678-9" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Nacimiento *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono *</FormLabel>
                      <FormControl>
                        <Input placeholder="+56 9 1234 5678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@ejemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Input placeholder="Dirección completa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="guardianName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Tutor/Apoderado</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del tutor" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guardianPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono del Tutor</FormLabel>
                      <FormControl>
                        <Input placeholder="+56 9 1234 5678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Información Clínica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Información Clínica</h3>
              
              <FormField
                control={form.control}
                name="diagnosis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Diagnóstico Fonoaudiológico *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Trastorno Fonológico, TEL, Disfemia..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="consultReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo de Consulta *</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe el motivo de la consulta" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="referredBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Derivado por</FormLabel>
                      <FormControl>
                        <Input placeholder="Profesional o institución" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="inactive">Inactivo</SelectItem>
                        <SelectItem value="completed">Completado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Anamnesis */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Ficha de Anamnesis</h3>
              
              <FormField
                control={form.control}
                name="perinatalHistory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Antecedentes Perinatales</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Embarazo, parto, peso al nacer, complicaciones..." 
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
                name="psychomotorDev"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desarrollo Psicomotor</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Hitos del desarrollo, sedestación, marcha, lenguaje..." 
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
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observaciones Adicionales</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Cualquier información relevante adicional..." 
                        rows={4}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {mode === "create" ? "Crear Paciente" : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
