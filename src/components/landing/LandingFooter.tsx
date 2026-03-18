import { Link } from "react-router-dom";
import { Stethoscope } from "lucide-react";

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-background py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo + tagline */}
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="flex items-center gap-2 font-bold text-lg text-foreground">
              <Stethoscope className="h-5 w-5 text-primary" />
              TherapyHub
            </div>
            <p className="text-xs text-muted-foreground">
              Plataforma clínica para profesionales de salud
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/login" className="hover:text-foreground transition-colors">
              Iniciar Sesión
            </Link>
            <a href="#funcionalidades" className="hover:text-foreground transition-colors">
              Funcionalidades
            </a>
            <a href="#precios" className="hover:text-foreground transition-colors">
              Precios
            </a>
          </div>

          {/* Copyright */}
          <div className="text-xs text-muted-foreground text-center md:text-right">
            <p>Hecho en Chile</p>
            <p>&copy; {year} TherapyHub. Todos los derechos reservados.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
