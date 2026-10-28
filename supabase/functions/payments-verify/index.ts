// Supabase Edge Function: Payments Verify
// Al volver del checkout de suscripción, verifica el pago contra la API de
// MercadoPago y lo aplica de inmediato (sin esperar webhook ni reconciliación).
// Requiere sesión: solo verifica pagos de órdenes del usuario logueado.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { enforceRateLimits } from '../_shared/idempotency.ts';
import { clientIp } from '../_shared/payments.ts';
import { verifySubscriptionReturn } from '../_shared/verify.ts';
import { mpCredentialResolver } from '../_shared/credentials.ts';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'No autorizado' }, 401);

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return jsonResponse({ error: 'No autorizado' }, 401);

    const { payment_id } = await req.json();
    if (typeof payment_id !== 'string' || !/^\d{1,20}$/.test(payment_id)) {
      return jsonResponse({ error: 'payment_id inválido' }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const allowed = await enforceRateLimits(supabaseAdmin, [
      { key: `payments-verify:ip:${clientIp(req)}`, max: 30, windowSeconds: 600 },
      { key: `payments-verify:user:${user.id}`, max: 10, windowSeconds: 600 },
    ]);
    if (!allowed) return jsonResponse({ error: 'Demasiados intentos. Espera unos minutos.' }, 429);

    const accessToken = await mpCredentialResolver(supabaseAdmin)('subscription', user.id);
    if (!accessToken) return jsonResponse({ error: 'MercadoPago no configurado' }, 503);

    const result = await verifySubscriptionReturn(supabaseAdmin, { paymentId: payment_id, userId: user.id }, accessToken);
    return jsonResponse(result.body, result.status);
  } catch (error) {
    console.error('payments-verify error:', (error as Error)?.message);
    return jsonResponse({ error: 'Error interno' }, 500);
  }
});
