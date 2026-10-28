// Verificación activa de un pago de suscripción al volver del checkout.
//
// El frontend solo aporta el payment_id que MercadoPago puso en la URL de retorno;
// el estado se consulta a la API de MercadoPago y se aplica con la misma función
// que usan webhooks y reconciliación. Así la activación no depende de que el
// webhook llegue (o pase la firma), y un payment_id ajeno o inventado no sirve.

import type { AdminClient } from './mp-webhook.ts';
import type { OperationResult } from './idempotency.ts';
import { callGateway, type MpPayment, type RetryOptions } from './payments.ts';

export async function verifySubscriptionReturn(
  admin: AdminClient,
  params: { paymentId: string; userId: string },
  accessToken: string,
  retry?: RetryOptions
): Promise<OperationResult> {
  const gateway = await callGateway(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(params.paymentId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
    { timeoutMs: 8000, maxRetries: 1, ...retry }
  );

  if (gateway.kind === 'unknown') {
    return { status: 503, body: { status: 'unverified', error: 'MercadoPago no respondió' } };
  }
  if (gateway.kind === 'rejected') {
    return { status: 404, body: { status: 'not_found', error: 'Pago no encontrado' } };
  }

  const payment = gateway.body as MpPayment;
  const reference = payment.external_reference ?? '';
  if (!reference.startsWith('thub_sub_')) {
    return { status: 404, body: { status: 'not_found', error: 'El pago no corresponde a una suscripción' } };
  }

  // El pago debe ser de una orden de este usuario
  const { data: order } = await admin
    .from('subscription_payments')
    .select('id')
    .eq('mp_external_reference', reference)
    .eq('user_id', params.userId)
    .maybeSingle();
  if (!order) {
    return { status: 403, body: { status: 'forbidden', error: 'El pago no pertenece a tu cuenta' } };
  }

  const { data: applied, error } = await admin.rpc('apply_gateway_payment', {
    p_external_reference: reference,
    p_provider_payment_id: String(payment.id),
    p_provider_status: payment.status,
    p_provider_status_detail: payment.status_detail ?? '',
    p_amount: payment.transaction_amount ?? 0,
    p_currency: payment.currency_id ?? '',
    p_refunded_amount: payment.transaction_amount_refunded ?? 0,
    p_source: 'reconcile',
    p_expected_owner: params.userId,
  });

  if (error || applied?.status === 'error') {
    return { status: 500, body: { status: 'error', error: 'No se pudo aplicar el pago' } };
  }

  // noop/ignored: ya estaba aplicado (p.ej. por el webhook); devolver el estado actual
  const { data: current } = await admin
    .from('gateway_payments')
    .select('state, review_reason')
    .eq('provider_payment_id', String(payment.id))
    .maybeSingle();

  return {
    status: 200,
    body: {
      status: 'verified',
      state: current?.state ?? applied?.to ?? 'unknown',
      fulfillment: applied?.fulfillment ?? (current?.review_reason?.startsWith('kept_existing_plan') ? 'kept_existing_plan' : 'none'),
    },
  };
}
