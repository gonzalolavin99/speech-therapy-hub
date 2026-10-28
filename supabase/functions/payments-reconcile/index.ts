// Supabase Edge Function: Payments Reconcile
// Tarea periódica (pg_cron cada 15 min, ver payments_lifecycle.sql):
// compara órdenes abiertas y reembolsos pendientes con MercadoPago y aplica las diferencias.
// Solo la invocan el cron (header x-cron-secret) o service_role.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { reconcilePayments } from '../_shared/refunds.ts';
import { mpCredentialResolver } from '../_shared/credentials.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const authorized =
    (cronSecret && req.headers.get('x-cron-secret') === cronSecret) ||
    req.headers.get('Authorization') === `Bearer ${serviceKey}`;
  if (!authorized) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey);

  try {
    const startedAt = Date.now();
    const summary = await reconcilePayments(supabaseAdmin, mpCredentialResolver(supabaseAdmin));
    console.log('[payments-reconcile]', JSON.stringify({ ...summary, ms: Date.now() - startedAt }));
    return new Response(JSON.stringify(summary), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('payments-reconcile error:', (error as Error)?.message);
    return new Response(JSON.stringify({ error: 'reconcile_failed' }), { status: 500 });
  }
});
