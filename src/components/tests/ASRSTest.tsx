import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";

interface ASRSTestProps {
  patientName: string;
  onComplete: (results: ASRSResults) => void;
  onCancel: () => void;
}

interface ASRSResults {
  responses: Record<number, number>;
  partAScore: number;
  partBScore: number;
  totalScore: number;
  screening: string;
}

// ASRS v1.1 - Adult ADHD Self-Report Scale (WHO)
// Part A: 6 screener items, Part B: 12 supplementary items
const asrsQuestions = [
  // Part A (0-5) — Screening
  "¿Con qué frecuencia tiene dificultad para finalizar los detalles de un proyecto, una vez que las partes más difíciles ya están hechas?",
  "¿Con qué frecuencia tiene dificultad para poner las cosas en orden cuando tiene que realizar una tarea que requiere organización?",
  "¿Con qué frecuencia tiene problemas para recordar citas u obligaciones?",
  "Cuando tiene una tarea que requiere mucha concentración, ¿con qué frecuencia evita o retrasa empezarla?",
  "¿Con qué frecuencia mueve o retuerce las manos o los pies cuando tiene que permanecer sentado(a) mucho tiempo?",
  "¿Con qué frecuencia se siente excesivamente activo(a) o con la necesidad de hacer cosas, como si lo impulsara un motor?",
  // Part B (6-17) — Supplementary
  "¿Con qué frecuencia comete errores por descuido cuando trabaja en algo aburrido o difícil?",
  "¿Con qué frecuencia tiene dificultad para mantener la atención cuando realiza trabajo aburrido o repetitivo?",
  "¿Con qué frecuencia tiene dificultad para concentrarse en lo que la gente le dice, aun cuando le están hablando directamente?",
  "¿Con qué frecuencia pierde o extravía cosas en la casa o en el trabajo?",
  "¿Con qué frecuencia se distrae con actividades o ruido a su alrededor?",
  "¿Con qué frecuencia se levanta de su asiento en reuniones u otras situaciones en las que se espera que permanezca sentado(a)?",
  "¿Con qué frecuencia se siente inquieto(a) o nervioso(a)?",
  "¿Con qué frecuencia tiene dificultad para relajarse cuando tiene tiempo libre?",
  "¿Con qué frecuencia se encuentra a sí mismo(a) hablando demasiado en situaciones sociales?",
  "Cuando está en una conversación, ¿con qué frecuencia se da cuenta de que termina las frases de las personas antes de que ellas puedan terminar?",
  "¿Con qué frecuencia tiene dificultad para esperar su turno en situaciones en las que se requiere?",
  "¿Con qué frecuencia interrumpe a otros cuando están ocupados?",
];

const responseOptions = [
  { value: 0, label: "Nunca" },
  { value: 1, label: "Rara vez" },
  { value: 2, label: "A veces" },
  { value: 3, label: "A menudo" },
  { value: 4, label: "Muy a menudo" },
];

// Screening thresholds for Part A (items 0-5)
// Items 0-3: score ≥ 2 is "clinically significant"
// Items 4-5: score ≥ 3 is "clinically significant"
function getPartASignificantCount(responses: Record<number, number>): number {
  let count = 0;
  for (let i = 0; i < 4; i++) {
    if ((responses[i] ?? 0) >= 2) count++;
  }
  for (let i = 4; i < 6; i++) {
    if ((responses[i] ?? 0) >= 3) count++;
  }
  return count;
}

function getScreeningResult(significantCount: number): string {
  if (significantCount >= 4) return "Altamente consistente con TDAH en adultos";
  if (significantCount >= 2) return "Posible TDAH — se recomienda evaluación completa";
  return "No sugestivo de TDAH";
}

function getScreeningColor(significantCount: number): string {
  if (significantCount >= 4) return "text-destructive";
  if (significantCount >= 2) return "text-orange-600 dark:text-orange-400";
  return "text-success";
}

export function ASRSTest({ patientName, onComplete, onCancel }: ASRSTestProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<number, number>>({});

  const totalQuestions = asrsQuestions.length;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;
  const allAnswered = Object.keys(responses).length === totalQuestions;

  const partAScore = Array.from({ length: 6 }, (_, i) => responses[i] ?? 0).reduce((a, b) => a + b, 0);
  const partBScore = Array.from({ length: 12 }, (_, i) => responses[i + 6] ?? 0).reduce((a, b) => a + b, 0);
  const totalScore = partAScore + partBScore;
  const significantCount = getPartASignificantCount(responses);

  const isPartA = currentIndex < 6;

  const handleResponse = (value: number) => {
    setResponses((prev) => ({ ...prev, [currentIndex]: value }));
  };

  const handleComplete = () => {
    onComplete({
      responses,
      partAScore,
      partBScore,
      totalScore,
      screening: getScreeningResult(significantCount),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">ASRS v1.1 — TDAH Adultos</h2>
          <p className="text-sm text-muted-foreground">Paciente: {patientName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {isPartA ? "Parte A (Screening)" : "Parte B (Suplementario)"} — Pregunta {currentIndex + 1} de {totalQuestions}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              isPartA ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              {isPartA ? "Parte A" : "Parte B"}
            </span>
          </div>
          <CardTitle className="text-base leading-relaxed">
            <span className="text-muted-foreground mr-2">{currentIndex + 1}.</span>
            {asrsQuestions[currentIndex]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {responseOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleResponse(opt.value)}
              className={cn(
                "w-full flex items-center justify-between rounded-lg border-2 p-3 text-left transition-all",
                responses[currentIndex] === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              )}
            >
              <p className="font-medium text-sm">{opt.label}</p>
              <span className={cn(
                "text-lg font-bold",
                responses[currentIndex] === opt.value ? "text-primary" : "text-muted-foreground/40"
              )}>{opt.value}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>

        {currentIndex < totalQuestions - 1 ? (
          <Button
            onClick={() => setCurrentIndex((i) => i + 1)}
            disabled={responses[currentIndex] === undefined}
          >
            Siguiente <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleComplete} disabled={!allAnswered}>
            <Save className="h-4 w-4 mr-1" /> Finalizar
          </Button>
        )}
      </div>

      {allAnswered && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Parte A (Screening)</p>
                <p className="text-xs text-muted-foreground">{significantCount} de 6 ítems clínicamente significativos</p>
              </div>
              <p className="text-xl font-bold text-primary">{partAScore}/24</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Parte B (Suplementario)</p>
              </div>
              <p className="text-xl font-bold text-primary">{partBScore}/48</p>
            </div>
            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">Resultado Screening</p>
                <p className="text-lg font-bold text-primary">{totalScore}/72</p>
              </div>
              <p className={cn("text-sm font-medium mt-1", getScreeningColor(significantCount))}>
                {getScreeningResult(significantCount)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
