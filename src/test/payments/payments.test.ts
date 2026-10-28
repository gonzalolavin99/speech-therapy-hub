import { describe, it, expect, vi } from "vitest";
import {
  mapMpStatus,
  isTransitionAllowed,
  isTerminalState,
  checkMpPayment,
  parseMpSignature,
  buildMpManifest,
  hmacSha256Hex,
  verifyMpSignature,
  hashRequest,
  isValidIdempotencyKey,
  callGateway,
  clientIp,
  safeReturnUrl,
  type PaymentState,
} from "../../../supabase/functions/_shared/payments.ts";

const ALL_STATES: PaymentState[] = [
  "pending", "processing", "requires_action", "under_review", "succeeded", "failed",
  "cancelled", "disputed", "refunded", "partially_refunded", "charged_back", "unknown",
];

describe("mapMpStatus", () => {
  it("maps MercadoPago statuses to internal states", () => {
    expect(mapMpStatus("approved")).toBe("succeeded");
    expect(mapMpStatus("in_process")).toBe("processing");
    expect(mapMpStatus("authorized")).toBe("processing");
    expect(mapMpStatus("in_mediation")).toBe("disputed");
    expect(mapMpStatus("rejected")).toBe("failed");
    expect(mapMpStatus("charged_back")).toBe("charged_back");
  });

  it("returns unknown for unexpected or missing statuses", () => {
    expect(mapMpStatus("something_new")).toBe("unknown");
    expect(mapMpStatus(null)).toBe("unknown");
    expect(mapMpStatus(undefined)).toBe("unknown");
  });
});

describe("isTransitionAllowed", () => {
  it("allows any first state and same-state repeats", () => {
    for (const state of ALL_STATES) {
      expect(isTransitionAllowed(null, state)).toBe(true);
      expect(isTransitionAllowed(state, state)).toBe(true);
    }
  });

  it("never moves a succeeded payment back to an open state (out-of-order events)", () => {
    expect(isTransitionAllowed("succeeded", "pending")).toBe(false);
    expect(isTransitionAllowed("succeeded", "processing")).toBe(false);
    expect(isTransitionAllowed("succeeded", "failed")).toBe(false);
  });

  it("allows refunds, disputes and chargebacks after success", () => {
    expect(isTransitionAllowed("succeeded", "partially_refunded")).toBe(true);
    expect(isTransitionAllowed("succeeded", "refunded")).toBe(true);
    expect(isTransitionAllowed("succeeded", "disputed")).toBe(true);
    expect(isTransitionAllowed("disputed", "succeeded")).toBe(true);
    expect(isTransitionAllowed("disputed", "charged_back")).toBe(true);
  });

  it("treats failed, cancelled, refunded and charged_back as terminal", () => {
    for (const terminal of ["failed", "cancelled", "refunded", "charged_back"] as PaymentState[]) {
      expect(isTerminalState(terminal)).toBe(true);
      for (const to of ALL_STATES.filter((s) => s !== terminal)) {
        expect(isTransitionAllowed(terminal, to)).toBe(false);
      }
    }
  });

  it("lets open states resolve to anything", () => {
    for (const from of ["pending", "processing", "requires_action", "unknown"] as PaymentState[]) {
      expect(isTerminalState(from)).toBe(false);
      for (const to of ALL_STATES) expect(isTransitionAllowed(from, to)).toBe(true);
    }
  });

  it("only lets a partial refund grow, not shrink", () => {
    expect(isTransitionAllowed("partially_refunded", "refunded")).toBe(true);
    expect(isTransitionAllowed("partially_refunded", "succeeded")).toBe(false);
  });
});

