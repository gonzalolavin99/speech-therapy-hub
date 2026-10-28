// Lógica de pagos compartida por las Edge Functions.
// Solo usa APIs web estándar (fetch, crypto.subtle) para poder testearse
// con Vitest en Node además de correr en Deno. La máquina de estados
// replica payment_transition_allowed / map_mp_status de
// supabase/migrations/payments_lifecycle.sql: si cambias una, cambia la otra.

export type PaymentState =
  | 'pending'
  | 'processing'
  | 'requires_action'
  | 'under_review'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'disputed'
  | 'refunded'
  | 'partially_refunded'
  | 'charged_back'
  | 'unknown';

const MP_STATUS_MAP: Record<string, PaymentState> = {
  approved: 'succeeded',
  authorized: 'processing',
  pending: 'pending',
  in_process: 'processing',
  in_mediation: 'disputed',
  rejected: 'failed',
  cancelled: 'cancelled',
  refunded: 'refunded',
  charged_back: 'charged_back',
};

export function mapMpStatus(status: string | null | undefined): PaymentState {
  return (status && MP_STATUS_MAP[status]) || 'unknown';
}

const OPEN_STATES: PaymentState[] = ['pending', 'processing', 'requires_action', 'unknown'];

const ALLOWED_FROM: Partial<Record<PaymentState, PaymentState[]>> = {
  under_review: ['succeeded', 'failed', 'cancelled', 'refunded', 'partially_refunded', 'charged_back'],
  succeeded: ['disputed', 'refunded', 'partially_refunded', 'charged_back'],
  partially_refunded: ['refunded', 'disputed', 'charged_back'],
  disputed: ['succeeded', 'refunded', 'partially_refunded', 'charged_back'],
};

export function isTransitionAllowed(from: PaymentState | null, to: PaymentState): boolean {
  if (from === null || from === to) return true;
  if (OPEN_STATES.includes(from)) return true;
  return ALLOWED_FROM[from]?.includes(to) ?? false; // failed, cancelled, refunded, charged_back: terminales
}

export function isTerminalState(state: PaymentState): boolean {
  return ['failed', 'cancelled', 'refunded', 'charged_back'].includes(state);
}

// ------------------------------------------------------------
// Verificación del pago consultado a MercadoPago
// ------------------------------------------------------------

export interface MpPayment {
  id: number | string;
  status: string;
  status_detail?: string;
  external_reference?: string | null;
  transaction_amount?: number;
  transaction_amount_refunded?: number;
  currency_id?: string;
}

// Tipos planos (no uniones discriminadas): el frontend compila con strict: false
export interface PaymentCheck {
  ok: boolean;
  reason?: 'missing_reference' | 'foreign_reference' | 'currency_mismatch';
}

// Chequeo previo al RPC. El monto lo valida apply_gateway_payment contra la BD.
export function checkMpPayment(
  payment: MpPayment,
  options: { referencePrefix: string; excludePrefix?: string; expectedCurrency?: string }
): PaymentCheck {
  const reference = payment.external_reference;
  if (!reference) return { ok: false, reason: 'missing_reference' };
  if (!reference.startsWith(options.referencePrefix)) return { ok: false, reason: 'foreign_reference' };
  if (options.excludePrefix && reference.startsWith(options.excludePrefix)) {
    return { ok: false, reason: 'foreign_reference' };
  }
  if (options.expectedCurrency && payment.currency_id !== options.expectedCurrency) {
    return { ok: false, reason: 'currency_mismatch' };
  }
  return { ok: true };
}

// ------------------------------------------------------------
// Firma de webhooks de MercadoPago (header x-signature)
// ------------------------------------------------------------
// x-signature: "ts=<unix>,v1=<hmac hex>"
// manifest:    "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
// Las partes sin valor se omiten. data.id alfanumérico va en minúsculas.

export function parseMpSignature(header: string | null): { ts: string; v1: string } | null {
  if (!header) return null;
  const parts: Record<string, string> = {};
  for (const part of header.split(',')) {
    const [key, ...rest] = part.split('=');
    if (key) parts[key.trim()] = rest.join('=').trim();
  }
  if (!parts.ts || !parts.v1) return null;
  return { ts: parts.ts, v1: parts.v1 };
}

