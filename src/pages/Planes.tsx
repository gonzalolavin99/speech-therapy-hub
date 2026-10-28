import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { useSubscriptionPayment } from "@/hooks/useSubscriptionPayment";
import { cn } from "@/lib/utils";
import {
  Check,
  X,
  Crown,
  Sparkles,
  Zap,
  Clock,
  ArrowRight,
  Loader2,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { describeVerifyResult, type PaymentNotice } from "@/utils/payments";
import type { PlanId } from "@/config/subscriptions";
import { formatPriceCLP, getTrialDaysRemaining } from "@/config/subscriptions";

interface PlanFeature {
  label: string;
  free: boolean | string;
  professional: boolean | string;
  clinic: boolean | string;
}

const features: PlanFeature[] = [
  { label: "Pacientes activos", free: "3", professional: "Ilimitados", clinic: "Ilimitados" },
  { label: "Sesiones por mes", free: "15", professional: "Ilimitadas", clinic: "Ilimitadas" },
  { label: "Tests disponibles", free: "2 básicos", professional: "Todos", clinic: "Todos" },
  { label: "Planificaciones activas", free: "2", professional: "Ilimitadas", clinic: "Ilimitadas" },
  { label: "Consultas IA por mes", free: "3", professional: "50", clinic: "Ilimitadas" },
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
  const { checkout, isCheckingOut, verifyReturn } = useSubscriptionPayment();
  const [searchParams, setSearchParams] = useSearchParams();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [checkingPlan, setCheckingPlan] = useState<PlanId | null>(null);
  const isTrialing = subscription?.plan === "trial";
  // Plan VIP o asignado por un admin: no se ofrece pagar otro plan
  const hasManagedPlan = effectivePlan === "vip" || (!!subscription?.admin_override && subscription?.status === "active");

  // Resultado del checkout de MercadoPago: la URL solo aporta el payment_id;
  // el estado real lo verifica el backend (payments-verify) antes de avisar
  useEffect(() => {
    const paymentResult = searchParams.get("payment");
    if (!paymentResult) return;

    const paymentId = searchParams.get("payment_id");
    const showNotice = (notice: PaymentNotice) => {
      const options = { description: notice.description, duration: 8000 };
      if (notice.kind === "success") toast.success(notice.title, options);
      else if (notice.kind === "warning") toast.warning(notice.title, options);
      else if (notice.kind === "error") toast.error(notice.title, options);
      else toast.info(notice.title, options);
    };

    if (paymentResult === "failure") {
      showNotice({ kind: "error", title: "Pago no completado", description: "El pago no pudo ser procesado. Puedes intentar nuevamente." });
    } else if (paymentId && /^\d+$/.test(paymentId)) {
      toast.loading("Confirmando tu pago con MercadoPago...", { id: "payment-verify" });
      verifyReturn.mutate(paymentId, {
        onSuccess: (result) => { toast.dismiss("payment-verify"); showNotice(describeVerifyResult(result)); },
        onError: () => { toast.dismiss("payment-verify"); showNotice(describeVerifyResult(null)); },
      });
    } else {
      showNotice(describeVerifyResult(null));
    }

    // Limpiar la URL para no repetir la verificación al recargar
    const mpParams = ["payment", "payment_id", "collection_id", "collection_status", "status", "external_reference",
      "payment_type", "merchant_order_id", "preference_id", "site_id", "processing_mode", "merchant_account_id"];
    mpParams.forEach((key) => searchParams.delete(key));
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al volver del checkout
  }, [searchParams]);

  const handleSubscribe = async (planId: PlanId) => {
    if (planId === "free") return;

    setCheckingPlan(planId);
    try {
      await checkout.mutateAsync({
        plan: planId,
        billingPeriod,
      });
    } finally {
      setCheckingPlan(null);
    }
  };

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

        {hasManagedPlan && (
          <div className="mx-auto max-w-xl rounded-xl border border-primary/20 bg-primary/5 p-4 text-center text-sm text-foreground">
            <Crown className="mr-1 inline h-4 w-4 text-primary" />
            Tienes un plan {effectivePlan === "vip" ? "VIP" : "asignado por TherapyHub"} con todas las funciones. No necesitas suscribirte.
          </div>
        )}

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              billingPeriod === 'monthly'
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            Mensual
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors relative",
              billingPeriod === 'yearly'
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            Anual
            <span className="absolute -top-2 -right-2 bg-success text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              -25%
            </span>
          </button>
        </div>

        {/* Plan Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = effectivePlan === plan.id ||
              (isTrialing && plan.id === "professional");
            const isCurrentPaid = !isTrialing && effectivePlan === plan.id && plan.priceMonthly > 0;
            const displayPrice = billingPeriod === 'yearly' && plan.priceYearly > 0
              ? Math.round(plan.priceYearly / 12)
              : plan.priceMonthly;
            const totalPrice = billingPeriod === 'yearly' ? plan.priceYearly : plan.priceMonthly;
            const yearlySaving = plan.priceMonthly > 0 && plan.priceYearly > 0
              ? Math.round((1 - (plan.priceYearly / 12) / plan.priceMonthly) * 100)
              : 0;
            const isLoading = checkingPlan === plan.id || (isCheckingOut && checkingPlan === plan.id);

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
                        <span className="text-3xl font-bold">{formatPriceCLP(displayPrice)}</span>
                        <span className="text-sm text-muted-foreground">/mes</span>
                      </div>
                      {billingPeriod === 'yearly' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatPriceCLP(totalPrice)} facturado anualmente
                          <span className="ml-1 text-success font-medium">(-{yearlySaving}%)</span>
                        </p>
                      )}
                      {billingPeriod === 'monthly' && plan.priceYearly > 0 && (
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
                  disabled={isCurrentPaid || isLoading || isCheckingOut || (hasManagedPlan && plan.priceMonthly > 0)}
                  onClick={() => handleSubscribe(plan.id)}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : isCurrentPaid ? (
                    "Plan actual"
                  ) : hasManagedPlan && plan.priceMonthly > 0 ? (
                    "Incluido en tu plan"
                  ) : plan.priceMonthly === 0 ? (
                    <>
                      Comenzar gratis
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Suscribirse — {formatPriceCLP(totalPrice)}
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

        {/* Payment Methods Note */}
        <div className="text-center space-y-2 pt-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            <span>Pago seguro con MercadoPago — Tarjeta de crédito, débito, transferencia y más</span>
          </div>
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
