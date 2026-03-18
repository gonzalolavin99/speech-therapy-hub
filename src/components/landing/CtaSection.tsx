import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-r from-primary to-primary/80">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary-foreground mb-4">
          Empieza a gestionar tu consulta de forma profesional
        </h2>
        <p className="text-primary-foreground/80 text-lg mb-8">
          Crea tu cuenta gratis en menos de 2 minutos. Sin tarjeta de crédito.
        </p>
        <Button
          size="lg"
          variant="secondary"
          asChild
          className="text-base font-semibold"
        >
          <Link to="/login">
            Crear Cuenta Gratis
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
