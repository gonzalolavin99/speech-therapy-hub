import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit2,
  DollarSign,
  MessageSquare,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateSessionNotes, isAIConfigured } from "@/lib/ai-service";
import { toast } from "sonner";

interface Session {
  id: string;
  patient_id: string;
  patient_name?: string;
  title: string;
  session_type: 'evaluation' | 'therapy' | 'followup';
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
}

interface SessionDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session | null;
  onConfirm: (sessionId: string) => void;
  onCancel: (sessionId: string) => void;
  onComplete: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onUpdateNotes: (sessionId: string, notes: string) => void;
  onViewPayment?: (patientId: string) => void;
  isLoading?: boolean;
}

export function SessionDetailModal({
  open,
  onOpenChange,
  session,
  onConfirm,
  onCancel,
  onComplete,
  onDelete,
  onUpdateNotes,
  onViewPayment,
  isLoading = false,
}: SessionDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(session?.notes || "");
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);

  if (!session) return null;

  const sessionDate = new Date(session.start_time);
  const endDate = new Date(session.end_time);

  const getSessionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      evaluation: "Evaluación",
      therapy: "Terapia",
      followup: "Seguimiento",
    };
    return labels[type] || type;
  };

  const getStatusConfig = (status: string) => {
    const config: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
      scheduled: {
        label: "Agendada",
        className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
        icon: Calendar,
      },
      confirmed: {
        label: "Confirmada",
        className: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
        icon: CheckCircle2,
      },
      completed: {
        label: "Completada",
        className: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
        icon: CheckCircle2,
      },
      cancelled: {
        label: "Cancelada",
        className: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
        icon: XCircle,
      },
      no_show: {
        label: "No asistió",
        className: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
        icon: XCircle,
      },
    };
    return config[status] || config.scheduled;
  };

  const statusConfig = getStatusConfig(session.status);
  const StatusIcon = statusConfig.icon;

  const handleSaveNotes = () => {
    onUpdateNotes(session.id, notes);
    setIsEditing(false);
  };

  const handleConfirm = () => {
    onConfirm(session.id);
  };

  const handleCancel = () => {
    onCancel(session.id);
    setShowCancelAlert(false);
  };

  const handleComplete = () => {
    onComplete(session.id);
  };

  const handleDelete = () => {
    onDelete(session.id);
    setShowDeleteAlert(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{session.title}</span>
              <Badge className={cn("ml-2", statusConfig.className)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Información del paciente */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{session.patient_name || "Paciente"}</p>
                <p className="text-sm text-muted-foreground">
                  {getSessionTypeLabel(session.session_type)}
                </p>
              </div>
            </div>

            {/* Fecha y hora */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(sessionDate, "EEEE d 'de' MMMM", { locale: es })}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(sessionDate, "HH:mm")} - {format(endDate, "HH:mm")}
                </span>
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Notas / Instrucciones
                </label>
                {!isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNotes(session.notes || "");
                      setIsEditing(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Agregar notas o instrucciones para la cita..."
                    rows={3}
                  />
                  <div className="flex justify-between gap-2">
                    {isAIConfigured() && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          setIsGeneratingNotes(true);
                          try {
                            const suggestion = await generateSessionNotes(
                              session.session_type,
                              session.patient_name || 'Paciente',
                              undefined,
                              session.notes || undefined
                            );
                            setNotes(suggestion);
                          } catch (err: any) {
                            toast.error('Error al generar nota', { description: err.message });
                          } finally {
                            setIsGeneratingNotes(false);
                          }
                        }}
                        disabled={isGeneratingNotes}
                        className="text-xs border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                      >
                        {isGeneratingNotes ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 mr-1" />
                        )}
                        {isGeneratingNotes ? "Generando..." : "Sugerir con IA"}
                      </Button>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={handleSaveNotes} disabled={isLoading}>
                        {isLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                        Guardar
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 min-h-[60px]">
                  {session.notes || "Sin notas"}
                </p>
              )}
            </div>

            {/* Acciones principales */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">Acciones</p>
              
              <div className="grid grid-cols-2 gap-2">
                {session.status === 'scheduled' && (
                  <Button
                    variant="outline"
                    className="justify-start text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/30"
                    onClick={handleConfirm}
                    disabled={isLoading}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirmar Cita
                  </Button>
                )}

                {(session.status === 'scheduled' || session.status === 'confirmed') && (
                  <Button
                    variant="outline"
                    className="justify-start text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                    onClick={handleComplete}
                    disabled={isLoading}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Marcar Completada
                  </Button>
                )}

                {(session.status === 'scheduled' || session.status === 'confirmed') && (
                  <Button
                    variant="outline"
                    className="justify-start text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    onClick={() => setShowCancelAlert(true)}
                    disabled={isLoading}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancelar Cita
                  </Button>
                )}

                {onViewPayment && (
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => onViewPayment(session.patient_id)}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Ver Pagos
                  </Button>
                )}
              </div>

              {/* Botón eliminar */}
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteAlert(true)}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Cita
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert de cancelación */}
      <AlertDialog open={showCancelAlert} onOpenChange={setShowCancelAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar esta cita?</AlertDialogTitle>
            <AlertDialogDescription>
              La cita con {session.patient_name} será marcada como cancelada.
              Podrás eliminarla después si lo deseas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Sí, cancelar cita
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert de eliminación */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta cita?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La cita será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
