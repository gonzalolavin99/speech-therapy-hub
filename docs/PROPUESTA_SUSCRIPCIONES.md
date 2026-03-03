# TherapyHub — Propuesta de Sistema de Suscripciones

## 1. Resumen Ejecutivo

TherapyHub pasará de ser una app de acceso libre (post-aprobación admin) a un modelo **freemium con trial de 1 mes**. Esto permite:

- Adquisición fácil (cualquier profesional prueba gratis)
- Monetización sostenible vía planes mensuales/anuales
- Control granular de features por el admin

---

## 2. Estructura de Planes

| Característica | **Free** | **Profesional** | **Clínica (VIP)** |
|---|---|---|---|
| **Precio mensual** | $0 | $9.990 CLP (~US$11) | $24.990 CLP (~US$27) |
| **Precio anual** | $0 | $89.990 CLP (~US$99) *25% dto* | $229.990 CLP (~US$249) *23% dto* |
| **Trial gratuito** | — | 30 días completo | 30 días completo |
| Pacientes activos | 5 | Ilimitados | Ilimitados |
| Sesiones/mes | 20 | Ilimitadas | Ilimitadas |
| Tests disponibles | 2 básicos | Todos | Todos |
| Planificaciones | 3 activas | Ilimitadas | Ilimitadas |
| Sugerencias IA | 5/mes | 50/mes | Ilimitadas |
| Boletas PDF | ✗ | ✓ | ✓ |
| Google Calendar sync | ✗ | ✓ | ✓ |
| Exportar ficha paciente | ✗ | ✓ | ✓ |
| Consentimiento digital | ✓ | ✓ | ✓ |
| Recordatorios | Básicos | Completos | Completos + WhatsApp* |
| Soporte | Comunidad | Email (48h) | Prioritario (24h) |
| Multi-profesional | 1 cuenta | 1 cuenta | Hasta 5 cuentas |
| Branding personalizado | ✗ | ✗ | Logo propio en boletas |

> *WhatsApp: integración futura vía Twilio/API oficial.

### Justificación de precios

- **Referencia de mercado Chile**: SaaS salud similares cobran $8.000–$30.000 CLP/mes.
- **Profesional** apunta al terapeuta independiente (~70% del mercado objetivo).
- **Clínica** apunta a centros con múltiples profesionales.
- El precio anual con descuento incentiva retención y mejora cash flow.

---

## 3. Flujo del Usuario

```
Registro → Onboarding → Tour → Trial 30 días (plan Profesional completo)
                                    │
                          Día 25: Notificación "Tu trial termina en 5 días"
                          Día 29: Notificación "Último día de trial"
                          Día 30: ¿Suscribirse?
                                    │
                          ┌─────────┼─────────┐
                          ▼         ▼         ▼
                        Free    Profesional  Clínica
                    (limitado)   ($9.990)   ($24.990)
```

### Reglas clave

1. **Nuevo usuario** → automáticamente en trial Profesional por 30 días.
2. **Al expirar trial** → baja a Free si no paga. Sin perder datos, solo se bloquean features.
3. **Downgrade** → los datos existentes se conservan, pero no puede crear nuevos si supera límites.
4. **Upgrade** → inmediato, se cobra proporcional al mes restante.
5. **Admin override** → el admin puede asignar cualquier plan manualmente (VIP, extender trial, etc.).

---

## 4. Panel Admin — Gestión de Suscripciones

El admin podrá:

| Acción | Descripción |
|---|---|
| Ver todos los usuarios | Con su plan actual, fecha de trial, estado de pago |
| Cambiar plan manualmente | Asignar Free/Profesional/Clínica a cualquier usuario |
| Extender trial | Dar más días de prueba |
| Otorgar VIP | Acceso completo sin cobro (para testers, partners, etc.) |
| Bloquear cuenta | Suspender acceso |
| Ver métricas | Ingresos, conversión trial→pago, churn rate |

### Modelo de datos propuesto

```sql
-- Nueva tabla
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  plan TEXT NOT NULL DEFAULT 'trial',        -- 'free', 'trial', 'professional', 'clinic', 'vip'
  status TEXT NOT NULL DEFAULT 'active',      -- 'active', 'canceled', 'past_due', 'suspended'
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  payment_provider TEXT,                      -- 'mercadopago', 'stripe', etc.
  payment_provider_subscription_id TEXT,      -- ID en la plataforma de pago
  admin_override BOOLEAN DEFAULT FALSE,       -- Si el admin asignó este plan manualmente
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Límites por plan (configurable por admin)
CREATE TABLE plan_limits (
  plan TEXT PRIMARY KEY,
  max_patients INTEGER,
  max_sessions_per_month INTEGER,
  max_plannings INTEGER,
  max_ai_requests_per_month INTEGER,
  available_tests TEXT[],                     -- IDs de tests permitidos
  features TEXT[],                            -- 'pdf_export', 'google_calendar', 'whatsapp', etc.
  label TEXT NOT NULL,
  price_monthly INTEGER DEFAULT 0,
  price_yearly INTEGER DEFAULT 0
);

-- Registros de uso para enforcement
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  metric TEXT NOT NULL,                       -- 'patients', 'sessions', 'ai_requests', etc.
  count INTEGER DEFAULT 0,
  period TEXT NOT NULL,                       -- '2026-03' (año-mes)
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, metric, period)
);
```

---

## 5. Comparativa de Plataformas de Pago

### Para Chile, las opciones viables son:

