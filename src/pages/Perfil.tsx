import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Mail, Phone, MapPin, Building, Save, Loader2, Calendar, Link, Unlink, RotateCcw, Crown, Clock, Shield, CheckCircle, XCircle, Sparkles, ArrowRight, AlertTriangle } from "lucide-react";
import { useProfile, ProfileFormData } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useProfession } from "@/contexts/ProfessionContext";
import { useTour } from "@/hooks/useTour";
import { RutInput } from "@/components/ui/rut-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { useSubscription } from "@/hooks/useSubscription";
import { useUsage } from "@/hooks/useUsage";
import { usePatients } from "@/hooks/usePatients";
import { usePlannings } from "@/hooks/usePlannings";
import { useClinic } from "@/hooks/useClinic";
import { formatPriceCLP } from "@/config/subscriptions";
import type { PlanId, FeatureId } from "@/config/subscriptions";
import { useNavigate } from "react-router-dom";

export default function Perfil() {
  const { user } = useAuth();
  const { profile, isLoading, updateProfile } = useProfile();
  const { isConnected: isGoogleConnected, isLoading: isGoogleLoading, connect: connectGoogle, disconnect: disconnectGoogle } = useGoogleCalendar();
  const { config: profConfig } = useProfession();
  const { resetTour } = useTour(user?.id);
  const navigate = useNavigate();
  const { subscription, limits, effectivePlan, isClinicPlan, trialDaysRemaining, trialExpired, isLoading: subLoading } = useSubscription();
  const { clinic, isClinicMember, isClinicAdmin } = useClinic();
  const { usage } = useUsage();
  const { patients } = usePatients();
  const { plannings } = usePlannings();
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

        {/* Subscription Section */}
        <div className="bg-card rounded-xl border p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Mi Suscripción
            </h3>
            <Button variant="outline" size="sm" onClick={() => navigate("/planes")}>
              Ver Planes
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {subLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Cargando suscripción...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Plan Badge & Status */}
              <div className="flex flex-wrap items-center gap-4">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
                  effectivePlan === 'vip' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                  effectivePlan === 'clinic' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                  effectivePlan === 'professional' ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400' :
                  effectivePlan === 'trial' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {effectivePlan === 'vip' && <Crown className="h-4 w-4" />}
                  {effectivePlan === 'clinic' && <Sparkles className="h-4 w-4" />}
                  {effectivePlan === 'professional' && <Shield className="h-4 w-4" />}
                  {effectivePlan === 'trial' && <Clock className="h-4 w-4" />}
                  {({
                    free: 'Plan Free',
                    trial: 'Plan Trial',
                    professional: 'Plan Profesional',
                    clinic: 'Plan Clínica',
                    vip: 'Plan VIP',
                  } as Record<PlanId, string>)[effectivePlan]}
                </div>

                {subscription?.status === 'active' && (
                  <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
                    <CheckCircle className="h-3.5 w-3.5" /> Activo
                  </span>
                )}
                {(subscription?.status === 'suspended' || subscription?.status === 'canceled') && (
                  <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium">
                    <XCircle className="h-3.5 w-3.5" /> {subscription.status === 'suspended' ? 'Suspendido' : 'Cancelado'}
                  </span>
                )}
                {isClinicPlan && clinic && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-full">
                    <Building className="h-3.5 w-3.5" /> Vía {clinic.name}
                  </span>
                )}
              </div>

              {/* Trial / Expiry Info */}
              {subscription?.plan === 'trial' && trialDaysRemaining !== null && (
                <div className={`rounded-lg p-4 text-sm ${
                  trialExpired
                    ? 'bg-destructive/10 text-destructive'
                    : trialDaysRemaining <= 7
                    ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                    : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
                }`}>
                  <div className="flex items-center gap-2">
                    {trialExpired ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    <span className="font-medium">
                      {trialExpired
                        ? 'Tu período de prueba ha expirado. Actualiza tu plan para seguir usando todas las funciones.'
                        : `Te quedan ${trialDaysRemaining} día${trialDaysRemaining !== 1 ? 's' : ''} de prueba`}
                    </span>
                  </div>
                  {!trialExpired && subscription.trial_ends_at && (
                    <p className="mt-1 text-xs opacity-80">
                      Expira el {new Date(subscription.trial_ends_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
              )}

              {/* Period info for non-trial plans */}
              {subscription && subscription.plan !== 'trial' && subscription.plan !== 'free' && subscription.current_period_end && (
                <div className="text-sm text-muted-foreground space-y-1">
                  {subscription.plan === 'vip' ? (
                    <p>Acceso completo sin fecha de expiración</p>
                  ) : (
                    <>
                      <p>Período actual: {new Date(subscription.current_period_start || '').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} — {new Date(subscription.current_period_end).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      {new Date(subscription.current_period_end) < new Date() && (
                        <p className="text-destructive font-medium">Plan expirado — tu cuenta opera con límites del plan Free</p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Usage & Limits */}
              {limits && (
                <div>
                  <p className="text-sm font-medium text-card-foreground mb-3">Uso del Plan</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      {
                        label: 'Pacientes',
                        current: patients.filter(p => p.status === 'active').length,
                        max: limits.max_patients,
                      },
                      {
                        label: 'Sesiones / mes',
                        current: usage['sessions'] || 0,
                        max: limits.max_sessions_per_month,
                      },
                      {
                        label: 'Planificaciones',
                        current: plannings.filter((p: any) => p.status === 'active').length,
                        max: limits.max_plannings,
                      },
                      {
                        label: 'Consultas IA / mes',
                        current: usage['ai_requests'] || 0,
                        max: limits.max_ai_requests_per_month,
                      },
                    ].map((item) => {
                      const pct = item.max === -1 ? 0 : Math.min(100, (item.current / item.max) * 100);
                      const isUnlimited = item.max === -1;
                      const isNearLimit = !isUnlimited && pct >= 80;
                      const isAtLimit = !isUnlimited && item.current >= item.max;
                      return (
                        <div key={item.label} className="rounded-lg border bg-background p-3 space-y-2">
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                          <p className={`text-lg font-bold ${isAtLimit ? 'text-destructive' : isNearLimit ? 'text-amber-600' : 'text-card-foreground'}`}>
                            {item.current}{isUnlimited ? '' : `/${item.max}`}
                          </p>
                          {isUnlimited ? (
                            <p className="text-[10px] text-success font-medium">Ilimitado</p>
                          ) : (
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${isAtLimit ? 'bg-destructive' : isNearLimit ? 'bg-amber-500' : 'bg-primary'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Features */}
              {limits && (
                <div>
                  <p className="text-sm font-medium text-card-foreground mb-3">Funciones Incluidas</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {([
                      { id: 'pdf_export' as FeatureId, label: 'Exportar PDF' },
                      { id: 'patient_export' as FeatureId, label: 'Exportar pacientes' },
                      { id: 'google_calendar' as FeatureId, label: 'Google Calendar' },
                      { id: 'consent' as FeatureId, label: 'Consentimiento' },
                      { id: 'boleta_pdf' as FeatureId, label: 'Boleta PDF' },
                      { id: 'whatsapp' as FeatureId, label: 'WhatsApp' },
                      { id: 'custom_branding' as FeatureId, label: 'Marca personalizada' },
                      { id: 'multi_user' as FeatureId, label: 'Multi-usuario' },
                    ]).map((feat) => {
                      const has = limits.features.includes(feat.id);
                      return (
                        <div key={feat.id} className={`flex items-center gap-2 text-sm rounded-md px-2 py-1.5 ${has ? 'text-card-foreground' : 'text-muted-foreground/50'}`}>
                          {has ? <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                          <span>{feat.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upgrade CTA for free/trial */}
              {(effectivePlan === 'free' || effectivePlan === 'trial') && (
                <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">¿Necesitas más?</p>
                    <p className="text-xs text-muted-foreground">Desbloquea todas las funciones con un plan superior</p>
                  </div>
                  <Button size="sm" onClick={() => navigate("/planes")}>
                    <Crown className="h-4 w-4 mr-1" />
                    Mejorar Plan
                  </Button>
                </div>
              )}

              {/* Plan pricing info */}
              {limits && limits.price_monthly > 0 && (
                <p className="text-xs text-muted-foreground">
                  Plan {limits.label}: {formatPriceCLP(limits.price_monthly)}/mes
                </p>
              )}
            </div>
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
