import {pathToFileURL} from 'node:url';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

test('OAuth isolated PostgreSQL: server-only tables/RPC, atomic one-use consumption, expiration and non-destructive disable',{skip:!process.env.PDI_TEST_PGLITE_MODULE},async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.PDI_TEST_PGLITE_MODULE).href);const db=new PGlite();
 const migration=await readFile(new URL('../supabase/migrations/20261013_google_oauth_protected_storage.sql',import.meta.url),'utf8');
 try {
  await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); INSERT INTO auth.users VALUES ('11111111-1111-4111-8111-111111111111'); GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;");
  await db.exec(migration);
  for(const role of ['anon','authenticated']) {
   await db.exec(`SET ROLE ${role}`);
   for(const table of ['google_oauth_flows','google_oauth_credentials'])await assert.rejects(db.query(`SELECT * FROM public.${table}`),/permission denied/);
   await assert.rejects(db.query("SELECT public.google_oauth_consume('x','y')"),/permission denied/);
   await db.exec('RESET ROLE');
  }
  await db.exec('SET ROLE service_role');
  const state='a'.repeat(64),browser='b'.repeat(64),owner='11111111-1111-4111-8111-111111111111';
  await db.query("INSERT INTO google_oauth_flows(state_hash,browser_hash,user_id,sealed_session,expires_at) VALUES($1,$2,$3,'encrypted-fixture',now()+interval '1 minute')",[state,browser,owner]);
  assert.equal((await db.query('SELECT google_oauth_consume($1,$2) AS result',[state,'c'.repeat(64)])).rows[0].result,null);
  const attempts=await Promise.all([db.query('SELECT google_oauth_consume($1,$2) AS result',[state,browser]),db.query('SELECT google_oauth_consume($1,$2) AS result',[state,browser])]);
  assert.equal(attempts.filter(r=>r.rows[0].result!==null).length,1);
  await db.query("INSERT INTO google_oauth_flows(state_hash,browser_hash,user_id,sealed_session,expires_at) VALUES($1,$2,$3,'encrypted-fixture',now()-interval '1 minute')",[state,browser,owner]);
  assert.equal((await db.query('SELECT google_oauth_consume($1,$2) AS result',[state,browser])).rows[0].result,null);
  await db.query("INSERT INTO google_oauth_credentials(id,client_hash,sealed_token,updated_by) VALUES('institutional','client-fixture','encrypted-fixture',$1)",[owner]);
  await db.exec('RESET ROLE');
  await db.exec(await readFile(new URL('../supabase/rollbacks/20261105_google_oauth_disable.sql',import.meta.url),'utf8'));
  assert.equal((await db.query('SELECT count(*)::int AS n FROM google_oauth_credentials')).rows[0].n,1);
  await db.exec('SET ROLE service_role');await assert.rejects(db.query('SELECT * FROM google_oauth_credentials'),/permission denied/);
 } finally {await db.close();}
});
