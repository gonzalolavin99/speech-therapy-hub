import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Mail, Phone, MapPin, Building, Save, Loader2, Calendar, Link, Unlink, RotateCcw } from "lucide-react";
import { useProfile, ProfileFormData } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useProfession } from "@/contexts/ProfessionContext";
import { useTour } from "@/hooks/useTour";
import { RutInput } from "@/components/ui/rut-input";
import { PhoneInput } from "@/components/ui/phone-input";

export default function Perfil() {
  const { user } = useAuth();
  const { profile, isLoading, updateProfile } = useProfile();
  const { isConnected: isGoogleConnected, isLoading: isGoogleLoading, connect: connectGoogle, disconnect: disconnectGoogle } = useGoogleCalendar();
  const { config: profConfig } = useProfession();
  const { resetTour } = useTour(user?.id);
  const [formData, setFormData] = useState<Partial<ProfileFormData>>({});

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name,
        rut: profile.rut,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        institution: profile.institution,
        specialties: profile.specialties,
        bio: profile.bio,
        sis_registration: profile.sis_registration,
        session_duration: profile.session_duration,
        session_price: profile.session_price,
        evaluation_price: profile.evaluation_price,
      });
    }
  }, [profile]);

  const handleChange = (field: keyof ProfileFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateProfile.mutate(formData);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>
          <p className="text-muted-foreground mt-1">
            Administra tu información profesional
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-card rounded-xl border p-8 mb-8">
          <div className="flex items-start gap-6 mb-8">
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-12 w-12 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-card-foreground">
                {formData.full_name || "Sin nombre"}
              </h2>
              <p className="text-muted-foreground">{profConfig.label}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {formData.sis_registration ? `${profConfig.labels.registrationLabel}: ${formData.sis_registration}` : `Sin ${profConfig.labels.registrationLabel.toLowerCase()}`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {user?.email}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input
                  id="name"
                  value={formData.full_name || ""}
                  onChange={(e) => handleChange("full_name", e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rut">RUT</Label>
                <RutInput
                  id="rut"
                  value={formData.rut || ""}
                  onChange={(val) => handleChange("rut", val)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">
                  <Phone className="h-4 w-4 inline mr-2" />
                  Teléfono
                </Label>
                <PhoneInput
                  id="phone"
                  value={formData.phone || ""}
                  onChange={(val) => handleChange("phone", val)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="address">
                  <MapPin className="h-4 w-4 inline mr-2" />
                  Dirección
                </Label>
                <Input
                  id="address"
                  value={formData.address || ""}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input 
                  id="city" 
                  value={formData.city || ""} 
                  onChange={(e) => handleChange("city", e.target.value)}
                  className="bg-background" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="institution">
                <Building className="h-4 w-4 inline mr-2" />
                Institución / Centro
              </Label>
              <Input
                id="institution"
                value={formData.institution || ""}
                onChange={(e) => handleChange("institution", e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialties">Especialidades</Label>
              <Textarea
                id="specialties"
                value={formData.specialties || ""}
                onChange={(e) => handleChange("specialties", e.target.value)}
                className="bg-background resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Biografía Profesional</Label>
              <Textarea
                id="bio"
                value={formData.bio || ""}
                onChange={(e) => handleChange("bio", e.target.value)}
                className="bg-background resize-none"
                rows={4}
              />
            </div>
          </div>
        </div>

        {/* Google Calendar Integration */}
        <div className="bg-card rounded-xl border p-8 mb-8">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            <Calendar className="h-5 w-5 inline mr-2" />
            Integración con Google Calendar
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Sincroniza automáticamente tus citas con Google Calendar para verlas en tu teléfono o computador.
          </p>
          
          {isGoogleLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verificando conexión...</span>
            </div>
          ) : isGoogleConnected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-success">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span className="text-sm font-medium">Google Calendar conectado</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={disconnectGoogle}
                className="text-destructive hover:text-destructive"
              >
                <Unlink className="h-4 w-4 mr-2" />
                Desconectar
              </Button>
            </div>
          ) : (
            <Button onClick={connectGoogle} variant="outline">
              <Link className="h-4 w-4 mr-2" />
              Conectar Google Calendar
            </Button>
          )}
        </div>

        {/* Session Settings */}
        <div className="bg-card rounded-xl border p-8 mb-8">
          <h3 className="text-lg font-semibold text-card-foreground mb-6">
            Configuración de Sesiones
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="sessionDuration">Duración de Sesión (min)</Label>
              <Input
                id="sessionDuration"
                type="number"
                value={formData.session_duration || 45}
                onChange={(e) => handleChange("session_duration", parseInt(e.target.value))}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionPrice">Valor Sesión (CLP)</Label>
              <Input
                id="sessionPrice"
                type="number"
                value={formData.session_price || 35000}
                onChange={(e) => handleChange("session_price", parseInt(e.target.value))}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evaluationPrice">Valor Evaluación (CLP)</Label>
              <Input
                id="evaluationPrice"
                type="number"
                value={formData.evaluation_price || 50000}
                onChange={(e) => handleChange("evaluation_price", parseInt(e.target.value))}
                className="bg-background"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={resetTour}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Repetir Tour
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90"
            onClick={handleSave}
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Cambios
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
