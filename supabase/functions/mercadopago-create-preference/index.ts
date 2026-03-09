// Supabase Edge Function: Create MercadoPago Preference
// Crea una preferencia de pago en MercadoPago Checkout Pro
// Se llama desde el frontend cuando el paciente quiere pagar con MP

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { charge_id, token, success_url, failure_url } = await req.json();

    if (!charge_id) {
      return new Response(
        JSON.stringify({ error: 'charge_id es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // If token is provided (portal access), validate it first
    if (token) {
      const { data: tokenCheck } = await supabaseAdmin
        .from('patient_portal_tokens')
        .select('patient_id, user_id')
        .eq('token', token)
        .eq('is_active', true)
        .maybeSingle();

      if (!tokenCheck) {
        return new Response(
          JSON.stringify({ error: 'Token inválido' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get charge data and MP config via RPC
    const { data: configData, error: configError } = await supabaseAdmin
      .rpc('get_mp_config_for_charge', { p_charge_id: charge_id });

    if (configError || configData?.error) {
      return new Response(
        JSON.stringify({ error: configData?.error || configError?.message || 'Error obteniendo configuración' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { access_token, is_sandbox, charge } = configData;
    const external_reference = `thub_${charge.id}`;

    // Determine MP API base URL
    const mpBaseUrl = 'https://api.mercadopago.com';

    // Create preference in MercadoPago
    const preferenceBody = {
      items: [
        {
          title: charge.description,
          description: `Cobro TherapyHub - ${charge.patient_name}`,
          quantity: 1,
          currency_id: 'CLP',
          unit_price: charge.amount,
        },
      ],
      external_reference,
      back_urls: {
        success: success_url || `${req.headers.get('origin')}/portal-pago/success`,
        failure: failure_url || `${req.headers.get('origin')}/portal-pago/failure`,
        pending: `${req.headers.get('origin')}/portal-pago/pending`,
      },
      auto_return: 'approved',
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
      statement_descriptor: 'TherapyHub',
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días
    };

    const mpResponse = await fetch(`${mpBaseUrl}/checkout/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`,
      },
      body: JSON.stringify(preferenceBody),
    });

    if (!mpResponse.ok) {
      const mpError = await mpResponse.text();
      console.error('MercadoPago API error:', mpError);
      return new Response(
        JSON.stringify({ error: 'Error al crear preferencia en MercadoPago' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const preference = await mpResponse.json();

    // Update charge with MP data
    await supabaseAdmin.rpc('update_charge_mp_data', {
      p_charge_id: charge.id,
      p_preference_id: preference.id,
      p_init_point: is_sandbox ? preference.sandbox_init_point : preference.init_point,
      p_external_reference: external_reference,
    });

    return new Response(
      JSON.stringify({
        init_point: is_sandbox ? preference.sandbox_init_point : preference.init_point,
        preference_id: preference.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
