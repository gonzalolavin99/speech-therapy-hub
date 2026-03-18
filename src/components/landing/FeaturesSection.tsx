import {
  ClipboardCheck,
  Sparkles,
  Users,
  Calendar,
  Receipt,
  Building2,
} from "lucide-react";

const features = [
  {
    icon: ClipboardCheck,
    title: "Evaluaciones Estandarizadas",
    description:
      "Más de 10 tests clínicos validados (MBGR, TAR, TEPROSIF-R, REEL-3, PHQ-9, GAD-7 y más) con cálculo automático de puntajes y normas.",
  },
  {
    icon: Sparkles,
    title: "Análisis con Inteligencia Artificial",
    description:
      "Interpretación automática de resultados, resúmenes clínicos y sugerencias de intervención generadas por IA.",
  },
  {
    icon: Users,
    title: "Gestión de Pacientes",
    description:
      "Fichas clínicas completas, historial de sesiones, portal del paciente con acceso seguro y consentimiento digital.",
  },
  {
    icon: Calendar,
    title: "Agenda Inteligente",
    description:
      "Calendario de sesiones, reserva online para pacientes desde tu perfil público y sincronización con Google Calendar.",
  },
  {
    icon: Receipt,
    title: "Pagos y Boletas",
    description:
      "Cobra con MercadoPago, genera boletas de honorarios en PDF y lleva el control financiero de tu consulta.",
  },
  {
    icon: Building2,
    title: "Multi-Profesional",
    description:
      "Soporte para clínicas con múltiples profesionales. Cada uno con su panel independiente, pacientes y agenda.",
  },
];

export function FeaturesSection() {
  return (
    <section id="funcionalidades" className="py-16 md:py-24 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Todo lo que necesitas para tu consulta
          </h2>
          <p className="text-muted-foreground text-lg">
            Herramientas diseñadas específicamente para fonoaudiólogos y
            profesionales de salud en Chile.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
            >
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
