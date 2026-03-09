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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Package, BadgePercent } from "lucide-react";

const packSchema = z.object({
  patientId: z.string().min(1, "Selecciona un paciente"),
  name: z.string().min(1, "Nombre del pack requerido"),
  totalSessions: z.number().min(1, "Minimo 1 sesion").max(100, "Maximo 100 sesiones"),
  priceTotal: z.number().min(0, "Monto debe ser positivo"),
  originalPricePerSession: z.number().min(0, "Precio por sesion requerido"),
  paymentStatus: z.enum(["pending", "partial", "paid"]),
  expiresAt: z.string().optional(),
  notes: z.string().max(500).optional(),
});

type PackFormValues = z.infer<typeof packSchema>;

interface SessionPackFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PackFormValues) => void;
  patients: { id: string; name: string }[];
  defaultSessionPrice: number;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
  }).format(amount);
}

const PACK_PRESETS = [
  { sessions: 4, label: "Pack 4 sesiones", discount: 5 },
  { sessions: 8, label: "Pack 8 sesiones", discount: 10 },
  { sessions: 12, label: "Pack 12 sesiones", discount: 15 },
];

export function SessionPackFormDialog({
  open,
  onOpenChange,
  onSubmit,
  patients,
  defaultSessionPrice,
}: SessionPackFormDialogProps) {
  const form = useForm<PackFormValues>({
    resolver: zodResolver(packSchema),
    defaultValues: {
      patientId: "",
      name: "Pack de sesiones",
      totalSessions: 8,
      priceTotal: 0,
      originalPricePerSession: defaultSessionPrice,
      paymentStatus: "pending",
      expiresAt: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        patientId: "",
        name: "Pack de sesiones",
        totalSessions: 8,
        priceTotal: 0,
        originalPricePerSession: defaultSessionPrice,
        paymentStatus: "pending",
        expiresAt: "",
        notes: "",
      });
    }
  }, [open, defaultSessionPrice, form]);

  const totalSessions = form.watch("totalSessions");
  const priceTotal = form.watch("priceTotal");
  const originalPrice = form.watch("originalPricePerSession");

  const calculations = useMemo(() => {
    const sessions = typeof totalSessions === "number" ? totalSessions : 0;
    const total = typeof priceTotal === "number" ? priceTotal : 0;
    const origPerSession = typeof originalPrice === "number" ? originalPrice : 0;
    const originalTotal = origPerSession * sessions;
    const pricePerSession = sessions > 0 ? Math.round(total / sessions) : 0;
    const discount = originalTotal > 0 ? Math.round((1 - total / originalTotal) * 100) : 0;
    const savings = originalTotal - total;

    return { originalTotal, pricePerSession, discount, savings };
  }, [totalSessions, priceTotal, originalPrice]);

  const applyPreset = (preset: (typeof PACK_PRESETS)[number]) => {
    const discountedTotal = Math.round(
      originalPrice * preset.sessions * (1 - preset.discount / 100)
    );
    form.setValue("totalSessions", preset.sessions);
    form.setValue("name", preset.label);
    form.setValue("priceTotal", discountedTotal);
  };

  const handleSubmit = (data: PackFormValues) => {
    onSubmit(data);
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Nuevo Pack de Sesiones
          </DialogTitle>
          <DialogDescription>
            Crea un paquete de sesiones con descuento por volumen
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Pack presets */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Packs sugeridos
              </p>
              <div className="flex gap-2">
                {PACK_PRESETS.map((preset) => (
                  <Button
                    key={preset.sessions}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.sessions} sesiones (-{preset.discount}%)
                  </Button>
                ))}
              </div>
            </div>

            {/* Patient */}
            <FormField
              control={form.control}
              name="patientId"
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

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del pack *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Pack 10 sesiones fonoaudiologia" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sessions & Price */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="totalSessions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad de sesiones *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="originalPricePerSession"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio normal/sesion (CLP)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription className="text-[11px]">
                      Sin descuento: {formatCurrency(calculations.originalTotal)}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Total price */}
            <FormField
              control={form.control}
              name="priceTotal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio total del pack (CLP) *</FormLabel>
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

            {/* Discount summary */}
            {calculations.discount > 0 && (
              <div className="rounded-lg border-2 border-green-300/50 bg-green-50/50 dark:bg-green-950/20 p-4 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <BadgePercent className="h-4 w-4 text-green-600" />
                  <p className="text-xs font-medium text-green-800 dark:text-green-300 uppercase tracking-wider">
                    Resumen del descuento
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Precio normal:</span>
                    <p className="font-medium line-through text-muted-foreground">
                      {formatCurrency(calculations.originalTotal)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Precio pack:</span>
                    <p className="font-bold text-green-700 dark:text-green-400">
                      {formatCurrency(priceTotal)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Descuento:</span>
                    <p className="font-bold text-green-700 dark:text-green-400">
                      {calculations.discount}%
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ahorro paciente:</span>
                    <p className="font-bold text-green-700 dark:text-green-400">
                      {formatCurrency(calculations.savings)}
                    </p>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-green-200 dark:border-green-800">
                    <span className="text-muted-foreground">Precio por sesion:</span>
                    <span className="font-semibold ml-2">
                      {formatCurrency(calculations.pricePerSession)}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      (vs {formatCurrency(originalPrice)} normal)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment status */}
            <FormField
              control={form.control}
              name="paymentStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado de pago</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="partial">Pago parcial</SelectItem>
                      <SelectItem value="paid">Pagado completo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Expiry */}
            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de vencimiento (opcional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription className="text-[11px]">
                    Si no se define, el pack no expira
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      placeholder="Observaciones del pack..."
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                <Package className="h-4 w-4 mr-2" />
                Crear Pack
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
