import { createClient } from '@supabase/supabase-js';
import { validatePublicSupabaseConfig } from '../lib/supabaseConfig.js';

// Injected after build-time validation of the approved public key binding.
const config = validatePublicSupabaseConfig(
  typeof __TERA_SUPABASE_CONFIG__ === 'undefined' ? null : __TERA_SUPABASE_CONFIG__
);
export const supabase = createClient(config.url, config.publicKey);

