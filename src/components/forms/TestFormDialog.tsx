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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const testSchema = z.object({
  testType: z.enum(["mbgr", "tar", "teprosif"]),
  patientId: z.string().min(1, "Seleccione un paciente"),
  evaluationDate: z.string().min(1, "Fecha requerida"),
  evaluator: z.string().min(1, "Evaluador requerido"),
  observations: z.string().optional(),
  // MBGR specific
  posture: z.string().optional(),
  breathing: z.string().optional(),
  chewing: z.string().optional(),
  swallowing: z.string().optional(),
  speech: z.string().optional(),
  // TAR specific
  phonemes: z.string().optional(),
  syllables: z.string().optional(),
  words: z.string().optional(),
  // TEPROSIF specific
  simplificationProcesses: z.string().optional(),
  pcc: z.string().optional(),
});

type TestFormData = z.infer<typeof testSchema>;

interface TestFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TestFormData) => void;
  patients: { id: string; name: string }[];
  testType: "mbgr" | "tar" | "teprosif";
}

export function TestFormDialog({
  open,
  onOpenChange,
  onSubmit,
  patients,
  testType,
}: TestFormDialogProps) {
  const form = useForm<TestFormData>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      testType,
      patientId: "",
      evaluationDate: new Date().toISOString().split("T")[0],
      evaluator: "",
      observations: "",
    },
  });

  const handleSubmit = (data: TestFormData) => {
    onSubmit(data);
    toast.success("Test guardado exitosamente");
    onOpenChange(false);
    form.reset();
  };

  const testNames = {
    mbgr: "MBGR - Evaluación Miofuncional Orofacial",
    tar: "TAR - Test de Articulación a la Repetición",
    teprosif: "TEPROSIF-R - Procesos de Simplificación Fonológica",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{testNames[testType]}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Datos Generales */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Datos de la Evaluación</h3>
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
                  name="evaluationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Evaluación *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="evaluator"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evaluador *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del evaluador" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Test Specific Fields */}
            {testType === "mbgr" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Evaluación MBGR</h3>
                <Tabs defaultValue="posture" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="posture">Postura</TabsTrigger>
                    <TabsTrigger value="breathing">Respiración</TabsTrigger>
                    <TabsTrigger value="chewing">Masticación</TabsTrigger>
                    <TabsTrigger value="swallowing">Deglución</TabsTrigger>
                    <TabsTrigger value="speech">Habla</TabsTrigger>
                  </TabsList>
                  <TabsContent value="posture" className="mt-4">
                    <FormField
                      control={form.control}
                      name="posture"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Evaluación de Postura</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Descripción de postura corporal, cabeza, labios, lengua en reposo..." 
                              rows={5}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  <TabsContent value="breathing" className="mt-4">
                    <FormField
                      control={form.control}
                      name="breathing"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Evaluación de Respiración</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Tipo respiratorio, modo, capacidad, permeabilidad nasal..." 
                              rows={5}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  <TabsContent value="chewing" className="mt-4">
                    <FormField
                      control={form.control}
                      name="chewing"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Evaluación de Masticación</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Patrón masticatorio, eficiencia, simetría..." 
                              rows={5}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  <TabsContent value="swallowing" className="mt-4">
                    <FormField
                      control={form.control}
                      name="swallowing"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Evaluación de Deglución</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Patrón deglutorio, interposición lingual, contracción perioral..." 
                              rows={5}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  <TabsContent value="speech" className="mt-4">
                    <FormField
                      control={form.control}
                      name="speech"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Evaluación del Habla</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Precisión articulatoria, velocidad, prosodia, inteligibilidad..." 
                              rows={5}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {testType === "tar" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Test de Articulación (TAR)</h3>
                <FormField
                  control={form.control}
                  name="phonemes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fonemas Evaluados</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Lista de fonemas evaluados y resultados (Ej: /p/ - logrado, /k/ - sustituido por /t/)" 
                          rows={4}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="syllables"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estructuras Silábicas</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="CV, CVC, CCV, CCVC, etc. y resultados" 
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
                  name="words"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Palabras/Frases con Dificultades</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Palabras donde se observan dificultades articulatorias" 
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {testType === "teprosif" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">TEPROSIF-R</h3>
                <FormField
                  control={form.control}
                  name="simplificationProcesses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Procesos de Simplificación Fonológica</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Procesos identificados: sustitución, omisión, asimilación, estructurales..." 
                          rows={5}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pcc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PCC (Porcentaje de Consonantes Correctas)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: 75%" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Observaciones */}
            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones Generales</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Observaciones adicionales sobre la evaluación" 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar Test</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
