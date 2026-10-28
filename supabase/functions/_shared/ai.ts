// Validación de requests a la Edge Function ai-completion.
// Sin dependencias de Deno para poder testearse con Vitest.

export const AI_LIMITS = {
  maxMessages: 10,
  maxTotalChars: 30000,
  maxCompletionTokens: 3000,
  defaultCompletionTokens: 2000,
  defaultTemperature: 0.7,
};

const ALLOWED_ROLES = new Set(['system', 'user', 'assistant']);

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type AIRequestValidation =
  | { ok: true; messages: AIMessage[]; temperature: number; maxTokens: number }
  | { ok: false; status: 400 | 413; error: string };

export function validateAIRequest(body: unknown): AIRequestValidation {
  const { messages, temperature, maxTokens } = (body ?? {}) as Record<string, unknown>;

  if (!Array.isArray(messages) || messages.length === 0 || messages.length > AI_LIMITS.maxMessages) {
    return { ok: false, status: 400, error: 'Mensajes inválidos' };
  }

  let totalChars = 0;
  for (const message of messages as Array<Record<string, unknown>>) {
    if (!message || !ALLOWED_ROLES.has(message.role as string) || typeof message.content !== 'string') {
      return { ok: false, status: 400, error: 'Mensajes inválidos' };
    }
    totalChars += message.content.length;
  }
  if (totalChars > AI_LIMITS.maxTotalChars) {
    return { ok: false, status: 413, error: 'El texto enviado es demasiado largo' };
  }

  return {
    ok: true,
    messages: (messages as AIMessage[]).map(({ role, content }) => ({ role, content })),
    temperature: typeof temperature === 'number' && Number.isFinite(temperature)
      ? Math.min(Math.max(temperature, 0), 1.5)
      : AI_LIMITS.defaultTemperature,
    maxTokens: typeof maxTokens === 'number' && Number.isFinite(maxTokens)
      ? Math.min(Math.max(Math.floor(maxTokens), 1), AI_LIMITS.maxCompletionTokens)
      : AI_LIMITS.defaultCompletionTokens,
  };
}
