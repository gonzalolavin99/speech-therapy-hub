import { useForm } from "react-hook-form";
import { useEffect } from "react";
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

const paymentSchema = z.object({
  patientId: z.string().min(1, "Seleccione un paciente"),
  sessionDate: z.string().min(1, "Fecha de sesión requerida"),
  paymentDate: z.string().optional(),
  amount: z.number().min(0, "Monto inválido"),
  paymentMethod: z.string().optional(),
  status: z.enum(["paid", "pending", "overdue"]),
  notes: z.string().max(500).optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PaymentFormData) => void;
  onCancelWithoutCharge?: () => void;
  patients: { id: string; name: string }[];
  mode: "create" | "register";
  initialData?: Partial<PaymentFormData>;
  defaultAmount?: number;
  patientName?: string;
}

export function PaymentFormDialog({
  open,
  onOpenChange,
  onSubmit,
  onCancelWithoutCharge,
  patients,
  mode,
  initialData,
  defaultAmount = 35000,
  patientName,
}: PaymentFormDialogProps) {
  // Formatear fecha para mostrar
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(amount);
  };
  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      patientId: initialData?.patientId || "",
      sessionDate: initialData?.sessionDate || "",
      paymentDate: initialData?.paymentDate || new Date().toISOString().split("T")[0],
      amount: initialData?.amount || defaultAmount,
      paymentMethod: initialData?.paymentMethod || "",
      status: initialData?.status || "paid",
      notes: initialData?.notes || "",
    },
  });

  // Resetear formulario cuando cambian los datos iniciales
  useEffect(() => {
    if (open) {
      form.reset({
        patientId: initialData?.patientId || "",
        sessionDate: initialData?.sessionDate || "",
        paymentDate: initialData?.paymentDate || new Date().toISOString().split("T")[0],
        amount: initialData?.amount || defaultAmount,
        paymentMethod: initialData?.paymentMethod || "",
        status: initialData?.status || "paid",
        notes: initialData?.notes || "",
      });
    }
  }, [open, initialData, defaultAmount, form]);

  const handleSubmit = (data: PaymentFormData) => {
    onSubmit(data);
    toast.success(mode === "create" ? "Sesión registrada" : "Pago registrado exitosamente");
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nueva Sesión" : "Registrar Pago"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" 
              ? "Complete los datos para registrar una nueva sesión"
              : "Confirme los datos del pago para esta sesión"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {mode === "register" && initialData ? (
              /* Modo simplificado para registrar pago de sesión existente */
              <>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Paciente:</span>
                    <span className="font-medium">{patientName || 'Paciente'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Fecha sesión:</span>
                    <span className="font-medium">{formatDateDisplay(initialData.sessionDate || '')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Monto:</span>
                    <span className="font-medium text-primary">{formatCurrency(initialData.amount || 0)}</span>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Pago *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Método de Pago *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar método" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="efectivo">Efectivo</SelectItem>
                          <SelectItem value="transferencia">Transferencia</SelectItem>
                          <SelectItem value="tarjeta_debito">Tarjeta Débito</SelectItem>
                          <SelectItem value="tarjeta_credito">Tarjeta Crédito</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : (
              /* Modo completo para crear nueva sesión */
              <>
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
                  name="sessionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Sesión *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monto (CLP) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={0}
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="paid">Pagado</SelectItem>
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="overdue">Vencido</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}


            <div className="flex flex-col gap-3 pt-4">
              {mode === "register" && onCancelWithoutCharge && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    onCancelWithoutCharge();
                    onOpenChange(false);
                  }}
                >
                  Paciente canceló - No cobrar
                </Button>
              )}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {mode === "create" ? "Crear Sesión" : "Confirmar Pago"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
