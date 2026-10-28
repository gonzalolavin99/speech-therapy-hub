import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export { escapeHtml } from './html.ts';

// true si la request trae la service role key o el JWT de un admin de la plataforma
export async function isServiceOrAdmin(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return false;

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (serviceKey && authHeader === `Bearer ${serviceKey}`) return true;

  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user?.email) return false;

  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey);
  const { data: admin } = await supabaseAdmin
    .from('admin_users')
    .select('id')
    .eq('email', user.email)
    .maybeSingle();

  return !!admin;
}
