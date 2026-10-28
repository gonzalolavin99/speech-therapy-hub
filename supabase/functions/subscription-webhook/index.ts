// Supabase Edge Function: Subscription Webhook
// Recibe notificaciones de pagos de suscripciones (cuenta MercadoPago de la plataforma).
// La lógica (firma, deduplicación, verificación, estados) está en _shared/mp-webhook.ts.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleMpWebhook } from '../_shared/mp-webhook.ts';

Deno.serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    return await handleMpWebhook(req, supabaseAdmin, {
      endpoint: 'subscription-webhook',
      referencePrefix: 'thub_sub_',
      resolveCredentials: async () => {
        const { data: mpConfig } = await supabaseAdmin.rpc('get_platform_mp_config');
        if (!mpConfig || mpConfig.error) return [];
        return [{
          accessToken: mpConfig.access_token,
          webhookSecret: Deno.env.get('MP_WEBHOOK_SECRET') ?? null,
          ownerId: null,
        }];
      },
    });
  } catch (error) {
    console.error('subscription-webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
});
