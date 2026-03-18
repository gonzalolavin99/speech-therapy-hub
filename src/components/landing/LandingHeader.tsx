import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "Comparativa", href: "#comparativa" },
  { label: "Precios", href: "#precios" },
];

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleAnchorClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault();
    setMobileOpen(false);
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-foreground">
          <Stethoscope className="h-6 w-6 text-primary" />
          TherapyHub
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleAnchorClick(e, link.href)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link to="/login">Iniciar Sesión</Link>
          </Button>
          <Button asChild>
            <Link to="/registro">Comenzar Gratis</Link>
          </Button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-muted-foreground hover:text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "md:hidden overflow-hidden transition-all duration-200 border-t bg-background",
          mobileOpen ? "max-h-64" : "max-h-0 border-t-0"
        )}
      >
        <div className="px-4 py-4 space-y-3">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleAnchorClick(e, link.href)}
              className="block text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <Button variant="outline" asChild className="w-full">
              <Link to="/login">Iniciar Sesión</Link>
            </Button>
            <Button asChild className="w-full">
              <Link to="/registro">Comenzar Gratis</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
