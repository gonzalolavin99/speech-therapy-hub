import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";

interface SNAPIVTestProps {
  patientName: string;
  onComplete: (results: SNAPIVResults) => void;
  onCancel: () => void;
}

interface SNAPIVResults {
  responses: Record<number, number>;
  inattentionScore: number;
  hyperactivityScore: number;
  oddScore: number;
  inattentionAvg: number;
  hyperactivityAvg: number;
  oddAvg: number;
  screening: string;
}

// SNAP-IV 26 items (Swanson, Nolan, and Pelham - Teacher and Parent Rating Scale)
// Items 1-9: Inattention (DSM-IV criteria)
// Items 10-18: Hyperactivity/Impulsivity (DSM-IV criteria)
// Items 19-26: Oppositional Defiant Disorder (ODD)
const snapQuestions = [
  // Inattention (0-8)
  "No presta atención suficiente a los detalles o comete errores por descuido en las tareas",
  "Tiene dificultades para mantener la atención en tareas o actividades lúdicas",
  "Parece no escuchar cuando se le habla directamente",
  "No sigue instrucciones y no finaliza tareas escolares o encargos",
  "Tiene dificultades para organizar tareas y actividades",
  "Evita, le disgusta o es reacio(a) a dedicarse a tareas que requieren un esfuerzo mental sostenido",
  "Pierde objetos necesarios para tareas o actividades (juguetes, útiles, lápices, libros)",
  "Se distrae fácilmente por estímulos irrelevantes",
  "Es descuidado(a) en las actividades diarias",
  // Hyperactivity/Impulsivity (9-17)
  "Mueve en exceso manos o pies, o se remueve en su asiento",
  "Abandona su asiento en la clase o en otras situaciones en que se espera que permanezca sentado(a)",
  "Corre o salta excesivamente en situaciones en que es inapropiado hacerlo",
  "Tiene dificultades para jugar o dedicarse tranquilamente a actividades de ocio",
  "Está en marcha o suele actuar como si tuviera un motor",
  "Habla en exceso",
  "Precipita respuestas antes de que las preguntas hayan sido completadas",
  "Tiene dificultades para guardar turno",
  "Interrumpe o se inmiscuye en las actividades de otros (conversaciones, juegos)",
  // ODD (18-25)
  "Se encoleriza e incurre en pataletas",
  "Discute con adultos",
  "Desafía activamente a los adultos o rehúsa cumplir sus demandas",
  "Molesta deliberadamente a otras personas",
  "Acusa a otros de sus errores o mal comportamiento",
  "Es susceptible o fácilmente molestado(a) por otros",
  "Es colérico(a) y resentido(a)",
  "Es rencoroso(a) o vengativo(a)",
];

const subscaleLabels: Record<string, { name: string; items: number[]; cutoff: number }> = {
  inattention: { name: "Inatención", items: [0, 1, 2, 3, 4, 5, 6, 7, 8], cutoff: 1.44 },
  hyperactivity: { name: "Hiperactividad/Impulsividad", items: [9, 10, 11, 12, 13, 14, 15, 16, 17], cutoff: 1.44 },
  odd: { name: "Oposicionismo Desafiante (TOD)", items: [18, 19, 20, 21, 22, 23, 24, 25], cutoff: 1.88 },
};

const responseOptions = [
  { value: 0, label: "Nada", description: "No observado" },
  { value: 1, label: "Un poco", description: "Ocasionalmente" },
  { value: 2, label: "Bastante", description: "Con frecuencia" },
  { value: 3, label: "Mucho", description: "Muy frecuente" },
];

function getSubscaleScore(responses: Record<number, number>, items: number[]): number {
  return items.reduce((sum, i) => sum + (responses[i] ?? 0), 0);
}

function getSubscaleAvg(responses: Record<number, number>, items: number[]): number {
  const score = getSubscaleScore(responses, items);
  return score / items.length;
}

function getScreening(inattAvg: number, hyperAvg: number, oddAvg: number): string {
  const results: string[] = [];
  if (inattAvg >= 1.44) results.push("Inatención");
  if (hyperAvg >= 1.44) results.push("Hiperactividad/Impulsividad");
  if (oddAvg >= 1.88) results.push("Oposicionismo Desafiante");

  if (results.length === 0) return "Sin indicadores clínicos significativos";
  return `Indicadores elevados en: ${results.join(", ")}`;
}

