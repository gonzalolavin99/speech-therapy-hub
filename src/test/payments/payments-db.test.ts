// @vitest-environment node
// Ejecuta supabase/migrations/payments_lifecycle.sql en Postgres real (PGlite)
// sobre un esquema mínimo que imita Supabase (auth.uid(), roles, tablas de órdenes).
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isTransitionAllowed, mapMpStatus, type PaymentState } from "../../../supabase/functions/_shared/payments.ts";

const migrationsDir = resolve(__dirname, "../../../supabase/migrations");
const migration = readFileSync(resolve(migrationsDir, "payments_lifecycle.sql"), "utf8");
const securityMigration = readFileSync(resolve(migrationsDir, "secure_payment_rpcs.sql"), "utf8");

const PRO = "11111111-1111-1111-1111-111111111111";
const OTHER_PRO = "22222222-2222-2222-2222-222222222222";
const SUB_USER = "33333333-3333-3333-3333-333333333333";
const CHARGE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const CHARGE_REF = `thub_${CHARGE}`;
const SUB_REF = "thub_sub_0123456789abcdef";

const SUPABASE_STUB = `
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS
    $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $$ SELECT NULLIF(auth.jwt() ->> 'sub', '')::uuid $$;
  GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;

  CREATE TABLE admin_users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE);
  CREATE TABLE portal_charges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    patient_id uuid NOT NULL DEFAULT gen_random_uuid(),
    amount integer NOT NULL CHECK (amount > 0),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'confirmed', 'cancelled')),
    payment_method text, payment_reference text,
    patient_confirmed_at timestamptz, professional_confirmed_at timestamptz,
    mp_preference_id text, mp_payment_id text, mp_status text, mp_init_point text, mp_external_reference text,
    created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
  );
  CREATE TABLE subscription_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL, plan text NOT NULL, billing_period text NOT NULL DEFAULT 'monthly',
    amount integer NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'in_process', 'refunded')),
    mp_preference_id text, mp_payment_id text, mp_status text, mp_status_detail text,
    mp_external_reference text UNIQUE, mp_init_point text,
    period_start timestamptz DEFAULT now(), period_end timestamptz DEFAULT now() + interval '1 month',
    created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
  );
  CREATE TABLE subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid UNIQUE NOT NULL,
    plan text, status text, payment_provider text, payment_provider_subscription_id text,
    current_period_start timestamptz, current_period_end timestamptz, trial_ends_at timestamptz,
    admin_override boolean DEFAULT false, admin_notes text, updated_at timestamptz DEFAULT now()
  );
`;

let db: PGlite;

type Row = Record<string, unknown>;

async function call<T = Row>(sql: string, params: unknown[] = []): Promise<T> {
  const result = await db.query<{ r: T }>(sql, params);
  return result.rows[0]?.r as T;
}

function applyPayment(opts: {
  ref?: string;
  paymentId?: string;
  status?: string;
  amount?: number;
  currency?: string;
  refunded?: number;
  owner?: string | null;
}) {
  return call(
    `SELECT apply_gateway_payment($1, $2, $3, '', $4, $5, $6, 'webhook', $7) AS r`,
    [
      opts.ref ?? CHARGE_REF,
      opts.paymentId ?? "mp_1",
      opts.status ?? "approved",
      opts.amount ?? 20000,
      opts.currency ?? "CLP",
      opts.refunded ?? 0,
      opts.owner === undefined ? PRO : opts.owner,
    ]
  );
}

async function chargeStatus() {
  return (await db.query<{ status: string }>(`SELECT status FROM portal_charges WHERE id = $1`, [CHARGE])).rows[0].status;
}

async function gatewayState(paymentId = "mp_1") {
  return (await db.query<{ state: string }>(`SELECT state FROM gateway_payments WHERE provider_payment_id = $1`, [paymentId])).rows[0]?.state;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  await db.exec(migration);
});

afterAll(async () => {
  await db.close();
});

beforeEach(async () => {
  await db.exec(`
    TRUNCATE payment_refunds, payment_state_transitions, gateway_payments, payment_webhook_events,
             idempotency_keys, rate_limit_buckets, portal_charges, subscription_payments, subscriptions, admin_users CASCADE;
    INSERT INTO portal_charges (id, user_id, amount, mp_external_reference, mp_preference_created_at)
    VALUES ('${CHARGE}', '${PRO}', 20000, '${CHARGE_REF}', now() - interval '1 hour');
    INSERT INTO subscription_payments (user_id, plan, amount, mp_external_reference, mp_preference_id, created_at)
    VALUES ('${SUB_USER}', 'professional', 15000, '${SUB_REF}', 'pref_sub', now() - interval '1 hour');
    RESET ROLE;
    SELECT set_config('request.jwt.claims', '', false);
  `);
});

