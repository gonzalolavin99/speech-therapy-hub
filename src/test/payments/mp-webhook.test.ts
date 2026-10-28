// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleMpWebhook, type AdminClient, type MpCredentials } from "../../../supabase/functions/_shared/mp-webhook.ts";
import { buildMpManifest, hmacSha256Hex } from "../../../supabase/functions/_shared/payments.ts";

interface EventRow {
  id: number;
  endpoint: string;
  request_id: string;
  status: string;
  signature_valid: boolean | null;
  result?: unknown;
}

// Cliente falso: solo lo que usa el handler (tabla de eventos + rpc)
function createFakeAdmin(rpcResult: unknown = { status: "applied", to: "succeeded" }) {
  const events: EventRow[] = [];
  const rpc = vi.fn().mockResolvedValue({ data: rpcResult, error: null });

  const from = (_table: string) => ({
    upsert(row: Omit<EventRow, "id">) {
      const exists = events.find((e) => e.endpoint === row.endpoint && e.request_id === row.request_id);
      let created: EventRow | null = null;
      if (!exists) {
        created = { ...row, id: events.length + 1 } as EventRow;
        events.push(created);
      }
      const result = { data: created ? [{ id: created.id }] : [], error: null };
      return { select: () => Promise.resolve(result), then: (resolve: (v: unknown) => void) => resolve(result) };
    },
    select() {
      const filters: Record<string, string> = {};
      const chain = {
        eq(column: string, value: string) { filters[column] = value; return chain; },
        single: () => Promise.resolve({
          data: events.find((e) => e.endpoint === filters.endpoint && e.request_id === filters.request_id) ?? null,
          error: null,
        }),
      };
      return chain;
    },
    update(values: Partial<EventRow>) {
      return {
        eq: (_column: string, id: number) => {
          const event = events.find((e) => e.id === id);
          if (event) Object.assign(event, values);
          return Promise.resolve({ error: null });
        },
      };
    },
  });

  return { client: { from, rpc } as unknown as AdminClient, events, rpc };
}

const SECRET = "webhook-secret-test";
const PRO = "11111111-1111-1111-1111-111111111111";
const credentials = (secret: string | null = SECRET): MpCredentials[] => [{ accessToken: "TEST-token", webhookSecret: secret, ownerId: PRO }];

const config = (creds: MpCredentials[] = credentials()) => ({
  endpoint: "mercadopago-webhook" as const,
  referencePrefix: "thub_",
  excludePrefix: "thub_sub_",
  resolveCredentials: async () => creds,
});

