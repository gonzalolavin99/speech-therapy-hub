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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FileText, Download, Loader2 } from "lucide-react";
import { Patient } from "@/hooks/usePatients";
import { Planning } from "@/hooks/usePlannings";
import { Session } from "@/hooks/useSessions";
import { TestResult } from "@/hooks/useTestResults";
import { ProfessionalProfile } from "@/hooks/useProfile";
import { exportProgressReportPDF } from "@/utils/exportProgressReport";
import { toast } from "sonner";

interface ProgressReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient;
  professional: ProfessionalProfile;
  plannings: Planning[];
  sessions: Session[];
  testResults: TestResult[];
}

export function ProgressReportDialog({
  open,
  onOpenChange,
  patient,
  professional,
  plannings,
  sessions,
  testResults,
}: ProgressReportDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [sections, setSections] = useState({
    patientInfo: true,
    diagnosis: true,
    plannings: true,
    sessions: true,
    tests: true,
    progress: true,
    recommendations: true,
  });

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter data for this patient
  const patientPlannings = plannings.filter((p) => p.patient_id === patient.id);
  const patientSessions = sessions.filter((s) => s.patient_id === patient.id);
  const patientTests = testResults.filter((t) => t.patient_id === patient.id);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await exportProgressReportPDF({
        patient,
        professional,
        plannings: patientPlannings,
        sessions: patientSessions,
        testResults: patientTests,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sections,
        customNotes: customNotes || undefined,
      });
      toast.success("Informe de evolución generado exitosamente");
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error generating report:", err);
      toast.error("Error al generar informe", { description: err.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const sectionItems = [
    { key: "patientInfo" as const, label: "Datos del paciente", count: null },
    { key: "diagnosis" as const, label: "Diagnóstico clínico", count: null },
    {
      key: "plannings" as const,
      label: "Planificaciones",
      count: patientPlannings.length,
    },
    {
      key: "sessions" as const,
      label: "Registro de sesiones",
      count: patientSessions.length,
    },
    {
      key: "tests" as const,
      label: "Evaluaciones aplicadas",
      count: patientTests.length,
    },
    { key: "progress" as const, label: "Resumen de progreso", count: null },
    {
      key: "recommendations" as const,
      label: "Observaciones y recomendaciones",
      count: null,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Informe de Evolución
          </DialogTitle>
          <DialogDescription>
            Genera un informe PDF del progreso de {patient.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Date Range */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Rango de fechas (opcional)
            </Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <Label className="text-xs">Desde</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Hasta</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Si no se especifica, se incluyen todos los datos disponibles
            </p>
          </div>

          {/* Sections Toggle */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Secciones del informe
            </Label>
            <div className="mt-2 space-y-2">
              {sectionItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{item.label}</span>
                    {item.count !== null && (
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                        {item.count}
                      </span>
                    )}
                  </div>
                  <Switch
                    checked={sections[item.key]}
                    onCheckedChange={() => toggleSection(item.key)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Custom Notes */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Observaciones del profesional (opcional)
            </Label>
            <Textarea
              className="mt-2"
              placeholder="Escribe observaciones, recomendaciones o indicaciones para incluir en el informe..."
              rows={3}
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isGenerating ? "Generando..." : "Generar PDF"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