describe("apply_gateway_payment: confirmación de cobros", () => {
  it("confirma el cobro una sola vez cuando MercadoPago aprueba el pago", async () => {
    const result = await applyPayment({});
    expect(result).toMatchObject({ status: "applied", from: null, to: "succeeded", fulfillment: "charge_confirmed" });
    expect(await chargeStatus()).toBe("confirmed");
    const transitions = await db.query(`SELECT from_state, to_state FROM payment_state_transitions`);
    expect(transitions.rows).toEqual([{ from_state: null, to_state: "succeeded" }]);
  });

  it("ignora un webhook repetido sin volver a entregar ni registrar transiciones", async () => {
    await applyPayment({});
    const again = await applyPayment({});
    expect(again).toMatchObject({ status: "noop", state: "succeeded" });
    expect((await db.query(`SELECT 1 FROM gateway_payments`)).rows).toHaveLength(1);
    expect((await db.query(`SELECT 1 FROM payment_state_transitions`)).rows).toHaveLength(1);
  });

  it("no retrocede el estado con eventos fuera de orden", async () => {
    await applyPayment({ status: "approved" });
    const late = await applyPayment({ status: "pending" });
    expect(late).toMatchObject({ status: "ignored", reason: "invalid_transition", from: "succeeded", to: "pending" });
    expect(await gatewayState()).toBe("succeeded");
    expect(await chargeStatus()).toBe("confirmed");
  });

  it("avanza de pending a succeeded registrando ambas transiciones", async () => {
    await applyPayment({ status: "pending" });
    expect(await chargeStatus()).toBe("pending");
    await applyPayment({ status: "approved" });
    expect(await chargeStatus()).toBe("confirmed");
    const transitions = await db.query(`SELECT to_state FROM payment_state_transitions ORDER BY id`);
    expect(transitions.rows.map((r: Row) => r.to_state)).toEqual(["pending", "succeeded"]);
  });

  it("deja en revisión un pago aprobado por menos del monto del cobro", async () => {
    const result = await applyPayment({ amount: 200 });
    expect(result).toMatchObject({ to: "under_review", fulfillment: "none" });
    expect(String((result as Row).review_reason)).toContain("amount_mismatch");
    expect(await chargeStatus()).toBe("pending");
  });

  it("deja en revisión un pago aprobado en otra moneda", async () => {
    const result = await applyPayment({ currency: "USD" });
    expect(result).toMatchObject({ to: "under_review" });
    expect(await chargeStatus()).toBe("pending");
  });

  it("rechaza un pago cuyo cobro pertenece a otro profesional", async () => {
    expect(await applyPayment({ owner: OTHER_PRO })).toMatchObject({ status: "error", error: "owner_mismatch" });
    expect(await chargeStatus()).toBe("pending");
  });

  it("rechaza referencias desconocidas o ajenas", async () => {
    expect(await applyPayment({ ref: "thub_00000000-0000-0000-0000-000000000000" })).toMatchObject({ error: "order_not_found" });
    expect(await applyPayment({ ref: "otra_app_123" })).toMatchObject({ error: "unknown_reference" });
  });

  it("no entrega dos veces si llega un segundo pago exitoso para el mismo cobro", async () => {
    await applyPayment({ paymentId: "mp_1" });
    const second = await applyPayment({ paymentId: "mp_2" });
    expect(second).toMatchObject({ to: "succeeded", fulfillment: "duplicate_payment" });
  });

  it("refleja un reembolso informado por MercadoPago sin reescribir la orden", async () => {
    await applyPayment({});
    const refunded = await applyPayment({ status: "approved", refunded: 5000 });
    expect(refunded).toMatchObject({ from: "succeeded", to: "partially_refunded" });
    expect(await chargeStatus()).toBe("confirmed");
  });

  it("registra contracargos después de un pago exitoso", async () => {
    await applyPayment({});
    expect(await applyPayment({ status: "charged_back" })).toMatchObject({ to: "charged_back" });
    expect(await applyPayment({ status: "approved" })).toMatchObject({ status: "ignored" });
  });
});

