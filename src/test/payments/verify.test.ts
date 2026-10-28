// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifySubscriptionReturn } from "../../../supabase/functions/_shared/verify.ts";
import type { AdminClient } from "../../../supabase/functions/_shared/mp-webhook.ts";

const USER = "33333333-3333-3333-3333-333333333333";
const noRetry = { maxRetries: 0, sleep: () => Promise.resolve() };

function fakeAdmin(opts: { order?: unknown; applied?: unknown; current?: unknown; rpcError?: unknown } = {}) {
  const rpc = vi.fn().mockResolvedValue({ data: opts.applied ?? { status: "applied", to: "succeeded", fulfillment: "subscription_activated" }, error: opts.rpcError ?? null });
  const filters: Array<[string, string, string]> = [];
  const from = vi.fn((table: string) => {
    const chain = {
      select: () => chain,
      eq: (column: string, value: string) => { filters.push([table, column, value]); return chain; },
      maybeSingle: () => Promise.resolve({
        data: table === "subscription_payments" ? (opts.order === undefined ? { id: "sp-1" } : opts.order) : (opts.current ?? null),
        error: null,
      }),
    };
    return chain;
  });
  return { client: { rpc, from } as unknown as AdminClient, rpc, filters };
}

const fetchMock = vi.fn();
const mpPayment = (overrides: Record<string, unknown> = {}) => new Response(JSON.stringify({
  id: 185506490547, status: "approved", status_detail: "accredited", external_reference: "thub_sub_abc",
  transaction_amount: 9990, currency_id: "CLP", ...overrides,
}), { status: 200 });

beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => vi.unstubAllGlobals());

describe("verifySubscriptionReturn", () => {
  it("consulta el pago a MercadoPago y lo aplica para el usuario logueado", async () => {
    const { client, rpc, filters } = fakeAdmin();
    fetchMock.mockResolvedValue(mpPayment());

    const result = await verifySubscriptionReturn(client, { paymentId: "185506490547", userId: USER }, "TEST-token", noRetry);

    expect(result).toEqual({ status: 200, body: { status: "verified", state: "succeeded", fulfillment: "subscription_activated" } });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.mercadopago.com/v1/payments/185506490547");
    expect(filters).toContainEqual(["subscription_payments", "user_id", USER]);
    expect(rpc).toHaveBeenCalledWith("apply_gateway_payment", expect.objectContaining({
      p_external_reference: "thub_sub_abc", p_amount: 9990, p_expected_owner: USER,
    }));
  });

  it("rechaza un payment_id de otro usuario sin aplicar nada", async () => {
    const { client, rpc } = fakeAdmin({ order: null });
    fetchMock.mockResolvedValue(mpPayment());
    const result = await verifySubscriptionReturn(client, { paymentId: "1", userId: USER }, "TEST-token", noRetry);
    expect(result.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rechaza pagos que no son de suscripciones (p.ej. cobros del portal)", async () => {
    const { client, rpc } = fakeAdmin();
    fetchMock.mockResolvedValue(mpPayment({ external_reference: "thub_aaaa" }));
    expect((await verifySubscriptionReturn(client, { paymentId: "1", userId: USER }, "t", noRetry)).status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("si el pago no existe en MercadoPago responde 404", async () => {
    const { client } = fakeAdmin();
    fetchMock.mockResolvedValue(new Response("{}", { status: 404 }));
    expect((await verifySubscriptionReturn(client, { paymentId: "999", userId: USER }, "t", noRetry)).status).toBe(404);
  });

  it("si MercadoPago no responde, no inventa un resultado (503)", async () => {
    const { client, rpc } = fakeAdmin();
    fetchMock.mockResolvedValue(new Response("{}", { status: 503 }));
    const result = await verifySubscriptionReturn(client, { paymentId: "1", userId: USER }, "t", noRetry);
    expect(result).toMatchObject({ status: 503, body: { status: "unverified" } });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("si el webhook ya lo aplicó (noop), devuelve el estado actual", async () => {
    const { client } = fakeAdmin({ applied: { status: "noop", state: "succeeded" }, current: { state: "succeeded", review_reason: null } });
    fetchMock.mockResolvedValue(mpPayment());
    const result = await verifySubscriptionReturn(client, { paymentId: "1", userId: USER }, "t", noRetry);
    expect(result.body).toEqual({ status: "verified", state: "succeeded", fulfillment: "none" });
  });

  it("informa cuando se mantuvo un plan VIP existente", async () => {
    const { client } = fakeAdmin({
      applied: { status: "noop" },
      current: { state: "succeeded", review_reason: "kept_existing_plan: vip" },
    });
    fetchMock.mockResolvedValue(mpPayment());
    const result = await verifySubscriptionReturn(client, { paymentId: "1", userId: USER }, "t", noRetry);
    expect(result.body).toMatchObject({ fulfillment: "kept_existing_plan" });
  });

  it("responde 500 si la base rechaza aplicar el pago", async () => {
    const { client } = fakeAdmin({ applied: { status: "error", error: "owner_mismatch" } });
    fetchMock.mockResolvedValue(mpPayment());
    expect((await verifySubscriptionReturn(client, { paymentId: "1", userId: USER }, "t", noRetry)).status).toBe(500);
  });
});
