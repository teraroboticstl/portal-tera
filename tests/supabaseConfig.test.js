import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import * as nodePath from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { PRODUCTION_PROJECT_REF, deploymentEnvironment, resolveSupabaseConfig, validatePublicSupabaseConfig } from '../src/lib/supabaseConfig.js';
import { serverSupabaseConfig, sha256 } from '../api/_lib/supabaseConfig.js';

const ref = 'abcdefghijklmnopqrst';
const publicKey = 'sb_publishable_' + 'synthetic_public_key_1234567890';
const serviceKey = 'sb_secret_' + 'synthetic_service_key_1234567890';
const fixture = () => ({ VERCEL: '1', VERCEL_ENV: 'preview', PORTAL_ENV: 'preview',
  PREVIEW_SUPABASE_PROJECT_REF: ref, VITE_SUPABASE_URL: `https://${ref}.supabase.co`,
  VITE_SUPABASE_ANON_KEY: publicKey, SUPABASE_URL: `https://${ref}.supabase.co`,
  SUPABASE_ANON_KEY: publicKey, SUPABASE_SERVICE_ROLE_KEY: serviceKey,
  PREVIEW_SUPABASE_PUBLIC_KEY_SHA256: sha256(publicKey),
  PREVIEW_SUPABASE_SERVICE_KEY_SHA256: sha256(serviceKey) });
const invalid = error => error.code === 'SUPABASE_CONFIGURATION_INVALID'
  && error.message === 'SUPABASE_CONFIGURATION_INVALID';
const read = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const jwt = (projectRef, role) => ['synthetic', Buffer.from(JSON.stringify({ ref: projectRef, role })).toString('base64url'), 'synthetic'].join('.');

test('missing and inconsistent environment/configuration fail closed', () => {
  for (const env of [{}, { NODE_ENV: 'production' }, { VERCEL: '1', PORTAL_ENV: 'production' },
    { ...fixture(), PORTAL_ENV: 'production' }, { ...fixture(), VERCEL_ENV: 'other' }]) {
    assert.throws(() => serverSupabaseConfig(env), invalid);
  }
  for (const field of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'PREVIEW_SUPABASE_PROJECT_REF', 'PREVIEW_SUPABASE_PUBLIC_KEY_SHA256']) {
    assert.throws(() => resolveSupabaseConfig({ ...fixture(), [field]: '' }, sha256), invalid);
  }
  assert.equal(deploymentEnvironment({ PORTAL_ENV: 'development' }), 'development');
});

test('an explicitly selected isolated project rejects mixed production URLs', () => {
  for (const mode of ['preview', 'development']) {
    const env = { ...fixture(), VERCEL_ENV: mode, PORTAL_ENV: mode };
    for (const patch of [{ SUPABASE_URL: `https://${PRODUCTION_PROJECT_REF}.supabase.co` },
      { VITE_SUPABASE_URL: `https://${PRODUCTION_PROJECT_REF}.supabase.co` }]) {
      assert.throws(() => serverSupabaseConfig({ ...env, ...patch }), invalid);
    }
  }
});

test('exact HTTPS host validation rejects URL tricks, proxies, paths and malformed input', () => {
  for (const url of ['', 'garbage', `http://${ref}.supabase.co`, `https://${ref}.supabase.co.evil.test`,
    `https://user:pass@${ref}.supabase.co`, `https://${ref}.supabase.co/path`,
    `https://${ref}.supabase.co?project=other`, `https://${ref}.supabase.co#other`,
    `https://${ref}.supabase.co:8443`, 'https://proxy.example.test']) {
    assert.throws(() => validatePublicSupabaseConfig({ environment: 'preview', projectRef: ref, url, publicKey }), invalid);
  }
});

