import { useState, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useReminders, Reminder } from "@/hooks/useReminders";
import { usePatients } from "@/hooks/usePatients";
import { useProfession } from "@/contexts/ProfessionContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Bell,
  Wand2,
  Send,
  MessageCircle,
  Check,
  Clock,
  X,
  Loader2,
  Trash2,
  AlertTriangle,
  CalendarDays,
  Users,
  Phone,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const DEFAULT_TEMPLATE = "Hola {nombre}, te recordamos tu cita de {tipo} el {fecha} a las {hora}. ¿Confirmas tu asistencia? Responde SÍ o NO.";

function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const label = date.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });

  if (date.toDateString() === today.toDateString()) return `Hoy — ${label}`;
  if (date.toDateString() === tomorrow.toDateString()) return `Mañana — ${label}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function Recordatorios() {
  const {
    reminders,
    isLoading,
    generateReminders,
    markAsSent,
    markAsSentBatch,
    updateReminder,
    deleteReminder,
  } = useReminders();
  const { patients } = usePatients();
  const { config: profConfig } = useProfession();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [messageTemplate, setMessageTemplate] = useState(DEFAULT_TEMPLATE);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [targetDate, setTargetDate] = useState(getTomorrowDate);

  // Group reminders by date
  const remindersByDate = useMemo(() => {
    const groups: Record<string, Reminder[]> = {};
    const sorted = [...reminders].sort((a, b) => {
      const dateCompare = a.session_date.localeCompare(b.session_date);
      if (dateCompare !== 0) return dateCompare;
      return a.session_time.localeCompare(b.session_time);
    });

    for (const r of sorted) {
      if (!groups[r.session_date]) groups[r.session_date] = [];
      groups[r.session_date].push(r);
    }
    return groups;
  }, [reminders]);

  // Stats
  const stats = useMemo(() => {
    const pending = reminders.filter((r) => r.status === "pending").length;
    const sent = reminders.filter((r) => r.status === "sent").length;
    const confirmed = reminders.filter((r) => r.status === "confirmed").length;
    const failed = reminders.filter((r) => r.status === "failed").length;
    return { pending, sent, confirmed, failed, total: reminders.length };
  }, [reminders]);

  // Patients without phone
  const patientsNoPhone = useMemo(
    () => patients.filter((p) => p.status === "active" && !p.phone),
    [patients]
  );

  const pendingReminders = useMemo(
    () => reminders.filter((r) => r.status === "pending"),
    [reminders]
  );

  const handleGenerate = () => {
    generateReminders.mutate({ date: targetDate, messageTemplate });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllPending = () => {
    const allPendingIds = pendingReminders.map((r) => r.id);
    setSelectedIds(new Set(allPendingIds));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleBulkSend = useCallback(async () => {
    const toSend = reminders.filter((r) => selectedIds.has(r.id) && r.status === "pending");
    if (toSend.length === 0) {
      toast.info("No hay recordatorios pendientes seleccionados");
      return;
    }

    setIsSendingBulk(true);
    const sentIds: string[] = [];

    for (let i = 0; i < toSend.length; i++) {
      const reminder = toSend[i];
      const phone = reminder.contact.replace(/\D/g, "");
      const message = encodeURIComponent(
        reminder.message || `Hola ${reminder.patient_name}, te recordamos tu cita el ${reminder.session_date} a las ${reminder.session_time}.`
      );

      window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
      sentIds.push(reminder.id);

      // Wait between opens to avoid browser blocking
      if (i < toSend.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    // Mark all as sent in batch
    if (sentIds.length > 0) {
      markAsSentBatch.mutate(sentIds);
      toast.success(`${sentIds.length} mensaje${sentIds.length > 1 ? "s" : ""} abierto${sentIds.length > 1 ? "s" : ""} en WhatsApp`);
    }

    setSelectedIds(new Set());
    setIsSendingBulk(false);
  }, [reminders, selectedIds, markAsSentBatch]);

  const sendSingleWhatsApp = (reminder: Reminder) => {
    const phone = reminder.contact.replace(/\D/g, "");
    const message = encodeURIComponent(
      reminder.message || `Hola ${reminder.patient_name}, te recordamos tu cita el ${reminder.session_date} a las ${reminder.session_time}.`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
    markAsSent.mutate(reminder.id);
  };

  const getStatusConfig = (status: Reminder["status"]) => {
    const configs = {
      pending: { icon: Clock, label: "Pendiente", className: "bg-warning/10 text-warning border-warning/20" },
      sent: { icon: Send, label: "Enviado", className: "bg-info/10 text-info border-info/20" },
      confirmed: { icon: CheckCircle2, label: "Confirmado", className: "bg-success/10 text-success border-success/20" },
      failed: { icon: XCircle, label: "Fallido", className: "bg-destructive/10 text-destructive border-destructive/20" },
    };
    return configs[status];
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Recordatorios WhatsApp
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Genera recordatorios automáticos y envíalos por WhatsApp con un clic
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Pendientes", value: stats.pending, icon: Clock, color: "text-warning" },
            { label: "Enviados", value: stats.sent, icon: Send, color: "text-info" },
            { label: "Confirmados", value: stats.confirmed, icon: Check, color: "text-success" },
            { label: "Fallidos", value: stats.failed, icon: X, color: "text-destructive" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border rounded-lg p-3 flex items-center gap-3">
              <stat.icon className={cn("h-5 w-5", stat.color)} />
              <div>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Auto-generate section */}
        <div className="bg-card border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Generación Automática
            </h2>
            <button
              onClick={() => setShowTemplateEditor(!showTemplateEditor)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              Personalizar mensaje
              {showTemplateEditor ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>

          {showTemplateEditor && (
            <div className="space-y-2 bg-muted/50 rounded-lg p-3">
              <Label className="text-xs">Plantilla del mensaje</Label>
              <Textarea
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                rows={3}
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                Variables disponibles: {"{nombre}"}, {"{fecha}"}, {"{hora}"}, {"{tipo}"}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs text-muted-foreground">Fecha de las citas</Label>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="bg-muted/50 border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generateReminders.isPending}
              className="gap-2"
            >
              {generateReminders.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              Generar Recordatorios
            </Button>
          </div>

          {/* Warning for patients without phone */}
          {patientsNoPhone.length > 0 && (
            <div className="flex items-start gap-2 bg-warning/10 text-warning rounded-lg px-3 py-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="text-xs">
                <span className="font-medium">{patientsNoPhone.length} paciente{patientsNoPhone.length > 1 ? "s" : ""} activo{patientsNoPhone.length > 1 ? "s" : ""} sin teléfono:</span>{" "}
                {patientsNoPhone.slice(0, 5).map((p) => p.name).join(", ")}
                {patientsNoPhone.length > 5 && ` y ${patientsNoPhone.length - 5} más`}
              </div>
            </div>
          )}
        </div>

        {/* Bulk actions */}
        {pendingReminders.length > 0 && (
          <div className="flex items-center justify-between bg-card border rounded-lg px-4 py-3">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedIds.size === pendingReminders.length && pendingReminders.length > 0}
                onCheckedChange={(checked) => checked ? selectAllPending() : deselectAll()}
              />
              <span className="text-sm text-muted-foreground">
                {selectedIds.size > 0
                  ? `${selectedIds.size} seleccionado${selectedIds.size > 1 ? "s" : ""}`
                  : `${pendingReminders.length} pendiente${pendingReminders.length > 1 ? "s" : ""}`}
              </span>
            </div>
            <Button
              onClick={handleBulkSend}
              disabled={selectedIds.size === 0 || isSendingBulk}
              className="gap-2"
              variant={selectedIds.size > 0 ? "default" : "outline"}
            >
              {isSendingBulk ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageCircle className="h-4 w-4" />
              )}
              Enviar {selectedIds.size > 0 ? `(${selectedIds.size})` : "Seleccionados"} por WhatsApp
            </Button>
          </div>
        )}

        {/* Reminders list by date */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : reminders.length === 0 ? (
          <div className="text-center py-12 bg-card border rounded-xl">
            <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-medium text-foreground">No hay recordatorios</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Genera recordatorios automáticos para las citas de mañana
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(remindersByDate).map(([date, dateReminders]) => (
              <div key={date} className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {formatDateLabel(date)}
                  <span className="text-xs font-normal">({dateReminders.length})</span>
                </h3>
                <div className="space-y-2">
                  {dateReminders.map((reminder) => {
                    const statusConfig = getStatusConfig(reminder.status);
                    const StatusIcon = statusConfig.icon;
                    const isPending = reminder.status === "pending";

                    return (
                      <div
                        key={reminder.id}
                        className={cn(
                          "bg-card border rounded-lg p-4 transition-colors",
                          isPending && selectedIds.has(reminder.id) && "ring-2 ring-primary/30 bg-primary/5"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {isPending && (
                            <Checkbox
                              checked={selectedIds.has(reminder.id)}
                              onCheckedChange={() => toggleSelect(reminder.id)}
                              className="mt-1"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-foreground">{reminder.patient_name}</p>
                              <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 border", statusConfig.className)}>
                                <StatusIcon className="h-3 w-3" />
                                {statusConfig.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {reminder.session_time}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {reminder.contact}
                              </span>
                            </div>
                            {reminder.message && (
                              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 italic">
                                "{reminder.message}"
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isPending && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendSingleWhatsApp(reminder)}
                                className="gap-1 h-8"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Enviar</span>
                              </Button>
                            )}
                            {(isPending || reminder.status === "sent") && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => updateReminder.mutate({ id: reminder.id, status: "confirmed" })}
                                  className="h-8 w-8 text-success hover:text-success"
                                  title="Marcar confirmado"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => updateReminder.mutate({ id: reminder.id, status: "failed" })}
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  title="Marcar fallido"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteReminder.mutate(reminder.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              title="Eliminar"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
