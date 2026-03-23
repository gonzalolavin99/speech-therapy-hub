// Supabase Edge Function: Send Welcome Email
// Manually send a welcome/account-ready email to a user
// Call with: POST { email, name }

import { corsHeaders } from '../_shared/cors.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'TherapyHub <onboarding@resend.dev>';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://therapyhub.vercel.app';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { email, name } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400 });
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), { status: 500 });
    }

    const displayName = name || email.split('@')[0];

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: `¡Tu cuenta en TherapyHub está lista, ${displayName}!`,
        html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:linear-gradient(135deg,#4A7B9B,#3A6078);padding:32px 32px 24px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:12px;padding:10px 12px;margin-bottom:16px;">
                <span style="font-size:24px;color:#ffffff;">🩺</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">TherapyHub</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Plataforma de gestión clínica</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 8px;color:#18181b;font-size:18px;font-weight:600;">¡Hola ${displayName}! 🎉</h2>
              <p style="margin:0 0 16px;color:#52525b;font-size:14px;line-height:1.6;">
                Tu cuenta en TherapyHub ha sido aprobada y está lista para usar. Ya puedes acceder a todas las herramientas de gestión clínica.
              </p>
              <p style="margin:0 0 8px;color:#18181b;font-size:14px;font-weight:600;">Lo que puedes hacer:</p>
              <ul style="margin:0 0 24px;padding-left:20px;color:#52525b;font-size:13px;line-height:1.8;">
                <li>Gestionar tus pacientes</li>
                <li>Aplicar evaluaciones estandarizadas (+10 tests)</li>
                <li>Crear planificaciones terapéuticas con IA</li>
                <li>Agendar citas y controlar pagos</li>
              </ul>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}/login" style="display:inline-block;background:#4A7B9B;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 32px;border-radius:8px;">
                      Ingresar a TherapyHub
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;color:#71717a;font-size:12px;line-height:1.5;">
                Si tienes alguna duda, no dudes en contactarnos. ¡Estamos para ayudarte!
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <hr style="border:none;border-top:1px solid #e4e4e7;margin:0 0 16px;">
              <p style="margin:0;color:#a1a1aa;font-size:11px;text-align:center;">
                TherapyHub — Gestión clínica profesional<br>
                Hecho en Chile 🇨🇱
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Resend API error:', errorText);
      return new Response(JSON.stringify({ error: errorText }), { status: 500 });
    }

    const result = await emailResponse.json();
    console.log('Welcome email sent to:', email, 'ID:', result.id);

    return new Response(JSON.stringify({ success: true, emailId: result.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
