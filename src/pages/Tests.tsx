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
import { Search, FileText, Clock, User, ChevronRight, Check, RefreshCw, X, AlertCircle } from "lucide-react";
import { tarSections, tarFrases } from "@/data/tests/tar";
import { useTestResults, TestResultFormData } from "@/hooks/useTestResults";
import { usePatients } from "@/hooks/usePatients";
import { MBGRTest, MMBGRLactantesTest, TARTest, TEPROSIFTest } from "@/components/tests";

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
  const [activeTest, setActiveTest] = useState<"mbgr" | "mmbgr-lactantes" | "tar" | "teprosif" | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [showPatientSelect, setShowPatientSelect] = useState(false);
  const [pendingTestType, setPendingTestType] = useState<"mbgr" | "mmbgr-lactantes" | "tar" | "teprosif" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTestDetail, setSelectedTestDetail] = useState<TestResult | null>(null);

  const { testResults, createTestResult } = useTestResults();
  const { patients } = usePatients();

  const selectedPatientData = patients.find(p => p.id === selectedPatient);

  const handleApplyTest = (testId: "mbgr" | "mmbgr-lactantes" | "tar" | "teprosif") => {
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
      test_name: activeTest === 'mbgr' ? 'MBGR' : activeTest === 'mmbgr-lactantes' ? 'MMBGR Lactantes' : activeTest === 'tar' ? 'TAR' : 'TEPROSIF-R',
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
                      
                      return <p className="text-muted-foreground">Test completado exitosamente</p>;
                    } catch {
                      return <p className="text-muted-foreground">Test completado exitosamente</p>;
                    }
                  })()}
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setSelectedTestDetail(null)}>Cerrar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}