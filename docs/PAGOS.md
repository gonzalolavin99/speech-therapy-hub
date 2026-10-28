# Arquitectura de pagos

TherapyHub cobra con MercadoPago en dos flujos:

| Flujo | Cuenta MercadoPago | Orden | Checkout | Webhook |
|---|---|---|---|---|
| Cobros del portal (paciente → profesional) | La del profesional | `portal_charges` | `mercadopago-create-preference` | `mercadopago-webhook` |
| Suscripciones (profesional → plataforma) | La de la plataforma | `subscription_payments` | `subscription-checkout` | `subscription-webhook` |

## Principios

1. **El frontend inicia, nunca confirma.** `PaymentResult` solo informa; ningún parámetro
   `?status=approved` cambia estados. La confirmación la hace el backend con datos
   consultados a la API de MercadoPago.
2. **Precio desde la fuente confiable.** El monto sale de `portal_charges.amount` o de
   `plan_limits` (vía `create_subscription_payment`), nunca del request.
3. **Orden ≠ pago.** La orden (`portal_charges`, `subscription_payments`) y cada pago en la
   pasarela (`gateway_payments`) tienen estados separados. Un contracargo no borra la historia.
4. **Todo es idempotente**: API (`idempotency_keys`), pasarela (`X-Idempotency-Key`),
   webhooks (`payment_webhook_events`) y entrega (solo la primera transición a `succeeded`).

## Flujo de un cobro

```
React ──POST + Idempotency-Key──▶ create-preference
                                   ├─ autoriza (token del portal o JWT del profesional)
                                   ├─ rate limit (IP y actor)
                                   ├─ reserve_idempotency_key
                                   ├─ reutiliza checkout vigente o crea preferencia
                                   │   (monto desde BD, timeout + reintentos, X-Idempotency-Key)
                                   └─ guarda respuesta (replay en reintentos)
Paciente paga en MercadoPago
MercadoPago ──webhook──▶ mercadopago-webhook
                          ├─ verifica x-signature (HMAC-SHA256, ventana anti-replay)
                          ├─ registra evento; duplicado → 200 sin procesar
                          ├─ GET /v1/payments/{id} (fuente de verdad)
                          ├─ valida referencia y moneda
                          └─ apply_gateway_payment (transacción, FOR UPDATE)
                               ├─ dueño, monto ≥ esperado, moneda CLP (si no → under_review)
                               ├─ máquina de estados (sin retrocesos por eventos fuera de orden)
                               ├─ historial en payment_state_transitions
                               └─ entrega idempotente (confirma el cobro una sola vez)
Paciente/profesional vuelve del checkout ──▶ payments-verify (suscripciones)
                          ├─ solo el payment_id de la URL; estado desde GET /v1/payments/{id}
                          ├─ el pago debe ser de una orden del usuario logueado
                          └─ apply_gateway_payment (activación inmediata, sin esperar webhook)
pg_cron cada 15 min ──▶ payments-reconcile
                          ├─ órdenes abiertas → /v1/payments/search → apply_gateway_payment
                          └─ reembolsos pendientes → reenvío con la misma clave
```

## Máquina de estados (`gateway_payments.state`)

```
pending / processing / requires_action / unknown ──▶ cualquier estado
under_review  ──▶ succeeded | failed | cancelled | refunded | partially_refunded | charged_back
succeeded     ──▶ disputed | refunded | partially_refunded | charged_back
partially_refunded ──▶ refunded | disputed | charged_back
disputed      ──▶ succeeded | refunded | partially_refunded | charged_back
failed, cancelled, refunded, charged_back: terminales
```

Implementada en SQL (`payment_transition_allowed`) y TypeScript (`isTransitionAllowed`);
un test compara ambas en los 144 pares posibles.

## Reembolsos

`payments-refund` (profesional dueño, header `Idempotency-Key` obligatorio):

- `create_refund_request` bloquea el pago (`FOR UPDATE`) y valida dueño, estado y saldo:
  lo reembolsado + lo pendiente + lo nuevo ≤ monto pagado. Dos solicitudes simultáneas
  no pueden devolver dos veces el mismo dinero.
- La misma clave devuelve el mismo reembolso; con otro monto → 422.
- Timeout → queda `pending` (202). La reconciliación lo reenvía con la misma clave y
  MercadoPago no duplica la devolución.

## Fallos parciales

| Situación | Comportamiento |
|---|---|
| Timeout al crear preferencia | 503, clave `failed`; reintentar con la misma clave es seguro (no cobra) |
| Timeout al reembolsar | Reembolso `pending`; reconciliación reenvía con la misma clave |
| MercadoPago no responde al webhook | 500 → MercadoPago reintenta; evento queda `failed` y se reprocesa |
| Webhook que nunca llega | Reconciliación busca el pago por `external_reference` |
| Proceso caído con clave `in_progress` | La clave se libera tras 60 s |
| Dos pagos exitosos para el mismo cobro | El segundo no entrega; alerta `duplicate_payment` para reembolsar |
| Pago de un plan teniendo VIP/plan asignado por admin | No se reemplaza el plan; alerta `kept_existing_plan` para reembolsar |
| Webhook con firma inválida | 401 con diagnóstico en `payment_webhook_events.result` (sin el secreto); `payments-verify` y la reconciliación activan igual |

## Alertas (`get_payment_alerts()`, solo admins)

`stuck_payment` (>24 h sin estado final), `under_review` (monto o moneda no cuadran),
`dispute` (disputas y contracargos), `duplicate_payment`, `stuck_refund` (>1 h pendiente).

## Secretos (Supabase → Edge Functions → Secrets)

| Secreto | Uso |
|---|---|
| `MP_WEBHOOK_SECRET` | Firma de webhooks de suscripciones (cuenta de la plataforma). Acepta varios valores separados por coma (modo de prueba y productivo) |
| `mercadopago_config.webhook_secret` | Firma de webhooks de cada profesional (columna en BD) |
| `CRON_SECRET` | Autoriza a pg_cron a invocar `payments-reconcile` |
| `APP_URL` | Origen permitido para URLs de retorno del checkout |

Los access tokens de MercadoPago nunca llegan al frontend ni a los logs.

## Tests

| Archivo | Qué cubre |
|---|---|
| `src/test/payments/payments.test.ts` | Estados, firma, idempotencia, reintentos/backoff, URLs de retorno |
| `src/test/payments/payments-db.test.ts` | Migraciones en Postgres real (PGlite): confirmación, duplicados, fuera de orden, montos, reembolsos, idempotencia, rate limit, reconciliación, alertas, permisos, RLS |
| `src/test/payments/mp-webhook.test.ts` | Webhook: firma falsa, duplicado, pasarela caída, datos de la API vs. del webhook |
| `src/test/payments/idempotency.test.ts` | Doble clic, concurrencia, mismatch, reintento tras fallo |
| `src/test/payments/refunds.test.ts` | Reembolsos y reconciliación contra MercadoPago simulado |
| `src/test/components/RefundDialog.test.tsx` | Validación de monto y clave estable ante doble clic |

```bash
npm test               # todo
npm run test:coverage  # con cobertura
```
