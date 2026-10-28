// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { processRefund, reconcilePayments } from "../../../supabase/functions/_shared/refunds.ts";
import type { AdminClient } from "../../../supabase/functions/_shared/mp-webhook.ts";

const PRO = "11111111-1111-1111-1111-111111111111";
const noRetry = { maxRetries: 0, sleep: () => Promise.resolve() };

function fakeAdmin(rpcResponses: Record<string, unknown>, payment = { kind: "portal_charge", owner_user_id: PRO }) {
  const rpc = vi.fn(async (fn: string) => {
    const value = rpcResponses[fn];
    return { data: typeof value === "function" ? (value as () => unknown)() : value ?? null, error: null };
  });
  const from = vi.fn(() => ({
    select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: payment, error: null }) }) }),
  }));
  return { client: { rpc, from } as unknown as AdminClient, rpc };
}

const fetchMock = vi.fn();
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const credential = vi.fn(async () => "TEST-token");

beforeEach(() => {
  fetchMock.mockReset();
  credential.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const refundParams = { gatewayPaymentId: "gp-1", amount: 5000, idempotencyKey: "refund-key-0001", requestedBy: PRO };
const created = { status: "created", refund_id: "rf-1", amount: 5000, provider_payment_id: "987" };

describe("processRefund", () => {
  it("envía el reembolso a MercadoPago con la clave idempotente y lo marca exitoso", async () => {
    const { client, rpc } = fakeAdmin({ create_refund_request: created, complete_refund: { status: "succeeded" } });
    fetchMock.mockResolvedValue(json(201, { id: 555, status: "approved" }));

    const result = await processRefund(client, refundParams, credential, noRetry);

    expect(result).toEqual({ status: 200, body: { refund_id: "rf-1", status: "succeeded", amount: 5000 } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.mercadopago.com/v1/payments/987/refunds");
    expect(init.headers["X-Idempotency-Key"]).toBe("refund-key-0001");
    expect(JSON.parse(init.body)).toEqual({ amount: 5000 });
    expect(rpc).toHaveBeenCalledWith("complete_refund", expect.objectContaining({ p_status: "succeeded", p_provider_refund_id: "555" }));
  });

  it("mapea los rechazos de la base a códigos HTTP sin llamar a MercadoPago", async () => {
    const cases: Array<[string, number]> = [
      ["forbidden", 403], ["payment_not_found", 404], ["not_refundable", 409],
      ["exceeds_refundable", 422], ["idempotency_mismatch", 422],
    ];
    for (const [code, status] of cases) {
      const { client } = fakeAdmin({ create_refund_request: { status: "error", error: code } });
      expect((await processRefund(client, refundParams, credential, noRetry)).status).toBe(status);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("al repetir un reembolso ya resuelto devuelve el resultado sin volver a enviarlo", async () => {
    const { client } = fakeAdmin({ create_refund_request: { status: "replay", refund_id: "rf-1", refund_status: "succeeded", amount: 5000 } });
    const result = await processRefund(client, refundParams, credential, noRetry);
    expect(result).toEqual({ status: 200, body: { refund_id: "rf-1", status: "succeeded", amount: 5000 } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("marca el reembolso como fallido si MercadoPago lo rechaza", async () => {
    const { client, rpc } = fakeAdmin({ create_refund_request: created });
    fetchMock.mockResolvedValue(json(400, { message: "insufficient_funds" }));
    const result = await processRefund(client, refundParams, credential, noRetry);
    expect(result.status).toBe(502);
    expect(rpc).toHaveBeenCalledWith("complete_refund", expect.objectContaining({ p_status: "failed", p_failure_reason: "insufficient_funds" }));
  });

  it("ante un timeout deja el reembolso pendiente (202) en vez de darlo por fallido", async () => {
    const { client, rpc } = fakeAdmin({ create_refund_request: created });
    fetchMock.mockResolvedValue(json(503, {}));
    const result = await processRefund(client, refundParams, credential, noRetry);
    expect(result).toEqual({ status: 202, body: { refund_id: "rf-1", status: "pending", amount: 5000 } });
    expect(rpc).not.toHaveBeenCalledWith("complete_refund", expect.anything());
  });
});

describe("reconcilePayments", () => {
  const order = { kind: "portal_charge", external_reference: "thub_abc", owner_user_id: PRO };

  it("aplica los pagos encontrados en MercadoPago para órdenes abiertas (webhook perdido)", async () => {
    const { client, rpc } = fakeAdmin({
      payments_needing_reconciliation: [order],
      apply_gateway_payment: { status: "applied", to: "succeeded" },
      pending_refunds_for_reconciliation: [],
    });
    fetchMock.mockResolvedValue(json(200, {
      results: [
        { id: 1, status: "approved", external_reference: "thub_abc", transaction_amount: 20000, currency_id: "CLP" },
        { id: 2, status: "approved", external_reference: "thub_otro", transaction_amount: 20000, currency_id: "CLP" },
      ],
    }));

    const summary = await reconcilePayments(client, credential, noRetry);

    expect(summary).toMatchObject({ orders: 1, applied: 1, errors: 0 });
    expect(fetchMock.mock.calls[0][0]).toContain("external_reference=thub_abc");
    expect(rpc).toHaveBeenCalledWith("apply_gateway_payment", expect.objectContaining({
      p_provider_payment_id: "1", p_source: "reconcile", p_expected_owner: PRO,
    }));
    expect(rpc.mock.calls.filter((c) => c[0] === "apply_gateway_payment")).toHaveLength(1);
    expect(rpc).toHaveBeenCalledWith("purge_payment_ephemera");
  });

  it("cuenta errores sin detenerse si MercadoPago falla para una orden", async () => {
    const { client } = fakeAdmin({
      payments_needing_reconciliation: [order, { ...order, external_reference: "thub_def" }],
      apply_gateway_payment: { status: "noop" },
      pending_refunds_for_reconciliation: [],
    });
    fetchMock
      .mockResolvedValueOnce(json(500, {}))
      .mockResolvedValueOnce(json(200, { results: [{ id: 3, status: "pending", external_reference: "thub_def" }] }));
    const summary = await reconcilePayments(client, credential, noRetry);
    expect(summary).toMatchObject({ orders: 2, errors: 1, unchanged: 1 });
  });

  it("reenvía reembolsos pendientes con la misma clave idempotente", async () => {
    const { client, rpc } = fakeAdmin({
      payments_needing_reconciliation: [],
      pending_refunds_for_reconciliation: [{
        refund_id: "rf-9", amount: 3000, provider_payment_id: "987", owner_user_id: PRO, kind: "portal_charge", idempotency_key: "refund-key-0009",
      }],
      complete_refund: { status: "succeeded" },
    });
    fetchMock.mockResolvedValue(json(201, { id: 777 }));
    const summary = await reconcilePayments(client, credential, noRetry);
    expect(summary.refundsResolved).toBe(1);
    expect(fetchMock.mock.calls[0][1].headers["X-Idempotency-Key"]).toBe("refund-key-0009");
    expect(rpc).toHaveBeenCalledWith("complete_refund", expect.objectContaining({ p_refund_id: "rf-9", p_status: "succeeded" }));
  });

  it("usa las credenciales de la plataforma para suscripciones (sin dueño esperado)", async () => {
    const { client, rpc } = fakeAdmin({
      payments_needing_reconciliation: [{ kind: "subscription", external_reference: "thub_sub_1", owner_user_id: PRO }],
      apply_gateway_payment: { status: "applied" },
      pending_refunds_for_reconciliation: [],
    });
    fetchMock.mockResolvedValue(json(200, { results: [{ id: 5, status: "approved", external_reference: "thub_sub_1" }] }));
    await reconcilePayments(client, credential, noRetry);
    expect(credential).toHaveBeenCalledWith("subscription", PRO);
    expect(rpc).toHaveBeenCalledWith("apply_gateway_payment", expect.objectContaining({ p_expected_owner: null }));
  });
});
