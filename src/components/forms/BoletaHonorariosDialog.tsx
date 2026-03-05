import { useForm } from "react-hook-form";
import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { RutInput } from "@/components/ui/rut-input";
import { ExternalLink, FileText, Save } from "lucide-react";
import { calculateRetencion, SII_BHE_PORTAL_URL } from "@/config/retencion";
import type { ProfessionId } from "@/config/professions";

const boletaSchema = z.object({
  patientName: z.string().min(1, "Nombre del paciente requerido"),
  patientRut: z.string().optional(),
  amountBruto: z.number().min(1, "Monto bruto debe ser mayor a 0"),
  description: z.string().min(1, "Descripcion del servicio requerida"),
  serviceDate: z.string().min(1, "Fecha de servicio requerida"),
  notes: z.string().max(500).optional(),
});

type BoletaFormValues = z.infer<typeof boletaSchema>;

interface BoletaHonorariosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: BoletaFormValues, action: 'draft' | 'emit') => void;
  professional: {
    name: string;
    rut: string | null;
    address: string | null;
    city: string | null;
  };
  paymentData?: {
    paymentId: string;
    patientId: string;
    patientName: string;
    patientRut: string | null;
    amount: number;
    sessionDate: string;
  } | null;
  professionId: ProfessionId | null;
}

const professionDescriptions: Record<string, string> = {
  fonoaudiologo: 'Sesion de fonoaudiologia',
  psicologo: 'Sesion de psicologia clinica',
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
  }).format(amount);
}

export function BoletaHonorariosDialog({
  open,
  onOpenChange,
  onSubmit,
  professional,
  paymentData,
  professionId,
}: BoletaHonorariosDialogProps) {
  const defaultDescription = professionId
    ? professionDescriptions[professionId] || 'Sesion profesional'
    : 'Sesion profesional';

  const form = useForm<BoletaFormValues>({
    resolver: zodResolver(boletaSchema),
    defaultValues: {
      patientName: paymentData?.patientName || "",
      patientRut: paymentData?.patientRut || "",
      amountBruto: paymentData?.amount || 0,
      description: defaultDescription,
      serviceDate: paymentData?.sessionDate || "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        patientName: paymentData?.patientName || "",
        patientRut: paymentData?.patientRut || "",
        amountBruto: paymentData?.amount || 0,
        description: defaultDescription,
        serviceDate: paymentData?.sessionDate || "",
        notes: "",
      });
    }
  }, [open, paymentData, defaultDescription, form]);

  const watchedAmount = form.watch("amountBruto");

  const retencion = useMemo(() => {
    const amount = typeof watchedAmount === 'number' && watchedAmount > 0 ? watchedAmount : 0;
    return calculateRetencion(amount);
  }, [watchedAmount]);

  const handleSubmitDraft = (data: BoletaFormValues) => {
    onSubmit(data, 'draft');
    onOpenChange(false);
    form.reset();
  };

  const handleSubmitEmit = () => {
    form.handleSubmit((data) => {
      onSubmit(data, 'emit');
      // Abrir portal SII en nueva pestaña
      const newWindow = window.open(SII_BHE_PORTAL_URL, '_blank', 'noopener,noreferrer');
      if (!newWindow) {
        // Si el popup fue bloqueado, dar enlace alternativo
        import('sonner').then(({ toast }) => {
          toast.info('No se pudo abrir el portal del SII automáticamente', {
            description: 'Haz clic aquí para abrir manualmente',
            action: {
              label: 'Abrir SII',
              onClick: () => window.open(SII_BHE_PORTAL_URL, '_blank'),
            },
            duration: 10000,
          });
        });
      }
      onOpenChange(false);
      form.reset();
    })();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Boleta de Honorarios</DialogTitle>
          <DialogDescription>
            Genera los datos de tu boleta y emitela en el portal del SII
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmitDraft)} className="space-y-4">
            {/* Professional Info (read-only) */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Emisor (Profesional)</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Nombre:</span>
                <span className="font-medium">{professional.name}</span>
              </div>
              {professional.rut && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">RUT:</span>
                  <span className="font-medium">{professional.rut}</span>
                </div>
              )}
              {professional.address && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Direccion:</span>
                  <span className="font-medium">
                    {professional.city
                      ? `${professional.address}, ${professional.city}`
                      : professional.address}
                  </span>
                </div>
              )}
            </div>

            {/* Patient Fields */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Receptor (Paciente / Apoderado)</p>

              <FormField
                control={form.control}
                name="patientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="patientRut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RUT</FormLabel>
                    <FormControl>
                      <RutInput
                        value={field.value || ""}
                        onChange={field.onChange}
                        showValidation={true}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Service Details */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripcion del servicio *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serviceDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha del servicio *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amountBruto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto Bruto (CLP) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Retention Calculation */}
            <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Desglose Tributario</p>

              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Monto Bruto:</span>
                <span className="font-semibold">{formatCurrency(retencion.amountLiquido + retencion.retencionAmount)}</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-destructive">Retencion ({retencion.percent}%):</span>
                <span className="font-semibold text-destructive">-{formatCurrency(retencion.retencionAmount)}</span>
              </div>

              <div className="border-t border-primary/20 pt-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-primary">Monto Liquido:</span>
                  <span className="text-lg font-bold text-primary">{formatCurrency(retencion.amountLiquido)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Notas adicionales..."
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-4 border-t">
              <Button
                type="button"
                className="w-full"
                onClick={handleSubmitEmit}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Guardar y Abrir SII
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="secondary"
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Borrador
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
