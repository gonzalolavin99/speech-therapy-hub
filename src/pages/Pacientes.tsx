import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PatientFormDialog } from "@/components/forms/PatientFormDialog";
import { usePatients, Patient, PatientFormData } from "@/hooks/usePatients";

export default function Pacientes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const { patients, isLoading, createPatient, updatePatient } = usePatients();

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
      age: data.birthDate ? new Date().getFullYear() - new Date(data.birthDate).getFullYear() : null,
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
          selectedPatient ? "w-96" : "flex-1"
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
                placeholder="Buscar por nombre, RUT o diagnóstico..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="overflow-auto" style={{ height: "calc(100vh - 140px)" }}>
            {filteredPatients.map((patient) => (
              <div
                key={patient.id}
                onClick={() => setSelectedPatient(patient)}
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
                  {getStatusBadge(patient.status)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Patient Detail */}
        {selectedPatient && (
          <div className="flex-1 overflow-auto">
            <div className="p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">
                      {selectedPatient.name}
                    </h2>
                    <p className="text-muted-foreground">{selectedPatient.rut}</p>
                    {getStatusBadge(selectedPatient.status)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Ver Tests
                  </Button>
                  <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={handleEditPatient}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </div>
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-card rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Edad</span>
                  </div>
                  <p className="text-lg font-semibold text-card-foreground">
                    {selectedPatient.age} años
                  </p>
                </div>
                <div className="bg-card rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Phone className="h-4 w-4" />
                    <span className="text-sm">Teléfono</span>
                  </div>
                  <p className="text-lg font-semibold text-card-foreground">
                    {selectedPatient.phone}
                  </p>
                </div>
                <div className="bg-card rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">Email</span>
                  </div>
                  <p className="text-sm font-semibold text-card-foreground truncate">
                    {selectedPatient.email}
                  </p>
                </div>
                <div className="bg-card rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Próxima Cita</span>
                  </div>
                  <p className="text-lg font-semibold text-primary">
                    -
                  </p>
                </div>
              </div>

              {/* Diagnosis Section */}
              <div className="bg-card rounded-xl border p-6 mb-6">
                <h3 className="text-lg font-semibold text-card-foreground mb-4">
                  Diagnóstico Fonoaudiológico
                </h3>
                <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                  <p className="text-primary font-medium">{selectedPatient.diagnosis}</p>
                </div>
              </div>

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
    </AppLayout>
  );
}