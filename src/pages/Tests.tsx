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
import { Search, FileText, Clock, User, ChevronRight, Check, RefreshCw, X, AlertCircle, Sparkles, Loader2, Brain, Target, Lightbulb, Stethoscope } from "lucide-react";
import { tarSections, tarFrases } from "@/data/tests/tar";
import { useTestResults, TestResultFormData } from "@/hooks/useTestResults";
import { usePatients } from "@/hooks/usePatients";
import { MBGRTest, MMBGRLactantesTest, TARTest, TEPROSIFTest, REEL3Test, PHQ9Test, GAD7Test, PSC17Test } from "@/components/tests";
import { analyzeTestResults, isAIConfigured, TestDiagnosisResult } from "@/lib/ai-service";
import { toast } from "sonner";
import { useProfession } from "@/contexts/ProfessionContext";

type TestId = "mbgr" | "mmbgr-lactantes" | "tar" | "teprosif" | "reel-3" | "phq-9" | "gad-7" | "psc-17";

const allAvailableTests: { id: TestId; name: string; fullName: string; description: string; duration: string; categories: string[] }[] = [
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
    id: "mmbgr-lactantes" as const,
    name: "MMBGR Lactantes",
    fullName: "Protocolo MMBGR - Examen Clínico Miofuncional Orofacial",
    description:
      "Evaluación miofuncional orofacial para lactantes y preescolares (6-71 meses)",
    duration: "25-35 min",
    categories: ["Motricidad Orofacial", "Lactantes"],
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
  {
    id: "reel-3" as const,
    name: "REEL-3",
    fullName: "Test de Lenguaje Emergente Receptivo Expresivo",
    description:
      "Evaluación de habilidades lingüísticas receptivas y expresivas en niños",
    duration: "20-30 min",
    categories: ["Lenguaje", "Desarrollo Temprano"],
  },
  // Psychology tests (public domain / open access)
  {
    id: "phq-9",
    name: "PHQ-9",
    fullName: "Patient Health Questionnaire-9",
    description:
      "Cuestionario de 9 ítems para screening y medición de severidad de depresión",
    duration: "5-10 min",
    categories: ["Depresión", "Screening"],
  },
  {
    id: "gad-7",
    name: "GAD-7",
    fullName: "Generalized Anxiety Disorder-7",
    description:
      "Escala de 7 ítems para screening y medición de severidad de ansiedad generalizada",
    duration: "5-10 min",
    categories: ["Ansiedad", "Screening"],
  },
  {
    id: "psc-17",
    name: "PSC-17",
    fullName: "Pediatric Symptom Checklist-17",
    description:
      "Checklist abreviado de 17 ítems para screening psicosocial pediátrico",
    duration: "5-10 min",
    categories: ["Pediátrico", "Screening", "Psicosocial"],
  },
];

interface TestResult {
  id: string;
  test_name: string;
  test_type: string;
  patient_name?: string;
  evaluation_date: string;
  score: string | null;
  status: string;
  results_data?: any;
}

