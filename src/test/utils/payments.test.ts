import { describe, it, expect } from "vitest";
import {
  isRefundable,
  refundableAmount,
  validateRefundAmount,
  newIdempotencyKey,
  latestPaymentByCharge,
  PAYMENT_STATE_LABELS,
  type GatewayPayment,
} from "@/utils/payments";
import { isValidIdempotencyKey } from "../../../supabase/functions/_shared/payments.ts";

const payment = (overrides: Partial<GatewayPayment> = {}): GatewayPayment => ({
  id: "gp-1",
  charge_id: "charge-1",
  subscription_payment_id: null,
  provider_payment_id: "987",
  state: "succeeded",
  amount: 20000,
  refunded_amount: 0,
  currency: "CLP",
  created_at: "2026-10-01T10:00:00Z",
  updated_at: "2026-10-01T10:00:00Z",
  ...overrides,
});

describe("refundableAmount / isRefundable", () => {
  it("descuenta lo ya reembolsado", () => {
    expect(refundableAmount(payment({ refunded_amount: 5000 }))).toBe(15000);
    expect(refundableAmount(payment({ refunded_amount: 25000 }))).toBe(0);
    expect(refundableAmount(null)).toBe(0);
  });

  it("solo permite reembolsar pagos exitosos con saldo", () => {
    expect(isRefundable(payment())).toBe(true);
    expect(isRefundable(payment({ state: "partially_refunded", refunded_amount: 5000 }))).toBe(true);
    expect(isRefundable(payment({ state: "partially_refunded", refunded_amount: 20000 }))).toBe(false);
    for (const state of ["pending", "failed", "refunded", "charged_back", "under_review", "disputed"] as const) {
      expect(isRefundable(payment({ state }))).toBe(false);
    }
    expect(isRefundable(undefined)).toBe(false);
  });
});

describe("validateRefundAmount", () => {
  it("acepta enteros positivos hasta el máximo", () => {
    expect(validateRefundAmount("15000", 20000)).toEqual({ valid: true, amount: 15000 });
    expect(validateRefundAmount("20000", 20000)).toEqual({ valid: true, amount: 20000 });
  });

  it("rechaza vacío, cero, decimales y montos sobre el máximo", () => {
    expect(validateRefundAmount("", 20000).valid).toBe(false);
    expect(validateRefundAmount("0", 20000).valid).toBe(false);
    expect(validateRefundAmount("10.5", 20000).valid).toBe(false);
    expect(validateRefundAmount("abc", 20000).valid).toBe(false);
    const over = validateRefundAmount("20001", 20000);
    expect(over.valid).toBe(false);
    expect(over.error).toContain("20.000");
  });
});

describe("newIdempotencyKey", () => {
  it("genera claves únicas con formato aceptado por el backend", () => {
    const a = newIdempotencyKey("refund");
    const b = newIdempotencyKey("refund");
    expect(a).not.toBe(b);
    expect(a.startsWith("refund-")).toBe(true);
    expect(isValidIdempotencyKey(a)).toBe(true);
  });
});

describe("latestPaymentByCharge", () => {
  it("prefiere el pago exitoso sobre intentos fallidos posteriores", () => {
    const map = latestPaymentByCharge([
      payment({ id: "ok", state: "succeeded", updated_at: "2026-10-01T10:00:00Z" }),
      payment({ id: "fail", state: "failed", updated_at: "2026-10-02T10:00:00Z" }),
    ]);
    expect(map.get("charge-1")?.id).toBe("ok");
  });

  it("usa el más reciente entre intentos del mismo nivel e ignora suscripciones", () => {
    const map = latestPaymentByCharge([
      payment({ id: "old", state: "pending", updated_at: "2026-10-01T10:00:00Z" }),
      payment({ id: "new", state: "failed", updated_at: "2026-10-03T10:00:00Z" }),
      payment({ id: "sub", charge_id: null, subscription_payment_id: "s1" }),
    ]);
    expect(map.get("charge-1")?.id).toBe("new");
    expect(map.size).toBe(1);
  });
});

describe("PAYMENT_STATE_LABELS", () => {
  it("tiene etiqueta en español para cada estado", () => {
    expect(Object.keys(PAYMENT_STATE_LABELS)).toHaveLength(12);
    expect(PAYMENT_STATE_LABELS.partially_refunded).toBe("Reembolso parcial");
  });
});
