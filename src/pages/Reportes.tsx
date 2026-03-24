import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  FileBarChart,
  ClipboardList,
  UserCheck,
  Download,
  Loader2,
  CalendarDays,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePatients } from "@/hooks/usePatients";
import { useSessions } from "@/hooks/useSessions";
import { useTestResults } from "@/hooks/useTestResults";
import { usePlannings } from "@/hooks/usePlannings";
import { useProfile } from "@/hooks/useProfile";
import { ProgressReportDialog } from "@/components/reports/ProgressReportDialog";
import { exportPatientToPDF } from "@/utils/exportPatient";
import { exportAttendanceReportPDF } from "@/utils/exportAttendanceReport";
import { exportTestResultsReportPDF } from "@/utils/exportTestResultsReport";
import { toast } from "sonner";

export default function Reportes() {
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [testsDialogOpen, setTestsDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  // Date range for attendance/tests reports
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { patients } = usePatients();
  const { sessions } = useSessions();
  const { testResults } = useTestResults();
  const { plannings } = usePlannings();
  const { profile } = useProfile();

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  // Count data for selected patient
  const patientSessions = sessions.filter((s) => s.patient_id === selectedPatientId);
  const patientTests = testResults.filter((t) => t.patient_id === selectedPatientId);
  const patientPlannings = plannings.filter((p) => p.patient_id === selectedPatientId);
  const completedSessions = patientSessions.filter((s) => s.status === "completed").length;

  const reportTypes = [
    {
      id: "evolucion",
      title: "Informe de Evolución",
      description: "Reporte completo del progreso del paciente con secciones configurables",
      icon: FileBarChart,
      color: "text-primary",
      bgColor: "bg-primary/10",
      stat: selectedPatient
        ? `${patientPlannings.length} planificación${patientPlannings.length !== 1 ? "es" : ""}`
        : null,
    },
    {
      id: "ficha",
      title: "Ficha Clínica",
      description: "Datos personales, diagnóstico, historial clínico del paciente",
      icon: FileText,
      color: "text-info",
      bgColor: "bg-info/10",
      stat: selectedPatient ? "Datos del paciente" : null,
    },
    {
      id: "asistencia",
      title: "Reporte de Asistencia",
      description: "Estadísticas de sesiones, cancelaciones y tasa de asistencia",
      icon: UserCheck,
      color: "text-success",
      bgColor: "bg-success/10",
      stat: selectedPatient
        ? `${completedSessions} de ${patientSessions.length} sesiones`
        : null,
    },
    {
      id: "evaluaciones",
      title: "Informe de Evaluaciones",
      description: "Resultados de tests y evaluaciones clínicas aplicadas",
      icon: ClipboardList,
      color: "text-warning",
      bgColor: "bg-warning/10",
      stat: selectedPatient
        ? `${patientTests.length} evaluación${patientTests.length !== 1 ? "es" : ""}`
        : null,
    },
  ];

  const handleGenerateReport = async (reportId: string) => {
    if (!selectedPatient || !profile) {
      toast.error("Selecciona un paciente primero");
      return;
    }

    switch (reportId) {
      case "evolucion":
        setProgressDialogOpen(true);
        break;

      case "ficha":
        setIsGenerating("ficha");
        try {
          const sessionData = patientSessions.map((s) => ({
            date: s.start_time,
            duration: Math.round(
              (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000
            ),
            notes: s.notes || undefined,
            status: s.status,
          }));
          const testData = patientTests.map((t) => ({
            test_type: t.test_name,
            date: t.evaluation_date,
            score: t.score,
          }));
          await exportPatientToPDF({
            patient: selectedPatient,
            sessions: sessionData,
            testResults: testData,
          });
          toast.success("Ficha clínica generada exitosamente");
        } catch (err: any) {
          toast.error("Error al generar ficha", { description: err.message });
        } finally {
          setIsGenerating(null);
        }
        break;

      case "asistencia":
        setAttendanceDialogOpen(true);
        break;

      case "evaluaciones":
        setTestsDialogOpen(true);
        break;
    }
  };

  const handleGenerateAttendance = async () => {
    if (!selectedPatient || !profile) return;
    setIsGenerating("asistencia");
    try {
      await exportAttendanceReportPDF({
        patient: selectedPatient,
        professional: profile,
        sessions,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      toast.success("Reporte de asistencia generado exitosamente");
      setAttendanceDialogOpen(false);
      setDateFrom("");
      setDateTo("");
    } catch (err: any) {
      toast.error("Error al generar reporte", { description: err.message });
    } finally {
      setIsGenerating(null);
    }
  };

  const handleGenerateTests = async () => {
    if (!selectedPatient || !profile) return;
    setIsGenerating("evaluaciones");
    try {
      await exportTestResultsReportPDF({
        patient: selectedPatient,
        professional: profile,
        testResults,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      toast.success("Informe de evaluaciones generado exitosamente");
      setTestsDialogOpen(false);
      setDateFrom("");
      setDateTo("");
    } catch (err: any) {
      toast.error("Error al generar informe", { description: err.message });
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Reportes e Informes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Genera informes PDF profesionales para tus pacientes
          </p>
        </div>

        {/* Patient Selector */}
        <div className="bg-card rounded-xl border p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-card-foreground">Seleccionar Paciente</h2>
              <p className="text-xs text-muted-foreground">
                Elige un paciente para generar sus reportes
              </p>
            </div>
          </div>

          <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Seleccionar paciente..." />
            </SelectTrigger>
            <SelectContent>
              {patients
                .filter((p) => p.status === "active")
                .map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              {patients.filter((p) => p.status !== "active").length > 0 && (
                <>
                  <SelectItem value="__separator" disabled>
                    ── Inactivos ──
                  </SelectItem>
                  {patients
                    .filter((p) => p.status !== "active")
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.status === "completed" ? "Alta" : "Inactivo"})
                      </SelectItem>
                    ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Report Cards */}
        {selectedPatient ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              const generating = isGenerating === report.id;

              return (
                <div
                  key={report.id}
                  className="bg-card rounded-xl border p-5 hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => !generating && handleGenerateReport(report.id)}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                        report.bgColor
                      )}
                    >
                      <Icon className={cn("h-6 w-6", report.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-colors">
                        {report.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
                      {report.stat && (
                        <p className="text-xs font-medium text-primary mt-2">{report.stat}</p>
                      )}
                    </div>
                    <div className="shrink-0 self-center">
                      {generating ? (
                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                      ) : (
                        <Download className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-card rounded-xl border p-12 text-center">
            <FileBarChart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground">
              Selecciona un paciente
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Elige un paciente arriba para ver los reportes disponibles
            </p>
          </div>
        )}
      </div>

      {/* Progress Report Dialog (reuse existing) */}
      {selectedPatient && profile && (
        <ProgressReportDialog
          open={progressDialogOpen}
          onOpenChange={setProgressDialogOpen}
          patient={selectedPatient}
          professional={profile}
          plannings={plannings}
          sessions={sessions}
          testResults={testResults}
        />
      )}

      {/* Attendance Report Dialog */}
      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-success" />
              Reporte de Asistencia
            </DialogTitle>
            <DialogDescription>
              Genera un PDF con las estadísticas de asistencia de{" "}
              {selectedPatient?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
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
                Si no se especifica, se incluyen todas las sesiones
              </p>
            </div>

            <div className="bg-muted/30 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Total sesiones:</span>{" "}
                  <span className="font-medium">{patientSessions.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Completadas:</span>{" "}
                  <span className="font-medium text-success">{completedSessions}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Canceladas:</span>{" "}
                  <span className="font-medium text-destructive">
                    {patientSessions.filter((s) => s.status === "cancelled").length}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Inasistencias:</span>{" "}
                  <span className="font-medium text-warning">
                    {patientSessions.filter((s) => s.status === "no_show").length}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setAttendanceDialogOpen(false);
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleGenerateAttendance}
                disabled={isGenerating === "asistencia"}
              >
                {isGenerating === "asistencia" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isGenerating === "asistencia" ? "Generando..." : "Generar PDF"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Results Report Dialog */}
      <Dialog open={testsDialogOpen} onOpenChange={setTestsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-warning" />
              Informe de Evaluaciones
            </DialogTitle>
            <DialogDescription>
              Genera un PDF con los resultados de evaluaciones de{" "}
              {selectedPatient?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
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
                Si no se especifica, se incluyen todas las evaluaciones
              </p>
            </div>

            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{patientTests.length}</span>{" "}
                evaluación{patientTests.length !== 1 ? "es" : ""} aplicada{patientTests.length !== 1 ? "s" : ""}
              </p>
              {patientTests.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {[...new Set(patientTests.map((t) => t.test_name))].map((name) => (
                    <span
                      key={name}
                      className="text-[10px] bg-warning/10 text-warning px-1.5 py-0.5 rounded-full"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setTestsDialogOpen(false);
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleGenerateTests}
                disabled={isGenerating === "evaluaciones"}
              >
                {isGenerating === "evaluaciones" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isGenerating === "evaluaciones" ? "Generando..." : "Generar PDF"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
