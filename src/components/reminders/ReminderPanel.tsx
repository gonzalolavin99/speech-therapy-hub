import { useState } from "react";
import { Bell, Send, MessageCircle, Mail, Check, Clock, X, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useReminders, Reminder, ReminderFormData } from "@/hooks/useReminders";
import { usePatients } from "@/hooks/usePatients";

export function ReminderPanel() {
  const { reminders, isLoading, createReminder, updateReminder, deleteReminder, markAsSent } = useReminders();
  const { patients } = usePatients();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [newReminder, setNewReminder] = useState<{
    contact: string;
    sessionDate: string;
    sessionTime: string;
    method: "whatsapp" | "email" | "sms";
    message: string;
  }>({
    contact: "",
    sessionDate: "",
    sessionTime: "",
    method: "whatsapp",
    message: "Hola {nombre}, te recordamos tu cita de fonoaudiología el día {fecha} a las {hora}. ¿Confirmas tu asistencia?",
  });

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const getStatusBadge = (status: Reminder["status"]) => {
    const config = {
      pending: { icon: Clock, label: "Pendiente", className: "bg-warning/10 text-warning" },
      sent: { icon: Send, label: "Enviado", className: "bg-info/10 text-info" },
      confirmed: { icon: Check, label: "Confirmado", className: "bg-success/10 text-success" },
      failed: { icon: X, label: "Fallido", className: "bg-destructive/10 text-destructive" },
    };
    const { icon: Icon, label, className } = config[status];
    return (
      <span className={cn("px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1", className)}>
        <Icon className="h-3 w-3" />
        {label}
      </span>
    );
  };

  const sendWhatsAppReminder = (reminder: Reminder) => {
    const message = encodeURIComponent(
      `Hola ${reminder.patient_name}, te recordamos tu cita de fonoaudiología el día ${reminder.session_date} a las ${reminder.session_time}. ¿Confirmas tu asistencia? Responde SÍ o NO.`
    );
    const phone = reminder.contact.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
    
    markAsSent.mutate(reminder.id);
  };

  const sendEmailReminder = (reminder: Reminder) => {
    const subject = encodeURIComponent(`Recordatorio de cita - ${reminder.session_date}`);
    const body = encodeURIComponent(
      `Estimado/a ${reminder.patient_name},\n\nLe recordamos su cita de fonoaudiología programada para el día ${reminder.session_date} a las ${reminder.session_time}.\n\nPor favor confirme su asistencia respondiendo a este correo.\n\nSaludos cordiales,\nFonoApp`
    );
    window.open(`mailto:${reminder.contact}?subject=${subject}&body=${body}`, "_blank");
    
    markAsSent.mutate(reminder.id);
  };

  const markAsConfirmed = (id: string) => {
    updateReminder.mutate({ id, status: "confirmed" });
  };

  const markAsFailed = (id: string) => {
    updateReminder.mutate({ id, status: "failed" });
  };

  const handleDeleteReminder = (id: string) => {
    deleteReminder.mutate(id);
  };

  const handleCreateReminder = () => {
    if (!selectedPatient) {
      toast.error("Selecciona un paciente");
      return;
    }

    const reminderData: ReminderFormData = {
      patient_id: selectedPatient.id,
      patient_name: selectedPatient.name,
      method: newReminder.method,
      contact: newReminder.contact || (newReminder.method === "email" ? selectedPatient.email || "" : selectedPatient.phone || ""),
      session_date: newReminder.sessionDate,
      session_time: newReminder.sessionTime,
      message: newReminder.message,
    };

    createReminder.mutate(reminderData, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setSelectedPatientId("");
        setNewReminder({
          contact: "",
          sessionDate: "",
          sessionTime: "",
          method: "whatsapp",
          message: "Hola {nombre}, te recordamos tu cita de fonoaudiología el día {fecha} a las {hora}. ¿Confirmas tu asistencia?",
        });
      }
    });
  };

  const pendingCount = reminders.filter((r) => r.status === "pending" || r.status === "sent").length;

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-5 w-5" />
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recordatorios de Sesiones
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create New Reminder */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-4">
            <h4 className="font-medium text-foreground">Nuevo Recordatorio</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patient">Paciente</Label>
                <Select
                  value={selectedPatientId}
                  onValueChange={(value) => {
                    setSelectedPatientId(value);
                    const patient = patients.find(p => p.id === value);
                    if (patient) {
                      setNewReminder(prev => ({
                        ...prev,
                        contact: prev.method === "email" ? patient.email || "" : patient.phone || ""
                      }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">Método de Envío</Label>
                <Select
                  value={newReminder.method}
                  onValueChange={(value: "whatsapp" | "email" | "sms") => {
                    setNewReminder({ ...newReminder, method: value });
                    if (selectedPatient) {
                      setNewReminder(prev => ({
                        ...prev,
                        method: value,
                        contact: value === "email" ? selectedPatient.email || "" : selectedPatient.phone || ""
                      }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Correo Electrónico</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact">
                  {newReminder.method === "email" ? "Email" : "Teléfono"}
                </Label>
                <Input
                  id="contact"
                  value={newReminder.contact}
                  onChange={(e) => setNewReminder({ ...newReminder, contact: e.target.value })}
                  placeholder={newReminder.method === "email" ? "email@ejemplo.com" : "+56 9 1234 5678"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Fecha de Sesión</Label>
                <Input
                  id="date"
                  type="date"
                  value={newReminder.sessionDate}
                  onChange={(e) => setNewReminder({ ...newReminder, sessionDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="time">Hora</Label>
                <Input
                  id="time"
                  type="time"
                  value={newReminder.sessionTime}
                  onChange={(e) => setNewReminder({ ...newReminder, sessionTime: e.target.value })}
                />
              </div>
              <div className="space-y-2" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Mensaje Personalizado</Label>
              <Textarea
                id="message"
                value={newReminder.message}
                onChange={(e) => setNewReminder({ ...newReminder, message: e.target.value })}
                placeholder="Usa {nombre}, {fecha}, {hora} para variables"
                rows={3}
              />
            </div>
            <Button 
              onClick={handleCreateReminder} 
              className="w-full"
              disabled={createReminder.isPending}
            >
              {createReminder.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Crear Recordatorio
            </Button>
          </div>

          {/* Reminders List */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Recordatorios Pendientes</h4>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : reminders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay recordatorios pendientes
              </p>
            ) : (
              reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="bg-card border rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-medium text-card-foreground">{reminder.patient_name}</p>
                      {getStatusBadge(reminder.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {reminder.session_date} a las {reminder.session_time}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {reminder.contact}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {reminder.status === "pending" && (
                      <>
                        {reminder.method === "whatsapp" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendWhatsAppReminder(reminder)}
                            className="gap-1"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Enviar
                          </Button>
                        ) : reminder.method === "email" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendEmailReminder(reminder)}
                            className="gap-1"
                          >
                            <Mail className="h-4 w-4" />
                            Enviar
                          </Button>
                        ) : null}
                      </>
                    )}
                    {(reminder.status === "pending" || reminder.status === "sent") && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markAsConfirmed(reminder.id)}
                          className="text-success hover:text-success"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markAsFailed(reminder.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteReminder(reminder.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