test('opaque and JWT keys require independent bindings and compatible roles', () => {
  for (const patch of [{ PREVIEW_SUPABASE_PUBLIC_KEY_SHA256: 'a'.repeat(64) },
    { SUPABASE_SERVICE_ROLE_KEY: serviceKey + 'changed' }, { PREVIEW_SUPABASE_SERVICE_KEY_SHA256: '' },
    { SUPABASE_ANON_KEY: publicKey + 'changed' },
    { VITE_SUPABASE_ANON_KEY: serviceKey, SUPABASE_ANON_KEY: serviceKey, PREVIEW_SUPABASE_PUBLIC_KEY_SHA256: sha256(serviceKey) }]) {
    assert.throws(() => serverSupabaseConfig({ ...fixture(), ...patch }), invalid);
  }
  const key = jwt(ref, 'anon');
  assert.equal(serverSupabaseConfig({ ...fixture(), VITE_SUPABASE_ANON_KEY: key, SUPABASE_ANON_KEY: key,
    PREVIEW_SUPABASE_PUBLIC_KEY_SHA256: sha256(key) }).publicConfig.publicKey, key);
  for (const key of [jwt(PRODUCTION_PROJECT_REF, 'anon'), jwt(ref, 'service_role'), 'invalid.key.value']) {
    assert.throws(() => serverSupabaseConfig({ ...fixture(), VITE_SUPABASE_ANON_KEY: key, SUPABASE_ANON_KEY: key,
      PREVIEW_SUPABASE_PUBLIC_KEY_SHA256: sha256(key) }), invalid);
  }
});

test('valid Preview retains server service key without exposing it in public config', () => {
  const result = serverSupabaseConfig(fixture());
  assert.equal(result.serverKey, serviceKey);
  assert.deepEqual(Object.keys(result.publicConfig).sort(), ['environment', 'projectRef', 'publicKey', 'url']);
  assert.ok(!JSON.stringify(result.publicConfig).includes(serviceKey));
  const env = fixture(); delete env.SUPABASE_SERVICE_ROLE_KEY;
  assert.equal(serverSupabaseConfig(env).serverKey, publicKey); // no privilege elevation
});

test('explicit valid production config preserves target without Preview-only variables', () => {
  const env = { VERCEL: '1', VERCEL_ENV: 'production', VITE_SUPABASE_URL: `https://${PRODUCTION_PROJECT_REF}.supabase.co`,
    VITE_SUPABASE_ANON_KEY: publicKey, SUPABASE_SERVICE_ROLE_KEY: serviceKey };
  const result = serverSupabaseConfig(env);
  assert.equal(result.publicConfig.projectRef, PRODUCTION_PROJECT_REF);
  assert.equal(result.serverKey, serviceKey);
  assert.throws(() => serverSupabaseConfig({ VERCEL: '1', VERCEL_ENV: 'production' }), invalid);
});

test('existing project supports distinct public and legacy anon keys with individual role/ref checks', () => {
  const legacy = jwt(PRODUCTION_PROJECT_REF, 'anon');
  for (const environment of ['production', 'preview', 'development']) {
    for (const [frontend, backend] of [[publicKey, legacy], [legacy, publicKey]]) {
      const env = { VERCEL: '1', VERCEL_ENV: environment,
        VITE_SUPABASE_URL: `https://${PRODUCTION_PROJECT_REF}.supabase.co`,
        SUPABASE_URL: `https://${PRODUCTION_PROJECT_REF}.supabase.co`,
        VITE_SUPABASE_ANON_KEY: frontend, SUPABASE_ANON_KEY: backend };
      assert.equal(resolveSupabaseConfig(env, sha256).publicConfig.publicKey, frontend);
      assert.equal(serverSupabaseConfig(env).publicConfig.publicKey, backend);
      assert.equal(serverSupabaseConfig(env).serverKey, backend);
      for (const bad of [jwt(ref, 'anon'), jwt(PRODUCTION_PROJECT_REF, 'service_role'), serviceKey, 'invalid.key.value']) {
        assert.throws(() => resolveSupabaseConfig({ ...env, SUPABASE_ANON_KEY: bad }, sha256), invalid);
        assert.throws(() => serverSupabaseConfig({ ...env, VITE_SUPABASE_ANON_KEY: bad }), invalid);
      }
    }
  }
});

