import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, UserPlus, ChevronDown, ChevronUp } from "lucide-react";

interface SessionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  patients: { id: string; name: string }[];
  initialData?: {
    patient_id?: string;
    title?: string;
    session_type?: string;
    date?: string;
    start_time?: string;
    end_time?: string;
    notes?: string;
  };
  isLoading?: boolean;
  onQuickPatientCreate?: (data: { name: string; phone: string }) => Promise<{ id: string; name: string } | null>;
}

export function SessionFormDialog({
  open,
  onOpenChange,
  onSubmit,
  patients,
  initialData,
  isLoading = false,
  onQuickPatientCreate,
}: SessionFormDialogProps) {
  const [formData, setFormData] = useState({
    patient_id: "",
    title: "",
    session_type: "therapy",
    date: "",
    start_time: "09:00",
    end_time: "09:45",
    notes: "",
  });

  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [quickPatients, setQuickPatients] = useState<{ id: string; name: string }[]>([]);

  const allPatients = [
    ...patients,
    ...quickPatients.filter(qp => !patients.some(p => p.id === qp.id)),
  ];

  useEffect(() => {
    if (initialData) {
      setFormData({
        patient_id: initialData.patient_id || "",
        title: initialData.title || "",
        session_type: initialData.session_type || "therapy",
        date: initialData.date || "",
        start_time: initialData.start_time || "09:00",
        end_time: initialData.end_time || "09:45",
        notes: initialData.notes || "",
      });
    } else {
      setFormData({
        patient_id: "",
        title: "",
        session_type: "therapy",
        date: new Date().toISOString().split("T")[0],
        start_time: "09:00",
        end_time: "09:45",
        notes: "",
      });
    }
    setShowQuickCreate(false);
    setQuickName("");
    setQuickPhone("");
    setQuickPatients([]);
  }, [initialData, open]);

  const handleQuickPatientCreate = async () => {
    if (!quickName.trim() || !onQuickPatientCreate) return;
    setIsCreatingPatient(true);
    try {
      const newPatient = await onQuickPatientCreate({
        name: quickName.trim(),
        phone: quickPhone.trim(),
      });
      if (newPatient) {
        setQuickPatients(prev => [...prev, newPatient]);
        handleChange("patient_id", newPatient.id);
        setShowQuickCreate(false);
        setQuickName("");
        setQuickPhone("");
      }
    } finally {
      setIsCreatingPatient(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedPatient = patients.find((p) => p.id === formData.patient_id);
    const title = formData.title || `${getSessionTypeLabel(formData.session_type)} - ${selectedPatient?.name || "Paciente"}`;
    
    onSubmit({
      ...formData,
      title,
    });
    onOpenChange(false);
  };

  const getSessionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      evaluation: "Evaluación",
      therapy: "Terapia",
      followup: "Seguimiento",
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nueva Cita</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="patient">Paciente *</Label>
              {onQuickPatientCreate && (
                <button
                  type="button"
                  onClick={() => setShowQuickCreate(!showQuickCreate)}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Nuevo rápido
                  {showQuickCreate ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              )}
            </div>
            <Select
              value={formData.patient_id}
              onValueChange={(value) => handleChange("patient_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar paciente" />
              </SelectTrigger>
              <SelectContent>
                {allPatients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {showQuickCreate && (
              <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                <p className="text-xs text-muted-foreground">
                  Crea un paciente con datos mínimos. Podrás completar su ficha después.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Nombre *</Label>
                    <Input
                      placeholder="Nombre del paciente"
                      value={quickName}
                      onChange={(e) => setQuickName(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Teléfono</Label>
                    <Input
                      placeholder="+56 9 1234 5678"
                      value={quickPhone}
                      onChange={(e) => setQuickPhone(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="w-full h-8 text-xs"
                  disabled={!quickName.trim() || isCreatingPatient}
                  onClick={handleQuickPatientCreate}
                >
                  {isCreatingPatient ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <UserPlus className="mr-1 h-3 w-3" />
                  )}
                  Crear y seleccionar
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="session_type">Tipo de Sesión</Label>
            <Select
              value={formData.session_type}
              onValueChange={(value) => handleChange("session_type", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="evaluation">Evaluación</SelectItem>
                <SelectItem value="therapy">Terapia</SelectItem>
                <SelectItem value="followup">Seguimiento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Fecha *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleChange("date", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Hora Inicio</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => handleChange("start_time", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Hora Fin</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => handleChange("end_time", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título (opcional)</Label>
            <Input
              id="title"
              placeholder="Se genera automáticamente si se deja vacío"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionales..."
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!formData.patient_id || !formData.date || isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Cita
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
