// Supabase Edge Function: AI Completion
// Proxy autenticado hacia OpenAI. La API key vive solo en el servidor
// (secreto OPENAI_API_KEY), nunca en el bundle del frontend.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { validateAIRequest } from '../_shared/ai.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const OPENAI_MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    if (!OPENAI_API_KEY) {
      return jsonResponse({ error: 'La IA no está configurada en el servidor' }, 503);
    }

    // Solo usuarios con sesión iniciada (la anon key sola no basta)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'No autorizado' }, 401);
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return jsonResponse({ error: 'No autorizado' }, 401);
    }

    // Límites (mensajes, tamaño, tokens) para que la función no sea un proxy abierto
    const validation = validateAIRequest(await req.json().catch(() => null));
    if (!validation.ok) {
      return jsonResponse({ error: validation.error }, validation.status);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: validation.messages,
        temperature: validation.temperature,
        max_completion_tokens: validation.maxTokens,
        user: user.id,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('OpenAI error:', response.status, error?.error?.message);
      return jsonResponse({ error: 'Error del servicio de IA' }, 502);
    }

    const data = await response.json();
    return jsonResponse({ content: data.choices?.[0]?.message?.content ?? '' });
  } catch (error) {
    console.error('ai-completion error:', error);
    return jsonResponse({ error: 'Error interno' }, 500);
  }
});
