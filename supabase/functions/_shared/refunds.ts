// Reembolsos y reconciliación de pagos contra MercadoPago.
// Sin dependencias de Deno para poder testearse con Vitest.

import type { AdminClient } from './mp-webhook.ts';
import type { OperationResult } from './idempotency.ts';
import { callGateway, type MpPayment, type RetryOptions } from './payments.ts';

export type CredentialResolver = (kind: 'portal_charge' | 'subscription', ownerId: string) => Promise<string | null>;

const REFUND_ERRORS: Record<string, { status: number; message: string }> = {
  payment_not_found: { status: 404, message: 'Pago no encontrado' },
  forbidden: { status: 403, message: 'No puedes reembolsar este pago' },
  not_refundable: { status: 409, message: 'El pago no está en un estado reembolsable' },
  exceeds_refundable: { status: 422, message: 'El monto supera lo que queda por reembolsar' },
  idempotency_mismatch: { status: 422, message: 'La clave de idempotencia ya se usó con otros datos' },
};

// Envía (o reenvía) un reembolso a MercadoPago con su clave idempotente
async function sendRefund(
  admin: AdminClient,
  refund: { refundId: string; providerPaymentId: string; amount: number; idempotencyKey: string },
  accessToken: string,
  retry?: RetryOptions
): Promise<{ state: 'succeeded' | 'failed' | 'pending'; providerRefundId?: string }> {
  const gateway = await callGateway(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(refund.providerPaymentId)}/refunds`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        // La misma clave en cada reintento: MercadoPago no duplica la devolución
        'X-Idempotency-Key': refund.idempotencyKey,
      },
      body: JSON.stringify({ amount: refund.amount }),
    },
    retry
  );

  if (gateway.kind === 'ok') {
    const providerRefundId = String((gateway.body as { id?: string | number })?.id ?? '');
    await admin.rpc('complete_refund', {
      p_refund_id: refund.refundId,
      p_status: 'succeeded',
      p_provider_refund_id: providerRefundId || null,
    });
    return { state: 'succeeded', providerRefundId };
  }

  if (gateway.kind === 'rejected') {
    const reason = (gateway.body as { message?: string })?.message ?? `http_${gateway.status}`;
    await admin.rpc('complete_refund', { p_refund_id: refund.refundId, p_status: 'failed', p_failure_reason: reason });
    return { state: 'failed' };
  }

  // Resultado desconocido: queda pendiente y la reconciliación lo reenvía con la misma clave
  return { state: 'pending' };
}

export async function processRefund(
  admin: AdminClient,
  params: { gatewayPaymentId: string; amount: number | null; idempotencyKey: string; requestedBy: string; reason?: string },
  resolveCredential: CredentialResolver,
  retry?: RetryOptions
): Promise<OperationResult> {
  const { data: request, error } = await admin.rpc('create_refund_request', {
    p_gateway_payment_id: params.gatewayPaymentId,
    p_amount: params.amount,
    p_idempotency_key: params.idempotencyKey,
    p_requested_by: params.requestedBy,
    p_reason: params.reason ?? null,
  });

  if (error || !request) {
    return { status: 500, body: { error: 'No se pudo registrar el reembolso' } };
  }

  if (request.status === 'error') {
    const mapped = REFUND_ERRORS[request.error] ?? { status: 400, message: 'Reembolso no válido' };
    return { status: mapped.status, body: { error: mapped.message, code: request.error, refundable: request.refundable } };
  }

  if (request.status === 'replay' && request.refund_status !== 'pending') {
    return { status: 200, body: { refund_id: request.refund_id, status: request.refund_status, amount: request.amount } };
  }

  const { data: payment } = await admin
    .from('gateway_payments')
    .select('kind, owner_user_id')
    .eq('id', params.gatewayPaymentId)
    .single();
  const accessToken = payment ? await resolveCredential(payment.kind, payment.owner_user_id) : null;
  if (!accessToken) {
    return { status: 202, body: { refund_id: request.refund_id, status: 'pending', amount: request.amount } };
  }

  const sent = await sendRefund(admin, {
    refundId: request.refund_id,
    providerPaymentId: request.provider_payment_id,
    amount: Number(request.amount),
    idempotencyKey: params.idempotencyKey,
  }, accessToken, retry);

  if (sent.state === 'failed') {
    return { status: 502, body: { refund_id: request.refund_id, status: 'failed', error: 'MercadoPago rechazó el reembolso' } };
  }
  return {
    status: sent.state === 'succeeded' ? 200 : 202,
    body: { refund_id: request.refund_id, status: sent.state, amount: request.amount },
  };
}

export interface ReconcileSummary {
  orders: number;
  applied: number;
  unchanged: number;
  refundsResolved: number;
  errors: number;
}

// Compara las órdenes abiertas con MercadoPago y aplica lo que falte.
// Recupera webhooks perdidos, timeouts y reembolsos con resultado desconocido.
export async function reconcilePayments(
  admin: AdminClient,
  resolveCredential: CredentialResolver,
  retry?: RetryOptions
): Promise<ReconcileSummary> {
  const summary: ReconcileSummary = { orders: 0, applied: 0, unchanged: 0, refundsResolved: 0, errors: 0 };

  const { data: orders, error } = await admin.rpc('payments_needing_reconciliation', { p_older_than_minutes: 15 });
  if (error) throw new Error(`payments_needing_reconciliation: ${error.message}`);

  for (const order of (orders ?? []) as Array<{ kind: 'portal_charge' | 'subscription'; external_reference: string; owner_user_id: string }>) {
    summary.orders++;
    const accessToken = await resolveCredential(order.kind, order.owner_user_id);
    if (!accessToken) { summary.errors++; continue; }

    const search = await callGateway(
      `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(order.external_reference)}&sort=date_created&criteria=asc`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
      retry
    );
    if (search.kind !== 'ok') { summary.errors++; continue; }

    for (const payment of ((search.body as { results?: MpPayment[] })?.results ?? [])) {
      if (payment.external_reference !== order.external_reference) continue;
      const { data: applied, error: applyError } = await admin.rpc('apply_gateway_payment', {
        p_external_reference: order.external_reference,
        p_provider_payment_id: String(payment.id),
        p_provider_status: payment.status,
        p_provider_status_detail: payment.status_detail ?? '',
        p_amount: payment.transaction_amount ?? 0,
        p_currency: payment.currency_id ?? '',
        p_refunded_amount: payment.transaction_amount_refunded ?? 0,
        p_source: 'reconcile',
        p_expected_owner: order.kind === 'portal_charge' ? order.owner_user_id : null,
      });
      if (applyError || applied?.status === 'error') summary.errors++;
      else if (applied?.status === 'applied') summary.applied++;
      else summary.unchanged++;
    }
  }

  const { data: refunds } = await admin.rpc('pending_refunds_for_reconciliation', { p_older_than_minutes: 5 });
  for (const refund of (refunds ?? []) as Array<{ refund_id: string; amount: number; provider_payment_id: string; owner_user_id: string; kind: 'portal_charge' | 'subscription'; idempotency_key: string }>) {
    const accessToken = await resolveCredential(refund.kind, refund.owner_user_id);
    if (!accessToken) { summary.errors++; continue; }
    const sent = await sendRefund(admin, {
      refundId: refund.refund_id,
      providerPaymentId: refund.provider_payment_id,
      amount: Number(refund.amount),
      idempotencyKey: refund.idempotency_key,
    }, accessToken, retry);
    if (sent.state === 'pending') summary.errors++;
    else summary.refundsResolved++;
  }

  await admin.rpc('purge_payment_ephemera');
  return summary;
}
