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
import { Loader2 } from "lucide-react";

interface OnboardingDialogProps {
  open: boolean;
}

export function OnboardingDialog({ open }: OnboardingDialogProps) {
  const { createProfile } = useProfile();
  const [step, setStep] = useState(1);
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
  });

  const handleChange = (field: keyof ProfileFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    createProfile.mutate(formData);
  };

  const isStep1Valid = formData.full_name.trim() !== "";

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[500px]" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "¡Bienvenido a TherapyHub! 👋" : "Configura tu práctica"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Completa tu perfil profesional para comenzar"
              : "Configura los valores de tus sesiones"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre Completo *</Label>
              <Input
                id="full_name"
                placeholder="Ej: Dra. Carolina Fernández"
                value={formData.full_name}
                onChange={(e) => handleChange("full_name", e.target.value)}
              />
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
                <Label htmlFor="sis_registration">Registro SIS</Label>
                <Input
                  id="sis_registration"
                  placeholder="12345-6"
                  value={formData.sis_registration || ""}
                  onChange={(e) => handleChange("sis_registration", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  placeholder="+56 9 1234 5678"
                  value={formData.phone || ""}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  placeholder="Santiago"
                  value={formData.city || ""}
                  onChange={(e) => handleChange("city", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="institution">Institución / Centro</Label>
              <Input
                id="institution"
                placeholder="Centro de Fonoaudiología Integral"
                value={formData.institution || ""}
                onChange={(e) => handleChange("institution", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialties">Especialidades</Label>
              <Input
                id="specialties"
                placeholder="Trastornos del Lenguaje, Motricidad Orofacial..."
                value={formData.specialties || ""}
                onChange={(e) => handleChange("specialties", e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!isStep1Valid}>
                Siguiente
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                placeholder="Av. Providencia 1234, Of. 567"
                value={formData.address || ""}
                onChange={(e) => handleChange("address", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Biografía Profesional</Label>
              <Textarea
                id="bio"
                placeholder="Breve descripción de tu experiencia..."
                value={formData.bio || ""}
                onChange={(e) => handleChange("bio", e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="session_duration">Duración Sesión (min)</Label>
                <Input
                  id="session_duration"
                  type="number"
                  value={formData.session_duration}
                  onChange={(e) => handleChange("session_duration", parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session_price">Valor Sesión (CLP)</Label>
                <Input
                  id="session_price"
                  type="number"
                  value={formData.session_price}
                  onChange={(e) => handleChange("session_price", parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evaluation_price">Valor Evaluación (CLP)</Label>
                <Input
                  id="evaluation_price"
                  type="number"
                  value={formData.evaluation_price}
                  onChange={(e) => handleChange("evaluation_price", parseInt(e.target.value))}
                />
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                Atrás
              </Button>
              <Button onClick={handleSubmit} disabled={createProfile.isPending}>
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
