// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { runIdempotent, enforceRateLimits } from "../../../supabase/functions/_shared/idempotency.ts";
import type { AdminClient } from "../../../supabase/functions/_shared/mp-webhook.ts";

interface RpcArgs {
  p_scope?: string;
  p_key?: string;
  p_request_hash?: string;
  p_status?: string;
  p_response?: unknown;
  p_http_status?: number;
  p_max?: number;
}

// Implementación en memoria con la misma semántica que reserve_idempotency_key
function createFakeAdmin() {
  const keys = new Map<string, { hash: string; status: string; response?: unknown; http_status?: number }>();
  const buckets = new Map<string, number>();

  const rpc = vi.fn(async (fn: string, args: RpcArgs) => {
    const id = `${args.p_scope}|${args.p_key}`;
    if (fn === "reserve_idempotency_key") {
      const row = keys.get(id);
      if (!row) {
        keys.set(id, { hash: args.p_request_hash, status: "in_progress" });
        return { data: { status: "reserved" }, error: null };
      }
      if (row.hash !== args.p_request_hash) return { data: { status: "mismatch" }, error: null };
      if (row.status === "completed") return { data: { status: "replay", response: row.response, http_status: row.http_status }, error: null };
      if (row.status === "failed") { row.status = "in_progress"; return { data: { status: "reserved" }, error: null }; }
      return { data: { status: "in_progress" }, error: null };
    }
    if (fn === "complete_idempotency_key") {
      Object.assign(keys.get(id)!, { status: args.p_status, response: args.p_response, http_status: args.p_http_status });
      return { data: null, error: null };
    }
    if (fn === "check_rate_limit") {
      const count = (buckets.get(args.p_key) ?? 0) + 1;
      buckets.set(args.p_key, count);
      return { data: count <= args.p_max, error: null };
    }
    throw new Error(`rpc inesperado ${fn}`);
  });

  return { client: { rpc, from: vi.fn() } as unknown as AdminClient, keys, rpc };
}

const params = { scope: "create-preference:user-1", key: "pref-charge-1", requestHash: "hash-a" };

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("runIdempotent", () => {
  it("ejecuta la operación una vez y devuelve la misma respuesta al repetir (doble clic)", async () => {
    const { client } = createFakeAdmin();
    const operation = vi.fn().mockResolvedValue({ status: 200, body: { init_point: "https://mp/1" } });

    const first = await runIdempotent(client, params, operation);
    const second = await runIdempotent(client, params, operation);

    expect(first).toEqual({ status: 200, body: { init_point: "https://mp/1" } });
    expect(second).toEqual(first);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("responde 409 a un request concurrente con la misma clave", async () => {
    const { client } = createFakeAdmin();
    let release!: () => void;
    const slow = () => new Promise<{ status: number; body: unknown }>((resolve) => {
      release = () => resolve({ status: 200, body: { ok: true } });
    });

    const pending = runIdempotent(client, params, slow);
    await new Promise((r) => setTimeout(r, 0));
    const concurrent = await runIdempotent(client, params, vi.fn());
    release();

    expect(concurrent.status).toBe(409);
    expect((await pending).status).toBe(200);
  });

  it("responde 422 si la misma clave llega con otro contenido (p.ej. otro monto)", async () => {
    const { client } = createFakeAdmin();
    await runIdempotent(client, params, async () => ({ status: 200, body: {} }));
    const operation = vi.fn();
    const result = await runIdempotent(client, { ...params, requestHash: "hash-b" }, operation);
    expect(result.status).toBe(422);
    expect(operation).not.toHaveBeenCalled();
  });

  it("permite reintentar con la misma clave cuando la operación falló con 5xx", async () => {
    const { client, keys } = createFakeAdmin();
    await runIdempotent(client, params, async () => ({ status: 503, body: { error: "gateway" } }));
    expect(keys.get(`${params.scope}|${params.key}`)?.status).toBe("failed");

    const retry = await runIdempotent(client, params, async () => ({ status: 200, body: { ok: true } }));
    expect(retry).toEqual({ status: 200, body: { ok: true } });
  });

  it("guarda los rechazos 4xx como resultado definitivo", async () => {
    const { client } = createFakeAdmin();
    await runIdempotent(client, params, async () => ({ status: 404, body: { error: "Cobro no encontrado" } }));
    const operation = vi.fn();
    expect(await runIdempotent(client, params, operation)).toEqual({ status: 404, body: { error: "Cobro no encontrado" } });
    expect(operation).not.toHaveBeenCalled();
  });

  it("convierte una excepción en 500 y deja la clave reintentable", async () => {
    const { client, keys } = createFakeAdmin();
    const result = await runIdempotent(client, params, async () => { throw new Error("boom"); });
    expect(result.status).toBe(500);
    expect(keys.get(`${params.scope}|${params.key}`)?.status).toBe("failed");
  });

  it("responde 500 si no puede registrar la clave", async () => {
    const client = { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "db down" } }), from: vi.fn() } as unknown as AdminClient;
    const operation = vi.fn();
    expect((await runIdempotent(client, params, operation)).status).toBe(500);
    expect(operation).not.toHaveBeenCalled();
  });
});

describe("enforceRateLimits", () => {
  it("bloquea cuando cualquiera de las claves supera su límite", async () => {
    const { client } = createFakeAdmin();
    const limits = [
      { key: "ip:1.2.3.4", max: 3, windowSeconds: 600 },
      { key: "actor:user-1", max: 2, windowSeconds: 600 },
    ];
    expect(await enforceRateLimits(client, limits)).toBe(true);
    expect(await enforceRateLimits(client, limits)).toBe(true);
    expect(await enforceRateLimits(client, limits)).toBe(false);
  });

  it("permite la operación si el limitador no está disponible (fail-open)", async () => {
    const client = { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "db" } }), from: vi.fn() } as unknown as AdminClient;
    expect(await enforceRateLimits(client, [{ key: "k", max: 1, windowSeconds: 60 }])).toBe(true);
  });
});
