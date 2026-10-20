import { createHash } from 'node:crypto';
import { resolveSupabaseConfig } from '../../src/lib/supabaseConfig.js';

export const sha256 = key => createHash('sha256').update(key).digest('hex');
export const serverSupabaseConfig = env => resolveSupabaseConfig(env, sha256, { server: true });
