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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  Mic2,
  Brain,
  Shield,
  Crown,
  CreditCard,
  AlertTriangle,
  Sparkles,
  Building,
  Users,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { getProfessionConfig } from "@/config/professions";
import type { ProfessionId } from "@/config/professions";
import type { PlanId, Subscription } from "@/config/subscriptions";
import { getTrialDaysRemaining, formatPriceCLP } from "@/config/subscriptions";

interface ClinicInfo {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
}

interface ClinicMemberInfo {
  id: string;
  clinic_id: string;
  user_id: string | null;
  email: string;
  role: 'clinic_admin' | 'member';
  status: 'invited' | 'active' | 'suspended' | 'removed';
}

interface UserProfile {
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
  subscription?: Subscription | null;
  clinicMember?: ClinicMemberInfo | null;
  clinic?: ClinicInfo | null;
}

const PLAN_LABELS: Record<PlanId, string> = {
  free: "Free",
  trial: "Trial",
  professional: "Profesional",
  clinic: "Clínica",
  vip: "VIP",
};

const PLAN_COLORS: Record<PlanId, string> = {
  free: "bg-muted text-muted-foreground",
  trial: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  professional: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400",
  clinic: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  vip: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
};

const PLAN_ICONS: Record<PlanId, React.ReactNode> = {
  free: null,
  trial: <Clock className="h-3 w-3" />,
  professional: <CreditCard className="h-3 w-3" />,
  clinic: <Sparkles className="h-3 w-3" />,
  vip: <Crown className="h-3 w-3" />,
};

