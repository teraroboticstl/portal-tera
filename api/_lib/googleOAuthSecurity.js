import { randomBytes, createHash, createCipheriv, createDecipheriv } from 'node:crypto';

export const FLOW_TTL_MS = 5 * 60 * 1000;
const COOKIE = 'tera_drive_oauth';
export const digest = value => createHash('sha256').update(value).digest('hex');

export function encryptionKey(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/i.test(value)) throw new Error('OAUTH_STORAGE_UNAVAILABLE');
  return Buffer.from(value, 'hex');
}

export function seal(value, key, purpose) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(purpose));
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(v => v.toString('base64url')).join('.');
}

export function unseal(value, key, purpose) {
  const parts = value.split('.');
  if (parts.length !== 3) throw new Error('OAUTH_STORAGE_UNAVAILABLE');
  const [iv, tag, data] = parts.map(v => Buffer.from(v, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(Buffer.from(purpose));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function page(res, status, message) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(status).send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Google Drive — Portal Tera</title></head><body><h1>Google Drive</h1><p>${escapeHtml(message)}</p><a href="/">Voltar ao portal</a></body></html>`);
}

function parameter(req, name) {
  const url = new URL(req.url || '/', 'https://local.invalid');
  if (url.searchParams.getAll(name).length > 1) return null;
  const value = req.query?.[name] ?? url.searchParams.get(name);
  return typeof value === 'string' ? value : null;
}

function cookie(req) {
  const values = (req.headers?.cookie || '').split(';').map(v => v.trim()).filter(v => v.startsWith(`${COOKIE}=`));
  return values.length === 1 ? values[0].slice(COOKIE.length + 1) : '';
}

function setCookie(res, value, secure, age) {
  res.setHeader('Set-Cookie', `${COOKIE}=${value}; Path=/api/auth/google; HttpOnly; SameSite=Lax; Max-Age=${age}${secure ? '; Secure' : ''}`);
}

// Dependencies are injected for offline tests; production uses a durable, server-only store.
export function createGoogleOAuthHandler({ env, validateAuth, makeOAuth, store, now = Date.now }) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
    if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
    const action = parameter(req, 'action') || (req.url || '').split('?')[0].split('/').pop();
    if (!['url', 'callback'].includes(action)) return res.status(404).json({ error: 'Rota não encontrada.' });

    let redirect, key;
    try {
      redirect = new URL(env.GOOGLE_REDIRECT_URI);
      const local = env.NODE_ENV !== 'production' && !env.VERCEL && ['localhost', '127.0.0.1'].includes(redirect.hostname);
      if ((!local && redirect.protocol !== 'https:') || !['http:', 'https:'].includes(redirect.protocol)
        || redirect.username || redirect.password || redirect.search || redirect.hash
        || redirect.pathname !== '/api/auth/google/callback'
        || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error();
      key = encryptionKey(env.GOOGLE_OAUTH_ENCRYPTION_KEY);
    } catch {
      return action === 'callback' ? page(res, 503, 'Configuração segura do OAuth indisponível. Contate a administração.')
        : res.status(503).json({ error: 'Configure o armazenamento protegido e o endereço de retorno OAuth no servidor.' });
    }
    const secure = redirect.protocol === 'https:';
    const context = digest(env.GOOGLE_CLIENT_ID);
    if (action === 'url') {
      let user;
      try { user = await validateAuth(req.headers?.authorization); }
      catch { return res.status(401).json({ error: 'Faça login novamente.' }); }
      if (!user?.profile?.is_admin || !user.id) return res.status(403).json({ error: 'Autorização restrita à administração.' });
      if (req.headers?.origin && req.headers.origin !== redirect.origin) return res.status(403).json({ error: 'Origem não autorizada.' });
      if (req.headers?.host !== redirect.host) return res.status(400).json({ error: 'Use o domínio configurado para a integração Google Drive.' });
      const token = req.headers.authorization.replace(/^Bearer\s+/i, '').trim();
      try {
        await store.ready();
        const state = randomBytes(32).toString('base64url');
        const binding = randomBytes(32).toString('base64url');
        await store.saveFlow({ state_hash: digest(state), browser_hash: digest(binding), user_id: user.id,
          sealed_session: seal(token, key, `session:${context}`), expires_at: new Date(now() + FLOW_TTL_MS).toISOString() });
        const oauth = makeOAuth(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, redirect.href);
        const authUrl = oauth.generateAuthUrl({ access_type: 'offline', prompt: 'consent', state,
          scope: ['https://www.googleapis.com/auth/drive.file'] });
        setCookie(res, binding, secure, FLOW_TTL_MS / 1000);
        return res.status(200).json({ authUrl, redirectUri: redirect.href });
      } catch { return res.status(503).json({ error: 'Não foi possível iniciar a autorização segura. Contate a administração.' }); }
    }

    const state = parameter(req, 'state'), binding = cookie(req);
    if (!state || !/^[A-Za-z0-9_-]{43}$/.test(state) || !/^[A-Za-z0-9_-]{43}$/.test(binding)) {
      return page(res, 400, 'Fluxo OAuth ausente ou inválido. Inicie novamente pelo portal.');
    }
    let flow;
    try { flow = await store.consumeFlow(digest(state), digest(binding)); }
    catch { return page(res, 503, 'Não foi possível validar o fluxo OAuth. Contate a administração.'); }
    if (!flow || !Number.isFinite(Date.parse(flow.expires_at)) || Date.parse(flow.expires_at) <= now()) {
      return page(res, 400, 'Fluxo OAuth inválido, expirado ou já utilizado. Inicie novamente pelo portal.');
    }
    setCookie(res, '', secure, 0);
    try {
      const user = await validateAuth(unseal(flow.sealed_session, key, `session:${context}`));
      if (!user?.profile?.is_admin || user.id !== flow.user_id) throw new Error();
    } catch { return page(res, 403, 'A sessão administrativa expirou ou perdeu autorização. Inicie novamente pelo portal.'); }
    // Consume state even when Google refuses consent. Never reflect provider-supplied text.
    if (Object.prototype.hasOwnProperty.call(req.query || {}, 'error')
      || new URL(req.url || '/', 'https://local.invalid').searchParams.has('error')) {
      return page(res, 400, 'A autorização foi cancelada ou recusada pelo Google.');
    }
    const code = parameter(req, 'code');
    if (!code || code.length > 4096 || /[\x00-\x20\x7f]/.test(code)) return page(res, 400, 'Código OAuth ausente ou inválido.');
    try {
      const oauth = makeOAuth(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, redirect.href);
      const { tokens } = await oauth.getToken(code);
      if (typeof tokens?.refresh_token !== 'string' || !tokens.refresh_token) {
        return page(res, 409, 'O Google não retornou uma nova credencial offline. A configuração anterior foi preservada. Contate a administração.');
      }
      await store.saveToken({ id: 'institutional', client_hash: context,
        sealed_token: seal(tokens.refresh_token, key, `refresh:${context}`), updated_by: flow.user_id });
      return page(res, 200, 'Autorização concluída. A credencial foi armazenada de forma protegida no servidor. Nenhuma cópia manual é necessária.');
    } catch { return page(res, 502, 'Não foi possível concluir ou armazenar a autorização. A configuração anterior foi preservada.'); }
  };
}
