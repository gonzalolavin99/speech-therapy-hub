import { Bell, Clock, Check, MessageCircle, Mail, ChevronRight, Plus, Trash2, Send, CheckCircle, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useReminders, Reminder, ReminderFormData } from "@/hooks/useReminders";
import { usePatients } from "@/hooks/usePatients";
import { useTasks, TaskFormData } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ReminderWidget() {
  const { reminders, isLoading: remindersLoading, markAsSent, createReminder, updateReminder, deleteReminder } = useReminders();
  const { tasks, isLoading: tasksLoading, createTask, toggleTask, deleteTask } = useTasks();
  const { patients } = usePatients();
  const [showFullPanel, setShowFullPanel] = useState(false);
  const [activeTab, setActiveTab] = useState("citas");
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [showNewReminderForm, setShowNewReminderForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", due_date: "" });
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [newReminder, setNewReminder] = useState({
    contact: "",
    sessionDate: "",
    sessionTime: "",
    method: "whatsapp" as "whatsapp" | "email" | "sms",
  });
  
  // Estado para el modal de envío
  const [sendModalReminder, setSendModalReminder] = useState<Reminder | null>(null);
  const [sendMethod, setSendMethod] = useState<"whatsapp" | "email">("whatsapp");
  const [sendMessage, setSendMessage] = useState("");

  const pendingReminders = reminders.filter(r => r.status === "pending" || r.status === "sent");
  const pendingTasks = tasks.filter(t => !t.completed);
  const totalPending = pendingReminders.length + pendingTasks.length;

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const openSendModal = (reminder: Reminder) => {
    setSendModalReminder(reminder);
    setSendMethod("whatsapp");
    setSendMessage(`Hola ${reminder.patient_name}, te recordamos tu cita de fonoaudiología el día ${reminder.session_date} a las ${reminder.session_time}. ¿Confirmas tu asistencia?`);
  };

  const handleSendMessage = () => {
    if (!sendModalReminder) return;
    
    if (sendMethod === "whatsapp") {
      const phone = sendModalReminder.contact.replace(/\D/g, "");
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(sendMessage)}`, "_blank");
    } else {
      const subject = encodeURIComponent(`Recordatorio de cita - ${sendModalReminder.session_date}`);
      window.open(`mailto:${sendModalReminder.contact}?subject=${subject}&body=${encodeURIComponent(sendMessage)}`, "_blank");
    }
    
    markAsSent.mutate(sendModalReminder.id);
    setSendModalReminder(null);
  };

  const sendWhatsAppReminder = (reminder: Reminder) => {
    openSendModal(reminder);
  };

  const sendEmailReminder = (reminder: Reminder) => {
    openSendModal(reminder);
  };

  const handleCreateTask = () => {
    if (!newTask.title.trim()) return;
    createTask.mutate({ 
      title: newTask.title, 
      description: newTask.description || null,
      due_date: newTask.due_date || null 
    }, {
      onSuccess: () => {
        setNewTask({ title: "", description: "", due_date: "" });
        setShowNewTaskForm(false);
      }
    });
  };

  const handleCreateReminder = () => {
    if (!selectedPatient || !newReminder.sessionDate || !newReminder.sessionTime) return;
    const data: ReminderFormData = {
      patient_id: selectedPatient.id,
      patient_name: selectedPatient.name,
      method: newReminder.method,
      contact: newReminder.contact || (newReminder.method === "email" ? selectedPatient.email || "" : selectedPatient.phone || ""),
      session_date: newReminder.sessionDate,
      session_time: newReminder.sessionTime,
    };
    createReminder.mutate(data, {
      onSuccess: () => {
        setNewReminder({ contact: "", sessionDate: "", sessionTime: "", method: "whatsapp" });
        setSelectedPatientId("");
        setShowNewReminderForm(false);
      }
    });
  };

  return (
    <>
      <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Recordatorios
            </div>
            {totalPending > 0 && (
              <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                {totalPending}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {remindersLoading || tasksLoading ? (
            <p className="text-xs text-muted-foreground">Cargando...</p>
          ) : totalPending === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              Sin pendientes
            </p>
          ) : (
            <>
              {pendingReminders.slice(0, 2).map((reminder) => (
                <div key={reminder.id} className="flex items-center justify-between bg-background rounded-lg p-2 text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{reminder.patient_name}</p>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {reminder.session_date}
                    </p>
                  </div>
                  {reminder.status === "pending" && (
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => 
                      reminder.method === "whatsapp" ? sendWhatsAppReminder(reminder) : sendEmailReminder(reminder)
                    }>
                      <Send className="h-3 w-3 text-primary" />
                    </Button>
                  )}
                </div>
              ))}
              {pendingTasks.slice(0, 2).map((task) => (
                <div key={task.id} className="flex items-center gap-2 bg-background rounded-lg p-2 text-xs">
                  <button onClick={() => toggleTask.mutate(task.id)} className="h-4 w-4 rounded border flex items-center justify-center hover:bg-primary/10">
                    {task.completed && <Check className="h-3 w-3 text-primary" />}
                  </button>
                  <span className="truncate flex-1">{task.title}</span>
                </div>
              ))}
              {totalPending > 4 && (
                <p className="text-xs text-muted-foreground text-center">+{totalPending - 4} más</p>
              )}
            </>
          )}
          <Button variant="ghost" size="sm" className="w-full text-xs h-8" onClick={() => setShowFullPanel(true)}>
            Ver todos <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showFullPanel} onOpenChange={setShowFullPanel}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recordatorios y Tareas
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="citas">Citas ({pendingReminders.length})</TabsTrigger>
              <TabsTrigger value="tareas">Tareas ({pendingTasks.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="citas" className="space-y-4 mt-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setShowNewReminderForm(!showNewReminderForm)}>
                  <Plus className="h-4 w-4 mr-1" /> Nuevo Recordatorio
                </Button>
              </div>

              {showNewReminderForm && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Paciente</Label>
                      <Select value={selectedPatientId} onValueChange={(v) => {
                        setSelectedPatientId(v);
                        const p = patients.find(pt => pt.id === v);
                        if (p) setNewReminder(prev => ({ ...prev, contact: prev.method === "email" ? p.email || "" : p.phone || "" }));
                      }}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Método</Label>
                      <Select value={newReminder.method} onValueChange={(v: any) => setNewReminder(prev => ({ ...prev, method: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Contacto</Label>
                      <Input className="h-8 text-xs" value={newReminder.contact} onChange={e => setNewReminder(prev => ({ ...prev, contact: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Fecha</Label>
                      <Input type="date" className="h-8 text-xs" value={newReminder.sessionDate} onChange={e => setNewReminder(prev => ({ ...prev, sessionDate: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Hora</Label>
                      <Input type="time" className="h-8 text-xs" value={newReminder.sessionTime} onChange={e => setNewReminder(prev => ({ ...prev, sessionTime: e.target.value }))} />
                    </div>
                  </div>
                  <Button size="sm" className="w-full" onClick={handleCreateReminder} disabled={createReminder.isPending}>
                    {createReminder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear Recordatorio"}
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                {pendingReminders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay recordatorios de citas pendientes</p>
                ) : (
                  pendingReminders.map(reminder => (
                    <div key={reminder.id} className="flex items-center justify-between bg-card border rounded-lg p-3">
                      <div>
                        <p className="font-medium text-sm">{reminder.patient_name}</p>
                        <p className="text-xs text-muted-foreground">{reminder.session_date} a las {reminder.session_time}</p>
                        <p className="text-xs text-muted-foreground">{reminder.contact}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {reminder.status === "pending" && (
                          <Button size="sm" variant="outline" onClick={() => 
                            reminder.method === "whatsapp" ? sendWhatsAppReminder(reminder) : sendEmailReminder(reminder)
                          }>
                            {reminder.method === "whatsapp" ? <MessageCircle className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => updateReminder.mutate({ id: reminder.id, status: "confirmed" })}>
                          <CheckCircle className="h-4 w-4 text-success" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteReminder.mutate(reminder.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="tareas" className="space-y-4 mt-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setShowNewTaskForm(!showNewTaskForm)}>
                  <Plus className="h-4 w-4 mr-1" /> Nueva Tarea
                </Button>
              </div>

              {showNewTaskForm && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Título</Label>
                    <Input className="h-8 text-xs" placeholder="Ej: Comprar materiales" value={newTask.title} onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Descripción (opcional)</Label>
                      <Input className="h-8 text-xs" value={newTask.description} onChange={e => setNewTask(prev => ({ ...prev, description: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Fecha límite (opcional)</Label>
                      <Input type="date" className="h-8 text-xs" value={newTask.due_date} onChange={e => setNewTask(prev => ({ ...prev, due_date: e.target.value }))} />
                    </div>
                  </div>
                  <Button size="sm" className="w-full" onClick={handleCreateTask} disabled={createTask.isPending}>
                    {createTask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear Tarea"}
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay tareas pendientes</p>
                ) : (
                  tasks.map(task => (
                    <div key={task.id} className={cn("flex items-center gap-3 bg-card border rounded-lg p-3", task.completed && "opacity-50")}>
                      <button onClick={() => toggleTask.mutate(task.id)} className={cn("h-5 w-5 rounded border-2 flex items-center justify-center", task.completed ? "bg-primary border-primary" : "border-muted-foreground")}>
                        {task.completed && <Check className="h-3 w-3 text-primary-foreground" />}
                      </button>
                      <div className="flex-1">
                        <p className={cn("text-sm font-medium", task.completed && "line-through")}>{task.title}</p>
                        {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                        {task.due_date && <p className="text-xs text-muted-foreground">Vence: {task.due_date}</p>}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => deleteTask.mutate(task.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Modal para enviar mensaje */}
      <Dialog open={!!sendModalReminder} onOpenChange={() => setSendModalReminder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Enviar Recordatorio
            </DialogTitle>
          </DialogHeader>
          {sendModalReminder && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium text-sm">{sendModalReminder.patient_name}</p>
                <p className="text-xs text-muted-foreground">{sendModalReminder.session_date} a las {sendModalReminder.session_time}</p>
                <p className="text-xs text-muted-foreground">{sendModalReminder.contact}</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Método de envío</Label>
                <div className="flex gap-2">
                  <Button 
                    type="button"
                    variant={sendMethod === "whatsapp" ? "default" : "outline"} 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setSendMethod("whatsapp")}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button 
                    type="button"
                    variant={sendMethod === "email" ? "default" : "outline"} 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setSendMethod("email")}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Mensaje</Label>
                <Textarea
                  value={sendMessage}
                  onChange={(e) => setSendMessage(e.target.value)}
                  rows={4}
                  className="text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSendModalReminder(null)}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={handleSendMessage}>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