export function buildMpManifest(dataId: string | null, requestId: string | null, ts: string): string {
  let manifest = '';
  if (dataId) manifest += `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;
  return manifest;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface SignatureCheck {
  valid: boolean;
  reason?: 'missing' | 'expired' | 'mismatch';
}

export async function verifyMpSignature(params: {
  secret: string;
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
  nowMs?: number;
  toleranceSeconds?: number;
}): Promise<SignatureCheck> {
  const parsed = parseMpSignature(params.signatureHeader);
  if (!parsed) return { valid: false, reason: 'missing' };

  // Ventana anti-replay. ts puede venir en segundos o milisegundos.
  const tsNumber = Number(parsed.ts);
  const tsMs = tsNumber > 1e12 ? tsNumber : tsNumber * 1000;
  const tolerance = (params.toleranceSeconds ?? 600) * 1000;
  if (!Number.isFinite(tsMs) || Math.abs((params.nowMs ?? Date.now()) - tsMs) > tolerance) {
    return { valid: false, reason: 'expired' };
  }

  const manifest = buildMpManifest(params.dataId, params.requestId, parsed.ts);
  const expected = await hmacSha256Hex(params.secret, manifest);
  return timingSafeEqual(expected, parsed.v1.toLowerCase()) ? { valid: true } : { valid: false, reason: 'mismatch' };
}

// ------------------------------------------------------------
// Idempotencia
// ------------------------------------------------------------

// Hash estable del contenido de la operación (el orden de las claves no importa)
export async function hashRequest(payload: unknown): Promise<string> {
  const canonical = JSON.stringify(sortKeys(payload));
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical)));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(record).sort().map((key) => [key, sortKeys(record[key])]));
  }
  return value;
}

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9:_-]{8,128}$/;

export function isValidIdempotencyKey(key: string | null | undefined): key is string {
  return !!key && IDEMPOTENCY_KEY_PATTERN.test(key);
}

// ------------------------------------------------------------
// Llamadas a la pasarela: timeout, reintentos y backoff
// ------------------------------------------------------------

export type GatewayResult =
  | { kind: 'ok'; status: number; body: unknown }
  | { kind: 'rejected'; status: number; body: unknown } // 4xx definitivo: no reintentar
  | { kind: 'unknown'; error: string }; // timeout/red/5xx agotados: resultado desconocido

export interface RetryOptions {
  timeoutMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

// Reintenta solo errores transitorios y siempre con la MISMA request
// (incluido X-Idempotency-Key), para que la pasarela no duplique la operación.
export async function callGateway(url: string, init: RequestInit, options: RetryOptions = {}): Promise<GatewayResult> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxRetries = options.maxRetries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 300;
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  let lastError = 'unknown';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const jitter = Math.floor(Math.random() * baseDelayMs);
      await sleep(baseDelayMs * 2 ** (attempt - 1) + jitter);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, { ...init, signal: controller.signal });
      const body = await response.json().catch(() => null);
      if (response.ok) return { kind: 'ok', status: response.status, body };
      if (!isRetryableStatus(response.status)) return { kind: 'rejected', status: response.status, body };
      lastError = `http_${response.status}`;
    } catch (error) {
      lastError = (error as Error)?.name === 'AbortError' ? 'timeout' : 'network_error';
    } finally {
      clearTimeout(timer);
    }
  }

  return { kind: 'unknown', error: lastError };
}

// IP del cliente para rate limiting (Supabase pasa la original en x-forwarded-for)
export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

// URLs de retorno del checkout: solo se aceptan del mismo origen que la app,
// para que nadie use el flujo de pago como redirección abierta.
export function safeReturnUrl(candidate: unknown, allowedOrigins: string[], fallback: string): string {
  if (typeof candidate !== 'string' || !candidate) return fallback;
  try {
    const url = new URL(candidate);
    const allowed = allowedOrigins.filter(Boolean).map((origin) => new URL(origin).origin);
    return allowed.includes(url.origin) ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}