| Plataforma | Comisión | Tarjetas | Suscripciones | Webhook | Moneda CLP | Nota |
|---|---|---|---|---|---|---|
| **Mercado Pago** | 3.49% + IVA | ✓ Visa/MC/Amex | ✓ Nativa | ✓ | ✓ Nativa | **Recomendada.** La más usada en Chile, comisión competitiva, SDK bueno. |
| **Flow.cl** | 2.95% + IVA | ✓ Visa/MC | ✓ Vía API | ✓ | ✓ Nativa | Chilena, buena integración, menor market share. |
| **Stripe** | 3.0% + ~US$0.30 | ✓ Todas | ✓ Excelente | ✓ | ⚠ USD→CLP | Mejor DX y documentación. Cobra en USD y convierte a CLP. Comisión similar pero con riesgo de cambio. |
| **Transbank Webpay** | 2.49% negocia. | ✓ Visa/MC/Amex | ✗ Manual | ✓ | ✓ Nativa | Más barata en %, pero sin suscripciones nativas. Integración más compleja. Requiere contrato empresa. |
| **Kushki** | ~3.5% | ✓ | ✓ | ✓ | ✓ | Latam-focused, buena API, menos conocida en Chile. |
| **PayPal** | 5.4% + fijo | ✓ | ✓ | ✓ | ⚠ USD | Muy cara para CLP. No recomendada. |

### Recomendación: **Mercado Pago** como principal

**Razones:**
1. **Comisión competitiva** (3.49% + IVA ≈ 4.16% efectivo)
2. **Suscripciones nativas** — la plataforma maneja reintentos, cobros recurrentes
3. **Amplia aceptación** — tarjetas de crédito/débito + saldo MercadoPago
4. **SDK moderno** — API REST + SDK JS para checkout
5. **CLP nativo** — sin riesgo cambiario
6. **Checkout Pro** — el usuario no necesita tener cuenta de MercadoPago

**Plan B: Flow.cl** — comisión más baja (2.95%), pero menor ecosistema. Buena alternativa si se quiere 100% chileno.

**Flow de pago sugerido:**
```
Usuario elige plan → Checkout MercadoPago (redirect o modal)
                     → Pago aprobado → Webhook actualiza `subscriptions`
                     → Pago fallido → Reintento automático (3 veces)
                     → Cancelación → Status 'canceled', baja a Free al fin del período
```

---

## 6. Implementación por Fases

### Fase 1 — Infraestructura (1-2 semanas)
- [ ] Crear tablas `subscriptions`, `plan_limits`, `usage_tracking`
- [ ] Hook `useSubscription` para leer plan actual y límites
- [ ] Middleware/guard que chequea límites antes de crear recursos
- [ ] Panel admin: ver y editar suscripciones de usuarios
- [ ] Seed de `plan_limits` con valores iniciales

### Fase 2 — UI de Planes + Trial (1 semana)
- [ ] Página de pricing `/planes` con los 3 tiers
- [ ] Banner de trial con countdown en el dashboard
- [ ] Notificaciones automáticas día 25 y 29
- [ ] Pantalla de "Tu trial expiró" con CTA a suscribirse
- [ ] Límites activos: mostrar "3/5 pacientes usados" etc.

### Fase 3 — Integración Mercado Pago (1-2 semanas)
- [ ] Crear cuenta vendedor en MercadoPago
- [ ] Backend: endpoint para crear suscripción MP
- [ ] Backend: webhook para recibir notificaciones de pago
- [ ] Frontend: botón de checkout que redirige a MP
- [ ] Manejo de estados: pago exitoso, fallido, cancelado
- [ ] Facturación: registro de pagos recibidos

### Fase 4 — Polish (1 semana)
- [ ] Emails transaccionales (bienvenida, trial expirando, pago confirmado)
- [ ] Página de billing en perfil (historial de pagos, cambiar plan, cancelar)
- [ ] Métricas admin: MRR, conversión, churn
- [ ] Tests E2E del flujo completo

---

## 7. Ejemplo de Enforcement en Frontend

```typescript
// Hook conceptual
function useCanCreate(resource: 'patient' | 'session' | 'planning' | 'ai_request') {
  const { plan, limits } = useSubscription();
  const { usage } = useUsage();

  const current = usage[resource] || 0;
  const max = limits[`max_${resource}s`];

  return {
    allowed: max === -1 || current < max,  // -1 = ilimitado
    current,
    max,
    message: max !== -1 ? `${current}/${max} ${resource}s usados` : undefined,
  };
}
```

---

## 8. Resumen de Costos Esperados

| Concepto | Costo mensual estimado |
|---|---|
| Supabase (Pro) | ~US$25 |
| Dominio + DNS | ~US$1 |
| Mercado Pago | 4.16% de ingresos |
| Email transaccional (Resend) | Free tier (3k/mes) |
| **Total fijo** | **~US$26/mes** |

Con 50 usuarios pagando plan Profesional ($9.990/mes):
- Ingreso bruto: $499.500 CLP/mes (~US$550)
- Comisión MP: ~US$23
- **Margen neto: ~US$500/mes**

Con 200 usuarios (mix 70% Pro, 20% Clínica, 10% Free):
- Ingreso bruto: ~$2.100.000 CLP/mes (~US$2.300)
- **Margen neto: ~US$2.200/mes**

---

## 9. Decisiones Pendientes

1. **¿Factura electrónica?** Si se quiere emitir boleta/factura oficial al usuario que paga, se necesita integración con SII (SimpleFact, Bsale, etc.)
2. **¿Permitir pago anual desde el inicio?** Recomendado: sí, con descuento visible
3. **¿Cuántos tests incluir en Free?** Propuesta: 2 tests básicos (el más usado de cada profesión)
4. **¿Plan Clínica con multi-usuario desde día 1?** Se puede postergar para Fase 5
5. **¿Qué plataforma de pago elegir?** → Confirmar Mercado Pago

---

*Documento generado para revisión. Los precios y límites son ajustables desde el panel admin una vez implementado.*
