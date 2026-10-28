// Ejecución idempotente de operaciones de la API y rate limiting,
// respaldados por reserve_idempotency_key / check_rate_limit en Postgres.

import type { AdminClient } from './mp-webhook.ts';

export interface OperationResult {
  status: number;
  body: unknown;
}

// Ejecuta `operation` una sola vez por (scope, key):
// - misma clave y mismo contenido ya completada → devuelve la respuesta guardada
// - misma clave en curso → 409 (doble clic / request concurrente)
// - misma clave con otro contenido → 422
// - errores 5xx o excepciones → la clave queda 'failed' y se puede reintentar
export async function runIdempotent(
  admin: AdminClient,
  params: { scope: string; key: string; requestHash: string },
  operation: () => Promise<OperationResult>
): Promise<OperationResult> {
  const { data: reservation, error } = await admin.rpc('reserve_idempotency_key', {
    p_scope: params.scope,
    p_key: params.key,
    p_request_hash: params.requestHash,
  });

  if (error || !reservation) {
    return { status: 500, body: { error: 'No se pudo registrar la operación' } };
  }

  switch (reservation.status) {
    case 'replay':
      return { status: reservation.http_status ?? 200, body: reservation.response };
    case 'in_progress':
      return { status: 409, body: { error: 'La operación ya está en curso. Intenta de nuevo en unos segundos.' } };
    case 'mismatch':
      return { status: 422, body: { error: 'La clave de idempotencia ya se usó con otros datos' } };
    case 'reserved':
      break;
    default:
      return { status: 500, body: { error: 'Estado de idempotencia desconocido' } };
  }

  let result: OperationResult;
  try {
    result = await operation();
  } catch (err) {
    console.error(`[idempotency] ${params.scope} falló:`, (err as Error)?.message);
    result = { status: 500, body: { error: 'Error interno' } };
  }

  await admin.rpc('complete_idempotency_key', {
    p_scope: params.scope,
    p_key: params.key,
    p_status: result.status >= 500 ? 'failed' : 'completed',
    p_response: result.body,
    p_http_status: result.status,
  });

  return result;
}

// true si todas las claves están bajo su límite
export async function enforceRateLimits(
  admin: AdminClient,
  limits: Array<{ key: string; max: number; windowSeconds: number }>
): Promise<boolean> {
  for (const limit of limits) {
    const { data, error } = await admin.rpc('check_rate_limit', {
      p_key: limit.key,
      p_max: limit.max,
      p_window_seconds: limit.windowSeconds,
    });
    // Si el limitador falla se permite la operación (fail-open): las demás capas siguen protegiendo
    if (error) {
      console.error('[rate-limit] error:', error.message);
      continue;
    }
    if (data === false) return false;
  }
  return true;
}
