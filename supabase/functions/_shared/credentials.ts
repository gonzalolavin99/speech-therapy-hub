// Access token de MercadoPago según el tipo de orden:
// cobros del portal → cuenta del profesional; suscripciones → cuenta de la plataforma.

import type { AdminClient } from './mp-webhook.ts';
import type { CredentialResolver } from './refunds.ts';

export function mpCredentialResolver(admin: AdminClient): CredentialResolver {
  let platformToken: string | null | undefined;

  return async (kind, ownerId) => {
    if (kind === 'subscription') {
      if (platformToken === undefined) {
        const { data } = await admin.rpc('get_platform_mp_config');
        platformToken = data && !data.error ? data.access_token : null;
      }
      return platformToken;
    }
    const { data } = await admin
      .from('mercadopago_config')
      .select('access_token')
      .eq('user_id', ownerId)
      .eq('is_active', true)
      .maybeSingle();
    return data?.access_token ?? null;
  };
}
