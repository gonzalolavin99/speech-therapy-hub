import { describe, it, expect, vi, beforeEach } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { functions: { invoke } } }));

import { getAICompletion, isAIConfigured } from "@/lib/ai-service";

beforeEach(() => invoke.mockReset());

describe("ai-service", () => {
  it("llama a la Edge Function ai-completion, nunca a OpenAI directo", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    invoke.mockResolvedValue({ data: { content: "respuesta" }, error: null });

    const result = await getAICompletion({ messages: [{ role: "user", content: "hola" }], maxTokens: 100 });

    expect(result).toBe("respuesta");
    expect(invoke).toHaveBeenCalledWith("ai-completion", {
      body: { messages: [{ role: "user", content: "hola" }], temperature: 0.7, maxTokens: 100 },
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("propaga el mensaje de error del servidor", async () => {
    const context = new Response(JSON.stringify({ error: "El texto enviado es demasiado largo" }), { status: 413 });
    invoke.mockResolvedValue({ data: null, error: { message: "Edge Function returned a non-2xx status code", context } });
    await expect(getAICompletion({ messages: [{ role: "user", content: "x" }] }))
      .rejects.toThrow("El texto enviado es demasiado largo");
  });

  it("devuelve texto vacío si la respuesta no trae contenido", async () => {
    invoke.mockResolvedValue({ data: {}, error: null });
    await expect(getAICompletion({ messages: [{ role: "user", content: "x" }] })).resolves.toBe("");
  });

  it("está habilitada por defecto (VITE_AI_ENABLED no definida)", () => {
    expect(isAIConfigured()).toBe(true);
  });

  it("no expone ninguna API key en el módulo", async () => {
    const source = await import("@/lib/ai-service?raw").then((m) => m.default as string);
    expect(source).not.toMatch(/OPENAI_API_KEY|api\.openai\.com|sk-/);
  });
});
