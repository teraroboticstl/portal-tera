import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const runtime=process.env.PDI_TEST_PGLITE_MODULE;
test('technician is an administrator with a distinct level; admin-only assignment, rejection and rollback',{skip:!runtime},async()=>{
 const {PGlite}=await import(pathToFileURL(runtime).href);const db=new PGlite();
 const [admin,target,member,other]=[1,2,3,4].map(i=>`70000000-0000-0000-0000-00000000000${i}`);
 try{
 await db.exec(`CREATE ROLE authenticated;CREATE ROLE anon;CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 GRANT USAGE ON SCHEMA auth TO authenticated,anon;
 CREATE TABLE profiles(id uuid PRIMARY KEY,email text,role text,member_role text,status text);
 INSERT INTO profiles VALUES('${admin}','teraroboticstl@gmail.com','admin','admin','approved'),('${target}','synthetic-tech@example.invalid','admin','admin','approved'),('${member}','synthetic-member@example.invalid','mentor','member','approved'),('${other}','synthetic-other@example.invalid','mentor','member','approved');
 CREATE FUNCTION is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$SELECT coalesce((SELECT role='admin' OR member_role='admin' FROM profiles WHERE id=auth.uid()),false)$$;
 CREATE TABLE portal_user_access(user_id uuid PRIMARY KEY REFERENCES profiles,access_level text CONSTRAINT portal_user_access_access_level_check CHECK(access_level IN ('public','student','trainee','member','leader')),portal_internal boolean,ava_status text DEFAULT 'pending',ava_admin boolean DEFAULT false,mentor boolean DEFAULT false,updated_at timestamptz DEFAULT now(),allowed_modalities text[] DEFAULT '{}');
 INSERT INTO portal_user_access(user_id,access_level,allowed_modalities) VALUES('${admin}','leader','{}'),('${target}','leader',ARRAY['FRC']),('${member}','member',ARRAY['FTC']);
 CREATE TABLE ava_audit_logs(actor_id uuid,action text,entity_id text,details jsonb);
 GRANT SELECT ON profiles,portal_user_access TO authenticated;
 CREATE TABLE private_pdis(id int,participant_id uuid);
 INSERT INTO private_pdis VALUES(1,'${member}'),(2,'${other}');
 ALTER TABLE private_pdis ENABLE ROW LEVEL SECURITY;GRANT SELECT ON private_pdis TO authenticated;
 CREATE POLICY private_read ON private_pdis FOR SELECT TO authenticated USING(participant_id=auth.uid() OR is_admin());`);
 const source=await readFile(new URL('../supabase/migrations/20261007_portal_access_levels.sql',import.meta.url),'utf8');
 for(const name of ['portal_access_level','portal_internal_access','portal_can_edit','portal_set_access']){
  const start=source.indexOf('CREATE OR REPLACE FUNCTION public.'+name+'(');assert.ok(start>=0);
  const end=source.indexOf('$$;',start)+3;await db.exec(source.slice(start,end));
 }
 const as=async(id,sql,args=[])=>{await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('SET ROLE authenticated');try{return await db.query(sql,args);}finally{await db.exec('RESET ROLE');}};
 const before=(await db.query('SELECT id,role,member_role,status FROM profiles ORDER BY id')).rows;
 await db.exec(await readFile(new URL('../supabase/migrations/20261106_technician_access_level.sql',import.meta.url),'utf8'));
 assert.deepEqual((await db.query('SELECT id,role,member_role,status FROM profiles ORDER BY id')).rows,before,'install does not promote any account');
 const set=(actor,id,level,status='approved')=>as(actor,'SELECT portal_set_access($1::jsonb)',[JSON.stringify({user_id:id,access_level:level,status,mentor:false})]);
 await set(admin,target,'technician');
 const identity=(await as(target,'SELECT is_admin() admin,portal_access_level() level,portal_internal_access() internal,portal_can_edit() edit')).rows[0];
 assert.deepEqual(identity,{admin:true,level:'technician',internal:true,edit:true});
 assert.equal((await as(target,'SELECT * FROM private_pdis')).rows.length,2,'same private PDI access as administrator');
 assert.deepEqual((await db.query('SELECT allowed_modalities FROM portal_user_access WHERE user_id=$1',[target])).rows[0].allowed_modalities,['FRC'],'individual choices preserved; admin bypass remains');
 await assert.rejects(set(member,member,'technician'),/AVA_ADMIN_REQUIRED/);
 await assert.rejects(as(member,'SELECT portal_set_access_before_technicians($1::jsonb)',[JSON.stringify({user_id:member,access_level:'leader',status:'approved'})]),/permission denied/);
 await assert.rejects(set(admin,admin,'technician'),/recuperação/);
 await assert.rejects(set(target,target,'member'),/próprio acesso/);
 await set(target,other,'technician');assert.equal((await as(other,'SELECT is_admin() v')).rows[0].v,true,'technician can perform existing admin actions');
 await set(admin,other,'technician','pending');assert.equal((await as(other,'SELECT is_admin() v')).rows[0].v,false);assert.equal((await as(other,'SELECT portal_internal_access() v')).rows[0].v,false);
 await set(admin,other,'technician','rejected');assert.equal((await as(other,'SELECT is_admin() v')).rows[0].v,false);
 await set(admin,other,'member');assert.equal((await as(other,'SELECT is_admin() v')).rows[0].v,false);
 await db.exec(await readFile(new URL('../supabase/rollbacks/20261106_technician_access_level.sql',import.meta.url),'utf8'));
 assert.equal((await as(target,'SELECT portal_access_level() v')).rows[0].v,'leader');
 assert.equal((await as(target,'SELECT is_admin() v')).rows[0].v,true,'rollback keeps existing privileges');
 }finally{await db.close();}
});
