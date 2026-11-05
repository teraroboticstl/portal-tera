import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import * as crypto from 'node:crypto';
import { digest, seal, encryptionKey } from '../api/_lib/googleOAuthSecurity.js';

const read = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
async function loadStore(db) {
  const context = vm.createContext({ Buffer, URL, process: { env: {} } });
  const source = new vm.SourceTextModule(await read('api/_lib/googleOAuthStore.js'), { context });
  const security = new vm.SourceTextModule(await read('api/_lib/googleOAuthSecurity.js'), { context });
  const service = new vm.SyntheticModule(['supabaseServer'], function() { this.setExport('supabaseServer', db); }, { context });
  const cryptography = new vm.SyntheticModule(Object.keys(crypto), function() {
    for (const [key, value] of Object.entries(crypto)) this.setExport(key, value);
  }, { context });
  await source.link(async name => {
    if (name === './supabaseServer.js') return service;
    if (name === './googleOAuthSecurity.js') {
      await security.link(() => cryptography);
      return security;
    }
    throw new Error('Unexpected import');
  });
  await source.evaluate();
  return source.namespace;
}

test('real store uses durable atomic consume RPC and stores only supplied encrypted fields', async () => {
  const calls = [];
  const db = { from(table) { return { async insert(data) { calls.push({ table, data }); return { data: null }; },
    async upsert(data) { calls.push({ table, data }); return { data: null }; } }; },
    async rpc(name, data) { calls.push({ name, data }); return { data: { user_id: 'synthetic-admin' } }; } };
  const { googleOAuthStore } = await loadStore(db);
  await googleOAuthStore.saveFlow({ state_hash: 'hash', sealed_session: 'encrypted' });
  await googleOAuthStore.saveToken({ id: 'institutional', sealed_token: 'encrypted' });
  assert.equal((await googleOAuthStore.consumeFlow('statehash', 'browserhash')).user_id, 'synthetic-admin');
  assert.equal(calls[0].table, 'google_oauth_flows');
  assert.equal(calls[1].table, 'google_oauth_credentials');
  assert.equal(calls[2].name, 'google_oauth_consume');
  assert.equal(calls[2].data.p_browser_hash, 'browserhash');
});

test('real token reader preserves legacy server env and decrypts protected token; errors fail closed', async () => {
  let row = null, error = null, reads = 0;
  const db = { from() { reads++; return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: row, error }; } }; } };
  const { getStoredGoogleRefreshToken } = await loadStore(db);
  assert.equal(await getStoredGoogleRefreshToken({ GOOGLE_REFRESH_TOKEN: 'synthetic-legacy' }), 'synthetic-legacy');
  assert.equal(reads, 0);
  const env = { GOOGLE_CLIENT_ID: 'test-id', GOOGLE_OAUTH_ENCRYPTION_KEY: '03'.repeat(32), SUPABASE_SERVICE_ROLE_KEY: 'synthetic-role', GOOGLE_REFRESH_TOKEN: 'synthetic-legacy' };
  assert.equal(await getStoredGoogleRefreshToken(env), 'synthetic-legacy');
  const hash = digest(env.GOOGLE_CLIENT_ID);
  row = { client_hash: hash, sealed_token: seal('synthetic-new', encryptionKey(env.GOOGLE_OAUTH_ENCRYPTION_KEY), `refresh:${hash}`) };
  assert.equal(await getStoredGoogleRefreshToken(env), 'synthetic-new');
  row.client_hash = 'different-client';
  await assert.rejects(getStoredGoogleRefreshToken(env), /configuração segura/);
  error = { message: 'sensitive-error-do-not-expose' };
  await assert.rejects(getStoredGoogleRefreshToken(env), e => !e.message.includes(error.message));
});

test('SQL and Drive consumer checks are static, not live authorization or database execution', async () => {
  const sql = await read('supabase/migrations/20261013_google_oauth_protected_storage.sql');
  assert.match(sql, /DELETE FROM public.google_oauth_flows WHERE state_hash=p_state_hash AND browser_hash=p_browser_hash\s+RETURNING \* INTO consumed/);
  assert.match(sql, /consumed.expires_at <= now\(\)/);
  assert.match(sql, /REVOKE ALL ON TABLE .* FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public.google_oauth_consume\(text,text\) FROM PUBLIC, anon, authenticated/);
  assert.equal((sql.match(/ENABLE ROW LEVEL SECURITY/g) || []).length, 2);
  for (const file of ['api/media/[id].js', 'api/fll/[action].js']) {
    const source = await read(file);
    assert.doesNotMatch(source, /drive\s*=\s*getGoogleDriveClient\(/);
    assert.match(source, /drive\s*=\s*await getGoogleDriveClient\(/);
  }
  assert.doesNotMatch(await read('api/auth/google/[action].js'), /console\.|refreshToken|clipboard/);
});
