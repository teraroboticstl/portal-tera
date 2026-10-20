// Import FIRST in legacy regression files that initialize actual SDK clients.
// Explicit synthetic config satisfies the same guard as deployment; no bypass.
import { createHash } from 'node:crypto';
import { serverSupabaseConfig } from '../../api/_lib/supabaseConfig.js';

const ref = 'abcdefghijklmnopqrst';
const key = 'sb_publishable_synthetic_regression_key_1234567890';
Object.assign(process.env, {
  VERCEL: '1', VERCEL_ENV: 'preview', PORTAL_ENV: 'preview',
  PREVIEW_SUPABASE_PROJECT_REF: ref,
  VITE_SUPABASE_URL: `https://${ref}.supabase.co`, SUPABASE_URL: `https://${ref}.supabase.co`,
  VITE_SUPABASE_ANON_KEY: key, SUPABASE_ANON_KEY: key,
  SUPABASE_SERVICE_ROLE_KEY: '', PREVIEW_SUPABASE_SERVICE_KEY_SHA256: '',
  PREVIEW_SUPABASE_PUBLIC_KEY_SHA256: createHash('sha256').update(key).digest('hex'),
  GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', GOOGLE_REFRESH_TOKEN: '',
  GOOGLE_OAUTH_ENCRYPTION_KEY: '', GOOGLE_REDIRECT_URI: '', GOOGLE_DRIVE_ROOT_FOLDER_ID: ''
});
globalThis.__TERA_SUPABASE_CONFIG__ = serverSupabaseConfig(process.env).publicConfig;
globalThis.fetch = async () => { throw new Error('NETWORK_FORBIDDEN_IN_REGRESSION_TEST'); };
