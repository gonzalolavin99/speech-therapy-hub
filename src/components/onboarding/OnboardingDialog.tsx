import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProfile, ProfileFormData } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Mic2, Brain, Check, User, Briefcase, Settings, ChevronRight, ChevronLeft } from "lucide-react";
import { professionOptions, getProfessionConfig, type ProfessionId } from "@/config/professions";
import { cn } from "@/lib/utils";

interface OnboardingDialogProps {
  open: boolean;
}

const TOTAL_STEPS = 4;

const professionIcons: Record<ProfessionId, React.ReactNode> = {
  fonoaudiologo: <Mic2 className="h-8 w-8" />,
  psicologo: <Brain className="h-8 w-8" />,
};

export function OnboardingDialog({ open }: OnboardingDialogProps) {
  const { user } = useAuth();
  const { createProfile } = useProfile();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: "",
    rut: "",
    phone: "",
    address: "",
    city: "",
    institution: "",
    specialties: "",
    bio: "",
    sis_registration: "",
    session_duration: 45,
    session_price: 35000,
    evaluation_price: 50000,
    onboarding_completed: true,
    profession: undefined,
  });

  const selectedConfig = formData.profession ? getProfessionConfig(formData.profession) : null;

  const handleChange = (field: keyof ProfileFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    createProfile.mutate(formData);
  };

  const isStep0Valid = !!formData.profession;
  const isStep1Valid = formData.full_name.trim().length >= 3;
  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const stepMeta: Record<number, { title: string; desc: string; icon: React.ReactNode }> = {
    0: { title: "¡Bienvenido a TherapyHub! 👋", desc: "¿Cuál es tu área profesional?", icon: <Briefcase className="h-5 w-5" /> },
    1: { title: "Datos Personales", desc: "Tu información de identificación", icon: <User className="h-5 w-5" /> },
    2: { title: "Información Profesional", desc: "Tu formación y lugar de trabajo", icon: <Briefcase className="h-5 w-5" /> },
    3: { title: "Configuración de Práctica", desc: "Valores y preferencias de atención", icon: <Settings className="h-5 w-5" /> },
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[540px]" onPointerDownOutside={(e) => e.preventDefault()}>
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted rounded-t-lg overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <DialogHeader className="pt-2">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{stepMeta[step]?.title}</DialogTitle>
              <DialogDescription>{stepMeta[step]?.desc}</DialogDescription>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              Paso {step + 1} de {TOTAL_STEPS}
            </span>
          </div>
        </DialogHeader>

        {/* Step 0: Profession Selection */}
        {step === 0 && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-3">
              {professionOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleChange("profession", opt.value)}
                  className={cn(
                    "flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all",
                    formData.profession === opt.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-xl shrink-0",
                    formData.profession === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {professionIcons[opt.value]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{opt.label}</p>
                    <p className="text-sm text-muted-foreground">{opt.description}</p>
                  </div>
                  {formData.profession === opt.value && (
                    <Check className="h-5 w-5 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Esto determinará las herramientas y tests disponibles en tu cuenta
            </p>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(1)} disabled={!isStep0Valid}>
                Siguiente <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            {user?.email && (
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Email: </span>
                <span className="font-medium">{user.email}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre Completo *</Label>
              <Input
                id="full_name"
                placeholder="Ej: Dra. Carolina Fernández"
                value={formData.full_name}
                onChange={(e) => handleChange("full_name", e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">Nombre que verán tus pacientes en boletas e informes</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rut">RUT</Label>
                <Input
                  id="rut"
                  placeholder="12.345.678-9"
                  value={formData.rut || ""}
                  onChange={(e) => handleChange("rut", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  placeholder="+56 9 1234 5678"
                  value={formData.phone || ""}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  placeholder="Santiago"
                  value={formData.city || ""}
                  onChange={(e) => handleChange("city", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  placeholder="Av. Providencia 1234, Of. 567"
                  value={formData.address || ""}
                  onChange={(e) => handleChange("address", e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(0)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Atrás
              </Button>
              <Button onClick={() => setStep(2)} disabled={!isStep1Valid}>
                Siguiente <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Professional Info */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sis_registration">{selectedConfig?.labels.registrationLabel || 'Registro Profesional'}</Label>
                <Input
                  id="sis_registration"
                  placeholder={selectedConfig?.labels.registrationPlaceholder || '12345-6'}
                  value={formData.sis_registration || ""}
                  onChange={(e) => handleChange("sis_registration", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="institution">Institución / Centro</Label>
                <Input
                  id="institution"
                  placeholder={selectedConfig?.labels.institutionPlaceholder || 'Centro profesional'}
                  value={formData.institution || ""}
                  onChange={(e) => handleChange("institution", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialties">Especialidades</Label>
              <Input
                id="specialties"
                placeholder={selectedConfig?.labels.specialtiesPlaceholder || 'Tus especialidades...'}
                value={formData.specialties || ""}
                onChange={(e) => handleChange("specialties", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Separa con comas, ej: {
                formData.profession === 'psicologo'
                  ? 'Clínica infanto-juvenil, Terapia cognitivo-conductual'
                  : 'Lenguaje infantil, Motricidad orofacial, Deglución'
              }</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Biografía Profesional</Label>
              <Textarea
                id="bio"
                placeholder="Breve descripción de tu experiencia, formación y enfoque profesional..."
                value={formData.bio || ""}
                onChange={(e) => handleChange("bio", e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">Opcional. Visible solo para ti por ahora.</p>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Atrás
              </Button>
              <Button onClick={() => setStep(3)}>
                Siguiente <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Practice Settings */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Configura los valores predeterminados para tus sesiones. Puedes cambiarlos después desde tu perfil.
            </p>
            <div className="space-y-2">
              <Label htmlFor="session_duration">Duración estándar de sesión (minutos)</Label>
              <Input
                id="session_duration"
                type="number"
                min={15}
                max={120}
                step={5}
                value={formData.session_duration}
                onChange={(e) => handleChange("session_duration", parseInt(e.target.value) || 45)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="session_price">Valor Sesión (CLP)</Label>
                <Input
                  id="session_price"
                  type="number"
                  min={0}
                  step={1000}
                  value={formData.session_price}
                  onChange={(e) => handleChange("session_price", parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">Precio por sesión regular</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="evaluation_price">Valor Evaluación (CLP)</Label>
                <Input
                  id="evaluation_price"
                  type="number"
                  min={0}
                  step={1000}
                  value={formData.evaluation_price}
                  onChange={(e) => handleChange("evaluation_price", parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">Precio por evaluación inicial</p>
              </div>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">💡 ¿Sabías que?</p>
              <p>TherapyHub te permite generar boletas de honorarios, gestionar pagos pendientes y llevar registro de todos tus cobros.</p>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Atrás
              </Button>
              <Button onClick={handleSubmit} disabled={createProfile.isPending} size="lg">
                {createProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Completar Registro
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
