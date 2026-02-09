import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { teprosifItems, teprosifProcesses, TEPROSIFProcess } from "@/data/tests/teprosif";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";

interface TEPROSIFTestProps {
  patientName: string;
  patientAge: string;
  onComplete: (results: TEPROSIFResults) => void;
  onCancel: () => void;
}

interface TEPROSIFItemResponse {
  production: string;
  processes: string[];
}

interface TEPROSIFResults {
  responses: Record<number, TEPROSIFItemResponse>;
  summary: {
    totalPSF: number;
    psfByCategory: Record<string, number>;
    psfByProcess: Record<string, number>;
  };
}

export function TEPROSIFTest({ patientName, patientAge, onComplete, onCancel }: TEPROSIFTestProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<number, TEPROSIFItemResponse>>({});

  const currentItem = teprosifItems[currentIndex];
  const totalItems = teprosifItems.length;
  const progress = ((currentIndex + 1) / totalItems) * 100;

  const currentResponse = responses[currentItem.id] || { production: '', processes: [] };

  const handleProductionChange = (value: string) => {
    setResponses((prev) => ({
      ...prev,
      [currentItem.id]: { ...currentResponse, production: value },
    }));
  };

  const handleProcessToggle = (processId: string) => {
    const currentProcesses = currentResponse.processes;
    const newProcesses = currentProcesses.includes(processId)
      ? currentProcesses.filter((p) => p !== processId)
      : [...currentProcesses, processId];

    setResponses((prev) => ({
      ...prev,
      [currentItem.id]: { ...currentResponse, processes: newProcesses },
    }));
  };

  const goToNext = () => {
    if (currentIndex < totalItems - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const calculateSummary = () => {
    let totalPSF = 0;
    const psfByCategory: Record<string, number> = {
      estructura: 0,
      asimilacion: 0,
      sustitucion: 0,
    };
    const psfByProcess: Record<string, number> = {};

    Object.values(responses).forEach((response) => {
      response.processes.forEach((processId) => {
        totalPSF++;
        const process = teprosifProcesses.find((p) => p.id === processId);
        if (process) {
          psfByCategory[process.category]++;
          psfByProcess[processId] = (psfByProcess[processId] || 0) + 1;
        }
      });
    });

    return { totalPSF, psfByCategory, psfByProcess };
  };

  const handleFinish = () => {
    const summary = calculateSummary();
    onComplete({ responses, summary });
  };

  const groupProcessesByCategory = (processes: TEPROSIFProcess[]) => {
    const groups: Record<string, TEPROSIFProcess[]> = {
      estructura: [],
      asimilacion: [],
      sustitucion: [],
    };
    processes.forEach((p) => {
      groups[p.category].push(p);
    });
    return groups;
  };

  const categoryLabels: Record<string, string> = {
    estructura: 'Procesos de Estructura Silábica',
    asimilacion: 'Procesos de Asimilación',
    sustitucion: 'Procesos de Sustitución',
  };

  const processGroups = groupProcessesByCategory(teprosifProcesses);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">TEPROSIF-R</h2>
          <p className="text-sm text-muted-foreground">
            Paciente: {patientName} | Edad: {patientAge}
          </p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Ítem {currentIndex + 1} de {totalItems}
          </span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-3xl">{currentItem.targetWord}</CardTitle>
            <Badge variant="outline">Ítem {currentItem.id}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="production">Producción del niño</Label>
            <Input
              id="production"
              value={currentResponse.production}
              onChange={(e) => handleProductionChange(e.target.value)}
              placeholder="Escriba lo que dijo el niño..."
              className="text-lg"
            />
          </div>

          <div className="space-y-4">
            <Label>Procesos de Simplificación Fonológica identificados</Label>
            
            {Object.entries(processGroups).map(([category, processes]) => (
              <div key={category} className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {categoryLabels[category]}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {processes.map((process) => (
                    <div
                      key={process.id}
                      className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/50"
                    >
                      <Checkbox
                        id={process.id}
                        checked={currentResponse.processes.includes(process.id)}
                        onCheckedChange={() => handleProcessToggle(process.id)}
                      />
                      <label
                        htmlFor={process.id}
                        className="text-sm cursor-pointer flex-1"
                      >
                        <span className="font-medium">{process.code}</span>
                        <span className="text-muted-foreground ml-1">- {process.name}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goToPrevious}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>

        {currentIndex === totalItems - 1 ? (
          <Button onClick={handleFinish}>
            <Save className="h-4 w-4 mr-2" />
            Finalizar Test
          </Button>
        ) : (
          <Button onClick={goToNext}>
            Siguiente
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