describe("checkMpPayment", () => {
  const base = { id: 1, status: "approved", currency_id: "CLP", transaction_amount: 20000 };

  it("accepts a payment with our reference and currency", () => {
    expect(checkMpPayment({ ...base, external_reference: "thub_abc" }, { referencePrefix: "thub_", expectedCurrency: "CLP" }))
      .toEqual({ ok: true });
  });

  it("rejects payments without reference or from another integration", () => {
    expect(checkMpPayment({ ...base, external_reference: null }, { referencePrefix: "thub_" }))
      .toEqual({ ok: false, reason: "missing_reference" });
    expect(checkMpPayment({ ...base, external_reference: "other_123" }, { referencePrefix: "thub_" }))
      .toEqual({ ok: false, reason: "foreign_reference" });
  });

  it("keeps portal charges and subscriptions apart", () => {
    expect(
      checkMpPayment({ ...base, external_reference: "thub_sub_1" }, { referencePrefix: "thub_", excludePrefix: "thub_sub_" })
    ).toEqual({ ok: false, reason: "foreign_reference" });
  });

  it("detects a currency change", () => {
    expect(
      checkMpPayment({ ...base, currency_id: "USD", external_reference: "thub_abc" }, { referencePrefix: "thub_", expectedCurrency: "CLP" })
    ).toEqual({ ok: false, reason: "currency_mismatch" });
  });
});

describe("MercadoPago webhook signature", () => {
  const secret = "test-webhook-secret";
  const now = 1_760_000_000_000;
  const ts = String(now / 1000);

  async function sign(dataId: string, requestId: string, timestamp = ts) {
    const v1 = await hmacSha256Hex(secret, buildMpManifest(dataId, requestId, timestamp));
    return `ts=${timestamp},v1=${v1}`;
  }

  it("parses the x-signature header", () => {
    expect(parseMpSignature("ts=123,v1=abc")).toEqual({ ts: "123", v1: "abc" });
    expect(parseMpSignature(" ts = 123 , v1 = abc ")).toEqual({ ts: "123", v1: "abc" });
    expect(parseMpSignature("v1=abc")).toBeNull();
    expect(parseMpSignature(null)).toBeNull();
  });

  it("builds the manifest documented by MercadoPago", () => {
    expect(buildMpManifest("123ABC", "req-1", "99")).toBe("id:123abc;request-id:req-1;ts:99;");
    expect(buildMpManifest(null, "req-1", "99")).toBe("request-id:req-1;ts:99;");
    expect(buildMpManifest("123", null, "99")).toBe("id:123;ts:99;");
  });

  it("accepts a correctly signed notification", async () => {
    const header = await sign("98765", "req-1");
    await expect(verifyMpSignature({ secret, signatureHeader: header, requestId: "req-1", dataId: "98765", nowMs: now }))
      .resolves.toEqual({ valid: true });
  });

  it("rejects a forged notification (other payment id or wrong secret)", async () => {
    const header = await sign("98765", "req-1");
    await expect(verifyMpSignature({ secret, signatureHeader: header, requestId: "req-1", dataId: "11111", nowMs: now }))
      .resolves.toEqual({ valid: false, reason: "mismatch" });
    await expect(verifyMpSignature({ secret: "other", signatureHeader: header, requestId: "req-1", dataId: "98765", nowMs: now }))
      .resolves.toEqual({ valid: false, reason: "mismatch" });
  });

  it("rejects missing signatures and replays outside the time window", async () => {
    await expect(verifyMpSignature({ secret, signatureHeader: null, requestId: "r", dataId: "1", nowMs: now }))
      .resolves.toEqual({ valid: false, reason: "missing" });
    const old = await sign("98765", "req-1", String(now / 1000 - 3600));
    await expect(verifyMpSignature({ secret, signatureHeader: old, requestId: "req-1", dataId: "98765", nowMs: now }))
      .resolves.toEqual({ valid: false, reason: "expired" });
  });

  it("accepts timestamps in milliseconds", async () => {
    const header = await sign("5", "req-2", String(now));
    await expect(verifyMpSignature({ secret, signatureHeader: header, requestId: "req-2", dataId: "5", nowMs: now }))
      .resolves.toEqual({ valid: true });
  });
});

describe("idempotency helpers", () => {
  it("hashes payloads independently of key order", async () => {
    const a = await hashRequest({ charge_id: "1", token: "t", nested: { b: 2, a: 1 } });
    const b = await hashRequest({ nested: { a: 1, b: 2 }, token: "t", charge_id: "1" });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces a different hash when the content changes (e.g. another amount)", async () => {
    expect(await hashRequest({ amount: 5000 })).not.toBe(await hashRequest({ amount: 500 }));
  });

  it("validates idempotency key format", () => {
    expect(isValidIdempotencyKey("refund:2f1c9a7e-1234")).toBe(true);
    expect(isValidIdempotencyKey("short")).toBe(false);
    expect(isValidIdempotencyKey("has spaces in it")).toBe(false);
    expect(isValidIdempotencyKey("x".repeat(129))).toBe(false);
    expect(isValidIdempotencyKey(null)).toBe(false);
  });
});

