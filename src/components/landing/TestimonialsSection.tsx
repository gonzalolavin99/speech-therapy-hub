import { Quote } from "lucide-react";

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  city: string;
  initials: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "Antes pasaba horas tabulando tests a mano. Con TherapyHub aplico el MBGR o el TEPROSIF-R y en segundos tengo los resultados con interpretación de IA. Me cambió la vida profesional.",
    name: "Carolina M.",
    role: "Fonoaudióloga",
    city: "Santiago",
    initials: "CM",
  },
  {
    quote:
      "El portal del paciente y el consentimiento digital me ahorraron un montón de papeleo. Mis pacientes pueden ver su progreso y eso mejora la adherencia al tratamiento.",
    name: "Felipe R.",
    role: "Psicólogo Clínico",
    city: "Valparaíso",
    initials: "FR",
  },
  {
    quote:
      "Gestionamos 4 profesionales desde un solo lugar. La agenda pública nos generó pacientes nuevos sin esfuerzo extra. Las boletas electrónicas nos simplifican la contabilidad.",
    name: "Centro Renacer",
    role: "Centro de Terapia",
    city: "Concepción",
    initials: "CR",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Profesionales que confían en TherapyHub
          </h2>
          <p className="text-muted-foreground text-lg">
            Historias reales de terapeutas que transformaron su consulta.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-xl border bg-card p-6 flex flex-col"
            >
              <Quote className="h-8 w-8 text-primary/30 mb-4" />
              <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-6">
                "{t.quote}"
              </p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.role} · {t.city}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
