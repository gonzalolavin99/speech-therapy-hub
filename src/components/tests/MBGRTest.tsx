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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { mbgrSections, MBGRSection, MBGRSubsection } from "@/data/tests/mbgr";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";

interface MBGRTestProps {
  patientName: string;
  onComplete: (results: Record<string, string | number>, totalScore: number) => void;
  onCancel: () => void;
}

export function MBGRTest({ patientName, onComplete, onCancel }: MBGRTestProps) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string | number>>({});

  const currentSection = mbgrSections[currentSectionIndex];
  const totalSections = mbgrSections.length;
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
    mbgrSections.forEach((section) => {
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

  const handleFinish = () => {
    const totalScore = calculateScore();
    onComplete(responses, totalScore);
  };

  const renderItem = (item: MBGRSubsection['items'][0]) => {
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
                {option.label}
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
        <div>
          <h2 className="text-xl font-bold">Protocolo MBGR</h2>
          <p className="text-sm text-muted-foreground">Paciente: {patientName}</p>
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
        </CardHeader>
        <CardContent className="space-y-6">
          {currentSection.subsections.map((subsection) => (
            <div key={subsection.id} className="space-y-4">
              <h4 className="font-medium text-primary border-b pb-2">
                {subsection.name}
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
