import { useState } from "react";
import { useParams } from "react-router-dom";
import { usePatientPortal } from "@/hooks/usePatientPortal";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Calendar,
  TrendingUp,
  CreditCard,
  MessageSquare,
  Loader2,
  ShieldX,
  User,
} from "lucide-react";
import { PortalSessions } from "@/components/portal/PortalSessions";
import { PortalProgress } from "@/components/portal/PortalProgress";
import { PortalCharges } from "@/components/portal/PortalCharges";
import { PortalMessages } from "@/components/portal/PortalMessages";

export default function PatientPortal() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, invalidToken, confirmPayment, sendMessage, refetch } = usePatientPortal(token);
  const [activeTab, setActiveTab] = useState("citas");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando portal...</p>
        </div>
      </div>
    );
  }

  if (invalidToken || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <ShieldX className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Enlace no válido
          </h1>
          <p className="text-muted-foreground">
            Este enlace del portal no es válido o ha expirado.
            Contacta a tu profesional para obtener un enlace actualizado.
          </p>
        </div>
      </div>
    );
  }

  const pendingCharges = data.charges.filter(c => c.status === 'pending').length;
  const unreadMessages = data.messages.filter(m => m.sender_type === 'professional' && !m.read_at).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {data.professional?.photo_url ? (
              <img
                src={data.professional.photo_url}
                alt={data.professional.full_name}
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-7 w-7 text-primary" />
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Portal de Paciente</p>
              <h1 className="text-xl font-bold text-foreground">
                {data.professional?.full_name || 'Profesional'}
              </h1>
              {data.professional?.institution && (
                <p className="text-sm text-muted-foreground">{data.professional.institution}</p>
              )}
            </div>
          </div>

          {data.professional?.portal_welcome_message && (
            <div className="mt-4 rounded-lg bg-primary/5 border border-primary/20 p-3">
              <p className="text-sm text-primary">
                {data.professional.portal_welcome_message}
              </p>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Paciente:</span>
            <span className="text-sm font-medium text-foreground">{data.patient.name}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="citas" className="gap-1 text-xs sm:text-sm">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Citas</span>
            </TabsTrigger>
            <TabsTrigger value="progreso" className="gap-1 text-xs sm:text-sm">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Progreso</span>
            </TabsTrigger>
            <TabsTrigger value="pagos" className="gap-1 text-xs sm:text-sm relative">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Pagos</span>
              {pendingCharges > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center">
                  {pendingCharges}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="mensajes" className="gap-1 text-xs sm:text-sm relative">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Mensajes</span>
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                  {unreadMessages}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="citas" className="mt-6">
            <PortalSessions sessions={data.sessions} />
          </TabsContent>

          <TabsContent value="progreso" className="mt-6">
            <PortalProgress plannings={data.plannings} />
          </TabsContent>

          <TabsContent value="pagos" className="mt-6">
            <PortalCharges
              charges={data.charges}
              bankInfo={data.bank_info}
              onConfirmPayment={(chargeId, reference) =>
                confirmPayment.mutate({ chargeId, reference })
              }
              isConfirming={confirmPayment.isPending}
              portalToken={token}
              mpEnabled={data.mp_enabled}
            />
          </TabsContent>

          <TabsContent value="mensajes" className="mt-6">
            <PortalMessages
              messages={data.messages}
              professionalName={data.professional?.full_name || 'Profesional'}
              onSendMessage={(msg) => sendMessage.mutateAsync(msg).then(() => { refetch(); })}
              isSending={sendMessage.isPending}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="border-t mt-8">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            Portal seguro de TherapyHub
          </p>
        </div>
      </div>
    </div>
  );
}