async function signedRequest(dataId: string, requestId: string, body: unknown = { type: "payment", data: { id: dataId } }, secret = SECRET) {
  const ts = String(Math.floor(Date.now() / 1000));
  const v1 = await hmacSha256Hex(secret, buildMpManifest(dataId, requestId, ts));
  return new Request(`https://fn.test/mercadopago-webhook?uid=${PRO}&data.id=${dataId}&type=payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-request-id": requestId, "x-signature": `ts=${ts},v1=${v1}` },
    body: JSON.stringify(body),
  });
}

const mpPayment = (overrides: Record<string, unknown> = {}) => ({
  id: 987,
  status: "approved",
  status_detail: "accredited",
  external_reference: "thub_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  transaction_amount: 20000,
  transaction_amount_refunded: 0,
  currency_id: "CLP",
  ...overrides,
});

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mpResponds(payload: unknown, status = 200) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(payload), { status }));
}

describe("handleMpWebhook", () => {
  it("aplica el pago con los datos consultados a MercadoPago, no con los del webhook", async () => {
    const { client, rpc, events } = createFakeAdmin();
    mpResponds(mpPayment());
    const forgedBody = { type: "payment", data: { id: "987" }, transaction_amount: 999999, status: "approved" };

    const response = await handleMpWebhook(await signedRequest("987", "req-1", forgedBody), client, config());

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadopago.com/v1/payments/987",
      expect.objectContaining({ headers: { Authorization: "Bearer TEST-token" } })
    );
    expect(rpc).toHaveBeenCalledWith("apply_gateway_payment", expect.objectContaining({
      p_provider_payment_id: "987",
      p_amount: 20000,
      p_currency: "CLP",
      p_expected_owner: PRO,
      p_source: "webhook",
    }));
    expect(events[0]).toMatchObject({ status: "processed", signature_valid: true });
  });

  it("rechaza con 401 un webhook con firma falsificada y no consulta ni modifica nada", async () => {
    const { client, rpc, events } = createFakeAdmin();
    const request = await signedRequest("987", "req-2", undefined, "otro-secreto");

    const response = await handleMpWebhook(request, client, config());

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
    expect(events[0]).toMatchObject({ status: "ignored", signature_valid: false });
  });

  it("rechaza un webhook sin firma cuando hay secreto configurado", async () => {
    const { client, rpc } = createFakeAdmin();
    const request = new Request("https://fn.test/mercadopago-webhook?data.id=987", {
      method: "POST",
      body: JSON.stringify({ type: "payment", data: { id: "987" } }),
    });
    expect((await handleMpWebhook(request, client, config())).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("procesa un mismo evento una sola vez (webhook repetido)", async () => {
    const { client, rpc } = createFakeAdmin();
    mpResponds(mpPayment());

    await handleMpWebhook(await signedRequest("987", "req-3"), client, config());
    const second = await handleMpWebhook(await signedRequest("987", "req-3"), client, config());

    expect(await second.text()).toBe("Duplicate");
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("responde 500 si MercadoPago no responde, para que reintente, y reprocesa el reintento", async () => {
    const { client, rpc, events } = createFakeAdmin();
    fetchMock.mockResolvedValue(new Response("{}", { status: 503 }));

    const first = await handleMpWebhook(await signedRequest("987", "req-4"), client, config());
    expect(first.status).toBe(500);
    expect(events[0].status).toBe("failed");
    expect(rpc).not.toHaveBeenCalled();

    mpResponds(mpPayment());
    const retry = await handleMpWebhook(await signedRequest("987", "req-4"), client, config());
    expect(retry.status).toBe(200);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(events[0].status).toBe("processed");
  }, 15000);

  it("ignora pagos de otras integraciones o de suscripciones", async () => {
    const { client, rpc } = createFakeAdmin();
    mpResponds(mpPayment({ external_reference: "thub_sub_123" }));
    const response = await handleMpWebhook(await signedRequest("987", "req-5"), client, config());
    expect(response.status).toBe(200);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("deja que la base decida (revisión) cuando la moneda no cuadra", async () => {
    const { client, rpc } = createFakeAdmin({ status: "applied", to: "under_review" });
    mpResponds(mpPayment({ currency_id: "USD" }));
    await handleMpWebhook(await signedRequest("987", "req-6"), client, config());
    expect(rpc).toHaveBeenCalledWith("apply_gateway_payment", expect.objectContaining({ p_currency: "USD" }));
  });

  it("ignora notificaciones que no son de pagos", async () => {
    const { client, rpc } = createFakeAdmin();
    const request = new Request("https://fn.test/mercadopago-webhook", {
      method: "POST",
      body: JSON.stringify({ type: "merchant_order", data: { id: "1" } }),
    });
    expect((await handleMpWebhook(request, client, config())).status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rechaza JSON inválido y métodos distintos de POST", async () => {
    const { client } = createFakeAdmin();
    const badJson = new Request("https://fn.test/x", { method: "POST", body: "{no-json" });
    expect((await handleMpWebhook(badJson, client, config())).status).toBe(400);
    expect((await handleMpWebhook(new Request("https://fn.test/x"), client, config())).status).toBe(405);
  });

  it("sin secreto configurado procesa igual, porque el estado viene de la API de MercadoPago", async () => {
    const { client, rpc, events } = createFakeAdmin();
    mpResponds(mpPayment());
    const request = new Request("https://fn.test/mercadopago-webhook?data.id=987", {
      method: "POST",
      headers: { "x-request-id": "req-7" },
      body: JSON.stringify({ type: "payment", data: { id: "987" } }),
    });
    expect((await handleMpWebhook(request, client, config(credentials(null)))).status).toBe(200);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(events[0].signature_valid).toBeNull();
  });

  it("si el pago no existe en ninguna cuenta, lo ignora sin reintentos", async () => {
    const { client, rpc } = createFakeAdmin();
    fetchMock.mockResolvedValue(new Response("{}", { status: 404 }));
    const response = await handleMpWebhook(await signedRequest("987", "req-8"), client, config());
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(rpc).not.toHaveBeenCalled();
  });
});
