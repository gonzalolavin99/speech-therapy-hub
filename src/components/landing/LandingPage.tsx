import { useEffect } from "react";
import { LandingHeader } from "./LandingHeader";
import { HeroSection } from "./HeroSection";
import { FeaturesSection } from "./FeaturesSection";
import { ComparisonSection } from "./ComparisonSection";
import { PricingSection } from "./PricingSection";
import { TestimonialsSection } from "./TestimonialsSection";
import { CtaSection } from "./CtaSection";
import { LandingFooter } from "./LandingFooter";

export default function LandingPage() {
  useEffect(() => {
    document.title = "TherapyHub — Plataforma Clínica para Profesionales de Salud";
    return () => {
      document.title = "TherapyHub";
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <HeroSection />
      <FeaturesSection />
      <ComparisonSection />
      <PricingSection />
      <TestimonialsSection />
      <CtaSection />
      <LandingFooter />
    </div>
  );
}