function getAvgColor(avg: number, cutoff: number): string {
  if (avg >= cutoff) return "text-destructive";
  if (avg >= cutoff * 0.75) return "text-orange-600 dark:text-orange-400";
  return "text-success";
}

export function SNAPIVTest({ patientName, onComplete, onCancel }: SNAPIVTestProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<number, number>>({});

  const totalQuestions = snapQuestions.length;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;
  const allAnswered = Object.keys(responses).length === totalQuestions;

  const inattentionScore = getSubscaleScore(responses, subscaleLabels.inattention.items);
  const hyperactivityScore = getSubscaleScore(responses, subscaleLabels.hyperactivity.items);
  const oddScore = getSubscaleScore(responses, subscaleLabels.odd.items);
  const inattentionAvg = getSubscaleAvg(responses, subscaleLabels.inattention.items);
  const hyperactivityAvg = getSubscaleAvg(responses, subscaleLabels.hyperactivity.items);
  const oddAvg = getSubscaleAvg(responses, subscaleLabels.odd.items);

  // Determine which subscale current question belongs to
  const getCurrentSubscale = () => {
    if (currentIndex < 9) return "Inatención";
    if (currentIndex < 18) return "Hiperactividad/Impulsividad";
    return "Oposicionismo Desafiante";
  };

  const handleResponse = (value: number) => {
    setResponses((prev) => ({ ...prev, [currentIndex]: value }));
  };

  const handleComplete = () => {
    onComplete({
      responses,
      inattentionScore,
      hyperactivityScore,
      oddScore,
      inattentionAvg: Math.round(inattentionAvg * 100) / 100,
      hyperactivityAvg: Math.round(hyperactivityAvg * 100) / 100,
      oddAvg: Math.round(oddAvg * 100) / 100,
      screening: getScreening(inattentionAvg, hyperactivityAvg, oddAvg),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">SNAP-IV — TDAH Infantil</h2>
          <p className="text-sm text-muted-foreground">Paciente: {patientName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{getCurrentSubscale()} — Pregunta {currentIndex + 1} de {totalQuestions}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              currentIndex < 9 ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                : currentIndex < 18 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                  : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
            )}>
              {getCurrentSubscale()}
            </span>
          </div>
          <CardTitle className="text-base leading-relaxed">
            <span className="text-muted-foreground mr-2">{currentIndex + 1}.</span>
            {snapQuestions[currentIndex]}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Para cada ítem, indique el grado que mejor describe la conducta del niño/a:
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
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Inatención</p>
                <p className="text-xs text-muted-foreground">Promedio: {inattentionAvg.toFixed(2)} (corte: 1.44)</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-primary">{inattentionScore}/27</p>
                <p className={cn("text-xs font-medium", getAvgColor(inattentionAvg, 1.44))}>
                  {inattentionAvg >= 1.44 ? "Sobre punto de corte" : "Bajo punto de corte"}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Hiperactividad/Impulsividad</p>
                <p className="text-xs text-muted-foreground">Promedio: {hyperactivityAvg.toFixed(2)} (corte: 1.44)</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-primary">{hyperactivityScore}/27</p>
                <p className={cn("text-xs font-medium", getAvgColor(hyperactivityAvg, 1.44))}>
                  {hyperactivityAvg >= 1.44 ? "Sobre punto de corte" : "Bajo punto de corte"}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Oposicionismo Desafiante</p>
                <p className="text-xs text-muted-foreground">Promedio: {oddAvg.toFixed(2)} (corte: 1.88)</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-primary">{oddScore}/24</p>
                <p className={cn("text-xs font-medium", getAvgColor(oddAvg, 1.88))}>
                  {oddAvg >= 1.88 ? "Sobre punto de corte" : "Bajo punto de corte"}
                </p>
              </div>
            </div>
            <div className="border-t pt-3">
              <p className={cn("text-sm font-medium",
                (inattentionAvg >= 1.44 || hyperactivityAvg >= 1.44 || oddAvg >= 1.88)
                  ? "text-destructive" : "text-success"
              )}>
                {getScreening(inattentionAvg, hyperactivityAvg, oddAvg)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
