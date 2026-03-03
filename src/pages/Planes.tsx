import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";
import {
  Check,
  X,
  Crown,
  Sparkles,
  Zap,
  Clock,
  ArrowRight,
} from "lucide-react";
import type { PlanId } from "@/config/subscriptions";
import { formatPriceCLP, getTrialDaysRemaining } from "@/config/subscriptions";

interface PlanFeature {
  label: string;
  free: boolean | string;
  professional: boolean | string;
  clinic: boolean | string;
}

const features: PlanFeature[] = [
  { label: "Pacientes activos", free: "5", professional: "Ilimitados", clinic: "Ilimitados" },
  { label: "Sesiones por mes", free: "20", professional: "Ilimitadas", clinic: "Ilimitadas" },
  { label: "Tests disponibles", free: "2 básicos", professional: "Todos", clinic: "Todos" },
  { label: "Planificaciones activas", free: "3", professional: "Ilimitadas", clinic: "Ilimitadas" },
  { label: "Consultas IA por mes", free: "5", professional: "50", clinic: "Ilimitadas" },
  { label: "Boletas PDF", free: false, professional: true, clinic: true },
  { label: "Exportar ficha paciente", free: false, professional: true, clinic: true },
  { label: "Google Calendar", free: false, professional: true, clinic: true },
  { label: "Consentimiento digital", free: true, professional: true, clinic: true },
  { label: "Multi-profesional", free: "1 cuenta", professional: "1 cuenta", clinic: "Hasta 5" },
  { label: "Branding personalizado", free: false, professional: false, clinic: true },
  { label: "Soporte", free: "Comunidad", professional: "Email (48h)", clinic: "Prioritario (24h)" },
];

const plans: {
  id: PlanId;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  icon: React.ReactNode;
  popular?: boolean;
}[] = [
  {
    id: "free",
    name: "Free",
    description: "Para probar la plataforma con funciones básicas",
    priceMonthly: 0,
    priceYearly: 0,
    icon: <Zap className="h-6 w-6" />,
  },
  {
    id: "professional",
    name: "Profesional",
    description: "Todo lo que necesitas como terapeuta independiente",
    priceMonthly: 9990,
    priceYearly: 89990,
    icon: <Sparkles className="h-6 w-6" />,
    popular: true,
  },
  {
    id: "clinic",
    name: "Clínica",
    description: "Para centros con múltiples profesionales",
    priceMonthly: 24990,
    priceYearly: 229990,
    icon: <Crown className="h-6 w-6" />,
  },
];

export default function Planes() {
  const { subscription, effectivePlan, trialDaysRemaining } = useSubscription();
  const isTrialing = subscription?.plan === "trial";

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Planes y Precios</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Elige el plan que mejor se adapte a tu práctica profesional.
            {isTrialing && trialDaysRemaining !== null && trialDaysRemaining > 0 && (
              <span className="block mt-1 text-primary font-medium">
                <Clock className="inline h-4 w-4 mr-1" />
                Te quedan {trialDaysRemaining} días de prueba gratuita
              </span>
            )}
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = effectivePlan === plan.id ||
              (isTrialing && plan.id === "professional");
            const yearlyMonthly = plan.priceYearly > 0
              ? Math.round(plan.priceYearly / 12)
              : 0;
            const yearlySaving = plan.priceMonthly > 0
              ? Math.round((1 - yearlyMonthly / plan.priceMonthly) * 100)
              : 0;

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative rounded-2xl border bg-card p-6 flex flex-col",
                  plan.popular && "border-primary shadow-lg shadow-primary/10",
                  isCurrent && "ring-2 ring-primary"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Más popular
                    </span>
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-3 right-4">
                    <span className="bg-success text-white text-xs font-semibold px-3 py-1 rounded-full">
                      {isTrialing ? "Trial activo" : "Plan actual"}
                    </span>
                  </div>
                )}

                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                  plan.popular
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}>
                  {plan.icon}
                </div>

                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">{plan.description}</p>

                {/* Price */}
                <div className="mb-6">
                  {plan.priceMonthly === 0 ? (
                    <div className="text-3xl font-bold">Gratis</div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">{formatPriceCLP(plan.priceMonthly)}</span>
                        <span className="text-sm text-muted-foreground">/mes</span>
                      </div>
                      {plan.priceYearly > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          o {formatPriceCLP(plan.priceYearly)}/año
                          <span className="ml-1 text-success font-medium">(-{yearlySaving}%)</span>
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* CTA */}
                <Button
                  className={cn(
                    "w-full mb-6",
                    plan.popular ? "" : "variant-outline"
                  )}
                  variant={plan.popular ? "default" : "outline"}
                  disabled={isCurrent && !isTrialing}
                >
                  {isCurrent && !isTrialing ? (
                    "Plan actual"
                  ) : (
                    <>
                      {plan.priceMonthly === 0 ? "Comenzar gratis" : "Suscribirse"}
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>

                {/* Feature list */}
                <div className="space-y-3 flex-1">
                  {features.map((feat) => {
                    const val = feat[plan.id as keyof Pick<PlanFeature, "free" | "professional" | "clinic">];
                    if (val === undefined) return null;
                    const included = val !== false;

                    return (
                      <div key={feat.label} className="flex items-start gap-2 text-sm">
                        {included ? (
                          <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                        )}
                        <span className={cn(!included && "text-muted-foreground/40")}>
                          {feat.label}
                          {typeof val === "string" && (
                            <span className="text-muted-foreground ml-1">— {val}</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ / Note */}
        <div className="text-center space-y-2 pt-4">
          <p className="text-sm text-muted-foreground">
            Todos los planes incluyen acceso al panel completo. Los precios están en CLP (pesos chilenos) e incluyen IVA.
          </p>
          <p className="text-xs text-muted-foreground">
            ¿Necesitas un plan personalizado? Contáctanos a soporte@therapyhub.cl
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
