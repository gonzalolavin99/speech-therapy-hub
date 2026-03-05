import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  Clock,
  XCircle,
  FileEdit,
  FileText,
  ExternalLink,
  Receipt,
  Trash2,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoletaHonorarios } from "@/hooks/useBoletas";
import { SII_BHE_PORTAL_URL } from "@/config/retencion";
import { exportBoletaHonorariosPDF } from "@/utils/exportBoleta";
import { toast } from "sonner";

interface BoletasListProps {
  boletas: BoletaHonorarios[];
  professional: {
    name: string;
    rut: string | null;
    address: string | null;
    city: string | null;
  };
  onMarkEmitted: (boletaId: string, siiFolio?: string, emissionDate?: string) => void;
  onVoid: (boletaId: string) => void;
  onDelete: (boletaId: string) => void;
  onEdit: (boleta: BoletaHonorarios) => void;
}

const statusConfig = {
  draft: { icon: FileEdit, label: "Borrador", className: "bg-muted text-muted-foreground" },
  pending_sii: { icon: Clock, label: "Pendiente SII", className: "bg-warning/10 text-warning" },
  emitted: { icon: CheckCircle, label: "Emitida", className: "bg-success/10 text-success" },
  voided: { icon: XCircle, label: "Anulada", className: "bg-destructive/10 text-destructive" },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(amount);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function getStatusBadge(status: BoletaHonorarios["status"]) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <span className={cn("px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit", config.className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

export function BoletasList({
  boletas,
  professional,
  onMarkEmitted,
  onVoid,
  onDelete,
  onEdit,
}: BoletasListProps) {
  const [emitDialogOpen, setEmitDialogOpen] = useState(false);
  const [selectedBoleta, setSelectedBoleta] = useState<BoletaHonorarios | null>(null);
  const [siiFolio, setSiiFolio] = useState("");
  const [emissionDate, setEmissionDate] = useState(new Date().toISOString().split("T")[0]);

  const handleOpenEmitDialog = (boleta: BoletaHonorarios) => {
    setSelectedBoleta(boleta);
    setSiiFolio("");
    setEmissionDate(new Date().toISOString().split("T")[0]);
    setEmitDialogOpen(true);
  };

  const handleConfirmEmitted = () => {
    if (selectedBoleta) {
      onMarkEmitted(selectedBoleta.id, siiFolio || undefined, emissionDate);
      setEmitDialogOpen(false);
      setSelectedBoleta(null);
    }
  };

  const handleViewPdf = async (boleta: BoletaHonorarios) => {
    try {
      await exportBoletaHonorariosPDF({
        boletaNumber: boleta.boleta_number,
        siiFolio: boleta.sii_folio,
        professional,
        patient: {
          name: boleta.patient_name,
          rut: boleta.patient_rut,
        },
        amountBruto: boleta.amount_bruto,
        retencionPercent: boleta.retencion_percent,
        retencionAmount: boleta.retencion_amount,
        amountLiquido: boleta.amount_liquido,
        description: boleta.description,
        serviceDate: boleta.service_date,
        emissionDate: boleta.emission_date,
        status: boleta.status,
      });
      toast.success("PDF generado exitosamente");
    } catch {
      toast.error("Error al generar PDF");
    }
  };

  const handleOpenSII = () => {
    const newWindow = window.open(SII_BHE_PORTAL_URL, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      toast.info('No se pudo abrir el portal del SII', {
        description: 'Abre manualmente: ' + SII_BHE_PORTAL_URL,
        duration: 8000,
      });
    }
  };

  return (
    <>
      <div className="bg-card rounded-xl border overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">N. Boleta</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Paciente</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Fecha</th>
              <th className="text-right p-4 text-sm font-medium text-muted-foreground">Bruto</th>
              <th className="text-right p-4 text-sm font-medium text-muted-foreground">Retencion</th>
              <th className="text-right p-4 text-sm font-medium text-muted-foreground">Liquido</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Estado</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {boletas.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center">
                  <Receipt className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">No hay boletas registradas</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Genera una boleta desde la seccion de Pagos
                  </p>
                </td>
              </tr>
            )}
            {boletas.map((boleta) => (
              <tr key={boleta.id} className="border-b last:border-b-0 hover:bg-muted/30">
                <td className="p-4">
                  <span className="font-mono text-sm font-medium text-card-foreground">
                    {boleta.boleta_number}
                  </span>
                  {boleta.sii_folio && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      SII: {boleta.sii_folio}
                    </p>
                  )}
                </td>
                <td className="p-4">
                  <span className="font-medium text-card-foreground">{boleta.patient_name}</span>
                  {boleta.patient_rut && (
                    <p className="text-xs text-muted-foreground">{boleta.patient_rut}</p>
                  )}
                </td>
                <td className="p-4 text-muted-foreground text-sm">{formatDate(boleta.service_date)}</td>
                <td className="p-4 text-right font-medium text-card-foreground">{formatCurrency(boleta.amount_bruto)}</td>
                <td className="p-4 text-right text-destructive text-sm">
                  -{formatCurrency(boleta.retencion_amount)}
                  <span className="text-xs text-muted-foreground ml-1">({boleta.retencion_percent}%)</span>
                </td>
                <td className="p-4 text-right font-semibold text-primary">{formatCurrency(boleta.amount_liquido)}</td>
                <td className="p-4">{getStatusBadge(boleta.status)}</td>
                <td className="p-4">
                  <div className="flex gap-1 flex-wrap">
                    {/* Draft actions */}
                    {boleta.status === "draft" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => onEdit(boleta)}>
                          <FileEdit className="h-3.5 w-3.5 mr-1" />
                          Editar
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleOpenSII}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          SII
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onDelete(boleta.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}

                    {/* Pending SII actions */}
                    {boleta.status === "pending_sii" && (
                      <>
                        <Button size="sm" variant="default" onClick={() => handleOpenEmitDialog(boleta)}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          Emitida
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleViewPdf(boleta)}>
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onVoid(boleta.id)}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}

                    {/* Emitted actions */}
                    {boleta.status === "emitted" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleViewPdf(boleta)}>
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onVoid(boleta.id)}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}

                    {/* Voided actions */}
                    {boleta.status === "voided" && (
                      <Button size="sm" variant="outline" onClick={() => handleViewPdf(boleta)}>
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        PDF
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialog para marcar como emitida */}
      <Dialog open={emitDialogOpen} onOpenChange={setEmitDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Marcar como Emitida</DialogTitle>
            <DialogDescription>
              Confirma que emitiste esta boleta en el portal del SII
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedBoleta && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Boleta:</span>
                  <span className="font-mono font-medium">{selectedBoleta.boleta_number}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paciente:</span>
                  <span className="font-medium">{selectedBoleta.patient_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monto:</span>
                  <span className="font-medium">{formatCurrency(selectedBoleta.amount_bruto)}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Folio SII (opcional)</label>
              <Input
                value={siiFolio}
                onChange={(e) => setSiiFolio(e.target.value)}
                placeholder="Ej: 12345678"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha de emision</label>
              <Input
                type="date"
                value={emissionDate}
                onChange={(e) => setEmissionDate(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEmitDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmEmitted}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