describe("callGateway", () => {
  const noSleep = () => Promise.resolve();
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  it("returns ok on success without retrying", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(201, { id: "pref_1" }));
    const result = await callGateway("https://mp.test", { method: "POST" }, { fetchImpl, sleep: noSleep });
    expect(result).toEqual({ kind: "ok", status: 201, body: { id: "pref_1" } });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("does not retry definitive rejections (4xx)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(400, { message: "invalid" }));
    const result = await callGateway("https://mp.test", {}, { fetchImpl, sleep: noSleep });
    expect(result.kind).toBe("rejected");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries transient errors with the same request and then succeeds", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(json(503, {}))
      .mockRejectedValueOnce(new TypeError("network"))
      .mockResolvedValueOnce(json(200, { ok: true }));
    const init = { method: "POST", headers: { "X-Idempotency-Key": "refund:abc12345" } };
    const result = await callGateway("https://mp.test", init, { fetchImpl, sleep: noSleep });
    expect(result.kind).toBe("ok");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    for (const call of fetchImpl.mock.calls) {
      expect(call[1].headers).toEqual(init.headers);
    }
  });

  it("reports unknown (not failed) when retries run out", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(502, {}));
    const result = await callGateway("https://mp.test", {}, { fetchImpl, sleep: noSleep, maxRetries: 2 });
    expect(result).toEqual({ kind: "unknown", error: "http_502" });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("treats a timeout as unknown so the caller verifies before charging again", async () => {
    const fetchImpl = vi.fn((_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
      })
    );
    const result = await callGateway("https://mp.test", {}, { fetchImpl: fetchImpl as typeof fetch, sleep: noSleep, timeoutMs: 5, maxRetries: 0 });
    expect(result).toEqual({ kind: "unknown", error: "timeout" });
  });

  it("uses exponential backoff between attempts", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fetchImpl = vi.fn().mockResolvedValue(json(500, {}));
    vi.spyOn(Math, "random").mockReturnValue(0);
    await callGateway("https://mp.test", {}, { fetchImpl, sleep, baseDelayMs: 100, maxRetries: 3 });
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([100, 200, 400]);
    vi.restoreAllMocks();
  });
});

describe("clientIp", () => {
  it("takes the first address from x-forwarded-for", () => {
    const req = new Request("https://x.test", { headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" } });
    expect(clientIp(req)).toBe("1.2.3.4");
    expect(clientIp(new Request("https://x.test"))).toBe("unknown");
  });
});

describe("safeReturnUrl", () => {
  const allowed = ["https://speech-therapy-hub.vercel.app", "http://localhost:8080"];
  const fallback = "https://speech-therapy-hub.vercel.app/portal-pago/success";

  it("acepta URLs del origen de la app", () => {
    expect(safeReturnUrl("https://speech-therapy-hub.vercel.app/portal-pago/success?x=1", allowed, fallback))
      .toBe("https://speech-therapy-hub.vercel.app/portal-pago/success?x=1");
    expect(safeReturnUrl("http://localhost:8080/portal-pago/failure", allowed, fallback))
      .toBe("http://localhost:8080/portal-pago/failure");
  });

  it("usa el fallback para otros dominios o valores inválidos", () => {
    expect(safeReturnUrl("https://evil.example/phish", allowed, fallback)).toBe(fallback);
    expect(safeReturnUrl("https://speech-therapy-hub.vercel.app.evil.example/", allowed, fallback)).toBe(fallback);
    expect(safeReturnUrl("javascript:alert(1)", allowed, fallback)).toBe(fallback);
    expect(safeReturnUrl("no es url", allowed, fallback)).toBe(fallback);
    expect(safeReturnUrl(undefined, allowed, fallback)).toBe(fallback);
  });
});
