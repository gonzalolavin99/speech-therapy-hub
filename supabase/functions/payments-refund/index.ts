// Supabase Edge Function: Payments Refund
// Reembolso total o parcial de un pago de MercadoPago, solicitado por el profesional dueño.
//
// - Requiere sesión y header Idempotency-Key (cada reembolso tiene su identidad).
// - create_refund_request bloquea el pago y valida dueño, estado y monto restante.
// - Ante timeout el reembolso queda pendiente y la reconciliación lo reenvía con la misma clave.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { enforceRateLimits } from '../_shared/idempotency.ts';
import { clientIp, isValidIdempotencyKey } from '../_shared/payments.ts';
import { processRefund } from '../_shared/refunds.ts';
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

    const idempotencyKey = req.headers.get('Idempotency-Key');
    if (!isValidIdempotencyKey(idempotencyKey)) {
      return jsonResponse({ error: 'Idempotency-Key requerida' }, 400);
    }

    const { gateway_payment_id, amount, reason } = await req.json();
    if (typeof gateway_payment_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(gateway_payment_id)) {
      return jsonResponse({ error: 'gateway_payment_id es requerido' }, 400);
    }
    if (amount !== undefined && amount !== null && (!Number.isInteger(amount) || amount <= 0)) {
      return jsonResponse({ error: 'El monto debe ser un entero positivo (CLP)' }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const allowed = await enforceRateLimits(supabaseAdmin, [
      { key: `payments-refund:ip:${clientIp(req)}`, max: 20, windowSeconds: 600 },
      { key: `payments-refund:user:${user.id}`, max: 10, windowSeconds: 600 },
    ]);
    if (!allowed) return jsonResponse({ error: 'Demasiados intentos. Espera unos minutos.' }, 429);

    const result = await processRefund(
      supabaseAdmin,
      {
        gatewayPaymentId: gateway_payment_id,
        amount: amount ?? null,
        idempotencyKey,
        requestedBy: user.id,
        reason: typeof reason === 'string' ? reason.slice(0, 500) : undefined,
      },
      mpCredentialResolver(supabaseAdmin)
    );

    return jsonResponse(result.body, result.status);
  } catch (error) {
    console.error('payments-refund error:', (error as Error)?.message);
    return jsonResponse({ error: 'Error interno' }, 500);
  }
});
