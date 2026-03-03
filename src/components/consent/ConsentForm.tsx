import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSignature, CheckCircle, AlertCircle } from "lucide-react";

interface ConsentFormProps {
  patientName: string;
  onConsent: (data: ConsentData) => void;
  onCancel?: () => void;
  isMinor?: boolean;
}

export interface ConsentData {
  consent_given: boolean;
  consent_date: string;
  consent_guardian_name?: string;
  consent_guardian_rut?: string;
}

export function ConsentForm({ patientName, onConsent, onCancel, isMinor = false }: ConsentFormProps) {
  const [accepted, setAccepted] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianRut, setGuardianRut] = useState("");

  const handleSubmit = () => {
    if (!accepted) return;
    if (isMinor && (!guardianName.trim() || !guardianRut.trim())) return;

    onConsent({
      consent_given: true,
      consent_date: new Date().toISOString(),
      consent_guardian_name: isMinor ? guardianName : undefined,
      consent_guardian_rut: isMinor ? guardianRut : undefined,
    });
  };

  const canSubmit = accepted && (!isMinor || (guardianName.trim() && guardianRut.trim()));

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-primary" />
          Consentimiento Informado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm font-medium">Paciente: {patientName}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Fecha: {new Date().toLocaleDateString('es-CL')}
          </p>
        </div>

        <ScrollArea className="h-64 border rounded-lg p-4">
          <div className="prose prose-sm max-w-none">
            <h4>CONSENTIMIENTO PARA EL TRATAMIENTO DE DATOS PERSONALES</h4>
            
            <p>
              Yo, <strong>{isMinor ? "representante legal de " : ""}{patientName}</strong>, 
              declaro que he sido informado/a de lo siguiente:
            </p>

            <h5>1. Responsable del Tratamiento</h5>
            <p>
              El profesional de salud que utiliza la plataforma TherapyHub será el 
              responsable del tratamiento de los datos personales y de salud recopilados.
            </p>

            <h5>2. Finalidad del Tratamiento</h5>
            <p>Los datos serán utilizados exclusivamente para:</p>
            <ul>
              <li>Registro y seguimiento del tratamiento clínico.</li>
              <li>Almacenamiento de resultados de evaluaciones y tests.</li>
              <li>Gestión de citas y recordatorios.</li>
              <li>Elaboración de informes clínicos.</li>
            </ul>

            <h5>3. Datos Recopilados</h5>
            <ul>
              <li>Datos de identificación: nombre, RUT, fecha de nacimiento.</li>
              <li>Datos de contacto: teléfono, email.</li>
              <li>Datos de salud: diagnóstico, historial clínico, resultados de evaluaciones.</li>
            </ul>

            <h5>4. Derechos del Titular</h5>
            <p>
              Tengo derecho a acceder, rectificar, cancelar y oponerme al tratamiento 
              de mis datos personales (derechos ARCO), contactando directamente al 
              profesional tratante.
            </p>

            <h5>5. Medidas de Seguridad</h5>
            <p>
              Los datos serán almacenados en servidores seguros con encriptación, 
              y solo el profesional tratante tendrá acceso a ellos.
            </p>

            <h5>6. Conservación</h5>
            <p>
              Los datos serán conservados durante el tiempo que dure la relación 
              profesional y el período legal establecido para la conservación de 
              fichas clínicas.
            </p>

            <h5>7. Recordatorios</h5>
            <p>
              Autorizo el envío de recordatorios de citas a través de WhatsApp, 
              email u otros medios de comunicación proporcionados.
            </p>
          </div>
        </ScrollArea>

        {isMinor && (
          <div className="space-y-4 p-4 border rounded-lg bg-warning/10">
            <div className="flex items-center gap-2 text-warning">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Paciente menor de edad</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="guardianName">Nombre del Representante Legal</Label>
                <Input
                  id="guardianName"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="Nombre completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardianRut">RUT del Representante</Label>
                <Input
                  id="guardianRut"
                  value={guardianRut}
                  onChange={(e) => setGuardianRut(e.target.value)}
                  placeholder="12.345.678-9"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start space-x-3 p-4 border rounded-lg">
          <Checkbox
            id="consent"
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked === true)}
          />
          <div className="space-y-1">
            <Label htmlFor="consent" className="font-medium cursor-pointer">
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
          {onCancel && (
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button 
            className="flex-1" 
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Firmar Consentimiento
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