describe("apply_gateway_payment: suscripciones", () => {
  it("activa la suscripción una sola vez", async () => {
    const first = await applyPayment({ ref: SUB_REF, paymentId: "mp_sub", amount: 15000, owner: null });
    expect(first).toMatchObject({ to: "succeeded", fulfillment: "subscription_activated" });
    const sub = (await db.query<Row>(`SELECT plan, status FROM subscriptions WHERE user_id = $1`, [SUB_USER])).rows;
    expect(sub).toEqual([{ plan: "professional", status: "active" }]);

    const again = await applyPayment({ ref: SUB_REF, paymentId: "mp_sub", amount: 15000, owner: null });
    expect(again).toMatchObject({ status: "noop" });
    expect((await db.query(`SELECT 1 FROM subscriptions`)).rows).toHaveLength(1);
  });

  it("no activa la suscripción si el monto pagado es menor al del plan", async () => {
    await applyPayment({ ref: SUB_REF, paymentId: "mp_sub", amount: 100, owner: null });
    expect((await db.query(`SELECT 1 FROM subscriptions`)).rows).toHaveLength(0);
    const payment = (await db.query<Row>(`SELECT status FROM subscription_payments`)).rows[0];
    expect(payment.status).toBe("rejected");
  });
});

describe("idempotencia de la API", () => {
  const reserve = (key: string, hash: string) =>
    call(`SELECT reserve_idempotency_key('create-preference:u1', $1, $2) AS r`, [key, hash]);

  it("reserva la primera vez y bloquea un request concurrente con la misma clave", async () => {
    expect(await reserve("key-00001", "h1")).toEqual({ status: "reserved" });
    expect(await reserve("key-00001", "h1")).toEqual({ status: "in_progress" });
  });

  it("devuelve la respuesta guardada al repetir una operación completada", async () => {
    await reserve("key-00002", "h1");
    await db.query(`SELECT complete_idempotency_key('create-preference:u1', 'key-00002', 'completed', '{"init_point":"x"}', 200)`);
    expect(await reserve("key-00002", "h1")).toEqual({ status: "replay", response: { init_point: "x" }, http_status: 200 });
  });

  it("rechaza la misma clave con otro contenido", async () => {
    await reserve("key-00003", "h1");
    expect(await reserve("key-00003", "h2")).toEqual({ status: "mismatch" });
  });

  it("permite reintentar una operación que falló o quedó abandonada", async () => {
    await reserve("key-00004", "h1");
    await db.query(`SELECT complete_idempotency_key('create-preference:u1', 'key-00004', 'failed', null, 503)`);
    expect(await reserve("key-00004", "h1")).toEqual({ status: "reserved" });

    await reserve("key-00005", "h1");
    await db.query(`UPDATE idempotency_keys SET locked_at = now() - interval '5 minutes' WHERE key = 'key-00005'`);
    expect(await reserve("key-00005", "h1")).toEqual({ status: "reserved" });
  });

  it("separa las claves por scope (usuario/operación)", async () => {
    await reserve("key-00006", "h1");
    expect(await call(`SELECT reserve_idempotency_key('refund:u2', 'key-00006', 'h9') AS r`)).toEqual({ status: "reserved" });
  });
});

describe("rate limiting", () => {
  it("permite hasta el máximo por ventana y luego bloquea", async () => {
    const results: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      results.push(await call<boolean>(`SELECT check_rate_limit('pref:ip:1.2.3.4', 3, 600) AS r`));
    }
    expect(results).toEqual([true, true, true, false]);
    expect(await call<boolean>(`SELECT check_rate_limit('pref:ip:5.6.7.8', 3, 600) AS r`)).toBe(true);
  });
});

