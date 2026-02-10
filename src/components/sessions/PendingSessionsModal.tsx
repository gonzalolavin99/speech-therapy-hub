import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User,
  Calendar,
  DollarSign,
} from "lucide-react";
import { Session } from "@/hooks/useSessions";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PendingSessionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingSessions: Session[];
  onConfirmSession: (sessionId: string, completed: boolean, amount?: number) => void;
  defaultSessionPrice?: number;
}

export function PendingSessionsModal({
  open,
  onOpenChange,
  pendingSessions,
  onConfirmSession,
  defaultSessionPrice = 30000,
}: PendingSessionsModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionAmount, setSessionAmount] = useState(defaultSessionPrice);
  const [processing, setProcessing] = useState(false);

  const currentSession = pendingSessions[currentIndex];
  const remaining = pendingSessions.length - currentIndex;

  useEffect(() => {
    setSessionAmount(defaultSessionPrice);
  }, [currentIndex, defaultSessionPrice]);

  if (!currentSession) return null;

  const handleConfirm = async (completed: boolean) => {
    setProcessing(true);
    await onConfirmSession(currentSession.id, completed, completed ? sessionAmount : undefined);
    setProcessing(false);
    
    if (currentIndex < pendingSessions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onOpenChange(false);
      setCurrentIndex(0);
    }
  };

  const sessionDate = new Date(currentSession.start_time);
  const sessionTypeLabels = {
    evaluation: "Evaluación",
    therapy: "Terapia",
    followup: "Seguimiento",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            Confirmar Citas Pasadas
          </DialogTitle>
          <DialogDescription>
            Tienes {remaining} cita{remaining > 1 ? 's' : ''} por confirmar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Session Info Card */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{currentSession.patient_name}</span>
              </div>
              <Badge variant="outline">
                {sessionTypeLabels[currentSession.session_type]}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {format(sessionDate, "EEEE d 'de' MMMM, HH:mm", { locale: es })}
              </span>
            </div>

            {currentSession.title && (
              <p className="text-sm">{currentSession.title}</p>
            )}
          </div>

          {/* Question */}
          <div className="text-center py-2">
            <p className="text-lg font-medium">¿Se realizó esta cita?</p>
          </div>

          {/* Amount Input (shown when confirming) */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Monto de la sesión
            </Label>
            <Input
              id="amount"
              type="number"
              value={sessionAmount}
              onChange={(e) => setSessionAmount(parseInt(e.target.value) || 0)}
              placeholder="30000"
            />
            <p className="text-xs text-muted-foreground">
              Se creará un pago pendiente por este monto
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => handleConfirm(false)}
              disabled={processing}
            >
              <XCircle className="h-4 w-4 mr-2" />
              No se realizó
            </Button>
            <Button
              className="flex-1"
              onClick={() => handleConfirm(true)}
              disabled={processing}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Sí, se realizó
            </Button>
          </div>

          {/* Progress indicator */}
          {pendingSessions.length > 1 && (
            <div className="flex justify-center gap-1 pt-2">
              {pendingSessions.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    idx === currentIndex
                      ? "bg-primary"
                      : idx < currentIndex
                      ? "bg-primary/50"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
