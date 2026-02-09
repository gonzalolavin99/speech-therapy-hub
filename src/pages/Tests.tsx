import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
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
import { Label } from "@/components/ui/label";
import { Search, FileText, Clock, User, ChevronRight } from "lucide-react";
import { useTestResults, TestResultFormData } from "@/hooks/useTestResults";
import { usePatients } from "@/hooks/usePatients";
import { MBGRTest, TARTest, TEPROSIFTest } from "@/components/tests";

const availableTests = [
  {
    id: "mbgr" as const,
    name: "MBGR",
    fullName: "Protocolo de Evaluación Miofuncional Orofacial MBGR",
    description:
      "Evaluación de estructuras y funciones del sistema estomatognático",
    duration: "45-60 min",
    categories: ["Motricidad Orofacial", "Deglución", "Respiración"],
  },
  {
    id: "tar" as const,
    name: "TAR Abreviado",
    fullName: "Test de Articulación a la Repetición",
    description: "Evaluación de la producción articulatoria mediante repetición",
    duration: "15-20 min",
    categories: ["Articulación", "Fonología"],
  },
  {
    id: "teprosif" as const,
    name: "TEPROSIF-R",
    fullName: "Test para Evaluar Procesos de Simplificación Fonológica",
    description:
      "Identificación de procesos de simplificación fonológica en niños",
    duration: "20-30 min",
    categories: ["Fonología", "Desarrollo del Lenguaje"],
  },
];

export default function Tests() {
  const [activeTest, setActiveTest] = useState<"mbgr" | "tar" | "teprosif" | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [showPatientSelect, setShowPatientSelect] = useState(false);
  const [pendingTestType, setPendingTestType] = useState<"mbgr" | "tar" | "teprosif" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { testResults, createTestResult } = useTestResults();
  const { patients } = usePatients();

  const selectedPatientData = patients.find(p => p.id === selectedPatient);

  const handleApplyTest = (testId: "mbgr" | "tar" | "teprosif") => {
    setPendingTestType(testId);
    setShowPatientSelect(true);
  };

  const handlePatientSelected = () => {
    if (selectedPatient && pendingTestType) {
      setShowPatientSelect(false);
      setActiveTest(pendingTestType);
    }
  };

  const handleTestComplete = (results: any) => {
    const testData: TestResultFormData = {
      patient_id: selectedPatient,
      test_type: activeTest!,
      test_name: activeTest === 'mbgr' ? 'MBGR' : activeTest === 'tar' ? 'TAR' : 'TEPROSIF-R',
      evaluation_date: new Date().toISOString().split('T')[0],
      status: "completed",
      score: JSON.stringify(results),
    };
    createTestResult.mutate(testData);
    setActiveTest(null);
    setSelectedPatient("");
  };

  const handleTestCancel = () => {
    setActiveTest(null);
    setSelectedPatient("");
  };

  const filteredTests = testResults.filter(
    (test) =>
      (test.patient_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.test_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tests y Evaluaciones</h1>
            <p className="text-muted-foreground mt-1">
              Aplica y gestiona las evaluaciones de tus pacientes
            </p>
          </div>
        </div>

        {/* Available Tests */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Tests Disponibles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {availableTests.map((test) => (
              <div
                key={test.id}
                className="bg-card rounded-xl border p-6 hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-card-foreground mb-1">
                  {test.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">{test.fullName}</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {test.description}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Clock className="h-4 w-4" />
                  <span>{test.duration}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {test.categories.map((category) => (
                    <span
                      key={category}
                      className="px-2 py-1 bg-secondary text-secondary-foreground rounded-full text-xs"
                    >
                      {category}
                    </span>
                  ))}
                </div>
                <Button 
                  className="w-full mt-4 bg-primary hover:bg-primary/90"
                  onClick={() => handleApplyTest(test.id)}
                >
                  Aplicar Test
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Tests */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Tests Recientes
            </h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar tests..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="bg-card rounded-xl border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Test
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Paciente
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Fecha
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Resultado
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTests.map((test) => (
                  <tr key={test.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-card-foreground">
                          {test.test_name}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-card-foreground">{test.patient_name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{test.evaluation_date}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-success/10 text-success rounded-full text-sm">
                        {test.score}
                      </span>
                    </td>
                    <td className="p-4">
                      <Button variant="ghost" size="sm">
                        Ver detalle
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Patient Selection Dialog */}
      <Dialog open={showPatientSelect} onOpenChange={setShowPatientSelect}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seleccionar Paciente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Paciente</Label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar paciente..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowPatientSelect(false)}>
                Cancelar
              </Button>
              <Button onClick={handlePatientSelected} disabled={!selectedPatient}>
                Iniciar Test
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Interactive Test Components */}
      <Dialog open={activeTest === 'mbgr'} onOpenChange={() => activeTest === 'mbgr' && handleTestCancel()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Protocolo MBGR</DialogTitle>
          </DialogHeader>
          <MBGRTest
            patientName={selectedPatientData?.name || ''}
            onComplete={(results, score) => handleTestComplete({ results, score })}
            onCancel={handleTestCancel}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={activeTest === 'tar'} onOpenChange={() => activeTest === 'tar' && handleTestCancel()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>TAR Abreviado</DialogTitle>
          </DialogHeader>
          <TARTest
            patientName={selectedPatientData?.name || ''}
            onComplete={(results) => handleTestComplete(results)}
            onCancel={handleTestCancel}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={activeTest === 'teprosif'} onOpenChange={() => activeTest === 'teprosif' && handleTestCancel()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>TEPROSIF-R</DialogTitle>
          </DialogHeader>
          <TEPROSIFTest
            patientName={selectedPatientData?.name || ''}
            patientAge=""
            onComplete={(results) => handleTestComplete(results)}
            onCancel={handleTestCancel}
          />
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}