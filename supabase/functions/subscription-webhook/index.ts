// Supabase Edge Function: Subscription Webhook
// Receives MercadoPago payment notifications for TherapyHub plan subscriptions
// Activates the user's subscription when payment is approved

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  // MercadoPago sends webhooks as POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();

    // We only care about payment notifications
    if (body.type !== 'payment' && body.action !== 'payment.created' && body.action !== 'payment.updated') {
      console.log('Ignoring non-payment webhook:', body.type, body.action);
      return new Response('OK', { status: 200 });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      console.error('No payment ID in webhook body');
      return new Response('OK', { status: 200 });
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get platform MP config to fetch payment details
    const { data: mpConfig } = await supabaseAdmin
      .rpc('get_platform_mp_config');

    if (!mpConfig || mpConfig.error) {
      console.error('No platform MP config found');
      return new Response('OK', { status: 200 });
    }

    // Fetch payment details from MercadoPago
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${mpConfig.access_token}`,
        },
      }
    );

    if (!mpResponse.ok) {
      console.error('Could not fetch payment from MP:', paymentId);
      return new Response('OK', { status: 200 });
    }

    const paymentData = await mpResponse.json();

    const externalReference = paymentData.external_reference;
    if (!externalReference || !externalReference.startsWith('thub_sub_')) {
      // Not a subscription payment — might be a portal charge payment
      console.log('External reference not a subscription payment:', externalReference);
      return new Response('OK', { status: 200 });
    }

    // Process the subscription payment
    const { data: result, error } = await supabaseAdmin.rpc('process_subscription_payment', {
      p_external_reference: externalReference,
      p_mp_payment_id: String(paymentData.id),
      p_mp_status: paymentData.status,
      p_mp_status_detail: paymentData.status_detail || '',
      p_amount: paymentData.transaction_amount,
    });

    if (error) {
      console.error('Error processing subscription payment:', error);
    } else {
      console.log('Subscription payment processed:', result);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    // Always return 200 to avoid MercadoPago retrying
    return new Response('OK', { status: 200 });
  }
});
