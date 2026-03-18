import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ClipboardCheck,
  Sparkles,
  Calendar,
  Shield,
  ArrowRight,
} from "lucide-react";

const highlights = [
  { icon: ClipboardCheck, label: "+10 Tests Clínicos" },
  { icon: Sparkles, label: "Análisis con IA" },
  { icon: Calendar, label: "Agenda Online" },
  { icon: Shield, label: "Cumple Ley 19.628" },
];

export function HeroSection() {
  function scrollToPrecios(e: React.MouseEvent) {
    e.preventDefault();
    document.getElementById("precios")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24 lg:py-32">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-4 py-1.5 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Plataforma clínica con inteligencia artificial
          </div>

          {/* H1 */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
            La plataforma clínica integral para{" "}
            <span className="text-primary">profesionales de salud</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Gestiona pacientes, aplica evaluaciones estandarizadas con IA,
            controla pagos y agenda — todo en un solo lugar. Diseñado para Chile.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button size="lg" asChild className="text-base">
              <Link to="/registro">
                Comenzar Gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base">
              <a href="#precios" onClick={scrollToPrecios}>
                Ver Planes
              </a>
            </Button>
          </div>

          {/* Highlight chips */}
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            {highlights.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground"
              >
                <item.icon className="h-4 w-4 text-primary" />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
