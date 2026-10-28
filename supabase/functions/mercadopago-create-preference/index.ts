// Supabase Edge Function: MercadoPago Create Preference
// Crea (o reutiliza) el checkout de MercadoPago para un cobro del portal.
//
// - El monto y la descripción salen de la BD (portal_charges), nunca del cliente.
// - Autoriza: el cobro debe ser del paciente del token o del profesional logueado.
// - Idempotente por header Idempotency-Key (doble clic / reintentos).
// - Rate limiting por IP y por actor.
// - Llama a MercadoPago con timeout, reintentos y X-Idempotency-Key.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { runIdempotent, enforceRateLimits } from '../_shared/idempotency.ts';
import { callGateway, clientIp, hashRequest, isValidIdempotencyKey, safeReturnUrl } from '../_shared/payments.ts';

const PREFERENCE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REUSE_MARGIN_MS = 24 * 60 * 60 * 1000; // se reutiliza si le queda más de 1 día

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
    const { charge_id, token, success_url, failure_url } = await req.json();

    if (typeof charge_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(charge_id)) {
      return jsonResponse({ error: 'charge_id es requerido' }, 400);
    }

    const idempotencyKey = req.headers.get('Idempotency-Key') ?? `pref-${charge_id}`;
    if (!isValidIdempotencyKey(idempotencyKey)) {
      return jsonResponse({ error: 'Idempotency-Key inválida' }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Autorización: ¿quién pide y le pertenece el cobro?
    const { data: charge } = await supabaseAdmin
      .from('portal_charges')
      .select('id, user_id, patient_id, status, mp_init_point, mp_preference_id, mp_preference_created_at')
      .eq('id', charge_id)
      .maybeSingle();

    if (!charge || charge.status !== 'pending') {
      return jsonResponse({ error: 'Cobro no encontrado' }, 404);
    }

    let actorId: string | null = null;
    if (typeof token === 'string' && token) {
      const { data: tokenCheck } = await supabaseAdmin
        .from('patient_portal_tokens')
        .select('id, patient_id, user_id')
        .eq('token', token)
        .eq('is_active', true)
        .maybeSingle();
      if (tokenCheck && tokenCheck.patient_id === charge.patient_id && tokenCheck.user_id === charge.user_id) {
        actorId = `portal:${tokenCheck.id}`;
      }
    } else {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const supabaseUser = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await supabaseUser.auth.getUser();
        if (user && user.id === charge.user_id) actorId = `user:${user.id}`;
      }
    }

    if (!actorId) {
      return jsonResponse({ error: 'No autorizado' }, 401);
    }

    // 2. Límite de intentos (abuso / pruebas de tarjetas)
    const allowed = await enforceRateLimits(supabaseAdmin, [
      { key: `create-preference:ip:${clientIp(req)}`, max: 30, windowSeconds: 600 },
      { key: `create-preference:${actorId}`, max: 10, windowSeconds: 600 },
    ]);
    if (!allowed) {
      return jsonResponse({ error: 'Demasiados intentos. Espera unos minutos.' }, 429);
    }

    const appOrigins = [Deno.env.get('APP_URL') ?? '', req.headers.get('origin') ?? ''];
    const defaultOrigin = Deno.env.get('APP_URL') ?? req.headers.get('origin') ?? '';
    const backUrls = {
      success: safeReturnUrl(success_url, appOrigins, `${defaultOrigin}/portal-pago/success`),
      failure: safeReturnUrl(failure_url, appOrigins, `${defaultOrigin}/portal-pago/failure`),
      pending: `${defaultOrigin}/portal-pago/pending`,
    };

    // 3. Operación idempotente
    const result = await runIdempotent(
      supabaseAdmin,
      { scope: `create-preference:${actorId}`, key: idempotencyKey, requestHash: await hashRequest({ charge_id }) },
      async () => {
        // Reutilizar el checkout vigente: un cobro tiene una sola preferencia activa
        const createdAt = charge.mp_preference_created_at ? new Date(charge.mp_preference_created_at).getTime() : 0;
        if (charge.mp_init_point && createdAt && Date.now() - createdAt < PREFERENCE_TTL_MS - REUSE_MARGIN_MS) {
          return { status: 200, body: { init_point: charge.mp_init_point, preference_id: charge.mp_preference_id, reused: true } };
        }

        const { data: configData, error: configError } = await supabaseAdmin
          .rpc('get_mp_config_for_charge', { p_charge_id: charge_id });
        if (configError || configData?.error) {
          return { status: 400, body: { error: configData?.error || 'MercadoPago no configurado' } };
        }

        const { access_token, is_sandbox, charge: chargeData } = configData;
        const externalReference = `thub_${chargeData.id}`;
        const now = Date.now();

        const preferenceBody = {
          items: [{
            title: chargeData.description,
            description: 'Cobro TherapyHub',
            quantity: 1,
            currency_id: 'CLP',
            unit_price: chargeData.amount, // desde la BD
          }],
          external_reference: externalReference,
          back_urls: backUrls,
          auto_return: 'approved',
          // uid permite al webhook usar solo el token del profesional dueño del cobro
          notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook?uid=${charge.user_id}`,
          statement_descriptor: 'TherapyHub',
          expires: true,
          expiration_date_from: new Date(now).toISOString(),
          expiration_date_to: new Date(now + PREFERENCE_TTL_MS).toISOString(),
        };

        const gateway = await callGateway('https://api.mercadopago.com/checkout/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${access_token}`,
            'X-Idempotency-Key': `${charge_id}:${idempotencyKey}`,
          },
          body: JSON.stringify(preferenceBody),
        });

        if (gateway.kind === 'rejected') {
          console.error(`[create-preference] MP rechazó la preferencia del cobro ${charge_id}: HTTP ${gateway.status}`);
          return { status: 502, body: { error: 'MercadoPago rechazó la solicitud' } };
        }
        if (gateway.kind === 'unknown') {
          // Crear una preferencia no cobra nada: reintentar con la misma clave es seguro
          console.error(`[create-preference] MP no respondió para el cobro ${charge_id}: ${gateway.error}`);
          return { status: 503, body: { error: 'MercadoPago no respondió. Intenta de nuevo.' } };
        }

        const preference = gateway.body as { id: string; init_point: string; sandbox_init_point: string };
        const initPoint = is_sandbox ? preference.sandbox_init_point : preference.init_point;

        await supabaseAdmin.rpc('update_charge_mp_data', {
          p_charge_id: chargeData.id,
          p_preference_id: preference.id,
          p_init_point: initPoint,
          p_external_reference: externalReference,
        });
        await supabaseAdmin
          .from('portal_charges')
          .update({ mp_preference_created_at: new Date(now).toISOString() })
          .eq('id', chargeData.id);

        return { status: 200, body: { init_point: initPoint, preference_id: preference.id } };
      }
    );

    return jsonResponse(result.body, result.status);
  } catch (error) {
    console.error('create-preference error:', (error as Error)?.message);
    return jsonResponse({ error: 'Error interno' }, 500);
  }
});