export default function AdminUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "incomplete">("all");
  const [planFilter, setPlanFilter] = useState<"all" | PlanId>("all");
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editPlan, setEditPlan] = useState<PlanId>("free");
  const [editNotes, setEditNotes] = useState("");
  const [editTrialDays, setEditTrialDays] = useState("");
  const [editClinicRole, setEditClinicRole] = useState<string>("none");
  const [editClinicId, setEditClinicId] = useState<string>("");
  const queryClient = useQueryClient();

  // Fetch profiles + emails + subscriptions
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const [profilesRes, emailsRes, subsRes, clinicsRes, membersRes] = await Promise.all([
        supabase
          .from("professional_profiles")
          .select("id, user_id, full_name, profession, institution, city, specialties, approved, onboarding_completed, created_at")
          .order("created_at", { ascending: false }),
        supabase.rpc("get_user_emails"),
        supabase.from("subscriptions").select("*"),
        supabase.from("clinics").select("id, name, slug, owner_id"),
        supabase.from("clinic_members").select("id, clinic_id, user_id, email, role, status").neq("status", "removed"),
      ]);

      if (profilesRes.error) throw profilesRes.error;

      const emailMap = new Map<string, string>();
      if (!emailsRes.error && emailsRes.data) {
        (emailsRes.data as { user_id: string; email: string }[]).forEach((e) =>
          emailMap.set(e.user_id, e.email)
        );
      }

      const subsMap = new Map<string, Subscription>();
      if (!subsRes.error && subsRes.data) {
        (subsRes.data as Subscription[]).forEach((s) =>
          subsMap.set(s.user_id, s)
        );
      }

      const clinicsMap = new Map<string, ClinicInfo>();
      if (!clinicsRes.error && clinicsRes.data) {
        (clinicsRes.data as ClinicInfo[]).forEach((c) => clinicsMap.set(c.id, c));
      }

      const membersByUser = new Map<string, ClinicMemberInfo>();
      if (!membersRes.error && membersRes.data) {
        (membersRes.data as ClinicMemberInfo[]).forEach((m) => {
          if (m.user_id) membersByUser.set(m.user_id, m);
        });
      }

      return (profilesRes.data as UserProfile[]).map((p) => {
        const cm = membersByUser.get(p.user_id) || null;
        return {
          ...p,
          email: emailMap.get(p.user_id) || undefined,
          subscription: subsMap.get(p.user_id) || null,
          clinicMember: cm,
          clinic: cm ? clinicsMap.get(cm.clinic_id) || null : null,
        };
      });
    },
  });

  // Approve/reject mutation
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

  // Change plan mutation
  const changePlanMutation = useMutation({
    mutationFn: async ({
      userId,
      plan,
      notes,
      trialDays,
    }: {
      userId: string;
      plan: PlanId;
      notes?: string;
      trialDays?: number;
    }) => {
      // Calculate expiry for trial, professional gift, and clinic gift
      const needsExpiry = ["trial", "professional", "clinic"].includes(plan) && trialDays;
      const trialEndsAt = needsExpiry
        ? new Date(Date.now() + trialDays! * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase.rpc("admin_update_subscription", {
        target_user_id: userId,
        new_plan: plan,
        new_status: "active",
        new_trial_ends_at: trialEndsAt,
        notes: notes || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast.success("Plan actualizado");
      setEditingUser(null);
    },
    onError: (error: Error) => {
      toast.error("Error al cambiar plan", { description: error.message });
    },
  });

  // Fetch clinics for the clinic assignment dropdown
  const { data: allClinics = [] } = useQuery({
    queryKey: ["admin-clinics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clinics").select("id, name, slug, owner_id");
      if (error) return [];
      return data as ClinicInfo[];
    },
  });

  // Clinic membership mutation
  const clinicMemberMutation = useMutation({
    mutationFn: async (params: { userId: string; email: string; clinicId: string | null; role: string }) => {
      if (!params.clinicId || params.role === 'none') {
        // Remove from clinic — delete existing membership
        const { error } = await supabase
          .from('clinic_members')
          .update({ status: 'removed' })
          .eq('user_id', params.userId);
        if (error) throw error;
      } else {
        // Check if already in a clinic
        const { data: existing } = await supabase
          .from('clinic_members')
          .select('id')
          .eq('user_id', params.userId)
          .in('status', ['active', 'invited'])
          .single();

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('clinic_members')
            .update({ clinic_id: params.clinicId, role: params.role, status: 'active' })
            .eq('user_id', params.userId)
            .in('status', ['active', 'invited']);
          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from('clinic_members')
            .insert({
              clinic_id: params.clinicId,
              user_id: params.userId,
              email: params.email,
              role: params.role,
              status: 'active',
              joined_at: new Date().toISOString(),
            });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast.success('Membresía de clínica actualizada');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar clínica', { description: error.message });
    },
  });

  const openEditPlan = (profile: UserProfile) => {
    setEditingUser(profile);
    setEditPlan(profile.subscription?.plan || "free");
    setEditNotes(profile.subscription?.admin_notes || "");
    setEditTrialDays("30");
    setEditClinicRole(profile.clinicMember?.role || 'none');
    setEditClinicId(profile.clinicMember?.clinic_id || '');
  };

  const handleSavePlan = () => {
    if (!editingUser) return;
    const needsDays = ["trial", "professional", "clinic"].includes(editPlan);
    changePlanMutation.mutate({
      userId: editingUser.user_id,
      plan: editPlan,
      notes: editNotes,
      trialDays: needsDays ? parseInt(editTrialDays) || 30 : undefined,
    });

    // Also update clinic membership if changed
    const currentClinicRole = editingUser.clinicMember?.role || 'none';
    const currentClinicId = editingUser.clinicMember?.clinic_id || '';
    if (editClinicRole !== currentClinicRole || editClinicId !== currentClinicId) {
      clinicMemberMutation.mutate({
        userId: editingUser.user_id,
        email: editingUser.email || '',
        clinicId: editClinicRole === 'none' ? null : editClinicId,
        role: editClinicRole,
      });
    }
  };

  // Filtering
  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.institution || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "incomplete" && !p.onboarding_completed) ||
      (statusFilter === "pending" && p.onboarding_completed && !p.approved) ||
      (statusFilter === "approved" && p.approved);
    const matchesPlan =
      planFilter === "all" || (p.subscription?.plan || "free") === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const pendingCount = profiles.filter((p) => p.onboarding_completed && !p.approved).length;
  const incompleteCount = profiles.filter((p) => !p.onboarding_completed).length;

  const professionIcon = (prof: ProfessionId) =>
    prof === "psicologo" ? <Brain className="h-4 w-4" /> : <Mic2 className="h-4 w-4" />;

  const getPlanBadge = (sub: Subscription | null | undefined) => {
    const plan = (sub?.plan || "free") as PlanId;
    const trialDays = getTrialDaysRemaining(sub || null);
    const isExpiredTrial = plan === "trial" && trialDays !== null && trialDays <= 0;

    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
        isExpiredTrial ? "bg-destructive/10 text-destructive" : PLAN_COLORS[plan]
      )}>
        {PLAN_ICONS[plan]}
        {isExpiredTrial ? "Trial expirado" : PLAN_LABELS[plan]}
        {trialDays !== null && trialDays > 0 && (
          <span className="text-[10px] opacity-70">({trialDays}d)</span>
        )}
      </span>
    );
  };

  // Stats
  const planCounts = profiles.reduce<Record<string, number>>((acc, p) => {
    const plan = p.subscription?.plan || "free";
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {});

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
              Aprueba cuentas y gestiona suscripciones
            </p>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-lg">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">{pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>

        {/* Plan Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {(["free", "trial", "professional", "clinic", "vip"] as PlanId[]).map((plan) => (
            <button
              key={plan}
              onClick={() => setPlanFilter(planFilter === plan ? "all" : plan)}
              className={cn(
                "rounded-xl border p-3 text-center transition-all hover:shadow-sm",
                planFilter === plan ? "ring-2 ring-primary border-primary" : "bg-card"
              )}
            >
              <p className="text-2xl font-bold">{planCounts[plan] || 0}</p>
              <p className="text-xs text-muted-foreground">{PLAN_LABELS[plan]}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, email o institución..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="w-44">
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
          <table className="w-full min-w-[850px]">
            <thead>
              <tr className="border-b bg-muted/50 dark:bg-muted/20">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Profesional</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Profesión</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Plan</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Clínica</th>
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
                      <div>
                        <span className="font-medium text-card-foreground">{profile.full_name}</span>
                        {profile.institution && (
                          <p className="text-xs text-muted-foreground">{profile.institution}</p>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-muted-foreground">{profile.email || "-"}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm">
                        {professionIcon(profile.profession)}
                        <span>{config.label}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {getPlanBadge(profile.subscription)}
                    </td>
                    <td className="p-4">
                      {profile.clinicMember && profile.clinic ? (
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                            profile.clinicMember.role === 'clinic_admin'
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                              : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                          )}>
                            {profile.clinicMember.role === 'clinic_admin' ? <Shield className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                            {profile.clinicMember.role === 'clinic_admin' ? 'Admin' : 'Miembro'}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[80px]" title={profile.clinic.name}>
                            {profile.clinic.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
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
                          <AlertTriangle className="h-3 w-3" />
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditPlan(profile)}
                        >
                          <Crown className="h-3.5 w-3.5 mr-1" />
                          Plan
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Plan Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Cambiar Plan</DialogTitle>
            <DialogDescription>
              {editingUser?.full_name} — {editingUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Current plan info */}
            {editingUser?.subscription && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Plan actual:</span>
                {getPlanBadge(editingUser.subscription)}
                {editingUser.subscription.admin_override && (
                  <span className="text-[10px] text-muted-foreground">(asignado por admin)</span>
                )}
              </div>
            )}

            {/* New plan select */}
            <div className="space-y-2">
              <Label>Nuevo plan</Label>
              <Select value={editPlan} onValueChange={(v) => setEditPlan(v as PlanId)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free — $0</SelectItem>
                  <SelectItem value="trial">Trial (temporal)</SelectItem>
                  <SelectItem value="professional">Profesional — regalo temporal</SelectItem>
                  <SelectItem value="clinic">Clínica — regalo temporal</SelectItem>
                  <SelectItem value="vip">VIP — Acceso completo permanente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Days input for temporal plans */}
            {["trial", "professional", "clinic"].includes(editPlan) && (
              <div className="space-y-2">
                <Label>Días de vigencia</Label>
                <Input
                  type="number"
                  value={editTrialDays}
                  onChange={(e) => setEditTrialDays(e.target.value)}
                  min={1}
                  max={365}
                  placeholder="30"
                />
                <p className="text-xs text-muted-foreground">
                  {editPlan === "trial" && "Período de prueba con acceso profesional"}
                  {editPlan === "professional" && "Acceso Profesional gratuito por tiempo limitado"}
                  {editPlan === "clinic" && "Acceso Clínica gratuito por tiempo limitado"}
                </p>
              </div>
            )}

            {editPlan === "vip" && (
              <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-lg p-3">
                ⚡ Acceso completo sin límites ni fecha de expiración. Ideal para partners y testers.
              </p>
            )}

            {/* Clinic Membership */}
            <div className="space-y-2 border-t pt-4">
              <Label className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Membresía de Clínica
              </Label>
              <Select value={editClinicRole} onValueChange={(v) => setEditClinicRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin clínica</SelectItem>
                  <SelectItem value="clinic_admin">Admin de Clínica</SelectItem>
                  <SelectItem value="member">Miembro de Clínica</SelectItem>
                </SelectContent>
              </Select>
              {editClinicRole !== "none" && (
                <div className="space-y-2">
                  <Label>Clínica</Label>
                  {allClinics.length > 0 ? (
                    <Select value={editClinicId} onValueChange={(v) => setEditClinicId(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar clínica" />
                      </SelectTrigger>
                      <SelectContent>
                        {allClinics.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xs text-muted-foreground">No hay clínicas creadas aún</p>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {editClinicRole === "clinic_admin" && "Podrá gestionar miembros e invitar profesionales"}
                {editClinicRole === "member" && "Heredará el plan de la clínica a la que pertenece"}
                {editClinicRole === "none" && "El usuario usará su propio plan individual"}
              </p>
            </div>

            {/* Admin notes */}
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Ej: Cliente VIP, partner, tester..."
                rows={2}
              />
            </div>

            <Button
              onClick={handleSavePlan}
              disabled={changePlanMutation.isPending || clinicMemberMutation.isPending}
              className="w-full"
            >
              {(changePlanMutation.isPending || clinicMemberMutation.isPending) ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
