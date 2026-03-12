import type { PortalSession } from "@/hooks/usePatientPortal";
import { Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  sessions: PortalSession[];
}

export function PortalSessions({ sessions }: Props) {
  const formatDate = (isoStr: string) => {
    const date = new Date(isoStr);
    return date.toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const formatTime = (isoStr: string) => {
    const date = new Date(isoStr);
    return date.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDurationMinutes = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.round(diff / 60000);
  };

  const typeLabels: Record<string, string> = {
    evaluation: 'Evaluación',
    therapy: 'Terapia',
    followup: 'Seguimiento',
    follow_up: 'Seguimiento',
  };

  const statusConfig: Record<string, { label: string; className: string }> = {
    scheduled: { label: 'Agendada', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    confirmed: { label: 'Confirmada', className: 'bg-primary/10 text-primary' },
    completed: { label: 'Completada', className: 'bg-success/10 text-success' },
    cancelled: { label: 'Cancelada', className: 'bg-destructive/10 text-destructive' },
    no_show: { label: 'No asistió', className: 'bg-warning/10 text-warning' },
  };

  const now = new Date().toISOString();
  const upcoming = sessions.filter(s => s.start_time >= now && (s.status === 'scheduled' || s.status === 'confirmed'));
  const past = sessions.filter(s => s.start_time < now || (s.status !== 'scheduled' && s.status !== 'confirmed'));

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No hay citas registradas</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Las próximas citas aparecerán aquí
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Próximas citas */}
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Próximas Citas</h3>
          <div className="space-y-3">
            {upcoming.map((session) => (
              <div
                key={session.id}
                className="bg-card rounded-xl border border-primary/20 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground capitalize">
                      {formatDate(session.start_time)}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {formatTime(session.start_time)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {getDurationMinutes(session.start_time, session.end_time)} min
                      </span>
                    </div>
                    {session.title && (
                      <p className="text-xs text-muted-foreground mt-1">{session.title}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                      {typeLabels[session.session_type] || session.session_type}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial */}
      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Historial</h3>
          <div className="space-y-2">
            {past.map((session) => {
              const sc = statusConfig[session.status] || statusConfig.completed;
              return (
                <div
                  key={session.id}
                  className="bg-card rounded-lg border p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground capitalize">
                      {formatDate(session.start_time)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(session.start_time)} · {typeLabels[session.session_type] || session.session_type}
                    </p>
                  </div>
                  <span className={cn("text-xs font-medium px-2 py-1 rounded-full", sc.className)}>
                    {sc.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