test('Preview supports the existing Portal Tera project with current public variables only', () => {
  const env = { VERCEL: '1', VERCEL_ENV: 'preview',
    VITE_SUPABASE_URL: `https://${PRODUCTION_PROJECT_REF}.supabase.co`, VITE_SUPABASE_ANON_KEY: publicKey };
  for (const environment of ['preview', 'development', 'production']) {
    const result = serverSupabaseConfig({ ...env, VERCEL_ENV: environment });
    assert.equal(result.publicConfig.projectRef, PRODUCTION_PROJECT_REF);
    assert.equal(result.publicConfig.environment, environment);
    assert.equal(result.serverKey, publicKey);
  }
  assert.throws(() => serverSupabaseConfig({ VERCEL: '1', VERCEL_ENV: 'preview' }), invalid);
  assert.throws(() => serverSupabaseConfig({ ...env, SUPABASE_URL: `https://${ref}.supabase.co` }), invalid);
});

async function loadClient(file, env, publicConfig) {
  let calls = 0;
  const context = vm.createContext({ URL, atob, process: { env },
    ...(publicConfig ? { __TERA_SUPABASE_CONFIG__: publicConfig } : {}),
    fetch() { throw new Error('Network forbidden'); } });
  const common = new vm.SourceTextModule(await read('src/lib/supabaseConfig.js'), { context });
  await common.link(() => { throw new Error('Unexpected import'); });
  const sdk = new vm.SyntheticModule(['createClient'], function () {
    this.setExport('createClient', (...args) => { calls++; return { args }; });
  }, { context });
  const wrapper = new vm.SyntheticModule(['serverSupabaseConfig'], function () {
    this.setExport('serverSupabaseConfig', serverSupabaseConfig);
  }, { context });
  const target = new vm.SourceTextModule(await read(file), { context });
  await target.link(name => name === '@supabase/supabase-js' ? sdk
    : name.endsWith('/lib/supabaseConfig.js') ? common
      : name === './supabaseConfig.js' ? wrapper : Promise.reject(new Error('Unexpected import')));
  let error; try { await target.evaluate(); } catch (failure) { error = failure; }
  return { target, calls, error };
}

test('real frontend module never creates a client for missing or mismatched config', async () => {
  for (const config of [undefined, { environment: 'preview', projectRef: PRODUCTION_PROJECT_REF,
    url: `https://${ref}.supabase.co`, publicKey }]) {
    const result = await loadClient('src/api/supabaseClient.js', {}, config);
    assert.ok(invalid(result.error)); assert.equal(result.calls, 0);
  }
  const result = await loadClient('src/api/supabaseClient.js', {}, serverSupabaseConfig(fixture()).publicConfig);
  assert.equal(result.error, undefined); assert.equal(result.calls, 1);
  const shared = await loadClient('src/api/supabaseClient.js', {}, {
    environment: 'preview', projectRef: PRODUCTION_PROJECT_REF,
    url: `https://${PRODUCTION_PROJECT_REF}.supabase.co`, publicKey });
  assert.equal(shared.error, undefined); assert.equal(shared.calls, 1);
});

test('real server module validates before SDK use and keeps scoped bearer authorization', async () => {
  const invalidResult = await loadClient('api/_lib/supabaseServer.js', {});
  assert.ok(invalid(invalidResult.error)); assert.equal(invalidResult.calls, 0);
  const valid = await loadClient('api/_lib/supabaseServer.js', fixture());
  assert.equal(valid.error, undefined); assert.equal(valid.calls, 1);
  const scoped = valid.target.namespace.createScopedUserSupabaseClient('synthetic-session');
  assert.equal(scoped.args[0], `https://${ref}.supabase.co`);
  assert.equal(scoped.args[2].global.headers.Authorization, 'Bearer synthetic-session');
});

