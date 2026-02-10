import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileSignature, CheckCircle, AlertCircle, Shield } from "lucide-react";

interface ConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientName: string;
  patientId: string;
  isMinor?: boolean;
  existingConsent?: {
    consent_given: boolean;
    consent_date?: string;
    consent_guardian_name?: string;
  };
  onConsent: (patientId: string, data: ConsentData) => void;
}

export interface ConsentData {
  consent_given: boolean;
  consent_date: string;
  consent_guardian_name?: string;
  consent_guardian_rut?: string;
}

export function ConsentDialog({ 
  open, 
  onOpenChange, 
  patientName, 
  patientId,
  isMinor = false,
  existingConsent,
  onConsent 
}: ConsentDialogProps) {
  const [accepted, setAccepted] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianRut, setGuardianRut] = useState("");

  const handleSubmit = () => {
    if (!accepted) return;
    if (isMinor && (!guardianName.trim() || !guardianRut.trim())) return;

    onConsent(patientId, {
      consent_given: true,
      consent_date: new Date().toISOString(),
      consent_guardian_name: isMinor ? guardianName : undefined,
      consent_guardian_rut: isMinor ? guardianRut : undefined,
    });
    
    onOpenChange(false);
    setAccepted(false);
    setGuardianName("");
    setGuardianRut("");
  };

  const canSubmit = accepted && (!isMinor || (guardianName.trim() && guardianRut.trim()));

  if (existingConsent?.consent_given) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              Consentimiento Registrado
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Consentimiento firmado</span>
              </div>
              <div className="mt-2 text-sm text-green-600 dark:text-green-500">
                <p><strong>Paciente:</strong> {patientName}</p>
                {existingConsent.consent_date && (
                  <p><strong>Fecha:</strong> {new Date(existingConsent.consent_date).toLocaleDateString('es-CL')}</p>
                )}
                {existingConsent.consent_guardian_name && (
                  <p><strong>Representante:</strong> {existingConsent.consent_guardian_name}</p>
                )}
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            Consentimiento Informado
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-medium">Paciente: {patientName}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Fecha: {new Date().toLocaleDateString('es-CL')}
            </p>
          </div>

          <ScrollArea className="h-[300px] border rounded-lg p-4">
            <div className="prose prose-sm max-w-none text-sm">
              <h4 className="text-base font-semibold">CONSENTIMIENTO PARA EL TRATAMIENTO DE DATOS PERSONALES</h4>
              
              <p>
                Yo, <strong>{isMinor ? "representante legal de " : ""}{patientName}</strong>, 
                declaro que he sido informado/a de lo siguiente:
              </p>

              <h5 className="font-medium mt-4">1. Responsable del Tratamiento</h5>
              <p className="text-muted-foreground">
                El profesional fonoaudiólogo/a que utiliza la plataforma TherapyHub será el 
                responsable del tratamiento de los datos personales y de salud recopilados.
              </p>

              <h5 className="font-medium mt-4">2. Finalidad del Tratamiento</h5>
              <p className="text-muted-foreground">Los datos serán utilizados exclusivamente para:</p>
              <ul className="text-muted-foreground">
                <li>Registro y seguimiento del tratamiento fonoaudiológico.</li>
                <li>Almacenamiento de resultados de evaluaciones y tests.</li>
                <li>Gestión de citas y recordatorios.</li>
                <li>Elaboración de informes clínicos.</li>
              </ul>

              <h5 className="font-medium mt-4">3. Datos Recopilados</h5>
              <ul className="text-muted-foreground">
                <li>Datos de identificación: nombre, RUT, fecha de nacimiento.</li>
                <li>Datos de contacto: teléfono, email.</li>
                <li>Datos de salud: diagnóstico, historial clínico, resultados de evaluaciones.</li>
              </ul>

              <h5 className="font-medium mt-4">4. Derechos del Titular</h5>
              <p className="text-muted-foreground">
                Tengo derecho a acceder, rectificar, cancelar y oponerme al tratamiento 
                de mis datos personales (derechos ARCO).
              </p>

              <h5 className="font-medium mt-4">5. Medidas de Seguridad</h5>
              <p className="text-muted-foreground">
                Los datos serán almacenados en servidores seguros con encriptación, 
                y solo el profesional tratante tendrá acceso a ellos.
              </p>

              <h5 className="font-medium mt-4">6. Recordatorios</h5>
              <p className="text-muted-foreground">
                Autorizo el envío de recordatorios de citas a través de WhatsApp, 
                email u otros medios de comunicación proporcionados.
              </p>
            </div>
          </ScrollArea>

          {isMinor && (
            <div className="space-y-3 p-3 border rounded-lg bg-warning/10">
              <div className="flex items-center gap-2 text-warning">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Paciente menor de edad</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="guardianName" className="text-xs">Nombre del Representante Legal</Label>
                  <Input
                    id="guardianName"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    placeholder="Nombre completo"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="guardianRut" className="text-xs">RUT del Representante</Label>
                  <Input
                    id="guardianRut"
                    value={guardianRut}
                    onChange={(e) => setGuardianRut(e.target.value)}
                    placeholder="12.345.678-9"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start space-x-3 p-3 border rounded-lg">
            <Checkbox
              id="consent"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
            />
            <div className="space-y-1">
              <Label htmlFor="consent" className="text-sm font-medium cursor-pointer">
                Acepto los términos del consentimiento informado
              </Label>
              <p className="text-xs text-muted-foreground">
                {isMinor 
                  ? "Como representante legal, autorizo el tratamiento de datos del menor."
                  : "He leído y comprendido la información proporcionada."}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Firmar Consentimiento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ConsentBadge({ hasConsent }: { hasConsent: boolean }) {
  if (hasConsent) {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Consentimiento
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
      <AlertCircle className="h-3 w-3 mr-1" />
      Sin consentimiento
    </Badge>
  );
}
