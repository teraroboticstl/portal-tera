import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleOAuthHandler, seal, unseal, encryptionKey, FLOW_TTL_MS, digest } from '../api/_lib/googleOAuthSecurity.js';

const fakeKey = '01'.repeat(32); // Synthetic test material, never a production credential.
const fakeToken = 'test-only-offline-credential';
function fixture() {
  const env = { GOOGLE_CLIENT_ID: 'test-client', GOOGLE_CLIENT_SECRET: 'test-secret', GOOGLE_REDIRECT_URI: 'https://portal.test/api/auth/google/callback',
    GOOGLE_OAUTH_ENCRYPTION_KEY: fakeKey, SUPABASE_SERVICE_ROLE_KEY: 'test-service', NODE_ENV: 'production' };
  const flows = new Map(), saved = [], generated = [];
  let clock = 1000000, exchanges = 0, failExchange = false, failStorage = false, failAuth = false, role = true, missingRefresh = false;
  const store = {
    async ready() { if (failStorage) throw new Error(fakeToken); },
    async saveFlow(flow) { flows.set(flow.state_hash, flow); },
    async consumeFlow(hash, browserHash) {
      const flow = flows.get(hash);
      if (!flow || flow.browser_hash !== browserHash) return null;
      flows.delete(hash); // Atomic synchronous removal before resolving; mirrors SQL consume.
      return flow;
    },
    async saveToken(token) { if (failStorage) throw new Error(fakeToken); saved.push(token); },
  };
  const handler = createGoogleOAuthHandler({ env, store, now: () => clock,
    validateAuth: async () => { if (failAuth) throw new Error(fakeToken); return { id: 'admin-id', profile: { is_admin: role } }; },
    makeOAuth: () => ({ generateAuthUrl(options) { generated.push(options); return `https://accounts.google.com/consent?state=${options.state}`; },
      async getToken() { exchanges++; if (failExchange) throw new Error(`<script>${fakeToken}</script>`); return { tokens: missingRefresh ? {} : { refresh_token: fakeToken } }; } }),
  });
  async function request(action, query = {}, headers = {}) {
    const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.statusCode = n; return this; },
      json(data) { this.body = JSON.stringify(data); return this; }, send(data) { this.body = data; return this; } };
    await handler({ method: 'GET', url: `/api/auth/google/${action}`, query: { action, ...query }, headers: { host: 'portal.test', ...headers } }, res);
    assert.ok(!JSON.stringify(res).includes(fakeToken), 'No refresh token may escape in body or headers');
    assert.equal(res.headers['Cache-Control'], 'no-store');
    return res;
  }
  async function start() {
    const res = await request('url', {}, { authorization: 'Bearer test-session' });
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['Set-Cookie'], /HttpOnly; SameSite=Lax; Max-Age=300; Secure/);
    const state = new URL(JSON.parse(res.body).authUrl).searchParams.get('state');
    return { state, cookie: res.headers['Set-Cookie'].split(';')[0] };
  }
  return { env, flows, saved, generated, request, start, advance: () => { clock += FLOW_TTL_MS + 1; },
    exchanges: () => exchanges, failExchange: () => { failExchange = true; }, failStorage: () => { failStorage = true; },
    failAuth: () => { failAuth = true; }, denyRole: () => { role = false; }, missingRefresh: () => { missingRefresh = true; } };
}

