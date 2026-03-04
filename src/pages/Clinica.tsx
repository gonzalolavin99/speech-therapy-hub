import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building,
  Users,
  UserPlus,
  Mail,
  Shield,
  Crown,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Settings,
  Send,
  Trash2,
  AlertTriangle,
  Mic2,
  Brain,
  MapPin,
  Phone,
  Globe,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useClinic } from "@/hooks/useClinic";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import type { ProfessionId } from "@/config/professions";

export default function Clinica() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    clinic,
    membership,
    members,
    pendingInvitations,
    isClinicAdmin,
    isClinicMember,
    isLoading,
    createClinic,
    inviteMember,
    acceptInvitation,
    updateMember,
    updateClinic,
  } = useClinic();
  const { effectivePlan, limits } = useSubscription();

  // Create clinic form
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    slug: "",
    address: "",
    city: "",
    phone: "",
    email: "",
  });

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "clinic_admin">("member");

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    name: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    description: "",
  });

  const canCreateClinic = effectivePlan === "clinic" || effectivePlan === "vip";
  const maxMembers = limits?.max_members ?? 0;
  const activeMembers = members.filter(m => m.status === "active" || m.status === "invited").length;

  const handleCreateClinic = () => {
    if (!createForm.name || !createForm.slug) return;
    createClinic.mutate(createForm, {
      onSuccess: () => setShowCreate(false),
    });
  };

  const handleInvite = () => {
    if (!inviteEmail || !clinic) return;
    inviteMember.mutate(
      { clinicId: clinic.id, email: inviteEmail, role: inviteRole },
      { onSuccess: () => { setShowInvite(false); setInviteEmail(""); } }
    );
  };

  const handleAcceptInvitation = (clinicId: string) => {
    acceptInvitation.mutate(clinicId);
  };

  const openSettings = () => {
    if (!clinic) return;
    setSettingsForm({
      name: clinic.name,
      address: clinic.address || "",
      city: clinic.city || "",
      phone: clinic.phone || "",
      email: clinic.email || "",
      description: clinic.description || "",
    });
    setShowSettings(true);
  };

  const handleSaveSettings = () => {
    if (!clinic) return;
    updateClinic.mutate({ id: clinic.id, ...settingsForm } as any, {
      onSuccess: () => setShowSettings(false),
    });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const professionIcon = (prof?: ProfessionId) =>
    prof === "psicologo" ? <Brain className="h-4 w-4" /> : <Mic2 className="h-4 w-4" />;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // User has pending invitations
  if (!isClinicMember && pendingInvitations.length > 0) {
    return (
      <AppLayout>
        <div className="p-8 max-w-2xl mx-auto space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Building className="h-6 w-6 text-primary" />
              Invitaciones Pendientes
            </h1>
            <p className="text-muted-foreground mt-1">
              Tienes invitaciones para unirte a una clínica
            </p>
          </div>

          <div className="space-y-4">
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className="bg-card rounded-xl border p-6 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-card-foreground">{inv.clinic_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Rol: {inv.role === "clinic_admin" ? "Administrador" : "Profesional"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Invitado el {new Date(inv.invited_at).toLocaleDateString("es-CL")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAcceptInvitation(inv.clinic_id)}
                    disabled={acceptInvitation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Aceptar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  // User is not in a clinic and can create one
  if (!isClinicMember && !clinic) {
    return (
      <AppLayout>
        <div className="p-8 max-w-2xl mx-auto space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Building className="h-6 w-6 text-primary" />
              Mi Clínica
            </h1>
            <p className="text-muted-foreground mt-1">
              Administra tu equipo de profesionales
            </p>
          </div>

          <div className="bg-card rounded-xl border p-8 text-center space-y-4">
            <Building className="h-16 w-16 mx-auto text-muted-foreground/30" />
            <div>
              <h2 className="text-lg font-semibold">No tienes una clínica</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {canCreateClinic
                  ? "Crea tu clínica para invitar profesionales a tu equipo."
                  : "Necesitas un plan Clínica o VIP para crear una clínica."}
              </p>
            </div>
            {canCreateClinic ? (
              <Button onClick={() => setShowCreate(true)}>
                <Building className="h-4 w-4 mr-2" />
                Crear Clínica
              </Button>
            ) : (
              <Button variant="outline" onClick={() => navigate("/planes")}>
                <Crown className="h-4 w-4 mr-2" />
                Ver Planes
              </Button>
            )}
          </div>

          {/* Create Clinic Dialog */}
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Crear Clínica</DialogTitle>
                <DialogDescription>
                  Configura los datos de tu centro o clínica
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Nombre de la Clínica *</Label>
                  <Input
                    value={createForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setCreateForm(prev => ({ ...prev, name, slug: generateSlug(name) }));
                    }}
                    placeholder="Centro Integral de Terapia"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Identificador (URL)</Label>
                  <Input
                    value={createForm.slug}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="centro-integral"
                  />
                  <p className="text-xs text-muted-foreground">Se usa como identificador interno</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dirección</Label>
                    <Input
                      value={createForm.address}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ciudad</Label>
                    <Input
                      value={createForm.city}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, city: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input
                      value={createForm.phone}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreateClinic}
                  disabled={!createForm.name || !createForm.slug || createClinic.isPending}
                >
                  {createClinic.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Building className="h-4 w-4 mr-2" />}
                  Crear Clínica
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </AppLayout>
    );
  }

  // User is a clinic member (admin or regular)
  return (
    <AppLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Building className="h-6 w-6 text-primary" />
              {clinic?.name || "Mi Clínica"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isClinicAdmin ? "Administra tu equipo de profesionales" : "Panel de tu clínica"}
            </p>
          </div>
          {isClinicAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={openSettings}>
                <Settings className="h-4 w-4 mr-1" />
                Configuración
              </Button>
              <Button size="sm" onClick={() => setShowInvite(true)}>
                <UserPlus className="h-4 w-4 mr-1" />
                Invitar
              </Button>
            </div>
          )}
        </div>

        {/* Clinic Info Card */}
        <div className="bg-card rounded-xl border p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Miembros</p>
              <p className="text-xl font-bold">
                {activeMembers}
                {maxMembers !== -1 && <span className="text-sm text-muted-foreground font-normal">/{maxMembers}</span>}
              </p>
            </div>
            {clinic?.city && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Ciudad</p>
                <p className="text-sm font-medium">{clinic.city}</p>
              </div>
            )}
            {clinic?.phone && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Teléfono</p>
                <p className="text-sm font-medium">{clinic.phone}</p>
              </div>
            )}
            {clinic?.email && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</p>
                <p className="text-sm font-medium">{clinic.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Members Table */}
        {isClinicAdmin && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Equipo</h2>
            <div className="bg-card rounded-xl border overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Profesional</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Rol</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Estado</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center">
                        <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">Sin miembros aún</p>
                      </td>
                    </tr>
                  )}
                  {members.map((member) => {
                    const isOwner = member.user_id === clinic?.owner_id;
                    const isSelf = member.user_id === user?.id;
                    return (
                      <tr key={member.id} className="border-b last:border-b-0 hover:bg-muted/30">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {professionIcon(member.profession)}
                            <div>
                              <span className="font-medium text-card-foreground">
                                {member.full_name || "Sin perfil"}
                              </span>
                              {isSelf && <span className="text-xs text-muted-foreground ml-1">(tú)</span>}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">{member.email}</td>
                        <td className="p-4">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                            member.role === "clinic_admin"
                              ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {member.role === "clinic_admin" ? <Shield className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                            {member.role === "clinic_admin" ? "Admin" : "Profesional"}
                          </span>
                        </td>
                        <td className="p-4">
                          {member.status === "active" && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/10 text-success rounded-full text-xs font-medium">
                              <CheckCircle className="h-3 w-3" /> Activo
                            </span>
                          )}
                          {member.status === "invited" && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium">
                              <Clock className="h-3 w-3" /> Invitado
                            </span>
                          )}
                          {member.status === "suspended" && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-destructive/10 text-destructive rounded-full text-xs font-medium">
                              <XCircle className="h-3 w-3" /> Suspendido
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {!isOwner && !isSelf && (
                            <div className="flex gap-1">
                              {member.status === "active" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-amber-600 hover:bg-amber-50"
                                  onClick={() => updateMember.mutate({ memberId: member.id, status: "suspended" })}
                                  disabled={updateMember.isPending}
                                >
                                  Suspender
                                </Button>
                              )}
                              {member.status === "suspended" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-success hover:bg-success/10"
                                  onClick={() => updateMember.mutate({ memberId: member.id, status: "active" })}
                                  disabled={updateMember.isPending}
                                >
                                  Reactivar
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => updateMember.mutate({ memberId: member.id, status: "removed" })}
                                disabled={updateMember.isPending}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          {isOwner && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Crown className="h-3 w-3" /> Dueño
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Member limit warning */}
        {isClinicAdmin && maxMembers !== -1 && activeMembers >= maxMembers && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Límite de miembros alcanzado ({activeMembers}/{maxMembers})</p>
              <p className="text-xs">Contacta al administrador para aumentar tu plan.</p>
            </div>
          </div>
        )}
      </div>

      {/* Invite Member Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Invitar Profesional</DialogTitle>
            <DialogDescription>
              El profesional recibirá acceso al unirse con su cuenta
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Email del profesional *</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="profesional@ejemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Profesional</SelectItem>
                  <SelectItem value="clinic_admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Los administradores pueden invitar y gestionar otros miembros
              </p>
            </div>
            {maxMembers !== -1 && (
              <p className="text-xs text-muted-foreground">
                Miembros: {activeMembers}/{maxMembers}
              </p>
            )}
            <Button
              className="w-full"
              onClick={handleInvite}
              disabled={!inviteEmail || inviteMember.isPending}
            >
              {inviteMember.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar Invitación
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Configuración de la Clínica</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={settingsForm.name}
                onChange={(e) => setSettingsForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label><MapPin className="h-3 w-3 inline mr-1" />Dirección</Label>
                <Input
                  value={settingsForm.address}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Ciudad</Label>
                <Input
                  value={settingsForm.city}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label><Phone className="h-3 w-3 inline mr-1" />Teléfono</Label>
                <Input
                  value={settingsForm.phone}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label><Mail className="h-3 w-3 inline mr-1" />Email</Label>
                <Input
                  type="email"
                  value={settingsForm.email}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={settingsForm.description}
                onChange={(e) => setSettingsForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSaveSettings}
              disabled={updateClinic.isPending}
            >
              {updateClinic.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
