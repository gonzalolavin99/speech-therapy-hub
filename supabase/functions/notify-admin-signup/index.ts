// Supabase Edge Function: Notify Admin on New Signup
// Triggered by a Database Webhook when a new profile is created
// Sends an email to the admin via Resend API

import { corsHeaders } from '../_shared/cors.ts';

const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') ?? 'admin@therapyhub.cl';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'TherapyHub <onboarding@resend.dev>';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await req.json();

    // Database webhooks send: { type, table, record, schema, old_record }
    const record = payload.record;
    if (!record) {
      console.log('No record in payload, ignoring');
      return new Response('OK', { status: 200 });
    }

    const userEmail = record.email || record.raw_user_meta_data?.email || 'Sin email';
    const userId = record.id || 'Sin ID';
    const createdAt = record.created_at
      ? new Date(record.created_at).toLocaleString('es-CL', { timeZone: 'America/Santiago' })
      : 'Fecha desconocida';

    console.log(`New user signup: ${userEmail} (${userId})`);

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response('Missing API key', { status: 500 });
    }

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject: `🆕 Nuevo registro en TherapyHub — ${userEmail}`,
        html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:linear-gradient(135deg,#4A7B9B,#3A6078);padding:24px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">🆕 Nuevo Registro</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">TherapyHub — Notificación Admin</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 16px;color:#18181b;font-size:15px;font-weight:600;">Un nuevo usuario se registró:</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;padding:16px;border:1px solid #e5e7eb;">
                <tr>
                  <td style="padding:8px 16px;">
                    <p style="margin:0;color:#6b7280;font-size:12px;">Email</p>
                    <p style="margin:2px 0 0;color:#18181b;font-size:14px;font-weight:600;">${userEmail}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 16px;">
                    <p style="margin:0;color:#6b7280;font-size:12px;">ID de Usuario</p>
                    <p style="margin:2px 0 0;color:#18181b;font-size:14px;font-family:monospace;">${userId}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 16px;">
                    <p style="margin:0;color:#6b7280;font-size:12px;">Fecha de Registro</p>
                    <p style="margin:2px 0 0;color:#18181b;font-size:14px;">${createdAt}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;color:#52525b;font-size:13px;line-height:1.5;">
                Puedes revisar y aprobar esta cuenta desde el panel de administración en <strong>TherapyHub → Usuarios</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <hr style="border:none;border-top:1px solid #e4e4e7;margin:0 0 12px;">
              <p style="margin:0;color:#a1a1aa;font-size:11px;text-align:center;">
                TherapyHub — Notificación automática
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
      return new Response(`Email send failed: ${errorText}`, { status: 500 });
    }

    const result = await emailResponse.json();
    console.log('Admin notification sent:', result.id);

    return new Response(JSON.stringify({ success: true, emailId: result.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in notify-admin-signup:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