describe("reembolsos", () => {
  async function paymentId() {
    await applyPayment({});
    return (await db.query<{ id: string }>(`SELECT id FROM gateway_payments`)).rows[0].id;
  }
  const request = (id: string, amount: number | null, key: string, by = PRO) =>
    call(`SELECT create_refund_request($1, $2, $3, $4, 'test') AS r`, [id, amount, key, by]);

  it("permite reembolsos parciales hasta el monto pagado y nunca más", async () => {
    const id = await paymentId();
    expect(await request(id, 15000, "refund-0001")).toMatchObject({ status: "created", amount: 15000, is_full: false });
    expect(await request(id, 6000, "refund-0002")).toMatchObject({ status: "error", error: "exceeds_refundable", refundable: 5000 });
    expect(await request(id, 5000, "refund-0003")).toMatchObject({ status: "created", is_full: true });
  });

  it("devuelve el mismo reembolso al repetir la clave y rechaza cambiar el monto", async () => {
    const id = await paymentId();
    const first = await request(id, 1000, "refund-0004");
    const replay = await request(id, 1000, "refund-0004");
    expect(replay).toMatchObject({ status: "replay", refund_id: (first as Row).refund_id });
    expect(await request(id, 2000, "refund-0004")).toMatchObject({ error: "idempotency_mismatch" });
    expect((await db.query(`SELECT 1 FROM payment_refunds`)).rows).toHaveLength(1);
  });

  it("solo el profesional dueño puede reembolsar", async () => {
    const id = await paymentId();
    expect(await request(id, 1000, "refund-0005", OTHER_PRO)).toMatchObject({ error: "forbidden" });
  });

  it("no permite reembolsar pagos que no fueron exitosos", async () => {
    await applyPayment({ status: "pending" });
    const id = (await db.query<{ id: string }>(`SELECT id FROM gateway_payments`)).rows[0].id;
    expect(await request(id, 1000, "refund-0006")).toMatchObject({ error: "not_refundable", state: "pending" });
  });

  it("actualiza el estado del pago al completar reembolsos y es idempotente", async () => {
    const id = await paymentId();
    const partial = (await request(id, 5000, "refund-0007")) as Row;
    expect(await call(`SELECT complete_refund($1, 'succeeded', 'mp_ref_1') AS r`, [partial.refund_id]))
      .toMatchObject({ status: "succeeded", payment_state: "partially_refunded", refunded_amount: 5000 });
    expect(await call(`SELECT complete_refund($1, 'succeeded', 'mp_ref_1') AS r`, [partial.refund_id]))
      .toMatchObject({ status: "noop" });

    const rest = (await request(id, null, "refund-0008")) as Row;
    expect(rest.amount).toBe(15000);
    expect(await call(`SELECT complete_refund($1, 'succeeded', 'mp_ref_2') AS r`, [rest.refund_id]))
      .toMatchObject({ payment_state: "refunded", refunded_amount: 20000 });
    expect(await gatewayState()).toBe("refunded");
  });

  it("libera el monto de un reembolso fallido para un nuevo intento", async () => {
    const id = await paymentId();
    const refund = (await request(id, 20000, "refund-0009")) as Row;
    await db.query(`SELECT complete_refund($1, 'failed', null, 'insufficient_funds')`, [refund.refund_id]);
    expect(await request(id, 20000, "refund-0010")).toMatchObject({ status: "created" });
  });
});

describe("reconciliación y alertas", () => {
  it("lista órdenes con pago iniciado sin estado final", async () => {
    const rows = (await db.query<Row>(`SELECT kind, external_reference FROM payments_needing_reconciliation(15) ORDER BY kind`)).rows;
    expect(rows).toEqual([
      { kind: "portal_charge", external_reference: CHARGE_REF },
      { kind: "subscription", external_reference: SUB_REF },
    ]);
  });

  it("deja de listar el cobro cuando queda confirmado", async () => {
    await applyPayment({});
    const rows = (await db.query<Row>(`SELECT kind FROM payments_needing_reconciliation(15)`)).rows;
    expect(rows).toEqual([{ kind: "subscription" }]);
  });

  it("alerta pagos en revisión y pagos duplicados solo a administradores", async () => {
    await applyPayment({ paymentId: "mp_1" });
    await applyPayment({ paymentId: "mp_2" });
    await applyPayment({ ref: SUB_REF, paymentId: "mp_sub", amount: 1, owner: null });
    await db.query(`INSERT INTO admin_users (email) VALUES ('admin@test.cl')`);
    await db.query(`SELECT set_config('request.jwt.claims', '{"email":"admin@test.cl"}', false)`);
    const alerts = (await db.query<Row>(`SELECT alert FROM get_payment_alerts() ORDER BY alert`)).rows.map((r) => r.alert);
    expect(alerts).toEqual(["duplicate_payment", "duplicate_payment", "under_review"]);

    await db.query(`SELECT set_config('request.jwt.claims', '{"email":"intruso@test.cl"}', false)`);
    await expect(db.query(`SELECT * FROM get_payment_alerts()`)).rejects.toThrow(/Not authorized/);
  });
});

