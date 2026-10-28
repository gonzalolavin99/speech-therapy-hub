# Plan de mejoras — revisión octubre 2026

Lista priorizada de mejoras detectadas en la revisión completa de la app.
Se aplican en este orden; cada ítem se marca al terminarlo.

## Seguridad (crítico)

- [x] **1. IA en el servidor.** Las llamadas a OpenAI se hacían desde el navegador con
  `VITE_OPENAI_API_KEY`, que Vite incrusta en el bundle público (la key estaba visible en
  producción). Mover las llamadas a la Edge Function `ai-completion`, que exige sesión
  iniciada y lee `OPENAI_API_KEY` como secreto de Supabase.
- [x] **2. Bloquear RPCs internas de pagos.** `get_platform_mp_config`,
  `get_mp_config_for_charge`, `process_mp_payment`, `process_subscription_payment` y
  `update_charge_mp_data` son `SECURITY DEFINER` y no tenían `REVOKE`, así que por defecto
  cualquier cliente con la anon key podía llamarlas (leer access tokens de MercadoPago,
  marcar cobros como pagados o activar suscripciones sin pagar). Migración que deja su
  ejecución solo a `service_role`.
- [x] **3. Validar el monto pagado.** Los webhooks confirmaban cobros y suscripciones con
  cualquier pago aprobado que trajera la referencia correcta. Comparar el monto pagado con
  el esperado antes de confirmar.
- [x] **4. `mercadopago-create-preference` sin control de pertenencia.** Con un token válido
  de cualquier paciente se podía crear un pago para un cobro ajeno, y sin token no se
  pedía sesión. Exigir que el cobro sea del paciente del token o del profesional logueado.
- [x] **5. Funciones de email abiertas.** `send-welcome-email` y `notify-admin-signup`
  enviaban correos a cualquier dirección sin autenticación. Exigir admin o un secreto de
  webhook.
- [x] **6. Webhook de MercadoPago probaba los tokens de todos los profesionales.** Pasar el
  `user_id` en la `notification_url` para usar solo el token del dueño del cobro.

## Calidad y CI

- [x] **7. CI rota desde marzo.** `package-lock.json` desincronizado hacía fallar `npm ci`.
  Regenerar el lock y hacer que la CI falle si fallan los tests.
- [x] **8. Error de sintaxis en `database.types.ts`** (llave sobrante; `tsc` lo reporta).
- [x] **9. Bugs señalados por ESLint:** hook llamado fuera de un componente
  (`usePublicBooking.getAvailableSlots`), auto-asignación en `validatePhone`, bloques
  `catch` vacíos en `GuidedTour`.
- [x] **10. Documentación:** actualizar `.env.example`, `README.md` y `CLAUDE.md` con la
  nueva configuración de IA, secretos de Edge Functions y la migración nueva.

## Pagos (ver docs/PAGOS.md)

- [x] **11. Estados explícitos** (`gateway_payments`) con máquina de estados en SQL y TS, historial en `payment_state_transitions`.
- [x] **12. Idempotencia** de API (`idempotency_keys`), pasarela (`X-Idempotency-Key`) y entrega.
- [x] **13. Webhooks seguros:** firma HMAC con ventana anti-replay, deduplicación duradera, 5xx en fallos transitorios.
- [x] **14. Concurrencia:** `SELECT ... FOR UPDATE` en orden y pago, `UNIQUE` en pagos, reembolsos y eventos.
- [x] **15. Validación de dueño, monto y moneda**; pagos que no cuadran quedan `under_review`.
- [x] **16. Timeouts, reintentos con backoff** solo para errores transitorios; resultado desconocido ≠ fallido.
- [x] **17. Reembolsos** totales y parciales con identidad propia y tope de saldo; UI en Pagos.
- [x] **18. Reconciliación** periódica (`payments-reconcile` + pg_cron) y alertas para admins.
- [x] **19. Rate limiting** en checkout y reembolsos; URLs de retorno restringidas al origen de la app.
- [x] **20. Tests** unitarios por módulo y de migraciones en Postgres real (PGlite); cobertura medida.

## Pendiente para después (no se aborda en esta pasada)

- 108 usos de `any` y `strict: false` en TypeScript: activar `strict` de forma gradual.
- Migraciones sin prefijo de fecha y tres esquemas de referencia (`schema.sql`,
  `schema_v2.sql`, `EJECUTAR_COMPLETO.sql`): consolidar con `supabase db diff`.
- Tokens de MercadoPago guardados en texto plano (protegidos por RLS): evaluar Supabase Vault.
- Las mismas skills copiadas en `.agent/`, `.agents/`, `.claude/`, `.windsurf/` y `skills/`.
- Repo público con protocolos de tests en `docs/` que pueden tener derechos de autor.
- Pocos tests: solo utilidades. Faltan tests de hooks, pagos y políticas RLS.
- Sin rate limiting en la reserva pública ni en el formulario de contacto.
