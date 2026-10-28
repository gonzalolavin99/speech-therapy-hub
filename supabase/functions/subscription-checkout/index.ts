// Supabase Edge Function: Subscription Checkout
// Crea el checkout de MercadoPago para un plan de TherapyHub
// (cuenta MercadoPago de la PLATAFORMA, no la del profesional).
//
// - El precio lo calcula create_subscription_payment desde plan_limits.
// - Idempotente por usuario + Idempotency-Key (doble clic no duplica pagos).
// - Rate limiting por usuario e IP; MercadoPago con timeout y reintentos.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { runIdempotent, enforceRateLimits } from '../_shared/idempotency.ts';
import { callGateway, clientIp, hashRequest, isValidIdempotencyKey, safeReturnUrl } from '../_shared/payments.ts';

const PLAN_LABELS: Record<string, string> = { professional: 'Plan Profesional', clinic: 'Plan Clínica' };
const PERIOD_LABELS: Record<string, string> = { monthly: 'Mensual', yearly: 'Anual' };

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
    const { plan, billing_period, success_url, failure_url } = await req.json();

    if (!PLAN_LABELS[plan] || !PERIOD_LABELS[billing_period]) {
      return jsonResponse({ error: 'plan y billing_period son requeridos' }, 400);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'No autorizado' }, 401);
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return jsonResponse({ error: 'No autorizado' }, 401);
    }

    const idempotencyKey = req.headers.get('Idempotency-Key') ?? `sub-${plan}-${billing_period}`;
    if (!isValidIdempotencyKey(idempotencyKey)) {
      return jsonResponse({ error: 'Idempotency-Key inválida' }, 400);
    }

    const allowed = await enforceRateLimits(supabaseAdmin, [
      { key: `subscription-checkout:ip:${clientIp(req)}`, max: 20, windowSeconds: 600 },
      { key: `subscription-checkout:user:${user.id}`, max: 5, windowSeconds: 600 },
    ]);
    if (!allowed) {
      return jsonResponse({ error: 'Demasiados intentos. Espera unos minutos.' }, 429);
    }

    const appOrigins = [Deno.env.get('APP_URL') ?? '', req.headers.get('origin') ?? ''];
    const defaultOrigin = Deno.env.get('APP_URL') ?? req.headers.get('origin') ?? '';

    const result = await runIdempotent(
      supabaseAdmin,
      {
        scope: `subscription-checkout:${user.id}`,
        key: idempotencyKey,
        requestHash: await hashRequest({ plan, billing_period }),
      },
      async () => {
        // 1. Registro del pago con precio calculado en la BD (como el usuario)
        const { data: paymentData, error: paymentError } = await supabaseUser
          .rpc('create_subscription_payment', { p_plan: plan, p_billing_period: billing_period });
        if (paymentError || paymentData?.error) {
          return { status: 400, body: { error: paymentData?.error || 'Error creando pago' } };
        }

        // 2. Credenciales de la plataforma
        const { data: mpConfig } = await supabaseAdmin.rpc('get_platform_mp_config');
        if (!mpConfig || mpConfig.error) {
          return { status: 503, body: { error: 'MercadoPago no configurado en la plataforma. Contacta al administrador.' } };
        }

        const { data: profile } = await supabaseAdmin
          .from('professional_profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle();

        const planLabel = PLAN_LABELS[plan];
        const periodLabel = PERIOD_LABELS[billing_period];

        const preferenceBody = {
          items: [{
            title: `TherapyHub - ${planLabel} (${periodLabel})`,
            description: `Suscripción ${periodLabel.toLowerCase()} al ${planLabel} de TherapyHub`,
            quantity: 1,
            currency_id: 'CLP',
            unit_price: paymentData.amount, // calculado en la BD
          }],
          payer: { email: user.email ?? '', name: profile?.full_name || '' },
          external_reference: paymentData.external_reference,
          back_urls: {
            success: safeReturnUrl(success_url, appOrigins, `${defaultOrigin}/planes?payment=success`),
            failure: safeReturnUrl(failure_url, appOrigins, `${defaultOrigin}/planes?payment=failure`),
            pending: `${defaultOrigin}/planes?payment=pending`,
          },
          auto_return: 'approved',
          notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/subscription-webhook`,
          statement_descriptor: 'TherapyHub',
          expires: true,
          expiration_date_from: new Date().toISOString(),
          expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };

        const gateway = await callGateway('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mpConfig.access_token}`,
            'X-Idempotency-Key': `${paymentData.id}`,
          },
          body: JSON.stringify(preferenceBody),
        });

        if (gateway.kind !== 'ok') {
          console.error(`[subscription-checkout] MP falló para el pago ${paymentData.id}:`,
            gateway.kind === 'rejected' ? `HTTP ${gateway.status}` : gateway.error);
          await supabaseAdmin.from('subscription_payments').update({ status: 'cancelled' }).eq('id', paymentData.id);
          return gateway.kind === 'rejected'
            ? { status: 502, body: { error: 'MercadoPago rechazó la solicitud' } }
            : { status: 503, body: { error: 'MercadoPago no respondió. Intenta de nuevo.' } };
        }

        const preference = gateway.body as { id: string; init_point: string; sandbox_init_point: string };
        const initPoint = mpConfig.is_sandbox ? preference.sandbox_init_point : preference.init_point;

        await supabaseAdmin
          .from('subscription_payments')
          .update({ mp_preference_id: preference.id, mp_init_point: initPoint, updated_at: new Date().toISOString() })
          .eq('id', paymentData.id);

        return {
          status: 200,
          body: {
            init_point: initPoint,
            preference_id: preference.id,
            payment_id: paymentData.id,
            amount: paymentData.amount,
            plan: paymentData.plan,
            billing_period: paymentData.billing_period,
          },
        };
      }
    );

    return jsonResponse(result.body, result.status);
  } catch (error) {
    console.error('subscription-checkout error:', (error as Error)?.message);
    return jsonResponse({ error: 'Error interno' }, 500);
  }
});
