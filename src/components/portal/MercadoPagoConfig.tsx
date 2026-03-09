import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  CreditCard,
  Save,
  Loader2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Eye,
  EyeOff,
} from "lucide-react";
import { useMercadoPago, MercadoPagoConfigForm } from "@/hooks/useMercadoPago";

export function MercadoPagoConfig() {
  const { config, isLoading, saveConfig, toggleActive, isConfigured } = useMercadoPago();
  const [formData, setFormData] = useState<MercadoPagoConfigForm>({
    access_token: "",
    public_key: "",
    is_sandbox: true,
  });
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        access_token: config.access_token,
        public_key: config.public_key || "",
        is_sandbox: config.is_sandbox,
      });
    }
  }, [config]);

  const handleSave = () => {
    if (!formData.access_token.trim()) return;
    saveConfig.mutate(formData);
  };

  const maskToken = (token: string) => {
    if (token.length <= 8) return "••••••••";
    return token.substring(0, 4) + "•".repeat(Math.min(token.length - 8, 20)) + token.substring(token.length - 4);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando...
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border p-8 mb-8">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          MercadoPago — Pagos Online
        </h3>
        {config && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {config.is_active ? "Activo" : "Inactivo"}
            </span>
            <Switch
              checked={config.is_active}
              onCheckedChange={(v) => toggleActive.mutate(v)}
            />
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Permite a tus pacientes pagar cobros con tarjeta de crédito/débito directamente desde el portal
      </p>

      <div className="space-y-6">
        {/* Status banner */}
        {isConfigured ? (
          <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                MercadoPago configurado {config?.is_sandbox ? "(Modo Prueba)" : "(Producción)"}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                Los pacientes podrán pagar sus cobros con tarjeta desde el portal
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                MercadoPago no configurado
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                Configura tus credenciales para habilitar pagos online
              </p>
            </div>
          </div>
        )}

        {/* Sandbox toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Modo sandbox (pruebas)</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Actívalo para probar pagos sin dinero real
            </p>
          </div>
          <Switch
            checked={formData.is_sandbox}
            onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_sandbox: v }))}
          />
        </div>

        {/* Access Token */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Access Token</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showToken ? "text" : "password"}
                value={showToken ? formData.access_token : (formData.access_token ? maskToken(formData.access_token) : "")}
                onChange={(e) => setFormData(prev => ({ ...prev, access_token: e.target.value }))}
                onFocus={() => setShowToken(true)}
                placeholder={formData.is_sandbox ? "TEST-xxxx-xxxx-xxxx" : "APP_USR-xxxx-xxxx-xxxx"}
                className="bg-background pr-10 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Encuentra tu Access Token en{" "}
            <a
              href="https://www.mercadopago.cl/developers/panel/app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-0.5"
            >
              Panel de Desarrollador MercadoPago
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </p>
        </div>

        {/* Public Key */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Public Key (opcional)</Label>
          <Input
            value={formData.public_key || ""}
            onChange={(e) => setFormData(prev => ({ ...prev, public_key: e.target.value }))}
            placeholder={formData.is_sandbox ? "TEST-xxxx-xxxx-xxxx" : "APP_USR-xxxx-xxxx-xxxx"}
            className="bg-background font-mono text-xs"
          />
        </div>

        {/* How it works */}
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-xs font-medium text-foreground mb-2">¿Cómo funciona?</p>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Creas un cobro para tu paciente desde la pestaña Cobros</li>
            <li>El paciente abre su portal y ve el cobro pendiente</li>
            <li>Hace clic en "Pagar con MercadoPago"</li>
            <li>Paga con tarjeta de crédito/débito o MercadoPago</li>
            <li>El cobro se confirma automáticamente</li>
          </ol>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!formData.access_token.trim() || saveConfig.isPending}
          >
            {saveConfig.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Configuración MP
          </Button>
        </div>
      </div>
    </div>
  );
}
