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
  Filter,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Payment {
  id: string;
  patientName: string;
  sessionDate: string;
  paymentDate: string | null;
  amount: number;
  status: "paid" | "pending" | "overdue";
}

const mockPayments: Payment[] = [
  {
    id: "1",
    patientName: "María García",
    sessionDate: "02/02/2026",
    paymentDate: "02/02/2026",
    amount: 35000,
    status: "paid",
  },
  {
    id: "2",
    patientName: "Juan Rodríguez",
    sessionDate: "01/02/2026",
    paymentDate: null,
    amount: 35000,
    status: "pending",
  },
  {
    id: "3",
    patientName: "Ana López",
    sessionDate: "30/01/2026",
    paymentDate: "30/01/2026",
    amount: 35000,
    status: "paid",
  },
  {
    id: "4",
    patientName: "Carlos Martínez",
    sessionDate: "28/01/2026",
    paymentDate: null,
    amount: 35000,
    status: "overdue",
  },
  {
    id: "5",
    patientName: "Laura Silva",
    sessionDate: "25/01/2026",
    paymentDate: "25/01/2026",
    amount: 35000,
    status: "paid",
  },
  {
    id: "6",
    patientName: "María García",
    sessionDate: "26/01/2026",
    paymentDate: "26/01/2026",
    amount: 35000,
    status: "paid",
  },
  {
    id: "7",
    patientName: "Juan Rodríguez",
    sessionDate: "24/01/2026",
    paymentDate: null,
    amount: 35000,
    status: "pending",
  },
];

export default function Pagos() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("febrero");

  const filteredPayments = mockPayments.filter((payment) => {
    const matchesSearch = payment.patientName
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

  const totalPaid = mockPayments
    .filter((p) => p.status === "paid")
    .reduce((acc, p) => acc + p.amount, 0);
  const totalPending = mockPayments
    .filter((p) => p.status === "pending" || p.status === "overdue")
    .reduce((acc, p) => acc + p.amount, 0);

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
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
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
                  {mockPayments.filter((p) => p.status !== "paid").length} sesiones
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
                  {mockPayments.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {mockPayments.filter((p) => p.status === "paid").length} pagadas
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
        <div className="bg-card rounded-xl border overflow-hidden">
          <table className="w-full">
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
              {filteredPayments.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-b last:border-b-0 hover:bg-muted/30"
                >
                  <td className="p-4">
                    <span className="font-medium text-card-foreground">
                      {payment.patientName}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">{payment.sessionDate}</td>
                  <td className="p-4 text-muted-foreground">
                    {payment.paymentDate || "-"}
                  </td>
                  <td className="p-4 font-medium text-card-foreground">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="p-4">{getStatusBadge(payment.status)}</td>
                  <td className="p-4">
                    {payment.status !== "paid" && (
                      <Button size="sm" variant="outline">
                        Registrar Pago
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
