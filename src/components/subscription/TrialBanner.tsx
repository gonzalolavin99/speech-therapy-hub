import { useSubscription } from "@/hooks/useSubscription";
import { Crown, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export function TrialBanner() {
  const { subscription, effectivePlan, trialDaysRemaining, trialExpired } = useSubscription();

  // Don't show for paid plans, VIP, or free (who never had trial)
  if (!subscription) return null;
  if (subscription.plan !== "trial" && subscription.plan !== "free") return null;
  if (subscription.plan === "free" && !subscription.trial_ends_at) return null;

  // Trial expired → show upgrade CTA
  if (trialExpired || (subscription.plan === "free" && subscription.trial_ends_at)) {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Tu período de prueba ha terminado
          </p>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/70 mt-0.5">
            Algunas funciones están limitadas. Suscríbete para recuperar acceso completo.
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link to="/planes">
            Ver planes <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>
    );
  }

  // Active trial with days remaining
  if (trialDaysRemaining === null) return null;

  const isUrgent = trialDaysRemaining <= 5;

  return (
    <div className={cn(
      "rounded-xl border p-4 flex items-center gap-4",
      isUrgent
        ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30"
        : "border-primary/20 bg-primary/5"
    )}>
      <div className={cn(
        "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
        isUrgent
          ? "bg-amber-100 dark:bg-amber-900/50"
          : "bg-primary/10"
      )}>
        {isUrgent ? (
          <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        ) : (
          <Crown className="h-5 w-5 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-semibold",
          isUrgent ? "text-amber-800 dark:text-amber-300" : "text-foreground"
        )}>
          {isUrgent
            ? `¡Solo te quedan ${trialDaysRemaining} día${trialDaysRemaining !== 1 ? "s" : ""} de prueba!`
            : `Estás en tu período de prueba gratuito`
          }
        </p>
        <p className={cn(
          "text-xs mt-0.5",
          isUrgent ? "text-amber-700/80 dark:text-amber-400/70" : "text-muted-foreground"
        )}>
          {isUrgent
            ? "Suscríbete antes de que expire para no perder acceso a funciones premium."
            : `Te quedan ${trialDaysRemaining} días para probar todas las funciones.`
          }
        </p>
      </div>
      <Button asChild size="sm" variant={isUrgent ? "default" : "outline"} className="shrink-0">
        <Link to="/planes">
          Ver planes <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </Button>
    </div>
  );
}
