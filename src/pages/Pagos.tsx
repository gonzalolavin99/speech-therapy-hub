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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Search,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  FileText,
  Plus,
  Receipt,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PaymentFormDialog } from "@/components/forms/PaymentFormDialog";
import { BoletaHonorariosDialog } from "@/components/forms/BoletaHonorariosDialog";
import { SessionPackFormDialog } from "@/components/forms/SessionPackFormDialog";
import { BoletasList } from "@/components/boletas/BoletasList";
import { BoletaSummaryCards } from "@/components/boletas/BoletaSummaryCards";
import { SessionPacksList } from "@/components/packs/SessionPacksList";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";
import { usePayments, Payment, PaymentFormData } from "@/hooks/usePayments";
import { useBoletas, generateBoletaNumber, BoletaFormData, BoletaHonorarios } from "@/hooks/useBoletas";
import { useSessionPacks, SessionPackFormData } from "@/hooks/useSessionPacks";
import { usePatients } from "@/hooks/usePatients";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { useProfession } from "@/contexts/ProfessionContext";
import { calculateRetencion } from "@/config/retencion";
import { exportBoletaPDF, generateBoletaNumber as generateBoletaNumberLegacy } from "@/utils/exportBoleta";
import { toast } from "sonner";

export default function Pagos() {
  const [activeTab, setActiveTab] = useState("pagos");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("febrero");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "register">("create");
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  // BHE state
  const [isBoletaDialogOpen, setIsBoletaDialogOpen] = useState(false);
  const [boletaPaymentData, setBoletaPaymentData] = useState<{
    paymentId: string;
    patientId: string;
    patientName: string;
    patientRut: string | null;
    patientAddress: string | null;
    patientRegion: string | null;
    patientComuna: string | null;
    amount: number;
    sessionDate: string;
  } | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [boletaSearchQuery, setBoletaSearchQuery] = useState("");
  const [boletaStatusFilter, setBoletaStatusFilter] = useState<string>("all");

  // Packs state
  const [isPackDialogOpen, setIsPackDialogOpen] = useState(false);
  const [packStatusFilter, setPackStatusFilter] = useState<string>("all");

  const { payments, isLoading, createPayment, updatePayment, deletePayment } = usePayments();
  const { boletas, createBoleta, updateBoleta, markAsEmitted, voidBoleta, deleteBoleta } = useBoletas();
  const { packs, createPack, useSession: usePackSession, cancelPack, deletePack } = useSessionPacks();
  const { patients } = usePatients();
  const { profile } = useProfile();
  const { hasFeature } = useSubscription();
  const { professionId } = useProfession();

  const canUseBHE = hasFeature('boleta_pdf');

  const professionalData = {
    name: profile?.full_name || 'Profesional',
    rut: profile?.rut || null,
    address: profile?.address || null,
    city: profile?.city || null,
  };

  const patientOptions = patients.map((p) => ({ id: p.id, name: p.name }));

  // ── Payment filters ──
  const filteredPayments = payments.filter((payment) => {
    const matchesSearch = (payment.patient_name || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ── Boleta filters ──
  const filteredBoletas = boletas.filter((boleta) => {
    const matchesSearch = boleta.patient_name
      .toLowerCase()
      .includes(boletaSearchQuery.toLowerCase());
    const matchesStatus =
      boletaStatusFilter === "all" || boleta.status === boletaStatusFilter;
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

  // ── BHE handlers ──
  const handleOpenBHEDialog = (payment: Payment) => {
    if (!canUseBHE) {
      setShowUpgradePrompt(true);
      return;
    }
    const patient = patients.find(p => p.id === payment.patient_id);
    setBoletaPaymentData({
      paymentId: payment.id,
      patientId: payment.patient_id,
      patientName: payment.patient_name || 'Paciente',
      patientRut: patient?.rut || null,
      patientAddress: patient?.address || null,
      patientRegion: patient?.region || null,
      patientComuna: patient?.comuna || null,
      amount: payment.amount,
      sessionDate: payment.session_date,
    });
    setIsBoletaDialogOpen(true);
  };

  const handleBoletaSubmit = (data: any, action: 'draft' | 'emit') => {
    const retencion = calculateRetencion(data.amountBruto);

    const boletaData: BoletaFormData = {
      payment_id: boletaPaymentData?.paymentId || null,
      patient_id: boletaPaymentData?.patientId || null,
      boleta_number: generateBoletaNumber(),
      amount_bruto: data.amountBruto,
      retencion_percent: retencion.percent,
      retencion_amount: retencion.retencionAmount,
      amount_liquido: retencion.amountLiquido,
      description: data.description,
      service_date: data.serviceDate,
      status: action === 'emit' ? 'pending_sii' : 'draft',
      professional_rut: profile?.rut || null,
      professional_name: profile?.full_name || 'Profesional',
      patient_rut: data.patientRut || null,
      patient_name: data.patientName,
      notes: data.notes || null,
    };

    createBoleta.mutate(boletaData);
  };

  const handleMarkEmitted = (boletaId: string, siiFolio?: string, emissionDate?: string) => {
    markAsEmitted.mutate({ id: boletaId, sii_folio: siiFolio, emission_date: emissionDate });
  };

  const handleVoidBoleta = (boletaId: string) => {
    voidBoleta.mutate(boletaId);
  };

  const handleDeleteBoleta = (boletaId: string) => {
    deleteBoleta.mutate(boletaId);
  };

  // ── Pack filters ──
  const filteredPacks = packs.filter((pack) => {
    return packStatusFilter === "all" || pack.status === packStatusFilter;
  });

  // ── Pack handlers ──
  const handlePackSubmit = (data: any) => {
    const packData: SessionPackFormData = {
      patient_id: data.patientId,
      name: data.name,
      total_sessions: data.totalSessions,
      price_total: data.priceTotal,
      original_price_per_session: data.originalPricePerSession,
      payment_status: data.paymentStatus,
      notes: data.notes || null,
      expires_at: data.expiresAt || null,
    };
    createPack.mutate(packData);
  };

  const handleEditBoleta = (boleta: BoletaHonorarios) => {
    // Pre-fill dialog with existing boleta data for editing
    const patient = patients.find(p => p.id === boleta.patient_id);
    setBoletaPaymentData({
      paymentId: boleta.payment_id || '',
      patientId: boleta.patient_id || '',
      patientName: boleta.patient_name,
      patientRut: boleta.patient_rut,
      patientAddress: patient?.address || null,
      patientRegion: patient?.region || null,
      patientComuna: patient?.comuna || null,
      amount: boleta.amount_bruto,
      sessionDate: boleta.service_date,
    });
    setIsBoletaDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pagos y Boletas</h1>
            <p className="text-muted-foreground mt-1">
              Control de pagos y boletas de honorarios
            </p>
          </div>
          <div className="flex gap-2">
            {activeTab === "pagos" && (
              <Button onClick={() => { setFormMode('create'); setSelectedPayment(null); setIsFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Pago
              </Button>
            )}
            {activeTab === "packs" && (
              <Button onClick={() => setIsPackDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Pack
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pagos" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Pagos
            </TabsTrigger>
            <TabsTrigger value="packs" className="gap-2">
              <Package className="h-4 w-4" />
              Packs
            </TabsTrigger>
            <TabsTrigger value="boletas" className="gap-2">
              <Receipt className="h-4 w-4" />
              Boletas
            </TabsTrigger>
          </TabsList>

          {/* ════════════ TAB: PAGOS ════════════ */}
          <TabsContent value="pagos" className="space-y-6 mt-6">
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
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Paciente</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Fecha Sesion</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Fecha Pago</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Monto</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Estado</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Acciones</th>
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
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  try {
                                    const patient = patients.find(p => p.id === payment.patient_id);
                                    await exportBoletaPDF({
                                      boletaNumber: generateBoletaNumberLegacy(payment.id),
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
                                    toast.success('PDF generado exitosamente');
                                  } catch {
                                    toast.error('Error al generar PDF');
                                  }
                                }}
                              >
                                <FileText className="h-3.5 w-3.5 mr-1" />
                                PDF
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenBHEDialog(payment)}
                              >
                                <Receipt className="h-3.5 w-3.5 mr-1" />
                                BHE
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ════════════ TAB: PACKS ════════════ */}
          <TabsContent value="packs" className="space-y-6 mt-6">
            {/* Pack Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl border p-5">
                <p className="text-sm text-muted-foreground">Packs Activos</p>
                <p className="text-2xl font-bold text-primary mt-1">
                  {packs.filter(p => p.status === 'active').length}
                </p>
              </div>
              <div className="bg-card rounded-xl border p-5">
                <p className="text-sm text-muted-foreground">Sesiones Restantes</p>
                <p className="text-2xl font-bold text-card-foreground mt-1">
                  {packs.filter(p => p.status === 'active').reduce((acc, p) => acc + (p.total_sessions - p.used_sessions), 0)}
                </p>
              </div>
              <div className="bg-card rounded-xl border p-5">
                <p className="text-sm text-muted-foreground">Ingresos por Packs</p>
                <p className="text-2xl font-bold text-success mt-1">
                  {formatCurrency(packs.filter(p => p.payment_status === 'paid').reduce((acc, p) => acc + p.price_total, 0))}
                </p>
              </div>
              <div className="bg-card rounded-xl border p-5">
                <p className="text-sm text-muted-foreground">Por Cobrar</p>
                <p className="text-2xl font-bold text-warning mt-1">
                  {formatCurrency(packs.filter(p => p.payment_status !== 'paid' && p.status === 'active').reduce((acc, p) => acc + p.price_total, 0))}
                </p>
              </div>
            </div>

            {/* Pack Filters */}
            <div className="flex flex-wrap gap-4">
              <Select value={packStatusFilter} onValueChange={setPackStatusFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="completed">Completados</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                  <SelectItem value="expired">Expirados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <SessionPacksList
              packs={filteredPacks}
              onUseSession={(id) => usePackSession.mutate(id)}
              onCancel={(id) => cancelPack.mutate(id)}
              onDelete={(id) => deletePack.mutate(id)}
            />
          </TabsContent>

          {/* ════════════ TAB: BOLETAS ════════════ */}
          <TabsContent value="boletas" className="space-y-6 mt-6">
            {canUseBHE ? (
              <>
                <BoletaSummaryCards boletas={boletas} />

                {/* Boleta Filters */}
                <div className="flex flex-wrap gap-4">
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por paciente..."
                      value={boletaSearchQuery}
                      onChange={(e) => setBoletaSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={boletaStatusFilter} onValueChange={setBoletaStatusFilter}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="draft">Borrador</SelectItem>
                      <SelectItem value="pending_sii">Pendiente SII</SelectItem>
                      <SelectItem value="emitted">Emitida</SelectItem>
                      <SelectItem value="voided">Anulada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <BoletasList
                  boletas={filteredBoletas}
                  professional={professionalData}
                  onMarkEmitted={handleMarkEmitted}
                  onVoid={handleVoidBoleta}
                  onDelete={handleDeleteBoleta}
                  onEdit={handleEditBoleta}
                />
              </>
            ) : (
              <div className="text-center py-16">
                <Receipt className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Boletas de Honorarios</h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  Genera y gestiona tus boletas de honorarios con calculo automatico de retencion y acceso directo al portal del SII.
                </p>
                <Button onClick={() => setShowUpgradePrompt(true)}>
                  Ver planes disponibles
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialogs ── */}
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

      <BoletaHonorariosDialog
        open={isBoletaDialogOpen}
        onOpenChange={setIsBoletaDialogOpen}
        onSubmit={handleBoletaSubmit}
        professional={professionalData}
        paymentData={boletaPaymentData}
        professionId={professionId}
      />

      <SessionPackFormDialog
        open={isPackDialogOpen}
        onOpenChange={setIsPackDialogOpen}
        onSubmit={handlePackSubmit}
        patients={patientOptions}
        defaultSessionPrice={profile?.session_price || 35000}
      />

      <UpgradePrompt
        open={showUpgradePrompt}
        onOpenChange={setShowUpgradePrompt}
        title="Boletas de Honorarios"
        description="Genera y gestiona tus boletas de honorarios con calculo automatico de retencion. Disponible en el plan Profesional."
      />
    </AppLayout>
  );
}
