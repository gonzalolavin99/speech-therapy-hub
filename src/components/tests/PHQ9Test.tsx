import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";

interface PHQ9TestProps {
  patientName: string;
  onComplete: (results: PHQ9Results) => void;
  onCancel: () => void;
}

interface PHQ9Results {
  responses: Record<number, number>;
  totalScore: number;
  severity: string;
}

const phq9Questions = [
  "Poco interés o placer en hacer cosas",
  "Se ha sentido decaído(a), deprimido(a) o sin esperanzas",
  "Dificultad para quedarse o permanecer dormido(a), o dormir demasiado",
  "Se ha sentido cansado(a) o con poca energía",
  "Sin apetito o ha comido en exceso",
  "Se ha sentido mal con usted mismo(a) — o que es un fracaso o que ha quedado mal con usted mismo(a) o con su familia",
  "Dificultad para concentrarse en cosas, como leer el diario o ver televisión",
  "¿Se ha movido o hablado tan lento que otras personas podrían haberlo notado? O lo contrario — Loss ha estado tan inquieto(a) o agitado(a) que se ha estado moviendo mucho más de lo normal",
  "Pensamientos de que estaría mejor muerto(a) o de hacerse daño de alguna manera",
];

const responseOptions = [
  { value: 0, label: "Nunca", description: "Ningún día" },
  { value: 1, label: "Varios días", description: "Menos de la mitad" },
  { value: 2, label: "Más de la mitad", description: "De los días" },
  { value: 3, label: "Casi todos los días", description: "Todos o casi todos" },
];

function getSeverity(score: number): string {
  if (score <= 4) return "Mínima";
  if (score <= 9) return "Leve";
  if (score <= 14) return "Moderada";
  if (score <= 19) return "Moderadamente severa";
  return "Severa";
}

function getSeverityColor(score: number): string {
  if (score <= 4) return "text-success";
  if (score <= 9) return "text-yellow-600 dark:text-yellow-400";
  if (score <= 14) return "text-orange-600 dark:text-orange-400";
  return "text-destructive";
}

export function PHQ9Test({ patientName, onComplete, onCancel }: PHQ9TestProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<number, number>>({});

  const totalQuestions = phq9Questions.length;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;
  const allAnswered = Object.keys(responses).length === totalQuestions;
  const totalScore = Object.values(responses).reduce((sum, v) => sum + v, 0);

  const handleResponse = (value: number) => {
    setResponses((prev) => ({ ...prev, [currentIndex]: value }));
  };

  const handleComplete = () => {
    const severity = getSeverity(totalScore);
    onComplete({ responses, totalScore, severity });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">PHQ-9 — Depresión</h2>
          <p className="text-sm text-muted-foreground">Paciente: {patientName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Pregunta {currentIndex + 1} de {totalQuestions}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base leading-relaxed">
            <span className="text-muted-foreground mr-2">{currentIndex + 1}.</span>
            {phq9Questions[currentIndex]}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Durante las últimas 2 semanas, ¿con qué frecuencia le han molestado los siguientes problemas?
          </p>
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
              <div>
                <p className="font-medium text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </div>
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
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Puntaje Total</p>
                <p className="text-sm text-muted-foreground">Severidad de depresión</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{totalScore}/27</p>
                <p className={cn("text-sm font-medium", getSeverityColor(totalScore))}>
                  {getSeverity(totalScore)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
