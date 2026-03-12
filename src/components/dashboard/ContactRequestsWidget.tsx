import { useState } from "react";
import { useContactRequests, ContactRequest } from "@/hooks/useContactRequests";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  Archive,
  Eye,
  ChevronDown,
  ChevronUp,
  User,
  Stethoscope,
  FileSearch,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SERVICE_LABELS: Record<string, string> = {
  session: "Sesión de terapia",
  evaluation: "Evaluación diagnóstica",
  consultation: "Consulta general",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pendiente", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400", icon: Clock },
  read: { label: "Leída", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400", icon: Eye },
  contacted: { label: "Contactado", color: "text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400", icon: CheckCircle2 },
  archived: { label: "Archivada", color: "text-muted-foreground bg-muted", icon: Archive },
};

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Justo ahora";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return date.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

export function ContactRequestsWidget() {
  const { requests, isLoading, pendingCount, updateStatus } = useContactRequests();
  const [expanded, setExpanded] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  if (isLoading) return null;

  const filtered = showArchived
    ? requests
    : requests.filter((r) => r.status !== "archived");

  const displayed = expanded ? filtered : filtered.slice(0, 3);

  if (requests.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          Solicitudes de Contacto
          {pendingCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </h3>
        {filtered.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                Ver menos <ChevronUp className="h-3 w-3 ml-1" />
              </>
            ) : (
              <>
                Ver todas ({filtered.length}) <ChevronDown className="h-3 w-3 ml-1" />
              </>
            )}
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {displayed.map((req) => (
          <ContactRequestCard
            key={req.id}
            request={req}
            onStatusChange={(status) =>
              updateStatus.mutate({ id: req.id, status })
            }
          />
        ))}
      </div>

      {requests.some((r) => r.status === "archived") && (
        <button
          className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowArchived(!showArchived)}
        >
          {showArchived ? "Ocultar archivadas" : "Mostrar archivadas"}
        </button>
      )}
    </div>
  );
}

function ContactRequestCard({
  request,
  onStatusChange,
}: {
  request: ContactRequest;
  onStatusChange: (status: ContactRequest["status"]) => void;
}) {
  const statusConf = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConf.icon;

  // Auto-mark as read when viewing
  const handleInteraction = () => {
    if (request.status === "pending") {
      onStatusChange("read");
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-2 transition-colors",
        request.status === "pending" && "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-800/30",
        request.status === "archived" && "opacity-60"
      )}
      onClick={handleInteraction}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{request.name}</p>
            <p className="text-xs text-muted-foreground">
              {SERVICE_LABELS[request.service_type] || request.service_type}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", statusConf.color)}>
            {statusConf.label}
          </span>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {formatRelativeDate(request.created_at)}
          </span>
        </div>
      </div>

      {/* Contact info */}
      <div className="flex flex-wrap gap-3 text-xs">
        {request.phone && (
          <a
            href={`tel:${request.phone}`}
            className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="h-3 w-3" />
            {request.phone}
          </a>
        )}
        {request.email && (
          <a
            href={`mailto:${request.email}`}
            className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Mail className="h-3 w-3" />
            {request.email}
          </a>
        )}
      </div>

      {/* Message */}
      {request.message && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2 line-clamp-2">
          {request.message}
        </p>
      )}

      {/* Actions */}
      {request.status !== "archived" && (
        <div className="flex gap-2 pt-1">
          {request.phone && (
            <a
              href={`https://wa.me/${request.phone.replace(/[^0-9+]/g, "")}?text=${encodeURIComponent(`Hola ${request.name}, recibí tu solicitud a través de TherapyHub.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <Button variant="outline" size="sm" className="h-7 text-xs bg-[#25D366]/10 border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/20">
                <MessageSquare className="h-3 w-3 mr-1" />
                WhatsApp
              </Button>
            </a>
          )}
          {request.status !== "contacted" && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange("contacted");
              }}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Contactado
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange("archived");
            }}
          >
            <Archive className="h-3 w-3 mr-1" />
            Archivar
          </Button>
        </div>
      )}
    </div>
  );
}
