import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createMemberPdisClient } from '../src/api/memberPdisClient.js';
const runtime=process.env.PDI_TEST_PGLITE_MODULE;
test('registration creates real PDIs atomically; backfill, identity, privacy, pagination and rollback',{skip:!runtime},async()=>{
 const {PGlite}=await import(pathToFileURL(runtime).href);const db=new PGlite();
 const ids=Array.from({length:5},(_,i)=>`10000000-0000-0000-0000-00000000000${i+1}`);
 const [owner,other,admin,leader,student]=ids;
 try {
 await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 GRANT USAGE ON SCHEMA auth TO authenticated,anon;
 CREATE TABLE profiles(id uuid PRIMARY KEY, full_name text,internal boolean,admin boolean);
 INSERT INTO profiles VALUES ${ids.map((id,i)=>`('${id}','Homônimo',${i!==4},${i===2})`).join(',')};
 CREATE FUNCTION portal_internal_access() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$SELECT coalesce((SELECT internal FROM profiles WHERE id=auth.uid()),false)$$;
 CREATE FUNCTION is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$SELECT coalesce((SELECT admin FROM profiles WHERE id=auth.uid()),false)$$;
 CREATE FUNCTION portal_can_edit() RETURNS boolean LANGUAGE sql STABLE AS $$SELECT portal_internal_access()$$;
 CREATE FUNCTION ava_identity() RETURNS jsonb LANGUAGE sql STABLE AS $$SELECT jsonb_build_object('access_level','member','mentor',false)$$;
 GRANT SELECT ON profiles TO authenticated;
 CREATE TABLE pdis(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),member_name text NOT NULL,main_role text NOT NULL,learning_goal text,season text NOT NULL,status text NOT NULL DEFAULT 'rascunho',progress_override integer);
 CREATE TABLE pdi_frcs(LIKE pdis INCLUDING ALL);
 INSERT INTO pdis(member_name,main_role,season) VALUES('Homônimo','Manual','2026');
 GRANT SELECT,INSERT,UPDATE,DELETE ON pdis,pdi_frcs TO authenticated,anon;
 ALTER TABLE pdis ENABLE ROW LEVEL SECURITY;ALTER TABLE pdi_frcs ENABLE ROW LEVEL SECURITY;
 CREATE POLICY legacy_all ON pdis TO authenticated USING(true) WITH CHECK(true);
 CREATE POLICY legacy_all ON pdi_frcs TO authenticated USING(true) WITH CHECK(true);`);
 await db.exec(await readFile(new URL('../supabase/migrations/20261021_member_re_registration.sql',import.meta.url),'utf8'));
 const as=async(id,sql,args=[])=>{await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('SET ROLE authenticated');try{return await db.query(sql,args);}finally{await db.exec('RESET ROLE');}};
 const payload={preferred_name:'Nome escolhido',age:15,reason:'Equipe',modalities:['FTC','FRC','FLL','FTC'],areas:['CAD'],experience:'Inicial',contribution:'Aprender',season:'2026',objectives:['Projetar robô'],competencies:['CAD']};
 await db.exec('UPDATE member_registration_settings SET enabled=true');
 await as(owner,'SELECT member_registration_complete($1::jsonb)',[JSON.stringify(payload)]);
 const original=(await db.query('SELECT to_jsonb(r) j FROM member_registrations r ORDER BY user_id')).rows;
 await db.exec(await readFile(new URL('../supabase/migrations/20261104_registration_pdis.sql',import.meta.url),'utf8'));
 await db.query('SELECT registration_pdis_generate($1)',[owner]);
 assert.equal((await db.query('SELECT count(*)::int n FROM pdis')).rows[0].n,1,'activation initially off');
 await db.exec(await readFile(new URL('../supabase/audits/20261104_enable_registration_pdis.sql',import.meta.url),'utf8'));
 await db.query('SELECT registration_pdis_generate($1)',[owner]);
 await db.query('SELECT registration_pdis_generate($1)',[owner]);
 assert.equal((await db.query('SELECT count(*)::int n FROM pdis')).rows[0].n,3);
 assert.equal((await db.query('SELECT count(*)::int n FROM pdi_frcs')).rows[0].n,1);
 assert.deepEqual((await db.query('SELECT to_jsonb(r) j FROM member_registrations r ORDER BY user_id')).rows,original,'backfill preserves responses');
 assert.equal((await db.query('SELECT participant_id FROM pdis WHERE registration_version IS NULL')).rows[0].participant_id,null,'never link by name');
 const mine=(await as(owner,'SELECT member_pdis() p')).rows[0].p;
 assert.equal(mine.items.length,3);
 for(const {pdi} of mine.items){assert.equal(pdi.participant_id,owner);assert.equal(pdi.progress_override,0);assert.equal(pdi.learning_goal,'Projetar robô');assert.deepEqual(pdi.initial_competencies,['CAD']);assert.equal(pdi.age,undefined);assert.equal(pdi.reason,undefined);}
 for(const id of [other,leader,student]) {
 assert.equal((await as(id,'SELECT * FROM pdis')).rows.length,0);
 await assert.rejects(as(id,'SELECT member_pdis(NULL,true)'),/PDI_ACCESS_DENIED/);
 }
 assert.equal((await as(admin,'SELECT member_pdis(NULL,true) p')).rows[0].p.items.length,4);
 await assert.rejects(as(owner,'SELECT registration_pdis_generate($1)',[other]),/permission denied/);
 await assert.rejects(as(owner,'UPDATE pdis SET participant_id=$1 WHERE registration_version=1',[other]),/PDI_PROVENANCE_PROTECTED/);
 await assert.rejects(as(owner,'UPDATE pdis SET progress_override=90 WHERE registration_version=1'),/PDI_ASSESSMENT/);
 await assert.rejects(as(admin,'UPDATE pdis SET progress_override=90 WHERE registration_version=1'),/PDI_ASSESSMENT/);
 assert.equal((await as(admin,'DELETE FROM pdis WHERE registration_version=1 RETURNING id')).rows.length,0);
 await as(owner,"UPDATE pdis SET learning_goal='Meta revisada' WHERE modality='FTC'");
 await as(owner,'SELECT member_registration_complete($1::jsonb)',[JSON.stringify(payload)]);
 assert.equal((await as(owner,"SELECT learning_goal FROM pdis WHERE modality='FTC'")).rows[0].learning_goal,'Meta revisada');
 await as(other,'SELECT member_registration_complete($1::jsonb)',[JSON.stringify({...payload,modalities:['FRC']})]);
 assert.equal((await as(other,'SELECT member_pdis() p')).rows[0].p.items.length,1,'new completion automatically generates without browser second call');
 await db.exec('SET ROLE anon');try {assert.equal((await db.query('SELECT * FROM pdis')).rows.length,0);await assert.rejects(db.query('SELECT member_pdis()'),/permission denied/);}finally{await db.exec('RESET ROLE');}
 await db.exec("INSERT INTO pdis(member_name,main_role,season) SELECT 'Synthetic','Test','2026' FROM generate_series(1,105)");
 const page=(await as(admin,'SELECT member_pdis(NULL,true) p')).rows[0].p;
 assert.equal(page.items.length,100);assert.equal(page.has_more,true);
 const next=(await as(admin,'SELECT member_pdis(NULL,true,$1) p',[page.next_cursor])).rows[0].p;
 assert.equal(next.items.length,10);assert.equal(next.has_more,false);
 assert.equal(new Set([...page.items,...next.items].map(i=>i.cursor)).size,110);
 await db.exec(await readFile(new URL('../supabase/rollbacks/20261104_registration_pdis.sql',import.meta.url),'utf8'));
 assert.equal((await db.query('SELECT pdi_generation_enabled FROM member_registration_settings')).rows[0].pdi_generation_enabled,false);
 assert.equal((await as(owner,'SELECT member_pdis() p')).rows[0].p.items.length,3);
 } finally {await db.close();}
});
test('PDI client refuses other-user records, changed sessions and service failures',async()=>{
 let current='a';let packet={actor:'a',items:[{cursor:'pdis:1',pdi:{participant_id:'a',modality:'FTC'}}],has_more:false};let failure=false,change=false;
 const read=createMemberPdisClient({auth:{getUser:async()=>({data:{user:{id:current}}})},rpc:async()=>{if(change)current='b';return {data:packet,error:failure};}});
 assert.equal((await read('a')).items.length,1);
 packet.items[0].pdi.participant_id='b';await assert.rejects(read('a'));
 packet.items[0].pdi.participant_id='a';failure=true;await assert.rejects(read('a'));failure=false;
 await assert.rejects(read('a',{modality:'FRC'}));change=true;await assert.rejects(read('a'));
});