test('real Vite config checks bindings at build time and defines ONLY public configuration', async () => {
  async function configFor(env, platform = 'linux', nativeError = null, ordinaryError = null) {
    const context = vm.createContext({ URL, atob, process: { env, platform }, console: { warn() {} } });
    const common = new vm.SourceTextModule(await read('src/lib/supabaseConfig.js'), { context });
    await common.link(() => { throw new Error('Unexpected import'); });
    const exports = {
      vite: { defineConfig: callback => callback, loadEnv: () => ({}) },
      '@vitejs/plugin-react': { default: () => ({ name: 'synthetic-react' }) },
      'node:fs': { default: { realpathSync: Object.assign(() => {
        if (ordinaryError) throw Object.assign(new Error('Synthetic filesystem error'), { code: ordinaryError });
        return '/synthetic/project';
      }, { native() {
        if (nativeError) throw Object.assign(new Error('Synthetic native error'), { code: nativeError });
        return '/synthetic/project';
      } }) } },
      'node:crypto': { createHash }, path: { default: nodePath }, url: { fileURLToPath }
    };
    const target = new vm.SourceTextModule(await read('vite.config.js'), { context,
      initializeImportMeta(meta) { meta.url = new URL('../vite.config.js', import.meta.url).href; } });
    await target.link(name => {
      if (name === './src/lib/supabaseConfig.js') return common;
      if (!exports[name]) throw new Error('Unexpected import');
      return new vm.SyntheticModule(Object.keys(exports[name]), function () {
        for (const [key, value] of Object.entries(exports[name])) this.setExport(key, value);
      }, { context });
    });
    await target.evaluate(); return target.namespace.default({ command: 'build', mode: 'production' });
  }
  const result = await configFor(fixture());
  assert.equal(result.resolve.preserveSymlinks, false);
  assert.equal((await configFor(fixture(), 'win32')).resolve.preserveSymlinks, false);
  assert.equal((await configFor(fixture(), 'win32', 'EPERM')).resolve.preserveSymlinks, true);
  await assert.rejects(configFor(fixture(), 'win32', 'EACCES'), error => error.code === 'EACCES');
  await assert.rejects(configFor(fixture(), 'win32', 'EPERM', 'EACCES'), error => error.code === 'EACCES');
  assert.equal(Object.keys(result.define).length, 1);
  const exposed = JSON.stringify(result.define);
  assert.ok(exposed.includes(publicKey)); assert.ok(!exposed.includes(serviceKey));
  assert.ok(!exposed.includes('PREVIEW_SUPABASE_SERVICE_KEY_SHA256'));
  await assert.rejects(configFor({ ...fixture(), PREVIEW_SUPABASE_PUBLIC_KEY_SHA256: '' }), invalid);
  const shared = await configFor({ VERCEL: '1', VERCEL_ENV: 'preview',
    VITE_SUPABASE_URL: `https://${PRODUCTION_PROJECT_REF}.supabase.co`, VITE_SUPABASE_ANON_KEY: publicKey });
  assert.equal(JSON.parse(shared.define.__TERA_SUPABASE_CONFIG__).projectRef, PRODUCTION_PROJECT_REF);
  const production = await configFor({ VERCEL: '1', VERCEL_ENV: 'production',
    VITE_SUPABASE_URL: `https://${PRODUCTION_PROJECT_REF}.supabase.co`, VITE_SUPABASE_ANON_KEY: publicKey,
    SUPABASE_ANON_KEY: jwt(PRODUCTION_PROJECT_REF, 'anon'), SUPABASE_SERVICE_ROLE_KEY: serviceKey });
  assert.equal(JSON.parse(production.define.__TERA_SUPABASE_CONFIG__).publicKey, publicKey);
  assert.ok(!JSON.stringify(production.define).includes(serviceKey));
  assert.ok(!JSON.stringify(production.define).includes(jwt(PRODUCTION_PROJECT_REF, 'anon')));
});

test('configuration errors never reflect supplied keys or URLs', () => {
  const env = { ...fixture(), SUPABASE_URL: 'https://sensitive.example.test/?token=synthetic-secret' };
  try { serverSupabaseConfig(env); assert.fail('Expected rejection'); } catch (error) {
    assert.ok(invalid(error));
    assert.doesNotMatch(JSON.stringify(error) + error.stack, /synthetic-secret|sensitive\.example|synthetic_public_key/);
  }
});
