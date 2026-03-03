import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  Mic2,
  Brain,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { getProfessionConfig } from "@/config/professions";
import type { ProfessionId } from "@/config/professions";

interface PendingProfile {
  id: string;
  user_id: string;
  full_name: string;
  profession: ProfessionId;
  institution: string | null;
  city: string | null;
  specialties: string | null;
  approved: boolean;
  onboarding_completed: boolean;
  created_at: string;
  email?: string;
}

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "incomplete">("all");
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const [profilesRes, emailsRes] = await Promise.all([
        supabase
          .from("professional_profiles")
          .select("id, user_id, full_name, profession, institution, city, specialties, approved, onboarding_completed, created_at")
          .order("created_at", { ascending: false }),
        supabase.rpc("get_user_emails"),
      ]);

      if (profilesRes.error) throw profilesRes.error;

      const emailMap = new Map<string, string>();
      if (!emailsRes.error && emailsRes.data) {
        (emailsRes.data as { user_id: string; email: string }[]).forEach((e) =>
          emailMap.set(e.user_id, e.email)
        );
      }

      return (profilesRes.data as PendingProfile[]).map((p) => ({
        ...p,
        email: emailMap.get(p.user_id) || undefined,
      }));
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase
        .from("professional_profiles")
        .update({ approved })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast.success(approved ? "Cuenta aprobada" : "Cuenta rechazada");
    },
    onError: (error: Error) => {
      toast.error("Error al actualizar", { description: error.message });
    },
  });

  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.institution || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "incomplete" && !p.onboarding_completed) ||
      (statusFilter === "pending" && p.onboarding_completed && !p.approved) ||
      (statusFilter === "approved" && p.approved);
    return matchesSearch && matchesStatus;
  });

  const pendingCount = profiles.filter((p) => p.onboarding_completed && !p.approved).length;
  const incompleteCount = profiles.filter((p) => !p.onboarding_completed).length;

  const professionIcon = (prof: ProfessionId) =>
    prof === "psicologo" ? (
      <Brain className="h-4 w-4" />
    ) : (
      <Mic2 className="h-4 w-4" />
    );

  return (
    <AppLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Gestión de Usuarios
            </h1>
            <p className="text-muted-foreground mt-1">
              Aprueba o administra cuentas de profesionales
            </p>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-lg">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">{pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o institución..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos ({profiles.length})</SelectItem>
              <SelectItem value="incomplete">Sin onboarding ({incompleteCount})</SelectItem>
              <SelectItem value="pending">Pendientes ({pendingCount})</SelectItem>
              <SelectItem value="approved">Aprobados ({profiles.filter(p => p.approved).length})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users Table */}
        <div className="bg-card rounded-xl border overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Profesional</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Profesión</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Institución</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Ciudad</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Estado</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center">
                    <UserCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-muted-foreground">No hay usuarios que mostrar</p>
                  </td>
                </tr>
              )}
              {filteredProfiles.map((profile) => {
                const config = getProfessionConfig(profile.profession);
                return (
                  <tr key={profile.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="p-4">
                      <span className="font-medium text-card-foreground">{profile.full_name}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-muted-foreground">{profile.email || '-'}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm">
                        {professionIcon(profile.profession)}
                        <span>{config.label}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground text-sm">{profile.institution || "-"}</td>
                    <td className="p-4 text-muted-foreground text-sm">{profile.city || "-"}</td>
                    <td className="p-4">
                      {!profile.onboarding_completed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                          <Clock className="h-3 w-3" />
                          Sin onboarding
                        </span>
                      ) : profile.approved ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/10 text-success rounded-full text-xs font-medium">
                          <CheckCircle className="h-3 w-3" />
                          Aprobado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium">
                          <Clock className="h-3 w-3" />
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {!profile.approved ? (
                          <Button
                            size="sm"
                            className="bg-success hover:bg-success/90 text-white"
                            onClick={() => approveMutation.mutate({ id: profile.id, approved: true })}
                            disabled={approveMutation.isPending}
                          >
                            <UserCheck className="h-3.5 w-3.5 mr-1" />
                            Aprobar
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => approveMutation.mutate({ id: profile.id, approved: false })}
                            disabled={approveMutation.isPending}
                          >
                            <UserX className="h-3.5 w-3.5 mr-1" />
                            Revocar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
