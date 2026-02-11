import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { mmbgrLactantesSections, MMBGRSubsection } from "@/data/tests/mmbgr-lactantes";
import { ChevronLeft, ChevronRight, Save, Baby } from "lucide-react";

interface MMBGRLactantesTestProps {
  patientName: string;
  onComplete: (results: Record<string, string | number>, totalScore: number) => void;
  onCancel: () => void;
}

export function MMBGRLactantesTest({ patientName, onComplete, onCancel }: MMBGRLactantesTestProps) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string | number>>({});

  const currentSection = mmbgrLactantesSections[currentSectionIndex];
  const totalSections = mmbgrLactantesSections.length;
  const progress = ((currentSectionIndex + 1) / totalSections) * 100;

  const handleResponse = (itemId: string, value: string | number) => {
    setResponses((prev) => ({ ...prev, [itemId]: value }));
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

  const calculateScore = () => {
    let totalScore = 0;
    mmbgrLactantesSections.forEach((section) => {
      section.subsections.forEach((subsection) => {
        subsection.items.forEach((item) => {
          const response = responses[item.id];
          if (response && item.options) {
            const option = item.options.find((o) => o.value === response);
            if (option?.score) {
              totalScore += option.score;
            }
          }
        });
      });
    });
    return totalScore;
  };

  const calculateSectionScore = () => {
    let sectionScore = 0;
    currentSection.subsections.forEach((subsection) => {
      subsection.items.forEach((item) => {
        const response = responses[item.id];
        if (response && item.options) {
          const option = item.options.find((o) => o.value === response);
          if (option?.score) {
            sectionScore += option.score;
          }
        }
      });
    });
    return sectionScore;
  };

  const handleFinish = () => {
    const totalScore = calculateScore();
    onComplete(responses, totalScore);
  };

  const renderItem = (item: MMBGRSubsection['items'][0]) => {
    if (item.type === 'select' && item.options) {
      return (
        <Select
          value={responses[item.id]?.toString() || ""}
          onValueChange={(value) => handleResponse(item.id, value)}
        >
          <SelectTrigger id={item.id}>
            <SelectValue placeholder="Seleccionar..." />
          </SelectTrigger>
          <SelectContent>
            {item.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label} {option.score !== undefined && option.score > 0 && `(${option.score})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    
    if (item.type === 'number') {
      return (
        <div className="flex items-center gap-2">
          <Input
            id={item.id}
            type="number"
            value={responses[item.id]?.toString() || ""}
            onChange={(e) => handleResponse(item.id, parseFloat(e.target.value) || 0)}
            className="w-24"
          />
          {item.unit && <span className="text-sm text-muted-foreground">{item.unit}</span>}
        </div>
      );
    }
    
    if (item.type === 'text') {
      return (
        <Textarea
          id={item.id}
          value={responses[item.id]?.toString() || ""}
          onChange={(e) => handleResponse(item.id, e.target.value)}
          placeholder="Escribir observación..."
          rows={2}
        />
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-100 rounded-lg">
            <Baby className="h-6 w-6 text-pink-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Protocolo MMBGR - Lactantes</h2>
            <p className="text-sm text-muted-foreground">Paciente: {patientName} | 6-71 meses</p>
          </div>
        </div>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Sección {currentSectionIndex + 1} de {totalSections}
          </span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{currentSection.title}</CardTitle>
          {currentSection.maxScore && (
            <CardDescription>
              Puntaje sección: {calculateSectionScore()} / {currentSection.maxScore} (mejor = 0)
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {currentSection.subsections.map((subsection) => (
            <div key={subsection.id} className="space-y-4">
              <h4 className="font-medium text-primary border-b pb-2">
                {subsection.name}
                {subsection.maxScore && (
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    (máx: {subsection.maxScore})
                  </span>
                )}
              </h4>
              <div className="grid gap-4">
                {subsection.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                    <Label htmlFor={item.id} className="text-sm py-2">{item.label}</Label>
                    {renderItem(item)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goToPreviousSection}
          disabled={currentSectionIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>

        <div className="text-sm text-muted-foreground">
          Puntaje total: {calculateScore()}
        </div>

        {currentSectionIndex === totalSections - 1 ? (
          <Button onClick={handleFinish}>
            <Save className="h-4 w-4 mr-2" />
            Finalizar Test
          </Button>
        ) : (
          <Button onClick={goToNextSection}>
            Siguiente
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
