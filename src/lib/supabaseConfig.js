// Pure configuration checks: no SDK, network or environment reads at module scope.
export const PRODUCTION_PROJECT_REF = 'dqmagpxjsdelpwuofxzz';
const reject = () => { throw Object.assign(new Error('SUPABASE_CONFIGURATION_INVALID'), { code: 'SUPABASE_CONFIGURATION_INVALID' }); };
const value = input => typeof input === 'string' ? input.trim() : '';

export function deploymentEnvironment(env) {
  const platform = value(env.VERCEL_ENV);
  const declared = value(env.PORTAL_ENV);
  if (env.VERCEL && !platform) reject();
  if (platform && declared && platform !== declared) reject();
  const mode = platform || declared;
  if (!['production', 'preview', 'development'].includes(mode)) reject();
  return mode;
}

export function validatePublicSupabaseConfig(config) {
  if (!config || !['production', 'preview', 'development'].includes(config.environment)) reject();
  const { environment, projectRef } = config;
  if (!/^[a-z0-9]{20}$/.test(projectRef || '')) reject();
  if (environment === 'production' && projectRef !== PRODUCTION_PROJECT_REF) reject();
  let url;
  try { url = new URL(config.url); } catch { reject(); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port
    || url.hostname !== `${projectRef}.supabase.co` || url.pathname !== '/' || url.search || url.hash) reject();
  validateSupabaseKey(config.publicKey, 'anon', projectRef);
  return { environment, projectRef, url: url.origin, publicKey: config.publicKey };
}

export function validateSupabaseKey(key, role, projectRef) {
  if (typeof key !== 'string' || key !== key.trim()) reject();
  const prefix = role === 'anon' ? 'sb_publishable_' : 'sb_secret_';
  if (key.startsWith(prefix) && /^[A-Za-z0-9_-]{20,}$/.test(key.slice(prefix.length))) return;
  // Decoding checks consistency, not signatures. A separately configured test
  // project also requires independently approved SHA-256 bindings.
  try {
    if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) reject();
    const part = key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(part));
    if (claims.role !== role || claims.ref !== projectRef) reject();
  } catch { reject(); }
}

function binding(key, approved, sha256) {
  if (!/^[a-f0-9]{64}$/.test(value(approved)) || typeof sha256 !== 'function'
    || sha256(key) !== approved) reject();
}

export function resolveSupabaseConfig(env, sha256, { server = false } = {}) {
  const environment = deploymentEnvironment(env);
  // The existing Portal Tera project is the default identity, NOT a URL/key
  // fallback. Credentials and URL must still be explicitly configured.
  // Preview sharing this project is not an isolated database or read-only mode.
  const projectRef = environment === 'production' ? PRODUCTION_PROJECT_REF
    : value(env.PREVIEW_SUPABASE_PROJECT_REF) || PRODUCTION_PROJECT_REF;
  const isolated = projectRef !== PRODUCTION_PROJECT_REF;
  const frontendUrl = value(env.VITE_SUPABASE_URL);
  const backendUrl = value(env.SUPABASE_URL);
  const frontendKey = value(env.VITE_SUPABASE_ANON_KEY);
  const backendKey = value(env.SUPABASE_ANON_KEY);
  const publicConfig = validatePublicSupabaseConfig({ environment, projectRef,
    url: server ? backendUrl || frontendUrl : frontendUrl,
    publicKey: server ? backendKey || frontendKey : frontendKey });
  for (const candidate of [frontendUrl, backendUrl].filter(Boolean)) {
    const checked = validatePublicSupabaseConfig({ ...publicConfig, url: candidate });
    if (checked.url !== publicConfig.url) reject();
  }
  // The existing project can issue both legacy anon JWTs and publishable keys.
  // Validate each configured public key; textual equality is not project identity.
  if (frontendKey) validateSupabaseKey(frontendKey, 'anon', projectRef);
  if (backendKey) validateSupabaseKey(backendKey, 'anon', projectRef);
  // An isolated test project still uses its independently approved key binding.
  if (isolated && frontendKey && backendKey && frontendKey !== backendKey) reject();
  if (isolated) binding(publicConfig.publicKey, env.PREVIEW_SUPABASE_PUBLIC_KEY_SHA256, sha256);
  const serviceKey = server ? value(env.SUPABASE_SERVICE_ROLE_KEY) : '';
  if (serviceKey) {
    validateSupabaseKey(serviceKey, 'service_role', projectRef);
    if (isolated) binding(serviceKey, env.PREVIEW_SUPABASE_SERVICE_KEY_SHA256, sha256);
  }
  // Only publicConfig may be included in the browser bundle.
  return { publicConfig, serverKey: serviceKey || publicConfig.publicKey };
}
