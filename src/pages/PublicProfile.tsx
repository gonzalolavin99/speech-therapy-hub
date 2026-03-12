import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { usePublicProfile, ContactRequestData } from "@/hooks/usePublicProfile";
import { PublicBookingCalendar } from "@/components/booking/PublicBookingCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  MapPin,
  Clock,
  MessageCircle,
  Send,
  Loader2,
  Phone,
  Mail,
  Building,
  Award,
  CheckCircle2,
  Stethoscope,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Toaster as Sonner } from "@/components/ui/sonner";

const PROFESSION_LABELS: Record<string, { label: string; icon: typeof Stethoscope }> = {
  fonoaudiologo: { label: "Fonoaudiólogo/a", icon: Stethoscope },
  psicologo: { label: "Psicólogo/a Clínico/a", icon: Heart },
};

function formatCLP(amount: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
  }).format(amount);
}

export default function PublicProfile() {
  const { slug } = useParams<{ slug: string }>();
  const { profile, isLoading, notFound, sendContactRequest } = usePublicProfile(slug);

  const [contactForm, setContactForm] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
    serviceType: "session",
  });
  const [formSent, setFormSent] = useState(false);

  // SEO: update page title
  useEffect(() => {
    if (profile) {
      const profLabel = PROFESSION_LABELS[profile.profession]?.label || "Profesional";
      document.title = `${profile.full_name} - ${profLabel} | TherapyHub`;
    } else if (notFound) {
      document.title = "Perfil no encontrado | TherapyHub";
    }
    return () => { document.title = "TherapyHub"; };
  }, [profile, notFound]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !contactForm.name.trim()) return;

    try {
      await sendContactRequest.mutateAsync({
        professional_id: profile.id,
        name: contactForm.name,
        phone: contactForm.phone || undefined,
        email: contactForm.email || undefined,
        message: contactForm.message || undefined,
        service_type: contactForm.serviceType,
      });
      setFormSent(true);
      toast.success("Solicitud enviada exitosamente");
    } catch {
      toast.error("Error al enviar solicitud. Intenta de nuevo.");
    }
  };

  const handleWhatsApp = () => {
    if (!profile?.public_phone) return;
    const phone = profile.public_phone.replace(/[^0-9+]/g, "");
    const profLabel = PROFESSION_LABELS[profile.profession]?.label || "profesional";
    const message = encodeURIComponent(
      `Hola ${profile.full_name}, vi tu perfil de ${profLabel} en TherapyHub y me gustaría agendar una hora.`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  // Not found
  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center">
        <Sonner />
        <div className="text-center max-w-md mx-auto px-4">
          <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Perfil no encontrado</h1>
          <p className="text-muted-foreground mb-6">
            Este perfil profesional no existe o no está disponible públicamente.
          </p>
          <a href="/" className="text-primary hover:underline text-sm">
            Ir a TherapyHub
          </a>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const profInfo = PROFESSION_LABELS[profile.profession] || { label: "Profesional de Salud", icon: Stethoscope };
  const ProfIcon = profInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      <Sonner />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b">
        <div className="max-w-3xl mx-auto px-4 py-12 md:py-16">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-primary/10 border-4 border-white dark:border-gray-800 shadow-lg flex items-center justify-center shrink-0">
              {profile.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt={profile.full_name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <User className="h-12 w-12 text-primary" />
              )}
            </div>

            {/* Info */}
            <div className="text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {profile.full_name}
              </h1>
              <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  <ProfIcon className="h-4 w-4" />
                  {profInfo.label}
                </span>
              </div>
              {profile.city && (
                <p className="flex items-center justify-center md:justify-start gap-1.5 mt-3 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {profile.city}
                </p>
              )}
              {profile.sis_registration && (
                <p className="flex items-center justify-center md:justify-start gap-1.5 mt-1 text-xs text-muted-foreground">
                  <Award className="h-3.5 w-3.5" />
                  Registro: {profile.sis_registration}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* About */}
        {(profile.bio || profile.specialties) && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Sobre mí</h2>
            {profile.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {profile.bio}
              </p>
            )}
            {profile.specialties && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Especialidades
                </p>
                <div className="flex flex-wrap gap-2">
                  {profile.specialties.split(",").map((s, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full bg-primary/5 text-primary text-xs font-medium border border-primary/10"
                    >
                      {s.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {profile.institution && (
              <p className="flex items-center gap-1.5 mt-3 text-sm text-muted-foreground">
                <Building className="h-4 w-4" />
                {profile.institution}
              </p>
            )}
          </section>
        )}

        {/* Services */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Servicios</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Session Card */}
            <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Stethoscope className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground">Sesión</h3>
                  <p className="text-xs text-muted-foreground">Intervención terapéutica</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.session_duration} minutos</span>
                </div>
                {profile.show_public_prices ? (
                  <p className="font-bold text-primary text-lg">
                    {formatCLP(profile.session_price)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Consultar valor
                  </p>
                )}
              </div>
            </div>

            {/* Evaluation Card */}
            <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Award className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground">Evaluación</h3>
                  <p className="text-xs text-muted-foreground">Evaluación diagnóstica</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>60-90 minutos</span>
                </div>
                {profile.show_public_prices ? (
                  <p className="font-bold text-violet-600 dark:text-violet-400 text-lg">
                    {formatCLP(profile.evaluation_price)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Consultar valor
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Public Booking Calendar */}
        {profile.booking_enabled && slug && (
          <section>
            <PublicBookingCalendar
              slug={slug}
              professionalName={profile.full_name}
            />
          </section>
        )}

        {/* Contact Section */}
        <section className="border-t pt-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Contacto</h2>

          {/* WhatsApp button */}
          {profile.public_phone && (
            <Button
              onClick={handleWhatsApp}
              className="w-full mb-4 bg-[#25D366] hover:bg-[#20BD5A] text-white h-12 text-base"
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Contactar por WhatsApp
            </Button>
          )}

          {/* Contact info */}
          <div className="flex flex-wrap gap-4 mb-6">
            {profile.public_phone && (
              <a
                href={`tel:${profile.public_phone}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="h-4 w-4" />
                {profile.public_phone}
              </a>
            )}
            {profile.public_email && (
              <a
                href={`mailto:${profile.public_email}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-4 w-4" />
                {profile.public_email}
              </a>
            )}
          </div>

          {/* Contact Form */}
          {formSent ? (
            <div className="rounded-xl border bg-green-50/50 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/50 p-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-green-800 dark:text-green-300 mb-1">
                Solicitud enviada
              </h3>
              <p className="text-sm text-green-700 dark:text-green-400">
                {profile.full_name} recibirá tu solicitud y te contactará pronto.
              </p>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="rounded-xl border bg-card p-5 space-y-4">
              <p className="text-sm text-muted-foreground mb-2">
                Envía una solicitud de contacto directamente a {profile.full_name}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Nombre *</label>
                  <Input
                    required
                    placeholder="Tu nombre completo"
                    value={contactForm.name}
                    onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Teléfono</label>
                  <Input
                    placeholder="+56 9 1234 5678"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="tu@email.com"
                    value={contactForm.email}
                    onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Tipo de servicio</label>
                  <Select
                    value={contactForm.serviceType}
                    onValueChange={(v) => setContactForm((p) => ({ ...p, serviceType: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="session">Sesión de terapia</SelectItem>
                      <SelectItem value="evaluation">Evaluación diagnóstica</SelectItem>
                      <SelectItem value="consultation">Consulta general</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Mensaje (opcional)</label>
                <Textarea
                  placeholder="Cuéntanos brevemente el motivo de tu consulta..."
                  rows={3}
                  value={contactForm.message}
                  onChange={(e) => setContactForm((p) => ({ ...p, message: e.target.value }))}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={sendContactRequest.isPending || !contactForm.name.trim()}
              >
                {sendContactRequest.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar Solicitud
              </Button>
            </form>
          )}
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t mt-12 py-6">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            Perfil profesional en{" "}
            <a href="/" className="text-primary hover:underline font-medium">
              TherapyHub
            </a>
            {" "}— Plataforma de gestión clínica
          </p>
        </div>
      </footer>
    </div>
  );
}
