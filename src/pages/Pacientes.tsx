import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  User,
  Phone,
  Mail,
  Calendar,
  ChevronRight,
  FileText,
  Edit,
  Loader2,
  FileSignature,
  Download,
  Sparkles,
  Brain,
  ArrowLeft,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { PatientFormDialog } from "@/components/forms/PatientFormDialog";
import { ConsentDialog, ConsentBadge, ConsentData } from "@/components/consent/ConsentDialog";
import { usePatients, Patient, PatientFormData } from "@/hooks/usePatients";
import { exportPatientToPDF } from "@/utils/exportPatient";
import { PatientListSkeleton } from "@/components/ui/skeleton-card";
import { toast } from "sonner";
import { generatePatientSummary, isAIConfigured } from "@/lib/ai-service";
import { formatearEdad, calcularEdadEnAños } from "@/utils/age";
import { useTestResults } from "@/hooks/useTestResults";

export default function Pacientes() {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const navigate = useNavigate();
  const { patients, isLoading, createPatient, updatePatient } = usePatients();
  const { testResults } = useTestResults();

  const handleConsent = (patientId: string, data: ConsentData) => {
    updatePatient.mutate({
      id: patientId,
      consent_given: data.consent_given,
      consent_date: data.consent_date,
      consent_guardian_name: data.consent_guardian_name || null,
      consent_guardian_rut: data.consent_guardian_rut || null,
    }, {
      onSuccess: () => {
        toast.success("Consentimiento registrado exitosamente");
        if (selectedPatient) {
          setSelectedPatient({ ...selectedPatient, consent_given: true, consent_date: data.consent_date });
        }
      }
    });
  };

  const isMinor = (birthDate: string | null) => {
    if (!birthDate) return false;
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    return age < 18;
  };

  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.rut.includes(searchQuery) ||
      (patient.diagnosis?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: Patient["status"]) => {
    const styles = {
      active: "bg-success/10 text-success",
      inactive: "bg-muted text-muted-foreground",
      completed: "bg-info/10 text-info",
    };
    const labels = {
      active: "Activo",
      inactive: "Inactivo",
      completed: "Completado",
    };
    return (
      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", styles[status])}>
        {labels[status]}
      </span>
    );
  };

  const handleCreatePatient = () => {
    setFormMode("create");
    setEditingPatient(null);
    setIsFormOpen(true);
  };

  const handleEditPatient = () => {
    if (selectedPatient) {
      setFormMode("edit");
      setEditingPatient(selectedPatient);
      setIsFormOpen(true);
    }
  };

  const handleFormSubmit = (data: any) => {
    const patientData: PatientFormData = {
      name: data.name,
      rut: data.rut,
      birth_date: data.birthDate || null,
      age: data.birthDate ? calcularEdadEnAños(data.birthDate) : null,
      phone: data.phone || null,
      email: data.email || null,
      diagnosis: data.diagnosis || null,
      status: data.status || 'active',
      consult_reason: data.consultReason || null,
      referred_by: data.referredBy || null,
      perinatal_history: data.perinatalHistory || null,
      psychomotor_dev: data.psychomotorDev || null,
      observations: data.observations || null,
    };

    if (formMode === "create") {
      createPatient.mutate(patientData);
    } else if (editingPatient) {
      updatePatient.mutate({ id: editingPatient.id, ...patientData });
      setSelectedPatient(null);
    }
  };

  return (
    <AppLayout>
      <div className="flex h-screen">
        {/* Patient List */}
        <div className={cn(
          "border-r bg-card transition-all duration-300",
          isMobile && selectedPatient ? "hidden" : "",
          !isMobile && selectedPatient ? "w-96" : "flex-1"
        )}>
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-card-foreground">Pacientes</h1>
              <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={handleCreatePatient}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Paciente
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, RUT o diagnÃ³stico..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="overflow-auto" style={{ height: "calc(100vh - 140px)" }}>
            {isLoading ? (
              <PatientListSkeleton />
            ) : filteredPatients.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <User className="h-12 w-12 mb-4 opacity-50" />
                <p>No se encontraron pacientes</p>
              </div>
            ) : filteredPatients.map((patient) => (
              <div
                key={patient.id}
                onClick={() => { setSelectedPatient(patient); setAiSummary(null); }}
                className={cn(
                  "p-4 border-b cursor-pointer transition-colors hover:bg-muted/50",
                  selectedPatient?.id === patient.id && "bg-primary/5 border-l-2 border-l-primary"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-card-foreground">{patient.name}</p>
                      <p className="text-sm text-muted-foreground">{patient.rut}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{patient.diagnosis}</p>
                  <div className="flex items-center gap-2">
                    <ConsentBadge hasConsent={patient.consent_given || false} />
                    {getStatusBadge(patient.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Patient Detail */}
        {selectedPatient && (
          <div className="flex-1 overflow-auto">
            <div className="p-4 md:p-8">
              {/* Mobile Back Button */}
              {isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mb-4 -ml-1 text-muted-foreground"
                  onClick={() => { setSelectedPatient(null); setAiSummary(null); }}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Volver a pacientes
                </Button>
              )}

              {/* Header */}
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl lg:text-2xl font-bold text-foreground truncate">
                      {selectedPatient.name}
                    </h2>
                    <p className="text-muted-foreground">{selectedPatient.rut}</p>
                    {getStatusBadge(selectedPatient.status)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setConsentDialogOpen(true)}
                    className={cn(
                      "flex-shrink-0",
                      selectedPatient.consent_given ? "text-green-600 border-green-200" : "text-amber-600 border-amber-200"
                    )}
                  >
                    <FileSignature className="h-4 w-4 mr-1 lg:mr-2" />
                    <span className="hidden sm:inline">{selectedPatient.consent_given ? "Ver Consentimiento" : "Firmar Consentimiento"}</span>
                    <span className="sm:hidden">{selectedPatient.consent_given ? "Consentimiento" : "Firmar"}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0"
                    onClick={() => {
                      const patientTests = testResults.filter(t => t.patient_id === selectedPatient?.id);
                      if (patientTests.length === 0) {
                        toast.info('Sin evaluaciones', {
                          description: `${selectedPatient?.name} no tiene tests registrados. Puedes aplicar uno desde la secciÃ³n de Tests.`,
                          action: { label: 'Ir a Tests', onClick: () => navigate('/tests') },
                        });
                      } else {
                        navigate('/tests');
                      }
                    }}
                  >
                    <FileText className="h-4 w-4 mr-1 lg:mr-2" />
                    <span className="hidden sm:inline">Ver Tests</span>
                    <span className="sm:hidden">Tests</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-shrink-0"
                    onClick={async () => {
                      try {
                        await exportPatientToPDF({ patient: selectedPatient });
                        toast.success('PDF exportado exitosamente');
                      } catch (e) {
                        toast.error('Error al exportar PDF');
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-1 lg:mr-2" />
                    <span className="hidden sm:inline">Exportar</span>
                    <span className="sm:hidden">PDF</span>
                  </Button>
                  <Button size="sm" className="bg-primary hover:bg-primary/90 flex-shrink-0" onClick={handleEditPatient}>
                    <Edit className="h-4 w-4 mr-1 lg:mr-2" />
                    Editar
                  </Button>
                </div>
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8">
                <div className="bg-card rounded-xl border p-3 lg:p-4 min-w-0">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs lg:text-sm">Edad</span>
                  </div>
                  <p className="text-base lg:text-lg font-semibold text-card-foreground">
                    {selectedPatient.birth_date ? formatearEdad(selectedPatient.birth_date) : (selectedPatient.age ? `${selectedPatient.age} años` : "Sin registro")}
                  </p>
                </div>
                <div className="bg-card rounded-xl border p-3 lg:p-4 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs lg:text-sm">TelÃ©fono</span>
                  </div>
                  <p className="text-sm lg:text-base font-semibold text-card-foreground truncate">
                    {selectedPatient.phone || "-"}
                  </p>
                </div>
                <div className="bg-card rounded-xl border p-3 lg:p-4 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs lg:text-sm">Email</span>
                  </div>
                  <p className="text-xs lg:text-sm font-semibold text-card-foreground truncate">
                    {selectedPatient.email || "-"}
                  </p>
                </div>
                <div className="bg-card rounded-xl border p-3 lg:p-4 min-w-0">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs lg:text-sm">PrÃ³xima Cita</span>
                  </div>
                  <p className="text-base lg:text-lg font-semibold text-primary">
                    -
                  </p>
                </div>
              </div>

              {/* Diagnosis Section */}
              <div className="bg-card rounded-xl border p-6 mb-6">
                <h3 className="text-lg font-semibold text-card-foreground mb-4">
                  DiagnÃ³stico FonoaudiolÃ³gico
                </h3>
                <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                  <p className="text-primary font-medium">{selectedPatient.diagnosis}</p>
                </div>
              </div>

              {/* AI Summary Section */}
              {isAIConfigured() && (
                <div className="bg-card rounded-xl border p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
                      <Brain className="h-5 w-5 text-violet-600" />
                      Resumen ClÃ­nico IA
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setIsGeneratingSummary(true);
                        setAiSummary(null);
                        try {
                          const summary = await generatePatientSummary(
                            selectedPatient.name,
                            selectedPatient.age,
                            selectedPatient.diagnosis,
                            selectedPatient.consult_reason,
                            selectedPatient.observations
                          );
                          setAiSummary(summary);
                        } catch (err: any) {
                          toast.error('Error al generar resumen', { description: err.message });
                        } finally {
                          setIsGeneratingSummary(false);
                        }
                      }}
                      disabled={isGeneratingSummary}
                      className="text-xs border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400"
                    >
                      {isGeneratingSummary ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {isGeneratingSummary ? "Generando..." : aiSummary ? "Regenerar" : "Generar Resumen"}
                    </Button>
                  </div>
                  {isGeneratingSummary && (
                    <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analizando datos del paciente...
                    </div>
                  )}
                  {aiSummary && !isGeneratingSummary && (
                    <div className="animate-in fade-in-0 duration-500">
                      <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 p-4">
                        <p className="text-sm text-violet-900 dark:text-violet-200 leading-relaxed whitespace-pre-line">{aiSummary}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic mt-2">
                        Generado por IA. Debe ser validado por el profesional.
                      </p>
                    </div>
                  )}
                  {!aiSummary && !isGeneratingSummary && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Genera un resumen clÃ­nico integrado del paciente con IA
                    </p>
                  )}
                </div>
              )}

              {/* Anamnesis Section */}
              <div className="bg-card rounded-xl border p-6">
                <h3 className="text-lg font-semibold text-card-foreground mb-4">
                  Ficha de Anamnesis
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Motivo de Consulta</p>
                      <p className="text-card-foreground">
                        {selectedPatient.consult_reason || "No registrado"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Derivado por</p>
                      <p className="text-card-foreground">{selectedPatient.referred_by || "No registrado"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Antecedentes Perinatales</p>
                      <p className="text-card-foreground">{selectedPatient.perinatal_history || "No registrado"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Desarrollo Psicomotor</p>
                      <p className="text-card-foreground">{selectedPatient.psychomotor_dev || "No registrado"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Observaciones</p>
                    <p className="text-card-foreground">
                      {selectedPatient.observations || "No registrado"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <PatientFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        mode={formMode}
        initialData={
          editingPatient
            ? {
                name: editingPatient.name,
                rut: editingPatient.rut,
                phone: editingPatient.phone,
                email: editingPatient.email,
                diagnosis: editingPatient.diagnosis,
                status: editingPatient.status,
                consultReason: editingPatient.consult_reason,
                referredBy: editingPatient.referred_by,
                perinatalHistory: editingPatient.perinatal_history,
                psychomotorDev: editingPatient.psychomotor_dev,
                observations: editingPatient.observations,
              }
            : undefined
        }
      />

      {selectedPatient && (
        <ConsentDialog
          open={consentDialogOpen}
          onOpenChange={setConsentDialogOpen}
          patientName={selectedPatient.name}
          patientId={selectedPatient.id}
          isMinor={isMinor(selectedPatient.birth_date)}
          existingConsent={{
            consent_given: selectedPatient.consent_given || false,
            consent_date: selectedPatient.consent_date,
            consent_guardian_name: selectedPatient.consent_guardian_name,
          }}
          onConsent={handleConsent}
        />
      )}
    </AppLayout>
  );
}