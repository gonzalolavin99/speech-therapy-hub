// Supabase Edge Function: MercadoPago Webhook
// Recibe notificaciones de pagos de cobros del portal (cuenta de cada profesional).
// La lógica (firma, deduplicación, verificación, estados) está en _shared/mp-webhook.ts.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleMpWebhook, type MpCredentials } from '../_shared/mp-webhook.ts';

Deno.serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    return await handleMpWebhook(req, supabaseAdmin, {
      endpoint: 'mercadopago-webhook',
      referencePrefix: 'thub_',
      excludePrefix: 'thub_sub_',
      resolveCredentials: async (request): Promise<MpCredentials[]> => {
        // Preferencias nuevas: ?uid=<profesional> identifica qué token usar.
        // Preferencias antiguas (sin uid): se prueban los tokens activos.
        const ownerId = new URL(request.url).searchParams.get('uid');
        let query = supabaseAdmin
          .from('mercadopago_config')
          .select('access_token, webhook_secret, user_id')
          .eq('is_active', true);
        if (ownerId) query = query.eq('user_id', ownerId);
        const { data } = await query;
        return (data ?? []).map((c) => ({
          accessToken: c.access_token,
          webhookSecret: c.webhook_secret ?? null,
          ownerId: c.user_id,
        }));
      },
    });
  } catch (error) {
    console.error('mercadopago-webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
});
