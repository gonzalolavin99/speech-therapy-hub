import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  FileText,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PaymentFormDialog } from "@/components/forms/PaymentFormDialog";
import { usePayments, Payment, PaymentFormData } from "@/hooks/usePayments";
import { usePatients } from "@/hooks/usePatients";
import { useProfile } from "@/hooks/useProfile";
import { exportBoletaPDF, generateBoletaNumber } from "@/utils/exportBoleta";
import { toast } from "sonner";

export default function Pagos() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("febrero");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "register">("create");
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const { payments, isLoading, createPayment, updatePayment, deletePayment } = usePayments();
  const { patients } = usePatients();
  const { profile } = useProfile();

  const patientOptions = patients.map((p) => ({ id: p.id, name: p.name }));

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch = (payment.patient_name || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Payment["status"]) => {
    const config = {
      paid: {
        icon: CheckCircle,
        label: "Pagado",
        className: "bg-success/10 text-success",
      },
      pending: {
        icon: Clock,
        label: "Pendiente",
        className: "bg-warning/10 text-warning",
      },
      overdue: {
        icon: XCircle,
        label: "Vencido",
        className: "bg-destructive/10 text-destructive",
      },
    };
    const { icon: Icon, label, className } = config[status];
    return (
      <span className={cn("px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit", className)}>
        <Icon className="h-3 w-3" />
        {label}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((acc, p) => acc + p.amount, 0);
  const totalPending = payments
    .filter((p) => p.status === "pending" || p.status === "overdue")
    .reduce((acc, p) => acc + p.amount, 0);

  const handleRegisterPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setFormMode("register");
    setIsFormOpen(true);
  };

  const handleFormSubmit = (data: any) => {
    if (formMode === "register" && selectedPayment) {
      updatePayment.mutate({
        id: selectedPayment.id,
        status: "paid",
        payment_date: data.paymentDate,
        payment_method: data.paymentMethod,
      });
    } else {
      const paymentData: PaymentFormData = {
        patient_id: data.patientId,
        amount: parseInt(data.amount),
        session_date: data.sessionDate,
        payment_date: data.status === "paid" ? data.paymentDate : null,
        status: data.status || "pending",
      };
      createPayment.mutate(paymentData);
    }
  };

  const handleCancelWithoutCharge = () => {
    if (selectedPayment) {
      deletePayment.mutate(selectedPayment.id);
    }
  };

  return (
    <AppLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pagos</h1>
            <p className="text-muted-foreground mt-1">
              Control de pagos de sesiones
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { setFormMode('create'); setSelectedPayment(null); setIsFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Pago
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card rounded-xl border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Recaudado</p>
                <p className="text-2xl font-bold text-success mt-1">
                  {formatCurrency(totalPaid)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Este mes</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Por Cobrar</p>
                <p className="text-2xl font-bold text-warning mt-1">
                  {formatCurrency(totalPending)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {payments.filter((p) => p.status !== "paid").length} sesiones
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sesiones del Mes</p>
                <p className="text-2xl font-bold text-card-foreground mt-1">
                  {payments.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {payments.filter((p) => p.status === "paid").length} pagadas
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por paciente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="paid">Pagado</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="overdue">Vencido</SelectItem>
            </SelectContent>
          </Select>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="febrero">Febrero 2026</SelectItem>
              <SelectItem value="enero">Enero 2026</SelectItem>
              <SelectItem value="diciembre">Diciembre 2025</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payments Table */}
        <div className="bg-card rounded-xl border overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Paciente
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Fecha Sesión
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Fecha Pago
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Monto
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Estado
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <DollarSign className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-muted-foreground">No hay pagos registrados</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {searchQuery || statusFilter !== "all"
                        ? "No se encontraron resultados con los filtros aplicados"
                        : "Registra un nuevo pago para comenzar a hacer seguimiento"}
                    </p>
                  </td>
                </tr>
              )}
              {filteredPayments.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-b last:border-b-0 hover:bg-muted/30"
                >
                  <td className="p-4">
                    <span className="font-medium text-card-foreground">
                      {payment.patient_name}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">{formatDate(payment.session_date)}</td>
                  <td className="p-4 text-muted-foreground">
                    {formatDate(payment.payment_date)}
                  </td>
                  <td className="p-4 font-medium text-card-foreground">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="p-4">{getStatusBadge(payment.status)}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      {payment.status !== "paid" && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRegisterPayment(payment)}
                        >
                          Registrar Pago
                        </Button>
                      )}
                      {payment.status === "paid" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const patient = patients.find(p => p.id === payment.patient_id);
                            exportBoletaPDF({
                              boletaNumber: generateBoletaNumber(payment.id),
                              professional: {
                                name: profile?.full_name || 'Profesional',
                                rut: profile?.rut || null,
                                address: profile?.address || null,
                                city: profile?.city || null,
                                institution: profile?.institution || null,
                              },
                              patient: {
                                name: payment.patient_name || 'Paciente',
                                rut: patient?.rut || null,
                              },
                              amount: payment.amount,
                              sessionDate: payment.session_date,
                              paymentDate: payment.payment_date,
                              paymentMethod: payment.payment_method,
                            });
                            toast.success('Boleta generada exitosamente');
                          }}
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          Boleta
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PaymentFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        onCancelWithoutCharge={handleCancelWithoutCharge}
        patients={patientOptions}
        mode={formMode}
        patientName={selectedPayment?.patient_name}
        initialData={
          selectedPayment
            ? {
                patientId: selectedPayment.patient_id,
                sessionDate: selectedPayment.session_date,
                amount: selectedPayment.amount,
                status: "paid",
              }
            : undefined
        }
      />
    </AppLayout>
  );
}