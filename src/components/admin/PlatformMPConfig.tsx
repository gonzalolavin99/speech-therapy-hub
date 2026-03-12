import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  CreditCard,
  Save,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

interface PlatformConfig {
  id?: string;
  access_token: string;
  public_key: string;
  is_sandbox: boolean;
  is_active: boolean;
}

export function PlatformMPConfig() {
  const [config, setConfig] = useState<PlatformConfig>({
    access_token: "",
    public_key: "",
    is_sandbox: true,
    is_active: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("platform_mp_config")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setConfig({
          id: data.id,
          access_token: data.access_token,
          public_key: data.public_key || "",
          is_sandbox: data.is_sandbox,
          is_active: data.is_active,
        });
      }
    } catch (err: any) {
      // Table might not exist yet
      console.warn("Platform MP config not loaded:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config.access_token.trim()) {
      toast.error("Ingresa el Access Token de MercadoPago");
      return;
    }

    setIsSaving(true);
    try {
      if (config.id) {
        const { error } = await supabase
          .from("platform_mp_config")
          .update({
            access_token: config.access_token,
            public_key: config.public_key || null,
            is_sandbox: config.is_sandbox,
            is_active: config.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", config.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("platform_mp_config")
          .insert([
            {
              access_token: config.access_token,
              public_key: config.public_key || null,
              is_sandbox: config.is_sandbox,
              is_active: config.is_active,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        if (data) setConfig((prev) => ({ ...prev, id: data.id }));
      }

      toast.success("Configuración de pagos de plataforma guardada");
    } catch (err: any) {
      toast.error("Error al guardar", { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando configuración de pagos...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          MercadoPago — Pagos de Suscripción
        </h3>
        {config.id ? (
          <span className="flex items-center gap-1 text-xs text-success font-medium">
            <CheckCircle className="h-3.5 w-3.5" /> Configurado
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" /> Sin configurar
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Configura la cuenta de MercadoPago de TherapyHub para recibir pagos de suscripciones de los usuarios.
        Esta cuenta es diferente a la de cada profesional (que usan para cobrar a pacientes).
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Access Token *</Label>
          <div className="relative">
            <Input
              type={showToken ? "text" : "password"}
              value={config.access_token}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, access_token: e.target.value }))
              }
              placeholder="APP_USR-..."
              className="pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Public Key (opcional)</Label>
          <Input
            value={config.public_key}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, public_key: e.target.value }))
            }
            placeholder="APP_USR-..."
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Modo Sandbox (pruebas)</Label>
            <p className="text-xs text-muted-foreground">
              Activa para usar credenciales de prueba
            </p>
          </div>
          <Switch
            checked={config.is_sandbox}
            onCheckedChange={(checked) =>
              setConfig((prev) => ({ ...prev, is_sandbox: checked }))
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Activo</Label>
            <p className="text-xs text-muted-foreground">
              Desactiva para pausar los cobros de suscripción
            </p>
          </div>
          <Switch
            checked={config.is_active}
            onCheckedChange={(checked) =>
              setConfig((prev) => ({ ...prev, is_active: checked }))
            }
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        Guardar Configuración
      </Button>
    </div>
  );
}
