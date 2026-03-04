import { Building, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClinic } from "@/hooks/useClinic";
import { useNavigate } from "react-router-dom";

export function ClinicInviteBanner() {
  const { isClinicMember, pendingInvitations, isLoading } = useClinic();
  const navigate = useNavigate();

  if (isLoading || isClinicMember || pendingInvitations.length === 0) return null;

  const inv = pendingInvitations[0];

  return (
    <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Building className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-card-foreground">
            Invitación a <span className="text-primary">{inv.clinic_name}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Te han invitado como {inv.role === "clinic_admin" ? "administrador" : "profesional"}
          </p>
        </div>
      </div>
      <Button size="sm" onClick={() => navigate("/clinica")}>
        Ver invitación
        <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