export default function Tests() {
  const [activeTest, setActiveTest] = useState<TestId | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [showPatientSelect, setShowPatientSelect] = useState(false);
  const [pendingTestType, setPendingTestType] = useState<TestId | null>(null);
  const { config: profConfig } = useProfession();

  const availableTests = allAvailableTests.filter(t => profConfig.availableTestIds.includes(t.id));

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTestDetail, setSelectedTestDetail] = useState<TestResult | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<TestDiagnosisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { testResults, createTestResult } = useTestResults();
  const { patients } = usePatients();

  const selectedPatientData = patients.find(p => p.id === selectedPatient);

  const handleApplyTest = (testId: TestId) => {
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
      test_name: allAvailableTests.find(t => t.id === activeTest)?.name || activeTest!,
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
          <div className="bg-card rounded-xl border overflow-x-auto">
            <table className="w-full min-w-[640px]">
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
                {filteredTests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center">
                      <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="text-sm font-medium text-muted-foreground">No hay evaluaciones registradas</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">Aplica un test desde las opciones de arriba para comenzar</p>
                    </td>
                  </tr>
                )}
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
                        Completado
                      </span>
                    </td>
                    <td className="p-4">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedTestDetail(test as any)}
                      >
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

      <Dialog open={activeTest === 'mmbgr-lactantes'} onOpenChange={() => activeTest === 'mmbgr-lactantes' && handleTestCancel()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Protocolo MMBGR - Lactantes</DialogTitle>
          </DialogHeader>
          <MMBGRLactantesTest
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

      <Dialog open={activeTest === 'reel-3'} onOpenChange={() => activeTest === 'reel-3' && handleTestCancel()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>REEL-3</DialogTitle>
          </DialogHeader>
          <REEL3Test
            patientName={selectedPatientData?.name || ''}
            onComplete={(results, score) => handleTestComplete({ results, score })}
            onCancel={handleTestCancel}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={activeTest === 'phq-9'} onOpenChange={() => activeTest === 'phq-9' && handleTestCancel()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>PHQ-9</DialogTitle>
          </DialogHeader>
          <PHQ9Test
            patientName={selectedPatientData?.name || ''}
            onComplete={(results) => handleTestComplete(results)}
            onCancel={handleTestCancel}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={activeTest === 'gad-7'} onOpenChange={() => activeTest === 'gad-7' && handleTestCancel()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>GAD-7</DialogTitle>
          </DialogHeader>
          <GAD7Test
            patientName={selectedPatientData?.name || ''}
            onComplete={(results) => handleTestComplete(results)}
            onCancel={handleTestCancel}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={activeTest === 'psc-17'} onOpenChange={() => activeTest === 'psc-17' && handleTestCancel()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>PSC-17</DialogTitle>
          </DialogHeader>
          <PSC17Test
            patientName={selectedPatientData?.name || ''}
            onComplete={(results) => handleTestComplete(results)}
            onCancel={handleTestCancel}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedTestDetail} onOpenChange={() => setSelectedTestDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Test - {selectedTestDetail?.test_name}</DialogTitle>
          </DialogHeader>
          {selectedTestDetail && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Paciente</p>
                  <p className="font-medium">{selectedTestDetail.patient_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha</p>
                  <p className="font-medium">{selectedTestDetail.evaluation_date}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Test</p>
                  <p className="font-medium">{selectedTestDetail.test_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <span className="px-2 py-1 bg-success/10 text-success rounded-full text-sm">Completado</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-3">Resultados Detallados</p>
                <div className="space-y-4">
                  {(() => {
                    try {
                      const parsed = JSON.parse(selectedTestDetail.score || '{}');
                      
                      if (selectedTestDetail.test_type === 'mbgr' || selectedTestDetail.test_type === 'mmbgr-lactantes') {
                        const isLactantes = selectedTestDetail.test_type === 'mmbgr-lactantes';
                        const { results, score } = parsed;
                        return (
                          <div className="space-y-3 bg-muted rounded-lg p-4 max-h-[400px] overflow-y-auto">
                            <div className="flex items-center justify-between bg-primary/10 rounded-lg p-3">
                              <div>
                                <span className="font-medium">Puntaje Total</span>
                                {isLactantes && <span className="text-xs text-muted-foreground ml-2">(menor = mejor)</span>}
                              </div>
                              <span className="text-lg font-bold text-primary">{score || 0} puntos</span>
                            </div>
                            {results && Object.entries(results).length > 0 && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium">Respuestas ({Object.keys(results).length} items):</p>
                                <div className="grid gap-2">
                                  {Object.entries(results).map(([key, value]) => (
                                    <div key={key} className="flex justify-between text-sm bg-background rounded p-2">
                                      <span className="text-muted-foreground">{key}</span>
                                      <span className="font-medium">{String(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      if (selectedTestDetail.test_type === 'tar') {
                        const { palabras, frases, summary, sectionObservations } = parsed;
                        const responseConfig: Record<string, { text: string; color: string; icon: React.ReactNode }> = {
                          C: { text: 'Correcto', color: 'text-success', icon: <Check className="h-3 w-3" /> },
                          S: { text: 'Sustitución', color: 'text-warning', icon: <RefreshCw className="h-3 w-3" /> },
                          O: { text: 'Omisión', color: 'text-destructive', icon: <X className="h-3 w-3" /> },
                          D: { text: 'Distorsión', color: 'text-blue-500', icon: <AlertCircle className="h-3 w-3" /> },
                        };
                        const getWordById = (id: string) => {
                          for (const section of tarSections) {
                            const item = section.items.find(i => i.id === id);
                            if (item) return { word: item.word, section: section.name, column: item.column };
                          }
                          return null;
                        };
                        const groupedBySection: Record<string, { name: string; items: Array<{ id: string; word: string; column: string; response: string }> }> = {};
                        if (palabras) {
                          Object.entries(palabras).forEach(([id, data]: [string, any]) => {
                            const wordInfo = getWordById(id);
                            if (wordInfo) {
                              if (!groupedBySection[wordInfo.section]) {
                                groupedBySection[wordInfo.section] = { name: wordInfo.section, items: [] };
                              }
                              groupedBySection[wordInfo.section].items.push({ id, word: data.word || wordInfo.word, column: data.column || wordInfo.column, response: data.response });
                            }
                          });
                        }
                        return (
                          <div className="space-y-4">
                            {summary && (
                              <div className="bg-primary/10 rounded-lg p-3">
                                <p className="font-medium mb-2">Resumen General</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                                  <div className="flex items-center gap-1"><Check className="h-3 w-3 text-success" /> <span className="font-medium text-success">{summary.correct || 0}</span></div>
                                  <div className="flex items-center gap-1"><RefreshCw className="h-3 w-3 text-warning" /> <span className="font-medium text-warning">{summary.substitutions || 0}</span></div>
                                  <div className="flex items-center gap-1"><X className="h-3 w-3 text-destructive" /> <span className="font-medium text-destructive">{summary.omissions || 0}</span></div>
                                  <div className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-blue-500" /> <span className="font-medium text-blue-500">{summary.distortions || 0}</span></div>
                                </div>
                              </div>
                            )}
                            {Object.keys(groupedBySection).length > 0 && (
                              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                                {Object.values(groupedBySection).map((section) => (
                                  <div key={section.name} className="border rounded-lg overflow-hidden">
                                    <div className="bg-muted px-3 py-2 font-medium text-sm">{section.name}</div>
                                    <div className="divide-y">
                                      {section.items.map((item) => {
                                        const config = responseConfig[item.response];
                                        return (
                                          <div key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                                            <div><span className="font-medium">{item.word}</span><span className="text-xs text-muted-foreground ml-2 capitalize">({item.column})</span></div>
                                            <span className={`flex items-center gap-1 text-xs font-medium ${config?.color || 'text-muted-foreground'}`}>{config?.icon}{config?.text || 'Sin respuesta'}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {frases && Object.keys(frases).length > 0 && (
                              <div className="border rounded-lg overflow-hidden">
                                <div className="bg-muted px-3 py-2 font-medium text-sm">Repetición de Frases</div>
                                <div className="divide-y">
                                  {tarFrases.map((frase) => (
                                    <div key={frase.id} className="px-3 py-2 text-sm">
                                      <p className="text-muted-foreground text-xs mb-1">"{frase.text}"</p>
                                      <p className="font-medium">{frases[frase.id] || '-'}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {sectionObservations && Object.keys(sectionObservations).filter(k => sectionObservations[k]).length > 0 && (
                              <div className="border rounded-lg overflow-hidden">
                                <div className="bg-muted px-3 py-2 font-medium text-sm">Observaciones Clínicas</div>
                                <div className="divide-y">
                                  {Object.entries(sectionObservations).map(([section, obs]: [string, any]) => obs && (
                                    <div key={section} className="px-3 py-2 text-sm"><span className="font-medium capitalize">{section}:</span><p className="text-muted-foreground mt-1">{obs}</p></div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      if (selectedTestDetail.test_type === 'teprosif') {
                        const { responses, summary } = parsed;
                        return (
                          <div className="space-y-4 bg-muted rounded-lg p-4 max-h-[400px] overflow-y-auto">
                            {summary && (
                              <div className="bg-primary/10 rounded-lg p-3">
                                <p className="font-medium mb-2">Resumen de Procesos</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div><span className="text-muted-foreground">Total PSF:</span> <span className="font-medium">{summary.totalPSF || 0}</span></div>
                                  <div><span className="text-muted-foreground">Items evaluados:</span> <span className="font-medium">{summary.itemsEvaluated || 0}</span></div>
                                </div>
                              </div>
                            )}
                            {responses && Object.keys(responses).length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-2">Respuestas ({Object.keys(responses).length} items)</p>
                                <div className="grid gap-1 text-xs max-h-[200px] overflow-y-auto">
                                  {Object.entries(responses).map(([idx, data]: [string, any]) => (
                                    <div key={idx} className="flex justify-between bg-background rounded p-2">
                                      <span>{data.targetWord || `Item ${idx}`}</span>
                                      <span className="text-muted-foreground">{data.childResponse || '-'}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      if (selectedTestDetail.test_type === 'reel-3') {
                        const { score, rawScores, scores: testScores, patientInfo } = parsed;
                        return (
                          <div className="space-y-4 bg-muted rounded-lg p-4 max-h-[400px] overflow-y-auto">
                            <div className="flex items-center justify-between bg-primary/10 rounded-lg p-3">
                              <span className="font-medium">Puntaje Total</span>
                              <span className="text-lg font-bold text-primary">{score || (rawScores?.expresivo + rawScores?.receptivo) || 0} puntos</span>
                            </div>
                            {rawScores && (
                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-lg border bg-background">
                                  <p className="text-sm text-muted-foreground">Lenguaje Receptivo</p>
                                  <p className="text-xl font-bold text-primary">{rawScores.receptivo || 0}</p>
                                </div>
                                <div className="p-3 rounded-lg border bg-background">
                                  <p className="text-sm text-muted-foreground">Lenguaje Expresivo</p>
                                  <p className="text-xl font-bold text-primary">{rawScores.expresivo || 0}</p>
                                </div>
                              </div>
                            )}
                            {testScores && (testScores.receptivo?.percentil || testScores.expresivo?.percentil) && (
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                {testScores.receptivo?.percentil && (
                                  <div className="flex justify-between"><span className="text-muted-foreground">Percentil Receptivo:</span><span className="font-medium">{testScores.receptivo.percentil}</span></div>
                                )}
                                {testScores.expresivo?.percentil && (
                                  <div className="flex justify-between"><span className="text-muted-foreground">Percentil Expresivo:</span><span className="font-medium">{testScores.expresivo.percentil}</span></div>
                                )}
                              </div>
                            )}
                            {patientInfo?.edadEnMeses && (
                              <div className="text-xs text-muted-foreground">Edad: {patientInfo.edadEnMeses} meses</div>
                            )}
                          </div>
                        );
                      }
                      
                      return <p className="text-muted-foreground">Test completado exitosamente</p>;
                    } catch {
                      return <p className="text-muted-foreground">Test completado exitosamente</p>;
                    }
                  })()}
                </div>
              </div>
              {/* AI Analysis Section */}
              {isAIConfigured() && (
                <div className="border-t pt-4">
                  {!aiAnalysis && !isAnalyzing && (
                    <Button
                      onClick={async () => {
                        setIsAnalyzing(true);
                        try {
                          const parsed = JSON.parse(selectedTestDetail.score || '{}');
                          const patient = patients.find(p => p.name === selectedTestDetail.patient_name);
                          const result = await analyzeTestResults(
                            selectedTestDetail.test_type,
                            selectedTestDetail.test_name,
                            selectedTestDetail.patient_name || '',
                            patient?.age,
                            patient?.diagnosis,
                            parsed
                          );
                          setAiAnalysis(result);
                        } catch (err: any) {
                          toast.error('Error al analizar con IA', { description: err.message });
                        } finally {
                          setIsAnalyzing(false);
                        }
                      }}
                      className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analizar con IA
                    </Button>
                  )}

                  {isAnalyzing && (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <div className="relative">
                        <Brain className="h-8 w-8 text-violet-500 animate-pulse" />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analizando resultados...
                      </div>
                    </div>
                  )}

                  {aiAnalysis && (
                    <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-400">
                        <Sparkles className="h-4 w-4" />
                        Análisis IA
                      </div>

                      {/* Possible Diagnoses */}
                      {aiAnalysis.possibleDiagnoses.length > 0 && (
                        <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Stethoscope className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                            <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">Posibles Diagnósticos</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {aiAnalysis.possibleDiagnoses.map((d, i) => (
                              <span key={i} className="px-3 py-1 bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 rounded-full text-xs font-medium">
                                {d}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Clinical Analysis */}
                      {aiAnalysis.clinicalAnalysis && (
                        <div className="rounded-lg border p-4 bg-card">
                          <div className="flex items-center gap-2 mb-2">
                            <Brain className="h-4 w-4 text-primary" />
                            <p className="text-sm font-semibold">Análisis Clínico</p>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{aiAnalysis.clinicalAnalysis}</p>
                        </div>
                      )}

                      {/* Priority Areas */}
                      {aiAnalysis.priorityAreas.length > 0 && (
                        <div className="rounded-lg border p-4 bg-card">
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="h-4 w-4 text-destructive" />
                            <p className="text-sm font-semibold">Áreas Prioritarias</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {aiAnalysis.priorityAreas.map((a, i) => (
                              <span key={i} className="px-3 py-1 bg-destructive/10 text-destructive rounded-full text-xs font-medium">{a}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Therapy Suggestions */}
                      {aiAnalysis.therapySuggestions.length > 0 && (
                        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Sugerencias de Terapia</p>
                          </div>
                          <ul className="space-y-1.5">
                            {aiAnalysis.therapySuggestions.map((s, i) => (
                              <li key={i} className="text-sm text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                                <span className="text-emerald-500 mt-1">•</span>
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommended Approach */}
                      {aiAnalysis.recommendedApproach && (
                        <div className="rounded-lg border p-4 bg-card">
                          <p className="text-sm font-semibold mb-1">Enfoque Recomendado</p>
                          <p className="text-sm text-muted-foreground">{aiAnalysis.recommendedApproach}</p>
                        </div>
                      )}

                      {/* Additional Recommendations */}
                      {aiAnalysis.additionalRecommendations && (
                        <div className="rounded-lg border p-4 bg-card">
                          <p className="text-sm font-semibold mb-1">Recomendaciones Adicionales</p>
                          <p className="text-sm text-muted-foreground">{aiAnalysis.additionalRecommendations}</p>
                        </div>
                      )}

                      <p className="text-[10px] text-muted-foreground italic text-center">
                        Sugerencia generada por IA. Debe ser validada por el profesional fonoaudiólogo.
                      </p>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAiAnalysis(null)}
                        className="w-full"
                      >
                        <RefreshCw className="h-3 w-3 mr-2" />
                        Volver a analizar
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => { setSelectedTestDetail(null); setAiAnalysis(null); }}>Cerrar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}