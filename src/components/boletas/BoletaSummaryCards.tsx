import { DollarSign, Percent, Wallet } from "lucide-react";
import type { BoletaHonorarios } from "@/hooks/useBoletas";

interface BoletaSummaryCardsProps {
  boletas: BoletaHonorarios[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
  }).format(amount);
}

export function BoletaSummaryCards({ boletas }: BoletaSummaryCardsProps) {
  // Filtrar solo boletas emitidas del mes actual
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const emittedThisMonth = boletas.filter((b) => {
    if (b.status !== 'emitted') return false;
    const date = new Date(b.service_date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const allThisMonth = boletas.filter((b) => {
    if (b.status === 'voided') return false;
    const date = new Date(b.service_date);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const totalBruto = emittedThisMonth.reduce((sum, b) => sum + b.amount_bruto, 0);
  const totalRetencion = emittedThisMonth.reduce((sum, b) => sum + b.retencion_amount, 0);
  const totalLiquido = emittedThisMonth.reduce((sum, b) => sum + b.amount_liquido, 0);

  const pendingCount = allThisMonth.filter((b) => b.status === 'draft' || b.status === 'pending_sii').length;
  const emittedCount = emittedThisMonth.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Bruto */}
        <div className="bg-card rounded-xl border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Bruto</p>
              <p className="text-2xl font-bold text-success mt-1">
                {formatCurrency(totalBruto)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {emittedCount} boletas emitidas
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-success" />
            </div>
          </div>
        </div>

        {/* Total Retencion */}
        <div className="bg-card rounded-xl border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Retencion</p>
              <p className="text-2xl font-bold text-warning mt-1">
                {formatCurrency(totalRetencion)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Impuesto retenido este mes
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <Percent className="h-6 w-6 text-warning" />
            </div>
          </div>
        </div>

        {/* Total Liquido */}
        <div className="bg-card rounded-xl border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Liquido</p>
              <p className="text-2xl font-bold text-primary mt-1">
                {formatCurrency(totalLiquido)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {pendingCount > 0 ? `${pendingCount} pendientes` : 'Todo al dia'}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
