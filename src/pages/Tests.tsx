import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText, Clock, User, ChevronRight } from "lucide-react";
import { TestFormDialog } from "@/components/forms/TestFormDialog";

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
    name: "TAR",
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

const mockPatients = [
  { id: "1", name: "María García Pérez" },
  { id: "2", name: "Juan Pablo Rodríguez" },
  { id: "3", name: "Ana María López" },
  { id: "4", name: "Carlos Andrés Martínez" },
  { id: "5", name: "Laura Fernanda Silva" },
];

interface TestResult {
  id: string;
  testName: string;
  patientName: string;
  date: string;
  status: string;
  score: string;
}

const initialTests: TestResult[] = [
  {
    id: "1",
    testName: "TEPROSIF-R",
    patientName: "María García",
    date: "02/02/2026",
    status: "completed",
    score: "85%",
  },
  {
    id: "2",
    testName: "MBGR",
    patientName: "Juan Rodríguez",
    date: "01/02/2026",
    status: "completed",
    score: "Leve alteración",
  },
  {
    id: "3",
    testName: "TAR",
    patientName: "Ana López",
    date: "30/01/2026",
    status: "completed",
    score: "Normal",
  },
];

export default function Tests() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTestType, setSelectedTestType] = useState<"mbgr" | "tar" | "teprosif">("mbgr");
  const [tests, setTests] = useState<TestResult[]>(initialTests);
  const [searchQuery, setSearchQuery] = useState("");

  const handleApplyTest = (testId: "mbgr" | "tar" | "teprosif") => {
    setSelectedTestType(testId);
    setIsFormOpen(true);
  };

  const handleTestSubmit = (data: any) => {
    const patient = mockPatients.find((p) => p.id === data.patientId);
    const newTest: TestResult = {
      id: Date.now().toString(),
      testName: selectedTestType.toUpperCase(),
      patientName: patient?.name || "Paciente",
      date: new Date(data.evaluationDate).toLocaleDateString("es-CL"),
      status: "completed",
      score: "Pendiente análisis",
    };
    setTests([newTest, ...tests]);
  };

  const filteredTests = tests.filter(
    (test) =>
      test.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.testName.toLowerCase().includes(searchQuery.toLowerCase())
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
                          {test.testName}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-card-foreground">{test.patientName}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{test.date}</td>
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

      <TestFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleTestSubmit}
        patients={mockPatients}
        testType={selectedTestType}
      />
    </AppLayout>
  );
}