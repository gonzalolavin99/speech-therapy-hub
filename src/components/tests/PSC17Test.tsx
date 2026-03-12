import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";

interface PSC17TestProps {
  patientName: string;
  onComplete: (results: PSC17Results) => void;
  onCancel: () => void;
}

interface PSC17Results {
  responses: Record<number, number>;
  totalScore: number;
  subscales: {
    internalizing: number;
    externalizing: number;
    attention: number;
  };
  screening: string;
}

// PSC-17 items grouped by subscale
// Internalizing: 1,2,3,4,5 | Attention: 6,7,8,9,10 | Externalizing: 11,12,13,14,15,16,17
const psc17Questions = [
  // Internalizing (items 0-4)
  "Se siente triste, infeliz",
  "Se siente sin esperanzas",
  "Está decaído(a)",
  "Se preocupa mucho",
  "Parece estar pasándola mal divirtiéndose",
  // Attention (items 5-9)
  "Sueña despierto(a) demasiado",
  "Se distrae fácilmente",
  "Tiene problemas para concentrarse",
  "Actúa como si estuviera impulsado(a) por un motor",
  "Es inquieto(a), no puede quedarse quieto(a)",
  // Externalizing (items 10-16)
  "Pelea con otros niños/as",
  "No escucha las reglas",
  "No entiende los sentimientos de los demás",
  "Molesta a otros",
  "Culpa a otros de sus problemas",
  "Se niega a compartir",
  "Toma cosas que no le pertenecen",
];

const responseOptions = [
  { value: 0, label: "Nunca", description: "No presenta esta conducta" },
  { value: 1, label: "A veces", description: "Ocasionalmente" },
  { value: 2, label: "Frecuentemente", description: "Con frecuencia" },
];

function getScreeningResult(total: number, int: number, ext: number, att: number): string {
  // PSC-17 cutoffs: Total ≥ 15, Internalizing ≥ 5, Externalizing ≥ 7, Attention ≥ 7
  const flags: string[] = [];
  if (total >= 15) flags.push("Screening positivo (total)");
  if (int >= 5) flags.push("Internalización elevada");
  if (ext >= 7) flags.push("Externalización elevada");
  if (att >= 7) flags.push("Atención elevada");
  return flags.length > 0 ? flags.join(" · ") : "Screening negativo";
}

export function PSC17Test({ patientName, onComplete, onCancel }: PSC17TestProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<number, number>>({});

  const totalQuestions = psc17Questions.length;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;
  const allAnswered = Object.keys(responses).length === totalQuestions;

  const internalizing = [0, 1, 2, 3, 4].reduce((s, i) => s + (responses[i] ?? 0), 0);
  const attention = [5, 6, 7, 8, 9].reduce((s, i) => s + (responses[i] ?? 0), 0);
  const externalizing = [10, 11, 12, 13, 14, 15, 16].reduce((s, i) => s + (responses[i] ?? 0), 0);
  const totalScore = internalizing + attention + externalizing;

  const handleResponse = (value: number) => {
    setResponses((prev) => ({ ...prev, [currentIndex]: value }));
  };

  const handleComplete = () => {
    const subscales = { internalizing, externalizing, attention };
    const screening = getScreeningResult(totalScore, internalizing, externalizing, attention);
    onComplete({ responses, totalScore, subscales, screening });
  };

  // Determine which subscale the current question belongs to
  const getSubscaleLabel = (idx: number) => {
    if (idx < 5) return "Internalización";
    if (idx < 10) return "Atención";
    return "Externalización";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">PSC-17 — Screening Pediátrico</h2>
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
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary rounded-full text-xs font-medium">
              {getSubscaleLabel(currentIndex)}
            </span>
          </div>
          <CardTitle className="text-base leading-relaxed">
            <span className="text-muted-foreground mr-2">{currentIndex + 1}.</span>
            {psc17Questions[currentIndex]}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Marque la opción que mejor describe al niño/a durante el último mes.
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
                <p className="font-medium">Puntaje Total</p>
                <p className="text-xs text-muted-foreground">Punto de corte: ≥ 15</p>
              </div>
              <p className={cn("text-2xl font-bold", totalScore >= 15 ? "text-destructive" : "text-primary")}>
                {totalScore}/34
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="bg-background rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Internalización</p>
                <p className={cn("font-bold", internalizing >= 5 ? "text-destructive" : "text-foreground")}>{internalizing}/10</p>
              </div>
              <div className="bg-background rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Atención</p>
                <p className={cn("font-bold", attention >= 7 ? "text-destructive" : "text-foreground")}>{attention}/10</p>
              </div>
              <div className="bg-background rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Externalización</p>
                <p className={cn("font-bold", externalizing >= 7 ? "text-destructive" : "text-foreground")}>{externalizing}/14</p>
              </div>
            </div>
            <p className={cn("text-sm font-medium text-center", totalScore >= 15 ? "text-destructive" : "text-success")}>
              {getScreeningResult(totalScore, internalizing, externalizing, attention)}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