test('missing, malformed and forged state never exchange a code', async () => {
  const f = fixture(); const flow = await f.start();
  for (const state of [undefined, 'bad', 'A'.repeat(43), ['duplicate', 'state']]) {
    assert.equal((await f.request('callback', { state, code: 'valid-code' }, { cookie: flow.cookie })).statusCode, 400);
  }
  assert.equal(f.exchanges(), 0);
});
test('browser binding, expiration and replay fail closed', async () => {
  const f = fixture(); const flow = await f.start();
  assert.equal((await f.request('callback', { state: flow.state, code: 'code' })).statusCode, 400);
  assert.equal((await f.request('callback', { state: flow.state, code: 'code' }, { cookie: `tera_drive_oauth=${'B'.repeat(43)}` })).statusCode, 400);
  f.advance();
  assert.equal((await f.request('callback', { state: flow.state, code: 'code' }, { cookie: flow.cookie })).statusCode, 400);
  assert.equal(f.exchanges(), 0);
});
test('successful callback persists only encrypted credential, never HTML/JS/URL token; replay denied', async () => {
  const f = fixture(); const flow = await f.start();
  const res = await f.request('callback', { state: flow.state, code: 'code' }, { cookie: flow.cookie });
  assert.equal(res.statusCode, 200); assert.equal(f.saved.length, 1);
  assert.ok(!JSON.stringify([...f.flows.values(), ...f.saved]).includes(fakeToken));
  assert.equal(unseal(f.saved[0].sealed_token, encryptionKey(fakeKey), `refresh:${digest('test-client')}`), fakeToken);
  assert.doesNotMatch(res.body, /<script|onclick|clipboard|test-session/i);
  assert.equal((await f.request('callback', { state: flow.state, code: 'code' }, { cookie: flow.cookie })).statusCode, 400);
  assert.equal(f.exchanges(), 1);
});
test('concurrent duplicate callbacks exchange at most once', async () => {
  const f = fixture(); const flow = await f.start();
  const responses = await Promise.all([1, 2].map(() => f.request('callback', { state: flow.state, code: 'code' }, { cookie: flow.cookie })));
  assert.deepEqual(responses.map(r => r.statusCode).sort(), [200, 400]); assert.equal(f.exchanges(), 1);
});
test('OAuth refusal is sanitized and consumes state', async () => {
  const f = fixture(); const flow = await f.start();
  const res = await f.request('callback', { state: flow.state, error: `<script>${fakeToken}</script>` }, { cookie: flow.cookie });
  assert.equal(res.statusCode, 400); assert.doesNotMatch(res.body, /<script/);
  assert.equal((await f.request('callback', { state: flow.state, code: 'code' }, { cookie: flow.cookie })).statusCode, 400);
  assert.equal(f.exchanges(), 0);
});
test('exchange and storage errors return generic messages and consume state', async () => {
  for (const failure of ['failExchange', 'failStorage']) {
    const f = fixture(); const flow = await f.start(); f[failure]();
    assert.equal((await f.request('callback', { state: flow.state, code: 'code' }, { cookie: flow.cookie })).statusCode, 502);
    assert.equal(f.saved.length, 0);
    assert.equal((await f.request('callback', { state: flow.state, code: 'code' }, { cookie: flow.cookie })).statusCode, 400);
  }
});
test('administrative session is revalidated, non-admin and auth failure cannot initiate', async () => {
  for (const failure of ['failAuth', 'denyRole']) {
    const f = fixture(); f[failure]();
    assert.equal((await f.request('url', {}, { authorization: 'Bearer test-session' })).statusCode, failure === 'failAuth' ? 401 : 403);
    assert.equal(f.flows.size, 0);
    const g = fixture(); const flow = await g.start(); g[failure]();
    assert.equal((await g.request('callback', { state: flow.state, code: 'code' }, { cookie: flow.cookie })).statusCode, 403);
    assert.equal(g.exchanges(), 0);
  }
});
test('unconfigured storage or redirect refuses initiation; host and origin cannot override redirect', async () => {
  for (const name of ['GOOGLE_OAUTH_ENCRYPTION_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'GOOGLE_REDIRECT_URI']) {
    const f = fixture(); delete f.env[name]; assert.equal((await f.request('url')).statusCode, 503);
  }
  const f = fixture(); f.failStorage(); assert.equal((await f.request('url', {}, { authorization: 'Bearer test-session' })).statusCode, 503);
  const g = fixture();
  assert.equal((await g.request('url', {}, { authorization: 'Bearer test-session', host: 'attacker.test' })).statusCode, 400);
  assert.equal((await g.request('url', {}, { authorization: 'Bearer test-session', origin: 'https://attacker.test' })).statusCode, 403);
});
test('missing refresh token and missing code preserve previous storage', async () => {
  const f = fixture(); const flow = await f.start(); f.missingRefresh();
  assert.equal((await f.request('callback', { state: flow.state, code: 'code' }, { cookie: flow.cookie })).statusCode, 409);
  assert.equal(f.saved.length, 0);
  const g = fixture(); const other = await g.start();
  assert.equal((await g.request('callback', { state: other.state }, { cookie: other.cookie })).statusCode, 400);
  assert.equal(g.exchanges(), 0);
});
test('authenticated encryption rejects tampering, wrong key and cross-purpose ciphertext', () => {
  const key = encryptionKey(fakeKey), value = seal('synthetic-value', key, 'session:test');
  assert.equal(unseal(value, key, 'session:test'), 'synthetic-value');
  assert.throws(() => unseal(value, key, 'refresh:test'));
  assert.throws(() => unseal(value, encryptionKey('02'.repeat(32)), 'session:test'));
  assert.throws(() => unseal(`X${value}`, key, 'session:test'));
});
