// @vitest-environment node
import { describe, it, expect } from "vitest";
import { validateAIRequest, AI_LIMITS } from "../../../supabase/functions/_shared/ai.ts";
import { escapeHtml } from "../../../supabase/functions/_shared/html.ts";

describe("validateAIRequest", () => {
  const msg = (content = "hola", role = "user") => ({ role, content });

  it("acepta un request válido y aplica valores por defecto", () => {
    expect(validateAIRequest({ messages: [msg()] })).toEqual({
      ok: true,
      messages: [{ role: "user", content: "hola" }],
      temperature: AI_LIMITS.defaultTemperature,
      maxTokens: AI_LIMITS.defaultCompletionTokens,
    });
  });

  it("descarta campos extra de los mensajes", () => {
    const result = validateAIRequest({ messages: [{ role: "user", content: "x", name: "inyectado", tool_calls: [] }] });
    expect(result.ok && result.messages).toEqual([{ role: "user", content: "x" }]);
  });

  it("rechaza mensajes vacíos, demasiados o con roles no permitidos", () => {
    expect(validateAIRequest({ messages: [] })).toMatchObject({ ok: false, status: 400 });
    expect(validateAIRequest({})).toMatchObject({ ok: false, status: 400 });
    expect(validateAIRequest(null)).toMatchObject({ ok: false, status: 400 });
    expect(validateAIRequest({ messages: Array(AI_LIMITS.maxMessages + 1).fill(msg()) })).toMatchObject({ ok: false, status: 400 });
    expect(validateAIRequest({ messages: [msg("x", "tool")] })).toMatchObject({ ok: false, status: 400 });
    expect(validateAIRequest({ messages: [{ role: "user", content: 123 }] })).toMatchObject({ ok: false, status: 400 });
  });

  it("rechaza textos demasiado largos con 413", () => {
    expect(validateAIRequest({ messages: [msg("a".repeat(AI_LIMITS.maxTotalChars + 1))] }))
      .toMatchObject({ ok: false, status: 413 });
  });

  it("acota temperatura y tokens para controlar costos", () => {
    const high = validateAIRequest({ messages: [msg()], temperature: 9, maxTokens: 999999 });
    expect(high).toMatchObject({ ok: true, temperature: 1.5, maxTokens: AI_LIMITS.maxCompletionTokens });
    const low = validateAIRequest({ messages: [msg()], temperature: -1, maxTokens: 0.4 });
    expect(low).toMatchObject({ ok: true, temperature: 0, maxTokens: 1 });
    const invalid = validateAIRequest({ messages: [msg()], temperature: "alta", maxTokens: NaN });
    expect(invalid).toMatchObject({ ok: true, temperature: AI_LIMITS.defaultTemperature, maxTokens: AI_LIMITS.defaultCompletionTokens });
  });
});

describe("escapeHtml", () => {
  it("neutraliza HTML inyectado en nombres o emails", () => {
    expect(escapeHtml('<a href="https://phish.example">Haz clic</a>'))
      .toBe("&lt;a href=&quot;https://phish.example&quot;&gt;Haz clic&lt;/a&gt;");
    expect(escapeHtml("O'Higgins & Cía")).toBe("O&#39;Higgins &amp; Cía");
  });

  it("deja intacto el texto normal", () => {
    expect(escapeHtml("Francisca Vargas")).toBe("Francisca Vargas");
  });
});
