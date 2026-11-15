import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const id=n=>`91000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
test('isolated PostgreSQL: priorities, member assignment, private contacts, inbox RLS, idempotence, pagination and rollback', {skip:!process.env.PDI_TEST_PGLITE_MODULE},async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.PDI_TEST_PGLITE_MODULE).href);const db=new PGlite();
 const [a,b,frc,admin,trainee,student,pending]=Array.from({length:7},(_,n)=>id(n+1));
 try{
 await db.exec(`CREATE ROLE authenticated;CREATE ROLE anon;CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;GRANT USAGE ON SCHEMA auth TO authenticated,anon;
 CREATE TABLE profiles(id uuid PRIMARY KEY,role text,member_role text,status text,full_name text);
 CREATE TABLE portal_user_access(user_id uuid PRIMARY KEY,access_level text,portal_internal bool,allowed_modalities text[]);
 CREATE TABLE member_registration_settings(singleton bool,modality_access_enabled bool);INSERT INTO member_registration_settings VALUES(true,true);
 CREATE TABLE portal_page_visibility(page_key text PRIMARY KEY,visible bool DEFAULT true,revision int DEFAULT 0);
 CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$SELECT EXISTS(SELECT 1 FROM profiles WHERE id=auth.uid() AND(role='admin' OR member_role='admin'))$$;`);
 for(const [index,u]of [a,b,frc,admin,trainee,student,pending].entries()){
  await db.query('INSERT INTO profiles VALUES($1,$2,$3,$4,$5)',[u,index===3?'admin':'user',index===3?'admin':'member',index===6?'pending':'approved','Synthetic '+index]);
  await db.query('INSERT INTO portal_user_access VALUES($1,$2,true,$3)',[u,index===4?'trainee':index===5?'student':index===3?'leader':'member',index===2?['FRC']:['FTC']]);
 }
 const levels=await readFile(new URL('../supabase/migrations/20261007_portal_access_levels.sql',import.meta.url),'utf8');
 await db.exec(levels.slice(levels.indexOf('CREATE OR REPLACE FUNCTION public.portal_access_level()'),levels.indexOf('CREATE OR REPLACE FUNCTION public.ava_has_access()')));
 const modalities=await readFile(new URL('../supabase/migrations/20261106_modality_access.sql',import.meta.url),'utf8');
 await db.exec(modalities.slice(modalities.indexOf('CREATE FUNCTION public.portal_modality_all()'),modalities.indexOf('CREATE FUNCTION public.portal_modality_access()')));
 await db.exec(await readFile(new URL('../supabase/migrations/20261106_demand_boards.sql',import.meta.url),'utf8'));
 const as=async(user,sql,args=[])=>{await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user||'']);await db.exec('SET ROLE authenticated');try{return await db.query(sql,args);}finally{await db.exec('RESET ROLE');}};
 const write=async(user,action,data)=>(await as(user,'SELECT portal_demands_write($1,$2) p',[action,JSON.stringify(data)])).rows[0].p.card;
 const create=(n,board='FTC')=>({id:id(100+n),board,title:'Synthetic card '+n,items:[{id:id(1000+n),text:'Synthetic task '+n,done:false}]});
 const oldPayload=create(1,'personal'),old=await write(a,'create',oldPayload),preserved=JSON.stringify(old.items);
 await db.exec(await readFile(new URL('../supabase/migrations/20261115_demand_priorities_notifications.sql',import.meta.url),'utf8'));
 assert.equal(JSON.stringify((await db.query('SELECT items FROM portal_demand_cards WHERE id=$1',[old.id])).rows[0].items),preserved);
 const read=async(user,board='FTC',cursor=null,focus=null)=>(await as(user,'SELECT portal_demands_v2_read($1,false,$2,$3,$4) p',[board,cursor?.rank??null,cursor?.id??null,focus])).rows[0].p;
 const inbox=async(user,cursor=null)=>(await as(user,'SELECT portal_demand_inbox($1,$2) p',[cursor?.date??null,cursor?.id??null])).rows[0].p;
 const contact=async(user,data=null)=>(await as(user,'SELECT portal_demand_contact($1) p',[data===null?null:JSON.stringify(data)])).rows[0].p;
 const meta=(payload,priority='normal',assignee=b)=>({...payload,item_meta:{[payload.items[0].id]:{priority,assignee_id:assignee}}});
 const payload=meta(create(2),'urgent');let shared=await write(a,'create',payload);
 assert.equal(shared.owner_id,a);assert.equal(shared.item_meta[shared.items[0].id].assignee_id,b);
 assert.equal((await inbox(b)).unread,1);assert.equal((await inbox(a)).items.length,0);assert.equal((await inbox(admin)).items.length,0,'admin has no bypass for another inbox');
 await write(a,'create',payload);assert.equal((await inbox(b)).items.length,1,'retried create cannot duplicate notifications');
 for(const target of [frc,student,pending])await assert.rejects(write(a,'create',meta(create(10+Number(target.at(-1))),'high',target)),/RECIPIENT_DENIED/);
 await assert.rejects(write(a,'create',meta(create(20,'personal'),'high',b)),/RECIPIENT_DENIED/);
 await assert.rejects(write(trainee,'create',create(21)),/ACCESS_DENIED/);await assert.rejects(read(frc),/ACCESS_DENIED/);await assert.rejects(inbox(null),/ACCESS_DENIED/);
 const own=await write(trainee,'create',meta(create(22,'personal'),'urgent',trainee));assert.equal(own.owner_id,trainee);
 assert.ok((await read(a)).recipients.some(r=>r.id===b));assert.ok(!(await read(a)).recipients.some(r=>r.id===frc));
 assert.equal((await read(a,'FTC',null,shared.id)).items.length,1);assert.equal((await read(b,'personal',null,old.id)).items.length,0,'notification focus cannot reveal private cards');
 await assert.rejects(as(a,'SELECT portal_demands_write_before_assignments($1,$2)',['create',JSON.stringify(create(23))]),/permission denied/);
 await assert.rejects(as(a,'UPDATE portal_demand_cards SET item_meta=$1 WHERE id=$2',['{}',shared.id]),/permission denied/);
 const prefs={phone:'+15555550123',no_phone:false,whatsapp_opt_in:true,email_opt_in:true};
 assert.equal((await contact(b,prefs)).phone,prefs.phone);
 assert.equal((await contact(a)).phone,null);for(const user of [a,b,admin])await assert.rejects(as(user,'SELECT * FROM portal_demand_contacts'),/permission denied/);
 await assert.rejects(contact(a,{...prefs,user_id:b}),/CONTACT_INVALID/);await assert.rejects(contact(a,{...prefs,no_phone:true}),/CONTACT_INVALID/);
 assert.equal((await contact(a,{phone:null,no_phone:true,whatsapp_opt_in:false,email_opt_in:false})).no_phone,true);
 await assert.rejects(as(a,'SELECT portal_demand_contact_required(true)'),/ACCESS_DENIED/);
 await as(admin,'SELECT portal_demand_contact_required(true)');assert.equal((await contact(frc)).required,true);assert.equal((await contact(a)).required,false);
 // A new assignment queues only references; no external delivery can be marked sent.
 const queued=await write(a,'create',meta(create(25),'high',b));
 const outbox=(await db.query('SELECT * FROM portal_demand_delivery_outbox')).rows;assert.equal(outbox.length,2);assert.ok(outbox.every(r=>r.status==='not_configured'));assert.doesNotMatch(JSON.stringify(outbox),/1555555|phone|email_address/);
 await assert.rejects(as(b,'SELECT * FROM portal_demand_delivery_outbox'),/permission denied/);
 const notice=(await inbox(b)).items[0];await as(b,'SELECT portal_demand_notice_read($1)',[notice.id]);await assert.rejects(as(a,'SELECT portal_demand_notice_read($1)',[notice.id]),/ACCESS_DENIED/);
 // Old clients can still toggle while metadata survives and CAS prevents stale changes.
 shared=await write(a,'toggle',{id:shared.id,revision:0,item:shared.items[0].id,done:true});assert.equal(shared.item_meta[shared.items[0].id].priority,'urgent');assert.equal(shared.revision,1);
 await assert.rejects(write(a,'toggle',{id:shared.id,revision:0,item:shared.items[0].id,done:false}),/CONFLICT/);
 for(let n=30;n<85;n++)await write(a,'create',meta(create(n),n===84?'urgent':'low',null));
 const all=[];let cursor=null;do{const p=await read(a,'FTC',cursor);all.push(...p.items);cursor=p.has_more?p.next_cursor:null;}while(cursor);
 assert.equal(new Set(all.map(c=>c.id)).size,all.length);assert.equal(all[0].id,id(184));assert.equal(all.at(-1).id,shared.id,'completed card goes last even if urgent');assert.ok(all.every((c,i)=>i===0||c.priority_rank>=all[i-1].priority_rank));
 // Reassignment and revocation hide stale notification content immediately.
 const reassigned=await write(a,'edit',{id:queued.id,revision:queued.revision,title:queued.title,items:queued.items,item_meta:{[queued.items[0].id]:{priority:'high',assignee_id:a}}});
 assert.ok(!(await inbox(b)).items.some(n=>n.card_id===queued.id));assert.ok((await inbox(a)).items.some(n=>n.card_id===queued.id));
 await write(a,'archive',{id:reassigned.id,revision:reassigned.revision,archived:true});assert.ok(!(await inbox(a)).items.some(n=>n.card_id===queued.id));
 await db.query("UPDATE portal_user_access SET allowed_modalities=ARRAY['FRC'] WHERE user_id=$1",[b]);assert.equal((await inbox(b)).items.length,0);
 await db.exec("UPDATE portal_page_visibility SET visible=false WHERE page_key='InternalDemands'");await assert.rejects(read(a),/ACCESS_DENIED/);assert.equal((await inbox(a)).items.length,0);
 await db.exec("UPDATE portal_page_visibility SET visible=true WHERE page_key='InternalDemands'");
 const counts=(await db.query('SELECT (SELECT count(*) FROM portal_demand_cards)::int cards,(SELECT count(*) FROM portal_demand_contacts)::int contacts')).rows[0];
 await db.exec(await readFile(new URL('../supabase/rollbacks/20261115_demand_priorities_notifications.sql',import.meta.url),'utf8'));
 assert.deepEqual((await db.query('SELECT (SELECT count(*) FROM portal_demand_cards)::int cards,(SELECT count(*) FROM portal_demand_contacts)::int contacts')).rows[0],counts);
 assert.equal((await contact(frc)).required,false);await write(a,'toggle',{id:old.id,revision:0,item:old.items[0].id,done:true});
 }finally{await db.close();}
});
