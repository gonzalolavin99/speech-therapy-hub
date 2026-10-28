import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface MercadoPagoConfig {
  id: string;
  user_id: string;
  access_token: string;
  public_key: string | null;
  is_sandbox: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MercadoPagoConfigForm {
  access_token: string;
  public_key?: string;
  is_sandbox: boolean;
}

export function useMercadoPago() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: ['mp-config', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('mercadopago_config')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      return data as MercadoPagoConfig | null;
    },
    enabled: !!user,
  });

  const saveConfig = useMutation({
    mutationFn: async (config: MercadoPagoConfigForm) => {
      if (!user) throw new Error('No user');

      // Check if config exists
      const existing = configQuery.data;

      if (existing) {
        const { data, error } = await supabase
          .from('mercadopago_config')
          .update({
            ...config,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('mercadopago_config')
          .insert([{ ...config, user_id: user.id, is_active: true }])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mp-config'] });
      toast.success('Configuración de MercadoPago guardada');
    },
    onError: (error: Error) => {
      toast.error('Error al guardar configuración', { description: error.message });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (isActive: boolean) => {
      if (!user) throw new Error('No user');

      const { error } = await supabase
        .from('mercadopago_config')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mp-config'] });
      toast.success('Estado actualizado');
    },
  });

  // Create a payment preference via Edge Function
  const createPreference = useMutation({
    mutationFn: async ({ chargeId, token }: { chargeId: string; token?: string }) => {
      // functions.invoke envía el JWT de la sesión: sin token de portal,
      // la Edge Function exige que el cobro sea del profesional logueado
      const { data, error } = await supabase.functions.invoke<{ init_point: string; preference_id: string }>(
        'mercadopago-create-preference',
        {
          // Un cobro tiene un solo checkout activo: doble clic o reintento reutilizan el mismo
          headers: { 'Idempotency-Key': `pref-${chargeId}` },
          body: {
            charge_id: chargeId,
            token,
            success_url: `${window.location.origin}/portal-pago/success`,
            failure_url: `${window.location.origin}/portal-pago/failure`,
          },
        }
      );

      if (error || !data) {
        const context = (error as { context?: Response } | null)?.context;
        const body = context ? await context.json().catch(() => null) : null;
        throw new Error(body?.error || 'Error al crear preferencia');
      }

      return data;
    },
  });

  return {
    config: configQuery.data,
    isLoading: configQuery.isLoading,
    isConfigured: !!configQuery.data?.access_token && configQuery.data?.is_active,
    saveConfig,
    toggleActive,
    createPreference,
  };
}

// Hook para el portal del paciente (sin auth)
export function usePortalMercadoPago() {
  const createPreference = useMutation({
    mutationFn: async ({ chargeId, token }: { chargeId: string; token: string }) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const response = await fetch(`${supabaseUrl}/functions/v1/mercadopago-create-preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Idempotency-Key': `pref-${chargeId}`,
        },
        body: JSON.stringify({
          charge_id: chargeId,
          token,
          success_url: `${window.location.origin}/portal-pago/success`,
          failure_url: `${window.location.origin}/portal-pago/failure`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al crear pago');
      }

      return response.json() as Promise<{ init_point: string; preference_id: string }>;
    },
  });

  return {
    createPreference,
    payWithMercadoPago: async (chargeId: string, token: string) => {
      try {
        const result = await createPreference.mutateAsync({ chargeId, token });
        // Redirect to MercadoPago Checkout
        window.location.href = result.init_point;
      } catch (error) {
        toast.error('Error al procesar pago', {
          description: error instanceof Error ? error.message : 'Intenta de nuevo',
        });
      }
    },
    isPending: createPreference.isPending,
  };
}
