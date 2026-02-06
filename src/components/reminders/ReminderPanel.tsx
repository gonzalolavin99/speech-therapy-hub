import { useState } from "react";
import { Bell, Send, MessageCircle, Mail, Check, Clock, X } from "lucide-react";
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

interface Reminder {
  id: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  sessionDate: string;
  sessionTime: string;
  status: "pending" | "sent" | "confirmed" | "declined";
  method: "whatsapp" | "email" | "manual";
}

const mockReminders: Reminder[] = [
  {
    id: "1",
    patientName: "María García",
    patientPhone: "+56912345678",
    patientEmail: "maria@email.com",
    sessionDate: "2026-02-09",
    sessionTime: "10:00",
    status: "pending",
    method: "whatsapp",
  },
  {
    id: "2",
    patientName: "Juan Rodríguez",
    patientPhone: "+56987654321",
    patientEmail: "juan@email.com",
    sessionDate: "2026-02-08",
    sessionTime: "11:30",
    status: "sent",
    method: "email",
  },
  {
    id: "3",
    patientName: "Ana López",
    patientPhone: "+56955556666",
    patientEmail: "ana@email.com",
    sessionDate: "2026-02-11",
    sessionTime: "15:00",
    status: "confirmed",
    method: "whatsapp",
  },
];

export function ReminderPanel() {
  const [reminders, setReminders] = useState<Reminder[]>(mockReminders);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newReminder, setNewReminder] = useState<{
    patientName: string;
    patientPhone: string;
    patientEmail: string;
    sessionDate: string;
    sessionTime: string;
    method: "whatsapp" | "email" | "manual";
    message: string;
  }>({
    patientName: "",
    patientPhone: "",
    patientEmail: "",
    sessionDate: "",
    sessionTime: "",
    method: "whatsapp" as const,
    message: "Hola {nombre}, te recordamos tu cita de fonoaudiología el día {fecha} a las {hora}. ¿Confirmas tu asistencia?",
  });

  const getStatusBadge = (status: Reminder["status"]) => {
    const config = {
      pending: { icon: Clock, label: "Pendiente", className: "bg-warning/10 text-warning" },
      sent: { icon: Send, label: "Enviado", className: "bg-info/10 text-info" },
      confirmed: { icon: Check, label: "Confirmado", className: "bg-success/10 text-success" },
      declined: { icon: X, label: "No asistirá", className: "bg-destructive/10 text-destructive" },
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
      `Hola ${reminder.patientName}, te recordamos tu cita de fonoaudiología el día ${reminder.sessionDate} a las ${reminder.sessionTime}. ¿Confirmas tu asistencia? Responde SÍ o NO.`
    );
    const phone = reminder.patientPhone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
    
    setReminders((prev) =>
      prev.map((r) => (r.id === reminder.id ? { ...r, status: "sent" } : r))
    );
    toast.success("Mensaje de WhatsApp abierto");
  };

  const copyEmailTemplate = (reminder: Reminder) => {
    const subject = `Recordatorio de cita - ${reminder.sessionDate}`;
    const body = `Estimado/a ${reminder.patientName},\n\nLe recordamos su cita de fonoaudiología programada para el día ${reminder.sessionDate} a las ${reminder.sessionTime}.\n\nPor favor confirme su asistencia respondiendo a este correo.\n\nSaludos cordiales,\nFonoApp`;
    
    navigator.clipboard.writeText(body);
    toast.success("Plantilla copiada al portapapeles");
    
    setReminders((prev) =>
      prev.map((r) => (r.id === reminder.id ? { ...r, status: "sent" } : r))
    );
  };

  const markAsConfirmed = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "confirmed" } : r))
    );
    toast.success("Cita confirmada");
  };

  const markAsDeclined = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "declined" } : r))
    );
    toast.info("Cita marcada como no asistirá");
  };

  const handleCreateReminder = () => {
    const newRem: Reminder = {
      id: Date.now().toString(),
      patientName: newReminder.patientName,
      patientPhone: newReminder.patientPhone,
      patientEmail: newReminder.patientEmail,
      sessionDate: newReminder.sessionDate,
      sessionTime: newReminder.sessionTime,
      status: "pending",
      method: newReminder.method,
    };
    setReminders((prev) => [newRem, ...prev]);
    setIsDialogOpen(false);
    setNewReminder({
      patientName: "",
      patientPhone: "",
      patientEmail: "",
      sessionDate: "",
      sessionTime: "",
      method: "whatsapp",
      message: "Hola {nombre}, te recordamos tu cita de fonoaudiología el día {fecha} a las {hora}. ¿Confirmas tu asistencia?",
    });
    toast.success("Recordatorio creado");
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
                <Label htmlFor="patientName">Nombre del Paciente</Label>
                <Input
                  id="patientName"
                  value={newReminder.patientName}
                  onChange={(e) => setNewReminder({ ...newReminder, patientName: e.target.value })}
                  placeholder="Nombre completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">Método de Envío</Label>
                <Select
                  value={newReminder.method}
                  onValueChange={(value: "whatsapp" | "email" | "manual") =>
                    setNewReminder({ ...newReminder, method: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Correo Electrónico</SelectItem>
                    <SelectItem value="manual">Recordatorio Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={newReminder.patientPhone}
                  onChange={(e) => setNewReminder({ ...newReminder, patientPhone: e.target.value })}
                  placeholder="+56 9 1234 5678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newReminder.patientEmail}
                  onChange={(e) => setNewReminder({ ...newReminder, patientEmail: e.target.value })}
                  placeholder="email@ejemplo.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Fecha de Sesión</Label>
                <Input
                  id="date"
                  type="date"
                  value={newReminder.sessionDate}
                  onChange={(e) => setNewReminder({ ...newReminder, sessionDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Hora</Label>
                <Input
                  id="time"
                  type="time"
                  value={newReminder.sessionTime}
                  onChange={(e) => setNewReminder({ ...newReminder, sessionTime: e.target.value })}
                />
              </div>
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
            <Button onClick={handleCreateReminder} className="w-full">
              Crear Recordatorio
            </Button>
          </div>

          {/* Reminders List */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Recordatorios Pendientes</h4>
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                className="bg-card border rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-medium text-card-foreground">{reminder.patientName}</p>
                    {getStatusBadge(reminder.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {reminder.sessionDate} a las {reminder.sessionTime}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {reminder.method === "whatsapp" ? reminder.patientPhone : reminder.patientEmail}
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
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyEmailTemplate(reminder)}
                          className="gap-1"
                        >
                          <Mail className="h-4 w-4" />
                          Copiar
                        </Button>
                      )}
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
                        onClick={() => markAsDeclined(reminder.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
