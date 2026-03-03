export type PlanId = 'free' | 'trial' | 'professional' | 'clinic' | 'vip';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'suspended';

export type FeatureId =
  | 'consent'
  | 'pdf_export'
  | 'google_calendar'
  | 'boleta_pdf'
  | 'patient_export'
  | 'whatsapp'
  | 'custom_branding'
  | 'multi_user';

export interface PlanLimits {
  plan: PlanId;
  label: string;
  max_patients: number;
  max_sessions_per_month: number;
  max_plannings: number;
  max_ai_requests_per_month: number;
  available_tests: string[];
  features: FeatureId[];
  price_monthly: number;
  price_yearly: number;
  sort_order: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: PlanId;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  payment_provider: string | null;
  payment_provider_subscription_id: string | null;
  admin_override: boolean;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionWithLimits {
  subscription: Subscription;
  limits: PlanLimits;
}

export interface UsageRecord {
  metric: string;
  count: number;
  period: string;
}

// Check if a plan is paid
export function isPaidPlan(plan: PlanId): boolean {
  return plan === 'professional' || plan === 'clinic';
}

// Check if a plan has a specific feature
export function planHasFeature(limits: PlanLimits | null, feature: FeatureId): boolean {
  if (!limits) return false;
  return limits.features.includes(feature);
}

// Check if trial has expired
export function isTrialExpired(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  if (subscription.plan !== 'trial') return false;
  if (!subscription.trial_ends_at) return false;
  return new Date(subscription.trial_ends_at) < new Date();
}

// Get days remaining in trial
export function getTrialDaysRemaining(subscription: Subscription | null): number | null {
  if (!subscription || subscription.plan !== 'trial' || !subscription.trial_ends_at) return null;
  const diff = new Date(subscription.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// Format price in CLP
export function formatPriceCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);
}
