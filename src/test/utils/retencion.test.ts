import { describe, it, expect } from "vitest";
import { getRetencionRate, calculateRetencion, RETENCION_RATES } from "@/config/retencion";

describe("getRetencionRate", () => {
  it("returns correct rate for known years", () => {
    expect(getRetencionRate(2024)).toBe(13.75);
    expect(getRetencionRate(2025)).toBe(14.50);
    expect(getRetencionRate(2026)).toBe(15.25);
    expect(getRetencionRate(2028)).toBe(17.0);
  });

  it("returns 17% for years after 2028", () => {
    expect(getRetencionRate(2029)).toBe(17.0);
    expect(getRetencionRate(2050)).toBe(17.0);
  });

  it("returns current year rate when no year provided", () => {
    const rate = getRetencionRate();
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeLessThanOrEqual(17);
  });
});

describe("calculateRetencion", () => {
  it("calculates correct retention for 2026 (15.25%)", () => {
    const result = calculateRetencion(100000, 2026);
    expect(result.percent).toBe(15.25);
    expect(result.retencionAmount).toBe(15250);
    expect(result.amountLiquido).toBe(84750);
  });

  it("calculates correct retention for 2028 (17%)", () => {
    const result = calculateRetencion(500000, 2028);
    expect(result.percent).toBe(17.0);
    expect(result.retencionAmount).toBe(85000);
    expect(result.amountLiquido).toBe(415000);
  });

  it("rounds retention to nearest integer", () => {
    const result = calculateRetencion(33333, 2026);
    // 33333 * 15.25% = 5083.2825 → rounded to 5083
    expect(result.retencionAmount).toBe(5083);
    expect(result.amountLiquido).toBe(28250);
  });

  it("bruto = liquido + retencion always", () => {
    const bruto = 123456;
    const result = calculateRetencion(bruto, 2026);
    expect(result.amountLiquido + result.retencionAmount).toBe(bruto);
  });

  it("returns correct rates for all defined years", () => {
    for (const [yearStr, expectedRate] of Object.entries(RETENCION_RATES)) {
      const year = Number(yearStr);
      const result = calculateRetencion(1000000, year);
      expect(result.percent).toBe(expectedRate);
    }
  });
});
