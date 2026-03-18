import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, X, Zap, Sparkles, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanData {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  icon: React.ReactNode;
  popular?: boolean;
}

const plans: PlanData[] = [
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

interface PlanFeature {
  label: string;
  free: boolean | string;
  professional: boolean | string;
  clinic: boolean | string;
}

const features: PlanFeature[] = [
  { label: "Pacientes activos", free: "5", professional: "Ilimitados", clinic: "Ilimitados" },
  { label: "Tests disponibles", free: "2 básicos", professional: "Todos (+10)", clinic: "Todos (+10)" },
  { label: "Consultas IA por mes", free: "5", professional: "50", clinic: "Ilimitadas" },
  { label: "Boletas PDF", free: false, professional: true, clinic: true },
  { label: "Google Calendar", free: false, professional: true, clinic: true },
  { label: "Multi-profesional", free: "1 cuenta", professional: "1 cuenta", clinic: "Hasta 5" },
  { label: "Soporte", free: "Comunidad", professional: "Email (48h)", clinic: "Prioritario (24h)" },
];

function formatPrice(price: number): string {
  if (price === 0) return "$0";
  return `$${price.toLocaleString("es-CL")}`;
}

function FeatureValue({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className="text-sm text-foreground">{value}</span>;
  }
  if (value) {
    return <Check className="h-4 w-4 text-green-600 dark:text-green-400 mx-auto" />;
  }
  return <X className="h-4 w-4 text-muted-foreground/50 mx-auto" />;
}

export function PricingSection() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="precios" className="py-16 md:py-24 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Planes simples y transparentes
          </h2>
          <p className="text-muted-foreground text-lg">
            Comienza gratis. Escala cuando lo necesites.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <button
            onClick={() => setYearly(false)}
            className={cn(
              "text-sm font-medium px-4 py-2 rounded-lg transition-colors",
              !yearly
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Mensual
          </button>
          <button
            onClick={() => setYearly(true)}
            className={cn(
              "text-sm font-medium px-4 py-2 rounded-lg transition-colors",
              yearly
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Anual
            <span className="ml-1.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full">
              -25%
            </span>
          </button>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => {
            const price = yearly ? plan.priceYearly : plan.priceMonthly;
            const monthlyEquiv = yearly && plan.priceYearly > 0
              ? Math.round(plan.priceYearly / 12)
              : null;

            return (
              <div
                key={plan.id}
                className={cn(
                  "rounded-xl border bg-card p-6 flex flex-col relative",
                  plan.popular && "border-primary shadow-md ring-1 ring-primary/20"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Más popular
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {plan.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{plan.name}</h3>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {plan.description}
                </p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-foreground">
                    {formatPrice(price)}
                  </span>
                  {price > 0 && (
                    <span className="text-sm text-muted-foreground ml-1">
                      /{yearly ? "año" : "mes"}
                    </span>
                  )}
                  {monthlyEquiv && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatPrice(monthlyEquiv)}/mes
                    </p>
                  )}
                </div>
                <Button
                  asChild
                  variant={plan.popular ? "default" : "outline"}
                  className="w-full mb-4"
                >
                  <Link to="/login">
                    {price === 0 ? "Comenzar Gratis" : "Comenzar Ahora"}
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>

        {/* Feature comparison table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 sm:px-6 text-sm font-semibold text-foreground">
                  Incluye
                </th>
                <th className="text-center py-3 px-3 text-sm font-semibold text-muted-foreground">
                  Free
                </th>
                <th className="text-center py-3 px-3 text-sm font-semibold text-primary">
                  Pro
                </th>
                <th className="text-center py-3 px-3 text-sm font-semibold text-muted-foreground">
                  Clínica
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature) => (
                <tr key={feature.label} className="border-b last:border-b-0">
                  <td className="py-3 px-4 sm:px-6 text-sm text-muted-foreground">
                    {feature.label}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <FeatureValue value={feature.free} />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <FeatureValue value={feature.professional} />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <FeatureValue value={feature.clinic} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
