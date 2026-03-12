// Supabase Edge Function: Subscription Checkout
// Creates a MercadoPago preference for TherapyHub plan subscriptions
// Uses the PLATFORM's MercadoPago account (not individual professional's)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { plan, billing_period, success_url, failure_url } = await req.json();

    if (!plan || !billing_period) {
      return new Response(
        JSON.stringify({ error: 'plan y billing_period son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token for RPC calls that need auth
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Create Supabase admin client for platform config
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Create subscription payment record (as the user)
    const { data: paymentData, error: paymentError } = await supabaseUser
      .rpc('create_subscription_payment', {
        p_plan: plan,
        p_billing_period: billing_period,
      });

    if (paymentError || paymentData?.error) {
      return new Response(
        JSON.stringify({ error: paymentData?.error || paymentError?.message || 'Error creando pago' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get platform MercadoPago config
    const { data: mpConfig } = await supabaseAdmin
      .rpc('get_platform_mp_config');

    if (!mpConfig || mpConfig.error) {
      return new Response(
        JSON.stringify({ error: 'MercadoPago no configurado en la plataforma. Contacta al administrador.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Get user info for the preference
    const { data: { user } } = await supabaseUser.auth.getUser();
    const userEmail = user?.email || '';

    // Get user's profile name
    const { data: profile } = await supabaseAdmin
      .from('professional_profiles')
      .select('full_name')
      .eq('user_id', user?.id)
      .maybeSingle();

    const planLabels: Record<string, string> = {
      professional: 'Plan Profesional',
      clinic: 'Plan Clínica',
    };

    const periodLabels: Record<string, string> = {
      monthly: 'Mensual',
      yearly: 'Anual',
    };

    const planLabel = planLabels[plan] || plan;
    const periodLabel = periodLabels[billing_period] || billing_period;

    // 4. Create MercadoPago preference
    const preferenceBody = {
      items: [
        {
          title: `TherapyHub - ${planLabel} (${periodLabel})`,
          description: `Suscripción ${periodLabel.toLowerCase()} al ${planLabel} de TherapyHub`,
          quantity: 1,
          currency_id: 'CLP',
          unit_price: paymentData.amount,
        },
      ],
      payer: {
        email: userEmail,
        name: profile?.full_name || '',
      },
      external_reference: paymentData.external_reference,
      back_urls: {
        success: success_url || `${req.headers.get('origin')}/planes?payment=success`,
        failure: failure_url || `${req.headers.get('origin')}/planes?payment=failure`,
        pending: `${req.headers.get('origin')}/planes?payment=pending`,
      },
      auto_return: 'approved',
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/subscription-webhook`,
      statement_descriptor: 'TherapyHub',
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mpConfig.access_token}`,
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

    // 5. Update payment record with MP data
    await supabaseAdmin
      .from('subscription_payments')
      .update({
        mp_preference_id: preference.id,
        mp_init_point: mpConfig.is_sandbox ? preference.sandbox_init_point : preference.init_point,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentData.id);

    return new Response(
      JSON.stringify({
        init_point: mpConfig.is_sandbox ? preference.sandbox_init_point : preference.init_point,
        preference_id: preference.id,
        payment_id: paymentData.id,
        amount: paymentData.amount,
        plan: paymentData.plan,
        billing_period: paymentData.billing_period,
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
