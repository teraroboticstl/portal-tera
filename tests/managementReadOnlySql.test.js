import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const runtime=process.env.PDI_TEST_PGLITE_MODULE;
test('real management migration: private reads, mutation denial, status, legacy roles and lossless rollback',{skip:!runtime},async()=>{
const {PGlite}=await import(pathToFileURL(runtime).href);
const migration=await readFile('supabase/migrations/20261118_management_readonly.sql','utf8');
const rollback=await readFile('supabase/rollbacks/20261118_management_readonly.sql','utf8');
const db=new PGlite();const ids=[1,2,3,4,5,6].map(i=>'70000000-0000-0000-0000-00000000000'+i); const [admin,target,member,other,seed,tech]=ids;
try{
await db.exec(`CREATE ROLE authenticated;CREATE ROLE anon;CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
GRANT USAGE ON SCHEMA auth TO authenticated,anon;
CREATE TABLE profiles(id uuid PRIMARY KEY,email text,role text,member_role text,status text);
INSERT INTO profiles VALUES('${admin}','synthetic-admin@example.invalid','admin','admin','approved'),('${target}','synthetic-manager@example.invalid','aluno','user','pending'),('${member}','synthetic-member@example.invalid','mentor','member','approved'),('${other}','synthetic-other@example.invalid','aluno','user','approved'),('${seed}','teraroboticstl@gmail.com','admin','admin','approved'),('${tech}','synthetic-tech@example.invalid','admin','admin','approved');
CREATE FUNCTION is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$SELECT coalesce((SELECT role='admin' OR member_role='admin' FROM profiles WHERE id=auth.uid()),false)$$;
CREATE TABLE portal_user_access(user_id uuid PRIMARY KEY REFERENCES profiles,access_level text CONSTRAINT portal_user_access_access_level_check CHECK(access_level IN ('public','student','trainee','member','leader')),portal_internal boolean,ava_status text DEFAULT 'pending',ava_admin boolean DEFAULT false,mentor boolean DEFAULT false,updated_at timestamptz DEFAULT now(),allowed_modalities text[] DEFAULT '{}',team_name text,city text);
INSERT INTO portal_user_access(user_id,access_level) VALUES('${admin}','leader'),('${member}','member'),('${other}','trainee'),('${seed}','leader'),('${tech}','leader');
CREATE TABLE ava_audit_logs(actor_id uuid,action text,entity_id text,details jsonb);
GRANT SELECT,INSERT,UPDATE,DELETE ON profiles,portal_user_access TO authenticated;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;ALTER TABLE portal_user_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY original_profiles ON profiles TO authenticated USING(id=auth.uid() OR is_admin()) WITH CHECK(id=auth.uid() OR is_admin());
CREATE POLICY original_access ON portal_user_access TO authenticated USING(id_dummy() IS NULL);
`.replace("CREATE POLICY original_access ON portal_user_access TO authenticated USING(id_dummy() IS NULL);","CREATE POLICY original_access ON portal_user_access TO authenticated USING(user_id=auth.uid() OR is_admin()) WITH CHECK(user_id=auth.uid() OR is_admin());"));
const base=await readFile('supabase/migrations/20261007_portal_access_levels.sql','utf8');
for(const name of ['portal_access_level','portal_internal_access','portal_can_edit','ava_has_access','ava_is_admin','ava_identity','portal_set_access']){const start=base.indexOf('CREATE OR REPLACE FUNCTION public.'+name+'(');await db.exec(base.slice(start,base.indexOf('$$;',start)+3));}
await db.exec(await readFile('supabase/migrations/20261106_technician_access_level.sql','utf8'));
await db.exec(`CREATE FUNCTION ava_mutate(p_action text,p_data jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF p_action='set_access' THEN RETURN portal_set_access(p_data); END IF; INSERT INTO ava_audit_logs(actor_id,action) VALUES(auth.uid(),'fixture_mutation');RETURN '{}';END $$;
CREATE TABLE pdis(id int PRIMARY KEY,objectives text,member_name text,secret text);
INSERT INTO pdis SELECT n,'synthetic objective','fictional member','MUST_NOT_EXPOSE' FROM generate_series(1,101) n;
ALTER TABLE pdis ENABLE ROW LEVEL SECURITY;GRANT SELECT,INSERT,UPDATE,DELETE ON pdis TO authenticated;
CREATE POLICY existing_pdi_read ON pdis FOR SELECT TO authenticated USING(is_admin());
CREATE POLICY existing_pdi_edit ON pdis FOR ALL TO authenticated USING(portal_can_edit()) WITH CHECK(portal_can_edit());`);
await db.exec(await readFile('supabase/migrations/20261021_member_re_registration.sql','utf8'));
await db.exec('UPDATE member_registration_settings SET enabled=true');
if(process.env.MANAGEMENT_BASELINE_SNAPSHOT){
 const snapshot=JSON.parse(await readFile(process.env.MANAGEMENT_BASELINE_SNAPSHOT,'utf8'));
 for(const f of snapshot.functions)await db.exec(f.definition);
}
const coreBefore=(await db.query("SELECT proname,pg_get_functiondef(oid) d FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('is_admin','portal_can_edit','portal_internal_access') ORDER BY proname")).rows;
const as=async(id,sql,args=[])=>{await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('SET ROLE authenticated');try{return await db.query(sql,args);}finally{await db.exec('RESET ROLE');}};
const set=(actor,id,level,status='approved')=>as(actor,'SELECT portal_set_access($1::jsonb)',[JSON.stringify({user_id:id,access_level:level,status,mentor:false})]);
const countBefore=(await db.query('SELECT count(*)::int n FROM profiles')).rows[0].n;
await db.exec(migration);
assert.deepEqual((await db.query("SELECT proname,pg_get_functiondef(oid) d FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('is_admin','portal_can_edit','portal_internal_access') ORDER BY proname")).rows,coreBefore,'writer/admin predicates unchanged');
assert.equal((await db.query("SELECT count(*)::int n FROM portal_user_access WHERE access_level='management_readonly'")).rows[0].n,0);
await set(admin,target,'management_readonly');
assert.deepEqual((await as(target,'SELECT is_admin() admin,portal_internal_access() internal,portal_can_edit() edit,portal_management_reader() reader')).rows[0],{admin:false,internal:false,edit:false,reader:true});
await assert.rejects(set(target,member,'leader'),/AVA_ADMIN_REQUIRED/);
await assert.rejects(as(target,"SELECT ava_mutate('set_access',$1::jsonb)",[JSON.stringify({user_id:member,access_level:'leader',status:'approved'})]),/MANAGEMENT_READ_ONLY/);
await assert.rejects(as(target,"SELECT ava_mutate('fixture')"),/MANAGEMENT_READ_ONLY/);
await assert.rejects(as(target,'SELECT member_registration_complete($1::jsonb)',['{}']),/REGISTRATION_ACCESS_DENIED/);
assert.equal((await as(target,"UPDATE profiles SET status='rejected' WHERE id=$1 RETURNING id",[target])).rows.length,0);
assert.equal((await as(target,"UPDATE portal_user_access SET access_level='leader' WHERE user_id=$1 RETURNING user_id",[target])).rows.length,0);
assert.equal((await as(target,"UPDATE pdis SET objectives='forbidden' RETURNING id")).rows.length,0);
await assert.rejects(as(target,"INSERT INTO pdis VALUES(999,'forbidden','fake','secret')"),/row-level security/);
assert.equal((await as(target,'DELETE FROM pdis RETURNING id')).rows.length,0);
let packet=(await as(target,"SELECT portal_management_records('pdis') v")).rows[0].v;const all=[...packet.items];
assert.equal(all.length,50);assert.equal(packet.has_more,true);assert.equal(JSON.stringify(packet).includes('MUST_NOT_EXPOSE'),false);
while(packet.has_more){packet=(await as(target,"SELECT portal_management_records('pdis',$1) v",[packet.next_cursor])).rows[0].v;all.push(...packet.items);}
assert.equal(all.length,101);assert.equal(new Set(all.map(x=>x.cursor)).size,101);
await assert.rejects(as(target,"SELECT portal_management_records('google_oauth_credentials')"),/INVALID_SOURCE/);
await assert.rejects(as(member,"SELECT portal_management_records('pdis')"),/ACCESS_DENIED/);
await db.exec('SET ROLE anon');await assert.rejects(db.query("SELECT portal_management_records('pdis')"),/permission denied/);await db.exec('RESET ROLE');
await set(admin,target,'management_readonly','pending');await assert.rejects(as(target,"SELECT portal_management_records('pdis')"),/ACCESS_DENIED/);
await set(admin,target,'management_readonly','rejected');await assert.rejects(as(target,"SELECT portal_management_records('pdis')"),/ACCESS_DENIED/);
await assert.rejects(set(admin,seed,'management_readonly'),/recuperação/);
await assert.rejects(set(admin,admin,'management_readonly'),/próprio acesso/);
await assert.rejects(db.exec(rollback),/REASSIGN_BEFORE_ROLLBACK/);await db.exec('ROLLBACK');
await set(admin,target,'member');
await set(admin,tech,'technician');
assert.equal((await as(tech,'SELECT is_admin() v')).rows[0].v,true);
assert.equal((await as(member,'SELECT portal_can_edit() v')).rows[0].v,true);
await db.exec(rollback);
assert.equal((await db.query('SELECT count(*)::int n FROM pdis')).rows[0].n,101);
assert.equal((await db.query('SELECT count(*)::int n FROM profiles')).rows[0].n,countBefore);
await set(admin,target,'student');
assert.equal((await db.query('SELECT count(*)::int n FROM pdis')).rows[0].n,101);
}catch(e){throw e;}finally{await db.close();}

});

