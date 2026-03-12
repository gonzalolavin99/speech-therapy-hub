import { describe, it, expect } from "vitest";
import {
  isPaidPlan,
  planHasFeature,
  isTrialExpired,
  getTrialDaysRemaining,
  formatPriceCLP,
  type PlanLimits,
  type Subscription,
  type PlanId,
} from "@/config/subscriptions";

// Helper to create a mock subscription
function mockSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "test-id",
    user_id: "user-id",
    plan: "trial",
    status: "active",
    trial_ends_at: null,
    current_period_start: null,
    current_period_end: null,
    payment_provider: null,
    payment_provider_subscription_id: null,
    admin_override: false,
    admin_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function mockLimits(features: string[] = []): PlanLimits {
  return {
    plan: "professional",
    label: "Profesional",
    max_patients: 50,
    max_sessions_per_month: 200,
    max_plannings: 20,
    max_ai_requests_per_month: 50,
    max_members: 1,
    available_tests: [],
    features: features as any[],
    price_monthly: 9990,
    price_yearly: 89900,
    sort_order: 2,
  };
}

describe("isPaidPlan", () => {
  it("returns true for professional and clinic plans", () => {
    expect(isPaidPlan("professional")).toBe(true);
    expect(isPaidPlan("clinic")).toBe(true);
  });

  it("returns false for free, trial, and vip plans", () => {
    expect(isPaidPlan("free")).toBe(false);
    expect(isPaidPlan("trial")).toBe(false);
    expect(isPaidPlan("vip")).toBe(false);
  });
});

describe("planHasFeature", () => {
  it("returns true when plan includes the feature", () => {
    const limits = mockLimits(["whatsapp", "pdf_export"]);
    expect(planHasFeature(limits, "whatsapp")).toBe(true);
  });

  it("returns false when plan does not include the feature", () => {
    const limits = mockLimits(["pdf_export"]);
    expect(planHasFeature(limits, "whatsapp")).toBe(false);
  });

  it("returns false when limits is null", () => {
    expect(planHasFeature(null, "whatsapp")).toBe(false);
  });
});

describe("isTrialExpired", () => {
  it("returns true when trial has ended", () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const sub = mockSubscription({ plan: "trial", trial_ends_at: yesterday });
    expect(isTrialExpired(sub)).toBe(true);
  });

  it("returns false when trial is still active", () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    const sub = mockSubscription({ plan: "trial", trial_ends_at: tomorrow });
    expect(isTrialExpired(sub)).toBe(false);
  });

  it("returns false for non-trial plans", () => {
    const sub = mockSubscription({ plan: "professional" });
    expect(isTrialExpired(sub)).toBe(false);
  });

  it("returns false for null subscription", () => {
    expect(isTrialExpired(null)).toBe(false);
  });
});

describe("getTrialDaysRemaining", () => {
  it("returns correct days remaining", () => {
    const inFiveDays = new Date(Date.now() + 5 * 86400000).toISOString();
    const sub = mockSubscription({ plan: "trial", trial_ends_at: inFiveDays });
    const remaining = getTrialDaysRemaining(sub);
    expect(remaining).toBe(5);
  });

  it("returns 0 when trial has expired", () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const sub = mockSubscription({ plan: "trial", trial_ends_at: yesterday });
    expect(getTrialDaysRemaining(sub)).toBe(0);
  });

  it("returns null for non-trial plans", () => {
    const sub = mockSubscription({ plan: "professional" });
    expect(getTrialDaysRemaining(sub)).toBeNull();
  });

  it("returns null for null subscription", () => {
    expect(getTrialDaysRemaining(null)).toBeNull();
  });
});

describe("formatPriceCLP", () => {
  it("formats Chilean pesos correctly", () => {
    const formatted = formatPriceCLP(9990);
    // Should contain the number in some form (locale-dependent)
    expect(formatted).toContain("9.990");
  });

  it("formats zero correctly", () => {
    const formatted = formatPriceCLP(0);
    expect(formatted).toContain("0");
  });

  it("formats large amounts", () => {
    const formatted = formatPriceCLP(1000000);
    expect(formatted).toContain("1.000.000");
  });
});
