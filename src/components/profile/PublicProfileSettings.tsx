import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Globe,
  Copy,
  Check,
  ExternalLink,
  Phone,
  Mail,
  Loader2,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { generateSlug, validateSlug } from "@/utils/slug";
import { ProfessionalProfile, ProfileFormData } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";

interface PublicProfileSettingsProps {
  profile: ProfessionalProfile;
  onUpdate: (updates: Partial<ProfileFormData>) => void;
  isUpdating: boolean;
}

export function PublicProfileSettings({
  profile,
  onUpdate,
  isUpdating,
}: PublicProfileSettingsProps) {
  const [slug, setSlug] = useState(profile.slug || "");
  const [enabled, setEnabled] = useState(profile.public_profile_enabled || false);
  const [publicPhone, setPublicPhone] = useState(profile.public_phone || "");
  const [publicEmail, setPublicEmail] = useState(profile.public_email || "");
  const [copied, setCopied] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  useEffect(() => {
    if (profile.slug) setSlug(profile.slug);
    if (profile.public_profile_enabled !== undefined) setEnabled(profile.public_profile_enabled);
    if (profile.public_phone) setPublicPhone(profile.public_phone);
    if (profile.public_email) setPublicEmail(profile.public_email);
  }, [profile]);

  // Auto-generate slug from name if empty
  useEffect(() => {
    if (!slug && profile.full_name) {
      setSlug(generateSlug(profile.full_name));
    }
  }, [profile.full_name, slug]);

  const profileUrl = `${window.location.origin}/p/${slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    toast.success("Link copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  const checkSlugAvailability = async (newSlug: string) => {
    if (!validateSlug(newSlug)) {
      setSlugAvailable(false);
      return;
    }
    setCheckingSlug(true);
    try {
      const { data, error } = await supabase
        .from("professional_profiles")
        .select("slug")
        .eq("slug", newSlug)
        .neq("user_id", profile.user_id)
        .maybeSingle();

      setSlugAvailable(error ? false : !data);
    } catch {
      setSlugAvailable(null);
    } finally {
      setCheckingSlug(false);
    }
  };

  const handleSlugChange = (value: string) => {
    const cleaned = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
    setSlug(cleaned);
    setSlugAvailable(null);
    if (cleaned.length >= 3) {
      // Debounced check
      const timeout = setTimeout(() => checkSlugAvailability(cleaned), 500);
      return () => clearTimeout(timeout);
    }
  };

  const handleSave = () => {
    if (enabled && !validateSlug(slug)) {
      toast.error("El slug no es válido. Usa solo letras, números y guiones.");
      return;
    }
    onUpdate({
      slug: slug || undefined,
      public_profile_enabled: enabled,
      public_phone: publicPhone || undefined,
      public_email: publicEmail || undefined,
    } as any);
  };

  return (
    <div className="bg-card rounded-xl border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Globe className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">Perfil Público</h3>
          <p className="text-sm text-muted-foreground">
            Comparte tu perfil profesional con pacientes potenciales
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Activar página pública</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tu perfil será visible para cualquier persona con el link
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {/* Slug */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">URL de tu perfil</Label>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-0 rounded-md border bg-muted/30 overflow-hidden">
              <span className="px-3 text-xs text-muted-foreground whitespace-nowrap bg-muted/50 py-2 border-r">
                {window.location.origin}/p/
              </span>
              <Input
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder="tu-nombre"
              />
            </div>
          </div>
          {slug && (
            <div className="flex items-center gap-2 text-xs">
              {checkingSlug ? (
                <span className="text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Verificando...
                </span>
              ) : !validateSlug(slug) ? (
                <span className="text-destructive">
                  Mínimo 3 caracteres. Solo letras, números y guiones.
                </span>
              ) : slugAvailable === true ? (
                <span className="text-success flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Disponible
                </span>
              ) : slugAvailable === false ? (
                <span className="text-destructive">
                  Este slug ya está en uso
                </span>
              ) : null}
            </div>
          )}
        </div>

        {/* Public contact info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              Teléfono público (WhatsApp)
            </Label>
            <Input
              placeholder="+56912345678"
              value={publicPhone}
              onChange={(e) => setPublicPhone(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              Se mostrará un botón de WhatsApp con este número
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Email público
            </Label>
            <Input
              type="email"
              placeholder="contacto@email.com"
              value={publicEmail}
              onChange={(e) => setPublicEmail(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              Separado de tu email de cuenta para mayor privacidad
            </p>
          </div>
        </div>

        {/* Preview link & Actions */}
        {enabled && slug && validateSlug(slug) && (
          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
            <p className="text-xs font-medium text-primary uppercase tracking-wider">
              Tu perfil público
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm bg-background rounded px-3 py-2 border truncate">
                {profileUrl}
              </code>
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={profileUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        )}

        {/* Save */}
        <div className="flex justify-end pt-2 border-t">
          <Button
            onClick={handleSave}
            disabled={isUpdating || (enabled && !validateSlug(slug))}
            className="bg-primary hover:bg-primary/90"
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Globe className="h-4 w-4 mr-2" />
            )}
            Guardar Perfil Público
          </Button>
        </div>
      </div>
    </div>
  );
}
