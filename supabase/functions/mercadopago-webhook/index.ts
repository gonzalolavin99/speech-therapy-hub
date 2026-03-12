// Supabase Edge Function: MercadoPago Webhook
// Recibe notificaciones de pago de MercadoPago y actualiza los cobros

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  // MercadoPago sends webhooks as POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();

    // MercadoPago webhook types: payment, merchant_order, etc.
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

    // We need to fetch the payment details from MP to get the external_reference
    // First, we need to figure out which professional's access token to use
    // The external_reference format is: thub_{charge_id}

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Try to find the charge by searching all active MP configs
    // We'll try each config's access token to fetch the payment
    const { data: mpConfigs } = await supabaseAdmin
      .from('mercadopago_config')
      .select('access_token, user_id')
      .eq('is_active', true);

    if (!mpConfigs || mpConfigs.length === 0) {
      console.error('No active MP configs found');
      return new Response('OK', { status: 200 });
    }

    let paymentData = null;

    for (const config of mpConfigs) {
      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${config.access_token}`,
          },
        }
      );

      if (response.ok) {
        paymentData = await response.json();
        break;
      }
    }

    if (!paymentData) {
      console.error('Could not fetch payment from MP:', paymentId);
      return new Response('OK', { status: 200 });
    }

    const externalReference = paymentData.external_reference;
    if (!externalReference || !externalReference.startsWith('thub_')) {
      console.log('External reference not from TherapyHub:', externalReference);
      return new Response('OK', { status: 200 });
    }

    // Process the payment
    const { data: result, error } = await supabaseAdmin.rpc('process_mp_payment', {
      p_external_reference: externalReference,
      p_mp_payment_id: String(paymentData.id),
      p_mp_status: paymentData.status,
      p_mp_status_detail: paymentData.status_detail || '',
      p_mp_payment_type: paymentData.payment_type_id || paymentData.payment_method_id || '',
      p_amount: paymentData.transaction_amount,
      p_payer_email: paymentData.payer?.email || '',
      p_raw_data: paymentData,
    });

    if (error) {
      console.error('Error processing MP payment:', error);
    } else {
      console.log('MP payment processed:', result);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    // Always return 200 to avoid MercadoPago retrying
    return new Response('OK', { status: 200 });
  }
});
