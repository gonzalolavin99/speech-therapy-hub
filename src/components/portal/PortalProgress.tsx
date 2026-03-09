import type { PortalPlanning } from "@/hooks/usePatientPortal";
import { TrendingUp, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  plannings: PortalPlanning[];
}

export function PortalProgress({ plannings }: Props) {
  if (plannings.length === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">Sin planificaciones registradas</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Tu progreso terapéutico aparecerá aquí
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {plannings.map((plan) => {
        const progress = plan.total_sessions > 0
          ? Math.round((plan.completed_sessions / plan.total_sessions) * 100)
          : 0;
        const isCompleted = plan.status === 'completed';

        return (
          <div
            key={plan.id}
            className={cn(
              "bg-card rounded-xl border p-5",
              isCompleted && "border-success/30"
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  {plan.intervention_approach}
                  {isCompleted && <CheckCircle className="h-4 w-4 text-success" />}
                </h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {plan.method}
                </p>
              </div>
              <span className={cn(
                "text-xs font-medium px-2 py-1 rounded-full",
                isCompleted
                  ? "bg-success/10 text-success"
                  : "bg-primary/10 text-primary"
              )}>
                {isCompleted ? 'Completado' : 'En curso'}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Sesiones: {plan.completed_sessions} de {plan.total_sessions}</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isCompleted ? "bg-success" : "bg-primary"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Frecuencia: {plan.frequency}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
