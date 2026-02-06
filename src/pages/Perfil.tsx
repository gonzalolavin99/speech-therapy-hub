import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Mail, Phone, MapPin, Building, Save } from "lucide-react";

export default function Perfil() {
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
                Dra. Carolina Fernández
              </h2>
              <p className="text-muted-foreground">Fonoaudióloga</p>
              <p className="text-sm text-muted-foreground mt-1">
                Registro SIS: 12345-6
              </p>
              <Button variant="outline" size="sm" className="mt-3">
                Cambiar Foto
              </Button>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input
                  id="name"
                  defaultValue="Carolina Fernández López"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rut">RUT</Label>
                <Input
                  id="rut"
                  defaultValue="12.345.678-9"
                  className="bg-background"
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
                  defaultValue="carolina.fernandez@email.com"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">
                  <Phone className="h-4 w-4 inline mr-2" />
                  Teléfono
                </Label>
                <Input
                  id="phone"
                  defaultValue="+56 9 1234 5678"
                  className="bg-background"
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
                  defaultValue="Av. Providencia 1234, Of. 567"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input id="city" defaultValue="Santiago" className="bg-background" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="institution">
                <Building className="h-4 w-4 inline mr-2" />
                Institución / Centro
              </Label>
              <Input
                id="institution"
                defaultValue="Centro de Fonoaudiología Integral"
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialties">Especialidades</Label>
              <Textarea
                id="specialties"
                defaultValue="Trastornos del Lenguaje Infantil, Motricidad Orofacial, Disfemia"
                className="bg-background resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Biografía Profesional</Label>
              <Textarea
                id="bio"
                defaultValue="Fonoaudióloga con más de 10 años de experiencia en atención pediátrica. Especialista en trastornos del lenguaje y habla. Formación en Chile y España."
                className="bg-background resize-none"
                rows={4}
              />
            </div>
          </div>
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
                defaultValue="45"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionPrice">Valor Sesión (CLP)</Label>
              <Input
                id="sessionPrice"
                type="number"
                defaultValue="35000"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evaluationPrice">Valor Evaluación (CLP)</Label>
              <Input
                id="evaluationPrice"
                type="number"
                defaultValue="50000"
                className="bg-background"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button className="bg-primary hover:bg-primary/90">
            <Save className="h-4 w-4 mr-2" />
            Guardar Cambios
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
