// Procesamiento común de webhooks de MercadoPago (cobros del portal y suscripciones).
//
// 1. Verifica la firma x-signature si hay secreto configurado.
// 2. Registra el evento de forma duradera y descarta duplicados (x-request-id).
// 3. Ignora el contenido del webhook: consulta el pago a la API de MercadoPago.
// 4. Valida referencia y moneda; apply_gateway_payment valida monto, dueño y
//    transición de estado dentro de una transacción con bloqueo de fila.
// 5. Responde 5xx en fallos transitorios para que MercadoPago reintente;
//    la reconciliación periódica cubre los eventos que nunca lleguen.

import { callGateway, checkMpPayment, verifyMpSignature, type MpPayment } from './payments.ts';

// Subconjunto del cliente de supabase-js que se usa aquí. Tipado estructural para
// no importar desde esm.sh y poder testear el handler con un cliente falso en Vitest.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AdminClient = { from: (table: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => any };

export interface MpCredentials {
  accessToken: string;
  webhookSecret: string | null;
  ownerId: string | null; // profesional dueño del token (null = cuenta de la plataforma)
}

export interface WebhookConfig {
  endpoint: 'mercadopago-webhook' | 'subscription-webhook';
  referencePrefix: string;
  excludePrefix?: string;
  // Credenciales a probar para consultar el pago, en orden
  resolveCredentials: (req: Request) => Promise<MpCredentials[]>;
}

const text = (body: string, status: number) => new Response(body, { status });

export async function handleMpWebhook(req: Request, supabaseAdmin: AdminClient, config: WebhookConfig): Promise<Response> {
  if (req.method !== 'POST') return text('Method not allowed', 405);

  const url = new URL(req.url);
  let body: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    body = await req.json();
  } catch {
    return text('Invalid JSON', 400);
  }

  const topic = body.type ?? body.topic ?? url.searchParams.get('type') ?? url.searchParams.get('topic');
  const dataId = String(url.searchParams.get('data.id') ?? body.data?.id ?? '') || null;
  if (topic !== 'payment' || !dataId) {
    return text('Ignored', 200);
  }

  const requestId = req.headers.get('x-request-id') ?? `${topic}:${dataId}:${body.action ?? ''}:${body.date_created ?? ''}`;
  const credentials = await config.resolveCredentials(req);
  if (credentials.length === 0) {
    console.error(`[${config.endpoint}] sin credenciales activas para el pago ${dataId}`);
    return text('Not configured', 200);
  }

  // 1. Firma: con secreto configurado, una firma inválida se rechaza
  const secret = credentials.length === 1 ? credentials[0].webhookSecret : null;
  let signatureValid: boolean | null = null;
  if (secret) {
    const check = await verifyMpSignature({
      secret,
      signatureHeader: req.headers.get('x-signature'),
      requestId: req.headers.get('x-request-id'),
      dataId,
    });
    signatureValid = check.valid;
    if (!check.valid) {
      await supabaseAdmin.from('payment_webhook_events').upsert({
        endpoint: config.endpoint, request_id: requestId, topic, resource_id: dataId,
        signature_valid: false, status: 'ignored', result: { reason: `signature_${check.reason}` },
        processed_at: new Date().toISOString(),
      }, { onConflict: 'provider,endpoint,request_id', ignoreDuplicates: true });
      console.warn(`[${config.endpoint}] firma inválida (${check.reason}) para el pago ${dataId}`);
      return text('Invalid signature', 401);
    }
  }

  // 2. Registro duradero + deduplicación
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('payment_webhook_events')
    .upsert({
      endpoint: config.endpoint, request_id: requestId, topic, resource_id: dataId,
      signature_valid: signatureValid, status: 'received',
    }, { onConflict: 'provider,endpoint,request_id', ignoreDuplicates: true })
    .select('id');

  if (insertError) {
    console.error(`[${config.endpoint}] no se pudo registrar el evento:`, insertError.message);
    return text('Storage error', 500);
  }

  let eventId: number;
  if (inserted && inserted.length > 0) {
    eventId = inserted[0].id;
  } else {
    const { data: existing } = await supabaseAdmin
      .from('payment_webhook_events')
      .select('id, status')
      .eq('endpoint', config.endpoint)
      .eq('request_id', requestId)
      .single();
    if (existing && (existing.status === 'processed' || existing.status === 'ignored')) {
      return text('Duplicate', 200);
    }
    eventId = existing!.id; // recibido antes pero falló: reprocesar
  }

  const finish = async (status: 'processed' | 'ignored' | 'failed', result: unknown, httpStatus: number) => {
    await supabaseAdmin
      .from('payment_webhook_events')
      .update({ status, result, processed_at: new Date().toISOString() })
      .eq('id', eventId);
    return text(status, httpStatus);
  };

  // 3. Fuente de verdad: la API de MercadoPago
  let payment: MpPayment | null = null;
  let owner: string | null = null;
  let transient = false;

  for (const cred of credentials) {
    const result = await callGateway(
      `https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`,
      { headers: { Authorization: `Bearer ${cred.accessToken}` } },
      { timeoutMs: 8000, maxRetries: 2 }
    );
    if (result.kind === 'ok') {
      payment = result.body as MpPayment;
      owner = cred.ownerId;
      break;
    }
    if (result.kind === 'unknown') transient = true;
  }

  if (!payment) {
    if (transient) return finish('failed', { reason: 'gateway_unavailable' }, 500);
    return finish('ignored', { reason: 'payment_not_found' }, 200);
  }

  // 4. Validaciones antes de tocar la base
  const check = checkMpPayment(payment, {
    referencePrefix: config.referencePrefix,
    excludePrefix: config.excludePrefix,
    expectedCurrency: 'CLP',
  });
  if (!check.ok && check.reason !== 'currency_mismatch') {
    return finish('ignored', { reason: check.reason }, 200);
  }
  // currency_mismatch sigue: apply_gateway_payment deja el pago en revisión

  const { data: applied, error: applyError } = await supabaseAdmin.rpc('apply_gateway_payment', {
    p_external_reference: payment.external_reference,
    p_provider_payment_id: String(payment.id),
    p_provider_status: payment.status,
    p_provider_status_detail: payment.status_detail ?? '',
    p_amount: payment.transaction_amount ?? 0,
    p_currency: payment.currency_id ?? '',
    p_refunded_amount: payment.transaction_amount_refunded ?? 0,
    p_source: 'webhook',
    p_expected_owner: owner,
  });

  if (applyError) {
    console.error(`[${config.endpoint}] error aplicando pago ${payment.id}:`, applyError.message);
    return finish('failed', { reason: 'db_error' }, 500);
  }

  console.log(`[${config.endpoint}] pago ${payment.id} (${payment.status}):`, JSON.stringify(applied));
  const status = applied?.status === 'error' ? 'ignored' : 'processed';
  return finish(status, applied, 200);
}