describe("permisos", () => {
  it("anon y authenticated no pueden ejecutar las funciones internas de pagos", async () => {
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`SET ROLE ${role}`);
      await expect(db.query(`SELECT apply_gateway_payment('${CHARGE_REF}', 'x', 'approved', '', 20000, 'CLP', 0, 'webhook', null)`))
        .rejects.toThrow(/permission denied/);
      await expect(db.query(`SELECT check_rate_limit('k', 1, 60)`)).rejects.toThrow(/permission denied/);
      await expect(db.query(`SELECT create_refund_request(gen_random_uuid(), 1, 'refund-xxxx', gen_random_uuid())`))
        .rejects.toThrow(/permission denied/);
      await db.exec(`RESET ROLE`);
    }
  });

  it("service_role sí puede ejecutarlas", async () => {
    await db.exec(`SET ROLE service_role`);
    await expect(db.query(`SELECT check_rate_limit('k', 1, 60)`)).resolves.toBeDefined();
    await db.exec(`RESET ROLE`);
  });

  it("un profesional solo ve sus propios pagos (RLS)", async () => {
    await applyPayment({});
    await db.exec(`GRANT SELECT ON gateway_payments TO authenticated`);
    await db.query(`SELECT set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ sub: OTHER_PRO })]);
    await db.exec(`SET ROLE authenticated`);
    expect((await db.query(`SELECT 1 FROM gateway_payments`)).rows).toHaveLength(0);
    await db.exec(`RESET ROLE`);
    await db.query(`SELECT set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ sub: PRO })]);
    await db.exec(`SET ROLE authenticated`);
    expect((await db.query(`SELECT 1 FROM gateway_payments`)).rows).toHaveLength(1);
    await db.exec(`RESET ROLE`);
  });
});

describe("máquina de estados: SQL y TypeScript coinciden", () => {
  const states: PaymentState[] = [
    "pending", "processing", "requires_action", "under_review", "succeeded", "failed",
    "cancelled", "disputed", "refunded", "partially_refunded", "charged_back", "unknown",
  ];

  it("payment_transition_allowed = isTransitionAllowed para los 144 pares", async () => {
    const rows = (await db.query<{ f: string; t: string; ok: boolean }>(`
      SELECT f, t, payment_transition_allowed(f, t) AS ok
      FROM unnest($1::text[]) AS f, unnest($1::text[]) AS t
    `, [states])).rows;
    expect(rows).toHaveLength(144);
    for (const row of rows) {
      expect({ pair: `${row.f}->${row.t}`, ok: row.ok })
        .toEqual({ pair: `${row.f}->${row.t}`, ok: isTransitionAllowed(row.f as PaymentState, row.t as PaymentState) });
    }
  });

  it("map_mp_status = mapMpStatus", async () => {
    const statuses = ["approved", "authorized", "pending", "in_process", "in_mediation", "rejected", "cancelled", "refunded", "charged_back", "otro"];
    const rows = (await db.query<{ s: string; m: string }>(`SELECT s, map_mp_status(s) AS m FROM unnest($1::text[]) AS s`, [statuses])).rows;
    for (const row of rows) expect(row.m).toBe(mapMpStatus(row.s));
  });
});

describe("secure_payment_rpcs.sql", () => {
  it("quita EXECUTE a anon/authenticated en las RPCs internas existentes", async () => {
    const fresh = new PGlite();
    await fresh.exec(SUPABASE_STUB);
    await fresh.exec(`
      CREATE TABLE platform_mp_config (access_token text, is_active boolean);
      CREATE FUNCTION get_platform_mp_config() RETURNS json LANGUAGE sql SECURITY DEFINER AS
        $$ SELECT json_build_object('access_token', (SELECT access_token FROM platform_mp_config LIMIT 1)) $$;
      INSERT INTO platform_mp_config VALUES ('TEST-token', true);
    `);
    await fresh.exec(`SET ROLE anon`);
    await expect(fresh.query(`SELECT get_platform_mp_config()`)).resolves.toBeDefined(); // antes: expuesto
    await fresh.exec(`RESET ROLE`);

    await fresh.exec(securityMigration);

    for (const role of ["anon", "authenticated"]) {
      await fresh.exec(`SET ROLE ${role}`);
      await expect(fresh.query(`SELECT get_platform_mp_config()`)).rejects.toThrow(/permission denied/);
      await expect(fresh.query(`SELECT process_subscription_payment('x', '1', 'approved')`)).rejects.toThrow(/permission denied/);
      await fresh.exec(`RESET ROLE`);
    }
    await fresh.exec(`SET ROLE service_role`);
    await expect(fresh.query(`SELECT get_platform_mp_config()`)).resolves.toBeDefined();
    await fresh.close();
  });
});
