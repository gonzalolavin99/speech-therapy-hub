import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparisonRow {
  feature: string;
  therapyHub: boolean;
  others: boolean;
  highlight?: boolean;
}

const comparisons: ComparisonRow[] = [
  { feature: "Calendario y agenda", therapyHub: true, others: true },
  { feature: "Gestión de pacientes", therapyHub: true, others: true },
  { feature: "Portal del paciente", therapyHub: true, others: true },
  { feature: "Cobros y pagos online", therapyHub: true, others: true },
  { feature: "Boletas de honorarios", therapyHub: true, others: true },
  { feature: "Perfil público profesional", therapyHub: true, others: true },
  { feature: "Multi-profesional / clínica", therapyHub: true, others: true },
  { feature: "Google Calendar", therapyHub: true, others: true },
  { feature: "Reserva online de citas", therapyHub: true, others: true },
  { feature: "Tests clínicos estandarizados (+10)", therapyHub: true, others: false, highlight: true },
  { feature: "Análisis con inteligencia artificial", therapyHub: true, others: false, highlight: true },
  { feature: "Planificación terapéutica completa", therapyHub: true, others: false, highlight: true },
  { feature: "Registro de auditoría", therapyHub: true, others: false, highlight: true },
  { feature: "Modo oscuro", therapyHub: true, others: false, highlight: true },
];

function StatusIcon({ available }: { available: boolean }) {
  if (available) {
    return (
      <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/30">
        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
      </div>
    );
  }
  return (
    <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-100 dark:bg-red-900/30">
      <X className="h-4 w-4 text-red-500 dark:text-red-400" />
    </div>
  );
}

export function ComparisonSection() {
  return (
    <section id="comparativa" className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Más que una agenda online
          </h2>
          <p className="text-muted-foreground text-lg">
            Todo lo que ofrecen otras plataformas, más herramientas clínicas
            especializadas que no encontrarás en ningún otro lugar.
          </p>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-4 px-6 font-semibold text-foreground">
                  Funcionalidad
                </th>
                <th className="text-center py-4 px-6 font-semibold text-primary">
                  TherapyHub
                </th>
                <th className="text-center py-4 px-6 font-semibold text-muted-foreground">
                  Otras plataformas
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((row) => (
                <tr
                  key={row.feature}
                  className={cn(
                    "border-b last:border-b-0",
                    row.highlight && "bg-primary/5 dark:bg-primary/10"
                  )}
                >
                  <td
                    className={cn(
                      "py-3 px-6 text-sm",
                      row.highlight
                        ? "font-medium text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {row.feature}
                  </td>
                  <td className="py-3 px-6 text-center">
                    <StatusIcon available={row.therapyHub} />
                  </td>
                  <td className="py-3 px-6 text-center">
                    <StatusIcon available={row.others} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards - only show highlights (TherapyHub exclusives) */}
        <div className="md:hidden space-y-3">
          <p className="text-sm text-muted-foreground mb-4">
            Funcionalidades exclusivas de TherapyHub:
          </p>
          {comparisons
            .filter((row) => row.highlight)
            .map((row) => (
              <div
                key={row.feature}
                className="rounded-xl border bg-primary/5 dark:bg-primary/10 p-4 flex items-center gap-3"
              >
                <StatusIcon available={true} />
                <span className="text-sm font-medium text-foreground">
                  {row.feature}
                </span>
              </div>
            ))}
          <p className="text-xs text-center text-muted-foreground pt-2">
            Además incluye: calendario, gestión de pacientes, portal,
            cobros, boletas, perfil público, multi-profesional y Google Calendar.
          </p>
        </div>
      </div>
    </section>
  );
}
