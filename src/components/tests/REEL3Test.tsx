import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Check, X, User, FileText, ClipboardList, BarChart3 } from 'lucide-react';
import { reel3AgeGroups, reel3TestInfo, reel3ScoreInterpretation } from '@/data/tests/reel3';

interface REEL3TestProps {
  patientName: string;
  onComplete: (results: Record<string, any>, score: number) => void;
  onCancel: () => void;
}

type TestPhase = 'info' | 'evaluation' | 'scores' | 'summary';

export function REEL3Test({ patientName, onComplete, onCancel }: REEL3TestProps) {
  const [phase, setPhase] = useState<TestPhase>('info');
  const [currentAgeGroupIndex, setCurrentAgeGroupIndex] = useState(0);
  const [currentSubtest, setCurrentSubtest] = useState<'expresivo' | 'receptivo'>('receptivo');
  
  const [patientInfo, setPatientInfo] = useState({
    sexo: '' as 'mujer' | 'hombre' | '',
    nombreInformante: '',
    relacionConNino: '',
    establecimiento: '',
    fechaEvaluacion: new Date().toISOString().split('T')[0],
    fechaNacimiento: '',
    edadEnMeses: '',
  });

  const [responses, setResponses] = useState<Record<string, boolean | null>>({});
  
  const [scores, setScores] = useState({
    receptivo: {
      puntajeBruto: '',
      edadEquivalente: '',
      puntajeHabilidad: '',
      percentil: '',
    },
    expresivo: {
      puntajeBruto: '',
      edadEquivalente: '',
      puntajeHabilidad: '',
      percentil: '',
    },
  });

  const currentAgeGroup = reel3AgeGroups[currentAgeGroupIndex];
  const currentItems = currentSubtest === 'expresivo' 
    ? currentAgeGroup.expressivoItems 
    : currentAgeGroup.receptivoItems;

  const getTotalItems = () => {
    let total = 0;
    reel3AgeGroups.forEach(group => {
      total += group.expressivoItems.length + group.receptivoItems.length;
    });
    return total;
  };

  const getAnsweredCount = () => {
    return Object.keys(responses).filter(key => responses[key] !== null && responses[key] !== undefined).length;
  };

  const progress = (getAnsweredCount() / getTotalItems()) * 100;

  const handleResponse = (itemId: string, value: boolean) => {
    setResponses(prev => ({ ...prev, [itemId]: value }));
  };

  const calculateRawScores = () => {
    let expresivoCount = 0;
    let receptivoCount = 0;

    Object.entries(responses).forEach(([key, value]) => {
      if (value === true) {
        if (key.startsWith('e')) expresivoCount++;
        else if (key.startsWith('r')) receptivoCount++;
      }
    });

    return { expresivo: expresivoCount, receptivo: receptivoCount };
  };

  const handleNextSection = () => {
    if (currentSubtest === 'receptivo') {
      setCurrentSubtest('expresivo');
    } else {
      if (currentAgeGroupIndex < reel3AgeGroups.length - 1) {
        setCurrentAgeGroupIndex(prev => prev + 1);
        setCurrentSubtest('receptivo');
      } else {
        const rawScores = calculateRawScores();
        setScores(prev => ({
          ...prev,
          receptivo: { ...prev.receptivo, puntajeBruto: String(rawScores.receptivo) },
          expresivo: { ...prev.expresivo, puntajeBruto: String(rawScores.expresivo) },
        }));
        setPhase('scores');
      }
    }
  };

  const handlePrevSection = () => {
    if (currentSubtest === 'expresivo') {
      setCurrentSubtest('receptivo');
    } else {
      if (currentAgeGroupIndex > 0) {
        setCurrentAgeGroupIndex(prev => prev - 1);
        setCurrentSubtest('expresivo');
      }
    }
  };

  const handleComplete = () => {
    const rawScores = calculateRawScores();
    const totalScore = rawScores.expresivo + rawScores.receptivo;

    const results = {
      patientInfo,
      responses,
      scores,
      rawScores,
      totalScore,
    };

    onComplete(results, totalScore);
  };

  const renderPhaseIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[
        { id: 'info', label: 'Información', icon: User },
        { id: 'evaluation', label: 'Evaluación', icon: ClipboardList },
        { id: 'scores', label: 'Puntajes', icon: BarChart3 },
        { id: 'summary', label: 'Resumen', icon: FileText },
      ].map((item, index) => (
        <div key={item.id} className="flex items-center">
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
            phase === item.id 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground'
          }`}>
            <item.icon className="h-3 w-3" />
            {item.label}
          </div>
          {index < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
        </div>
      ))}
    </div>
  );

  const renderInfoPhase = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-primary">{reel3TestInfo.name}</h2>
        <p className="text-sm text-muted-foreground mt-1">{reel3TestInfo.spanishName}</p>
        <p className="text-sm mt-2">{reel3TestInfo.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Paciente</Label>
          <Input value={patientName} disabled className="bg-muted" />
        </div>
        <div>
          <Label>Sexo</Label>
          <Select value={patientInfo.sexo} onValueChange={(v) => setPatientInfo(prev => ({ ...prev, sexo: v as any }))}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mujer">Mujer</SelectItem>
              <SelectItem value="hombre">Hombre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Nombre del informante</Label>
          <Input 
            value={patientInfo.nombreInformante} 
            onChange={(e) => setPatientInfo(prev => ({ ...prev, nombreInformante: e.target.value }))}
            placeholder="Quien responde las preguntas"
          />
        </div>
        <div>
          <Label>Relación con el niño</Label>
          <Input 
            value={patientInfo.relacionConNino} 
            onChange={(e) => setPatientInfo(prev => ({ ...prev, relacionConNino: e.target.value }))}
            placeholder="Ej: Madre, Padre, Cuidador"
          />
        </div>
        <div>
          <Label>Fecha de evaluación</Label>
          <Input 
            type="date" 
            value={patientInfo.fechaEvaluacion} 
            onChange={(e) => setPatientInfo(prev => ({ ...prev, fechaEvaluacion: e.target.value }))}
          />
        </div>
        <div>
          <Label>Fecha de nacimiento</Label>
          <Input 
            type="date" 
            value={patientInfo.fechaNacimiento} 
            onChange={(e) => setPatientInfo(prev => ({ ...prev, fechaNacimiento: e.target.value }))}
          />
        </div>
        <div>
          <Label>Edad en meses</Label>
          <Input 
            type="number" 
            value={patientInfo.edadEnMeses} 
            onChange={(e) => setPatientInfo(prev => ({ ...prev, edadEnMeses: e.target.value }))}
            placeholder="Ej: 18"
          />
        </div>
        <div>
          <Label>Establecimiento</Label>
          <Input 
            value={patientInfo.establecimiento} 
            onChange={(e) => setPatientInfo(prev => ({ ...prev, establecimiento: e.target.value }))}
          />
        </div>
      </div>

      <div className="bg-muted rounded-lg p-4 text-sm space-y-2">
        <p className="font-medium">Instrucciones:</p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>{reel3TestInfo.instructions.start}</li>
          <li>{reel3TestInfo.instructions.ceiling}</li>
          <li>{reel3TestInfo.instructions.basal}</li>
        </ul>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => setPhase('evaluation')}>
          Comenzar Evaluación <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderEvaluationPhase = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">{currentAgeGroup.name}</h3>
          <p className="text-sm text-muted-foreground">
            Lenguaje {currentSubtest === 'expresivo' ? 'Expresivo' : 'Receptivo'}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="text-muted-foreground">Progreso total</p>
          <p className="font-medium">{getAnsweredCount()} / {getTotalItems()} items</p>
        </div>
      </div>

      <Progress value={progress} className="h-2" />

      <div className="bg-muted/50 rounded-lg p-1 flex gap-1">
        <button
          onClick={() => setCurrentSubtest('receptivo')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            currentSubtest === 'receptivo' 
              ? 'bg-background shadow-sm' 
              : 'hover:bg-background/50'
          }`}
        >
          Receptivo
        </button>
        <button
          onClick={() => setCurrentSubtest('expresivo')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            currentSubtest === 'expresivo' 
              ? 'bg-background shadow-sm' 
              : 'hover:bg-background/50'
          }`}
        >
          Expresivo
        </button>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {currentItems.map((item) => (
          <div 
            key={item.id} 
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
              responses[item.id] === true 
                ? 'bg-success/10 border-success/30' 
                : responses[item.id] === false 
                  ? 'bg-destructive/10 border-destructive/30' 
                  : 'bg-card hover:bg-muted/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground w-6">{item.number}.</span>
              <span className="text-sm">{item.question}</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={responses[item.id] === true ? 'default' : 'outline'}
                className={responses[item.id] === true ? 'bg-success hover:bg-success/90' : ''}
                onClick={() => handleResponse(item.id, true)}
              >
                <Check className="h-4 w-4" />
                <span className="ml-1">Sí</span>
              </Button>
              <Button
                size="sm"
                variant={responses[item.id] === false ? 'default' : 'outline'}
                className={responses[item.id] === false ? 'bg-destructive hover:bg-destructive/90' : ''}
                onClick={() => handleResponse(item.id, false)}
              >
                <X className="h-4 w-4" />
                <span className="ml-1">No</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button 
          variant="outline" 
          onClick={handlePrevSection}
          disabled={currentAgeGroupIndex === 0 && currentSubtest === 'receptivo'}
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
        </Button>
        <div className="flex gap-2">
          {reel3AgeGroups.map((group, idx) => (
            <button
              key={group.id}
              onClick={() => {
                setCurrentAgeGroupIndex(idx);
                setCurrentSubtest('receptivo');
              }}
              className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                idx === currentAgeGroupIndex 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
        <Button onClick={handleNextSection}>
          {currentAgeGroupIndex === reel3AgeGroups.length - 1 && currentSubtest === 'expresivo' 
            ? 'Finalizar' 
            : 'Siguiente'} 
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderScoresPhase = () => (
    <div className="space-y-6">
      <h3 className="font-semibold text-lg text-center">Registro de Puntajes</h3>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4 p-4 rounded-lg border">
          <h4 className="font-medium text-center">Lenguaje Receptivo</h4>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Puntaje bruto</Label>
              <Input 
                value={scores.receptivo.puntajeBruto} 
                onChange={(e) => setScores(prev => ({ 
                  ...prev, 
                  receptivo: { ...prev.receptivo, puntajeBruto: e.target.value } 
                }))}
              />
            </div>
            <div>
              <Label className="text-xs">Edad equivalente</Label>
              <Input 
                value={scores.receptivo.edadEquivalente} 
                onChange={(e) => setScores(prev => ({ 
                  ...prev, 
                  receptivo: { ...prev.receptivo, edadEquivalente: e.target.value } 
                }))}
              />
            </div>
            <div>
              <Label className="text-xs">Puntaje habilidad</Label>
              <Input 
                value={scores.receptivo.puntajeHabilidad} 
                onChange={(e) => setScores(prev => ({ 
                  ...prev, 
                  receptivo: { ...prev.receptivo, puntajeHabilidad: e.target.value } 
                }))}
              />
            </div>
            <div>
              <Label className="text-xs">Percentil</Label>
              <Input 
                value={scores.receptivo.percentil} 
                onChange={(e) => setScores(prev => ({ 
                  ...prev, 
                  receptivo: { ...prev.receptivo, percentil: e.target.value } 
                }))}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 rounded-lg border">
          <h4 className="font-medium text-center">Lenguaje Expresivo</h4>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Puntaje bruto</Label>
              <Input 
                value={scores.expresivo.puntajeBruto} 
                onChange={(e) => setScores(prev => ({ 
                  ...prev, 
                  expresivo: { ...prev.expresivo, puntajeBruto: e.target.value } 
                }))}
              />
            </div>
            <div>
              <Label className="text-xs">Edad equivalente</Label>
              <Input 
                value={scores.expresivo.edadEquivalente} 
                onChange={(e) => setScores(prev => ({ 
                  ...prev, 
                  expresivo: { ...prev.expresivo, edadEquivalente: e.target.value } 
                }))}
              />
            </div>
            <div>
              <Label className="text-xs">Puntaje habilidad</Label>
              <Input 
                value={scores.expresivo.puntajeHabilidad} 
                onChange={(e) => setScores(prev => ({ 
                  ...prev, 
                  expresivo: { ...prev.expresivo, puntajeHabilidad: e.target.value } 
                }))}
              />
            </div>
            <div>
              <Label className="text-xs">Percentil</Label>
              <Input 
                value={scores.expresivo.percentil} 
                onChange={(e) => setScores(prev => ({ 
                  ...prev, 
                  expresivo: { ...prev.expresivo, percentil: e.target.value } 
                }))}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-muted rounded-lg p-4">
        <h4 className="font-medium mb-3 text-center">Interpretación de Puntajes</h4>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {reel3ScoreInterpretation.map((item) => (
            <div key={item.range} className="flex justify-between bg-background rounded p-2">
              <span className="font-medium">{item.range}</span>
              <span className="text-muted-foreground">{item.descriptor}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setPhase('evaluation')}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Volver a Evaluación
        </Button>
        <Button onClick={() => setPhase('summary')}>
          Ver Resumen <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderSummaryPhase = () => {
    const rawScores = calculateRawScores();
    const totalAnswered = getAnsweredCount();
    const yesCount = Object.values(responses).filter(v => v === true).length;
    const noCount = Object.values(responses).filter(v => v === false).length;

    return (
      <div className="space-y-6">
        <h3 className="font-semibold text-lg text-center">Resumen de Evaluación</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Paciente</p>
            <p className="font-medium">{patientName}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Fecha de evaluación</p>
            <p className="font-medium">{patientInfo.fechaEvaluacion}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-primary/10 text-center">
            <p className="text-2xl font-bold text-primary">{totalAnswered}</p>
            <p className="text-xs text-muted-foreground">Items respondidos</p>
          </div>
          <div className="p-4 rounded-lg bg-success/10 text-center">
            <p className="text-2xl font-bold text-success">{yesCount}</p>
            <p className="text-xs text-muted-foreground">Respuestas SÍ</p>
          </div>
          <div className="p-4 rounded-lg bg-destructive/10 text-center">
            <p className="text-2xl font-bold text-destructive">{noCount}</p>
            <p className="text-xs text-muted-foreground">Respuestas NO</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border">
            <h4 className="font-medium mb-2">Lenguaje Receptivo</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Puntaje bruto:</span>
                <span className="font-medium">{rawScores.receptivo}</span>
              </div>
              {scores.receptivo.percentil && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Percentil:</span>
                  <span className="font-medium">{scores.receptivo.percentil}</span>
                </div>
              )}
            </div>
          </div>
          <div className="p-4 rounded-lg border">
            <h4 className="font-medium mb-2">Lenguaje Expresivo</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Puntaje bruto:</span>
                <span className="font-medium">{rawScores.expresivo}</span>
              </div>
              {scores.expresivo.percentil && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Percentil:</span>
                  <span className="font-medium">{scores.expresivo.percentil}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => setPhase('scores')}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Volver a Puntajes
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button onClick={handleComplete} className="bg-success hover:bg-success/90">
              <Check className="mr-2 h-4 w-4" /> Guardar Resultados
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderPhaseIndicator()}
      
      {phase === 'info' && renderInfoPhase()}
      {phase === 'evaluation' && renderEvaluationPhase()}
      {phase === 'scores' && renderScoresPhase()}
      {phase === 'summary' && renderSummaryPhase()}
    </div>
  );
}
