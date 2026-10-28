import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProfession } from "@/contexts/ProfessionContext";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Users,
  ClipboardList,
  FileText,
  CreditCard,
  User,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  PartyPopper,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route?: string;
  highlight?: string; // CSS selector to highlight (optional)
}

interface GuidedTourProps {
  open: boolean;
  onComplete: () => void;
}

const TOUR_STEP_KEY = 'therapyhub_tour_step';

function getPersistedStep(): number {
  try {
    const val = sessionStorage.getItem(TOUR_STEP_KEY);
    return val ? parseInt(val, 10) : 0;
  } catch { return 0; }
}

function persistStep(step: number) {
  try { sessionStorage.setItem(TOUR_STEP_KEY, String(step)); } catch { /* sessionStorage no disponible */ }
}

function clearPersistedStep() {
  try { sessionStorage.removeItem(TOUR_STEP_KEY); } catch { /* sessionStorage no disponible */ }
}

export function GuidedTour({ open, onComplete }: GuidedTourProps) {
  const [step, setStepRaw] = useState(getPersistedStep);
  const [isVisible, setIsVisible] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { config: profConfig } = useProfession();
  const containerRef = useRef<HTMLDivElement>(null);

  // Wrapper that also persists step
  const setStep = useCallback((valOrFn: number | ((prev: number) => number)) => {
    setStepRaw((prev) => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      persistStep(next);
      return next;
    });
  }, []);

  const steps: TourStep[] = [
    {
      id: "welcome",
      title: "¡Bienvenido a TherapyHub! 🎉",
      description: `Tu plataforma de gestión clínica como ${profConfig.label.toLowerCase()}. Te mostramos rápidamente lo que puedes hacer.`,
      icon: <Rocket className="h-8 w-8" />,
    },
    {
      id: "calendar",
      title: "Calendario",
      description: "Organiza tus citas y sesiones. Ve tu agenda diaria, semanal o mensual y gestiona horarios de atención.",
      icon: <Calendar className="h-8 w-8" />,
      route: "/",
    },
    {
      id: "patients",
      title: "Pacientes",
      description: "Registra pacientes con su ficha completa: datos personales, diagnóstico, anamnesis y consentimiento informado.",
      icon: <Users className="h-8 w-8" />,
      route: "/pacientes",
    },
    {
      id: "tests",
      title: "Tests y Evaluaciones",
      description: `Aplica evaluaciones estandarizadas directamente en la app. Los resultados se guardan automáticamente en la ficha del paciente.`,
      icon: <ClipboardList className="h-8 w-8" />,
      route: "/tests",
    },
    {
      id: "plannings",
      title: "Planificaciones",
      description: "Crea planes de intervención con objetivos, contenidos y métodos. La IA te puede sugerir planificaciones completas.",
      icon: <FileText className="h-8 w-8" />,
      route: "/planificaciones",
    },
    {
      id: "payments",
      title: "Pagos",
      description: "Registra cobros por sesión, genera boletas de honorarios en PDF y lleva control de pagos pendientes.",
      icon: <CreditCard className="h-8 w-8" />,
      route: "/pagos",
    },
    {
      id: "profile",
      title: "Tu Perfil",
      description: "Configura tus datos profesionales, precios de sesión y conecta tu Google Calendar para sincronizar citas.",
      icon: <User className="h-8 w-8" />,
      route: "/perfil",
    },
    {
      id: "ai",
      title: "Asistente IA",
      description: "En distintas secciones encontrarás el ícono ✨ para generar sugerencias con IA: notas de sesión, planificaciones y análisis de tests.",
      icon: <Sparkles className="h-8 w-8" />,
    },
    {
      id: "done",
      title: "¡Todo listo!",
      description: "Ya conoces lo esencial. Explora la app a tu ritmo. Puedes volver a ver este tour desde tu perfil.",
      icon: <PartyPopper className="h-8 w-8" />,
    },
  ];

  const totalSteps = steps.length;
  const currentStep = steps[step];
  const isFirst = step === 0;
  const isLast = step === totalSteps - 1;
  const progress = ((step + 1) / totalSteps) * 100;

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [open]);

  // Navigate to the step's route if specified
  useEffect(() => {
    if (open && currentStep.route && location.pathname !== currentStep.route) {
      setNavigating(true);
      navigate(currentStep.route, { replace: true });
    } else {
      setNavigating(false);
    }
  }, [step, open, currentStep.route, location.pathname, navigate]);

  const handleNext = useCallback(() => {
    if (isLast) {
      clearPersistedStep();
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  }, [isLast, onComplete, setStep]);

  const handlePrev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const handleSkip = useCallback(() => {
    clearPersistedStep();
    onComplete();
  }, [onComplete]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") handleSkip();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, handleNext, handlePrev, handleSkip]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          isVisible ? "opacity-100" : "opacity-0"
        )}
        onClick={handleSkip}
      />

      {/* Tour Card */}
      <div
        ref={containerRef}
        className={cn(
          "relative z-10 w-full transition-all duration-500 ease-out",
          isMobile ? "max-w-sm mx-4" : "max-w-md mx-4",
          isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
        )}
      >
        <div className="bg-card rounded-2xl border shadow-2xl overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Skip button */}
          {!isLast && (
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
              aria-label="Saltar tour"
            >
              <X className="h-5 w-5" />
            </button>
          )}

          {/* Content */}
          <div className="p-6 sm:p-8">
            {/* Icon */}
            <div
              className={cn(
                "mx-auto mb-5 flex items-center justify-center rounded-2xl transition-all duration-500",
                isMobile ? "h-16 w-16" : "h-20 w-20",
                isFirst || isLast
                  ? "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground"
                  : "bg-primary/10 text-primary"
              )}
            >
              {currentStep.icon}
            </div>

            {/* Text */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-foreground mb-2">
                {currentStep.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                {currentStep.description}
              </p>
            </div>

            {/* Step dots */}
            <div className="flex justify-center gap-1.5 mb-6">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={cn(
                    "rounded-full transition-all duration-300",
                    i === step
                      ? "w-6 h-2 bg-primary"
                      : i < step
                        ? "w-2 h-2 bg-primary/40"
                        : "w-2 h-2 bg-muted-foreground/20"
                  )}
                  aria-label={`Paso ${i + 1}`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3">
              {!isFirst ? (
                <Button variant="ghost" size="sm" onClick={handlePrev}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Atrás
                </Button>
              ) : (
                <div />
              )}

              <Button onClick={handleNext} size={isMobile ? "default" : "lg"} className="px-6">
                {isLast ? (
                  "¡Comenzar!"
                ) : isFirst ? (
                  <>Iniciar Tour <ChevronRight className="h-4 w-4 ml-1" /></>
                ) : (
                  <>Siguiente <ChevronRight className="h-4 w-4 ml-1" /></>
                )}
              </Button>
            </div>

            {/* Keyboard hint (desktop only) */}
            {!isMobile && (
              <p className="text-[10px] text-muted-foreground/50 text-center mt-4">
                Usa ← → para navegar · Esc para saltar
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
