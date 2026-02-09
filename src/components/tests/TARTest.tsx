import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { tarSections, tarFrases, TARSection } from "@/data/tests/tar";
import { ChevronLeft, ChevronRight, Save, Check, X, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ResponseType = 'C' | 'S' | 'O' | 'D' | null;

interface TARTestProps {
  patientName: string;
  onComplete: (results: TARResults) => void;
  onCancel: () => void;
}

interface TARResults {
  palabras: Record<string, { response: ResponseType; observation?: string; word: string; column: string }>;
  frases: Record<string, string>;
  summary: TARSummary;
  sectionObservations: Record<string, string>;
}

interface TARSummary {
  total: number;
  correct: number;
  substitutions: number;
  omissions: number;
  distortions: number;
  errorsBySection: Record<string, { errors: number; total: number }>;
}

const responseLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  C: { label: 'Correcto', icon: <Check className="h-4 w-4" />, color: 'bg-success text-success-foreground' },
  S: { label: 'Sustitución', icon: <RefreshCw className="h-4 w-4" />, color: 'bg-warning text-warning-foreground' },
  O: { label: 'Omisión', icon: <X className="h-4 w-4" />, color: 'bg-destructive text-destructive-foreground' },
  D: { label: 'Distorsión', icon: <AlertCircle className="h-4 w-4" />, color: 'bg-info text-info-foreground' },
};

const columnLabels: Record<string, string> = {
  inicial: 'Inicial',
  media: 'Media',
  final: 'Final',
  trabada: 'Trabada',
};

export function TARTest({ patientName, onComplete, onCancel }: TARTestProps) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'palabras' | 'frases'>('palabras');
  const [palabrasResponses, setPalabrasResponses] = useState<Record<string, { response: ResponseType; observation?: string; word: string; column: string }>>({});
  const [frasesResponses, setFrasesResponses] = useState<Record<string, string>>({});
  const [sectionObservations, setSectionObservations] = useState<Record<string, string>>({});

  const currentSection = tarSections[currentSectionIndex];
  const totalSections = tarSections.length;
  const progress = ((currentSectionIndex + 1) / totalSections) * 100;

  const handlePalabraResponse = (itemId: string, response: ResponseType, word: string, column: string) => {
    setPalabrasResponses((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], response, word, column },
    }));
  };

  const handleSectionObservation = (sectionId: string, value: string) => {
    setSectionObservations((prev) => ({ ...prev, [sectionId]: value }));
  };

  const handleFraseResponse = (fraseId: string, value: string) => {
    setFrasesResponses((prev) => ({ ...prev, [fraseId]: value }));
  };

  const goToNextSection = () => {
    if (currentSectionIndex < totalSections - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
    }
  };

  const goToPreviousSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
    }
  };

  const calculateSummary = (): TARSummary => {
    const allItems = tarSections.flatMap(s => s.items);
    const summary: TARSummary = {
      total: allItems.length,
      correct: 0,
      substitutions: 0,
      omissions: 0,
      distortions: 0,
      errorsBySection: {},
    };

    tarSections.forEach((section) => {
      summary.errorsBySection[section.id] = { errors: 0, total: section.items.length };
      
      section.items.forEach((item) => {
        const response = palabrasResponses[item.id]?.response;
        switch (response) {
          case 'C':
            summary.correct++;
            break;
          case 'S':
            summary.substitutions++;
            summary.errorsBySection[section.id].errors++;
            break;
          case 'O':
            summary.omissions++;
            summary.errorsBySection[section.id].errors++;
            break;
          case 'D':
            summary.distortions++;
            summary.errorsBySection[section.id].errors++;
            break;
        }
      });
    });

    return summary;
  };

  const handleFinish = () => {
    const summary = calculateSummary();
    onComplete({ palabras: palabrasResponses, frases: frasesResponses, summary, sectionObservations });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">TAR Abreviado</h2>
          <p className="text-sm text-muted-foreground">Paciente: {patientName}</p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'palabras' | 'frases')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="palabras">Palabras</TabsTrigger>
          <TabsTrigger value="frases">Frases</TabsTrigger>
        </TabsList>

        <TabsContent value="palabras" className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Sección {currentSectionIndex + 1} de {totalSections}: {currentSection.name}
              </span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="bg-muted/50 rounded-lg p-3 border mb-4">
            <p className="font-medium mb-2 text-sm">Simbología de respuestas</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 rounded bg-success/10">
                <Check className="h-3 w-3 text-success" />
                <div><span className="font-medium text-success">Correcto</span><p className="text-muted-foreground">Fonema bien producido</p></div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-warning/10">
                <RefreshCw className="h-3 w-3 text-warning" />
                <div><span className="font-medium text-warning">Sustitución</span><p className="text-muted-foreground">Reemplazó por otro</p></div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-destructive/10">
                <X className="h-3 w-3 text-destructive" />
                <div><span className="font-medium text-destructive">Omisión</span><p className="text-muted-foreground">No lo produjo</p></div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-blue-500/10">
                <AlertCircle className="h-3 w-3 text-blue-500" />
                <div><span className="font-medium text-blue-500">Distorsión</span><p className="text-muted-foreground">Producción imprecisa</p></div>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{currentSection.name}</CardTitle>
                <Badge variant="outline">{currentSection.category}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentSection.items.map((item) => {
                  const currentResponse = palabrasResponses[item.id]?.response;
                  return (
                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border">
                      <div className="flex-1">
                        <p className="font-medium text-lg">{item.word}</p>
                        <p className="text-xs text-muted-foreground">{columnLabels[item.column]}</p>
                      </div>
                      <div className="grid grid-cols-4 gap-1 sm:flex">
                        {(['C', 'S', 'O', 'D'] as ResponseType[]).map((type) => {
                          if (!type) return null;
                          const { label, icon, color } = responseLabels[type];
                          return (
                            <Button
                              key={type}
                              variant="outline"
                              size="sm"
                              className={cn(
                                "h-auto py-2 px-2 flex flex-col items-center gap-1",
                                currentResponse === type && color
                              )}
                              onClick={() => handlePalabraResponse(item.id, type, item.word, item.column)}
                            >
                              {icon}
                              <span className="text-[10px] font-normal">{label.slice(0, 4)}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6 pt-4 border-t">
                <Label className="text-sm font-medium">Observaciones de la sección</Label>
                <textarea
                  className="mt-2 w-full min-h-[80px] p-3 text-sm rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Anotar comportamiento, actitud, dificultades observadas..."
                  value={sectionObservations[currentSection.id] || ''}
                  onChange={(e) => handleSectionObservation(currentSection.id, e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={goToPreviousSection} disabled={currentSectionIndex === 0}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>
            {currentSectionIndex === totalSections - 1 ? (
              <Button onClick={() => setActiveTab('frases')}>
                Ir a Frases
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={goToNextSection}>
                Siguiente
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="frases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Repetición de Frases</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tarFrases.map((frase, idx) => (
                <div key={frase.id} className="space-y-2 p-3 rounded-lg border">
                  <Label className="font-medium">{idx + 1}. {frase.text}</Label>
                  <Input
                    value={frasesResponses[frase.id] || ''}
                    onChange={(e) => handleFraseResponse(frase.id, e.target.value)}
                    placeholder="Transcribir producción del niño..."
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setActiveTab('palabras')}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Volver a Palabras
            </Button>
            <Button onClick={handleFinish}>
              <Save className="h-4 w-4 mr-2" />
              Finalizar Test
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
