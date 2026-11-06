import { supabaseServer } from './supabaseServer.js';
import { digest, encryptionKey, unseal } from './googleOAuthSecurity.js';

const checked = result => { if (result.error) throw new Error('OAUTH_STORAGE_UNAVAILABLE'); return result.data; };
export const googleOAuthStore = {
  async ready() {
    checked(await supabaseServer.from('google_oauth_flows').select('state_hash').limit(1));
    checked(await supabaseServer.from('google_oauth_credentials').select('id').limit(1));
  },
  async saveFlow(flow) { checked(await supabaseServer.from('google_oauth_flows').insert(flow)); },
  async consumeFlow(stateHash, browserHash) {
    return checked(await supabaseServer.rpc('google_oauth_consume', { p_state_hash: stateHash, p_browser_hash: browserHash }));
  },
  async saveToken(token) { checked(await supabaseServer.from('google_oauth_credentials').upsert({ ...token, updated_at: new Date().toISOString() })); },
};

export async function getStoredGoogleRefreshToken(env = process.env) {
  // Existing server environment configuration remains valid until protected storage is enabled.
  if (!env.GOOGLE_OAUTH_ENCRYPTION_KEY) return env.GOOGLE_REFRESH_TOKEN;
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('A configuração segura do Google Drive está indisponível.');
  try {
    const key = encryptionKey(env.GOOGLE_OAUTH_ENCRYPTION_KEY);
    const row = checked(await supabaseServer.from('google_oauth_credentials').select('client_hash,sealed_token').eq('id', 'institutional').maybeSingle());
    if (!row) return env.GOOGLE_REFRESH_TOKEN;
    const context = digest(env.GOOGLE_CLIENT_ID || '');
    if (row.client_hash !== context) throw new Error();
    return unseal(row.sealed_token, key, `refresh:${context}`);
  } catch { throw new Error('A configuração segura do Google Drive está indisponível.'); }
}
