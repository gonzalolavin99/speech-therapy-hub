import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparisonRow {
  feature: string;
  therapyHub: boolean;
  encuadrado: boolean;
  highlight?: boolean;
}

const comparisons: ComparisonRow[] = [
  { feature: "Calendario y agenda", therapyHub: true, encuadrado: true },
  { feature: "Gestión de pacientes", therapyHub: true, encuadrado: true },
  { feature: "Portal del paciente", therapyHub: true, encuadrado: true },
  { feature: "Cobros y pagos online", therapyHub: true, encuadrado: true },
  { feature: "Boletas de honorarios", therapyHub: true, encuadrado: true },
  { feature: "Perfil público profesional", therapyHub: true, encuadrado: true },
  { feature: "Multi-profesional / clínica", therapyHub: true, encuadrado: true },
  { feature: "Google Calendar", therapyHub: true, encuadrado: true },
  { feature: "Reserva online de citas", therapyHub: true, encuadrado: true },
  { feature: "Tests clínicos estandarizados (+10)", therapyHub: true, encuadrado: false, highlight: true },
  { feature: "Análisis con inteligencia artificial", therapyHub: true, encuadrado: false, highlight: true },
  { feature: "Planificación terapéutica completa", therapyHub: true, encuadrado: false, highlight: true },
  { feature: "Registro de auditoría", therapyHub: true, encuadrado: false, highlight: true },
  { feature: "Modo oscuro", therapyHub: true, encuadrado: false, highlight: true },
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
            TherapyHub vs la competencia
          </h2>
          <p className="text-muted-foreground text-lg">
            Todo lo que otros ofrecen, más herramientas clínicas que nadie más
            tiene.
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
                  Encuadrado
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((row, i) => (
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
                    <StatusIcon available={row.encuadrado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {comparisons
            .filter((row) => row.highlight)
            .map((row) => (
              <div
                key={row.feature}
                className="rounded-xl border bg-primary/5 dark:bg-primary/10 p-4 flex items-center justify-between gap-3"
              >
                <span className="text-sm font-medium text-foreground">
                  {row.feature}
                </span>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-center">
                    <StatusIcon available={row.therapyHub} />
                    <p className="text-[10px] text-primary mt-1">TH</p>
                  </div>
                  <div className="text-center">
                    <StatusIcon available={row.encuadrado} />
                    <p className="text-[10px] text-muted-foreground mt-1">Enc</p>
                  </div>
                </div>
              </div>
            ))}
          <p className="text-xs text-center text-muted-foreground pt-2">
            Ambas plataformas incluyen: calendario, gestión de pacientes, portal,
            cobros, boletas, perfil público, multi-profesional y Google Calendar.
          </p>
        </div>
      </div>
    </section>
  );
}
