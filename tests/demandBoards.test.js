import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {transform} from 'sucrase';
import vm from 'node:vm';
import {createDemandBoardsClient,validDemandCard} from '../src/api/demandBoardsClient.js';

const id=n=>`80000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const actor=id(1),other=id(2),item={id:id(10),text:'Montar mecanismo',done:false};
const card={id:id(20),owner_id:actor,board:'personal',title:'Regional',items:[item],archived:false,revision:0};
const packet=()=>({actor,board:'personal',boards:['personal','FTC'],can_edit:true,items:[card],has_more:false,next_cursor:null});
test('client checks account before/after, private ownership, board and response shape',async()=>{
 let current=actor,result=packet(),error=null;const calls=[];
 const api=createDemandBoardsClient({auth:{getUser:async()=>({data:{user:{id:current}}})},rpc:async(name,args)=>{calls.push({name,args});return {data:result,error};}});
 assert.equal((await api.read(actor)).items[0].title,'Regional');
 assert.deepEqual(calls.at(-1),{name:'portal_demands_read',args:{p_board:'personal',p_archived:false,p_after:null}});
 result={...packet(),items:[{...card,owner_id:other}]};await assert.rejects(api.read(actor));
 result={...packet(),actor:other};await assert.rejects(api.read(actor));
 result=packet();error={message:'secret-provider-details'};await assert.rejects(api.read(actor),e=>!e.message.includes('secret'));
 error={message:'DEMAND_CONFLICT'};await assert.rejects(api.write(actor,'edit',{},'personal'),/outro dispositivo/);
 current=other;await assert.rejects(api.read(actor));
 assert.equal(validDemandCard({...card,items:[item,item]},actor,'personal'),false);
});
test('slow/unavailable service times out instead of leaving a permanent spinner',async()=>{
 let resolveAuth;let calls=0;
 const api=createDemandBoardsClient({auth:{getUser:()=>new Promise(resolve=>{resolveAuth=resolve;})},rpc:()=>{calls++;}}, {timeoutMs:5});
 await assert.rejects(api.read(actor));
 resolveAuth({data:{user:{id:actor}}});await new Promise(resolve=>setTimeout(resolve,5));
 assert.equal(calls,0,'late authentication may not issue a mutation after timeout');
});
test('actual card UI checks completed rows, strikes text, keeps long text inert and exposes restore',async()=>{
 const source=await readFile(new URL('../src/components/internal/DemandBoard.jsx',import.meta.url),'utf8');
 const wrapper=({children,...props})=>React.createElement('button',props,children);
 const container=({children})=>React.createElement('div',null,children);
 const mocks={react:React,'@tanstack/react-query':{},'lucide-react':Object.fromEntries(['Plus','Pencil','Trash2','RotateCcw','X'].map(k=>[k,()=>null])),
  '@/api/supabaseClient':{supabase:{}},'@/api/demandBoardsClient':{createDemandBoardsClient:()=>({})},'@/components/ui/button':{Button:wrapper},'@/components/ui/dialog':Object.fromEntries(['Dialog','DialogContent','DialogHeader','DialogTitle','DialogDescription'].map(k=>[k,container]))};
 const module={exports:{}};vm.runInNewContext(transform(source,{transforms:['jsx','imports']}).code,{module,exports:module.exports,require:name=>mocks[name]});
 const html=renderToStaticMarkup(React.createElement(module.exports.DemandCard,{card:{...card,items:[{...item,text:'<script>alert(1)</script>',done:true}]},editable:true}));
 assert.match(html,/line-through/);assert.match(html,/checked=""/);assert.match(html,/1 item concluído/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
 assert.match(html,/aria-label="Excluir Regional"/);
 const archived=renderToStaticMarkup(React.createElement(module.exports.DemandCard,{card:{...card,archived:true},editable:true}));
 assert.match(archived,/Restaurar/);assert.match(archived,/disabled=""/);
 assert.doesNotMatch(archived,/>Excluir</);
 const readOnly=renderToStaticMarkup(React.createElement(module.exports.DemandCard,{card,editable:false}));
 assert.doesNotMatch(readOnly,/>Editar<|>Excluir</);assert.match(readOnly,/disabled=""/);
 const personalConfirm=renderToStaticMarkup(React.createElement(module.exports.DemandRemovalConfirm,{card:{...card,items:[{...item,done:true}]},busy:false}));
 assert.match(personalConfirm,/Lixeira/);assert.match(personalConfirm,/restaurá-los/);assert.match(personalConfirm,/Cancelar/);assert.match(personalConfirm,/Excluir caixa/);assert.doesNotMatch(personalConfirm,/item pendente|todo o quadro/);
 const sharedConfirm=renderToStaticMarkup(React.createElement(module.exports.DemandRemovalConfirm,{card:{...card,board:'FRC'},busy:true,error:'Atualize o quadro'}));
 assert.match(sharedConfirm,/1 item pendente/);assert.match(sharedConfirm,/todo o quadro da modalidade/);assert.match(sharedConfirm,/Excluindo/);assert.match(sharedConfirm,/disabled=""/);assert.match(sharedConfirm,/role="alert"/);
});

test('isolated PostgreSQL: own-only notes, modality boards, all roles, revisions, idempotence, archival and non-destructive rollback',
 {skip:!process.env.PDI_TEST_PGLITE_MODULE},async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.PDI_TEST_PGLITE_MODULE).href);const db=new PGlite();
 const [ftc,frc,admin,leader,trainee,student,fll,obr,technician]=Array.from({length:9},(_,i)=>id(i+1));
 try{
 await db.exec(`CREATE ROLE authenticated;CREATE ROLE anon;CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 GRANT USAGE ON SCHEMA auth TO authenticated,anon;
 CREATE TABLE profiles(id uuid PRIMARY KEY,admin boolean,level text);
 INSERT INTO profiles VALUES ${[ftc,frc,admin,leader,trainee,student,fll,obr,technician].map((u,i)=>`('${u}',${i===2||i===8},'${i===3?'leader':i===4?'trainee':i===5?'student':i===8?'technician':'member'}')`).join(',')};
 CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$SELECT coalesce((SELECT admin FROM profiles WHERE id=auth.uid()),false)$$;
 CREATE FUNCTION public.portal_access_level() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$SELECT level FROM profiles WHERE id=auth.uid()$$;
 CREATE FUNCTION public.portal_internal_access() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$SELECT coalesce((SELECT level<>'student' FROM profiles WHERE id=auth.uid()),false)$$;
 CREATE FUNCTION public.portal_can_edit() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$SELECT coalesce((SELECT level IN ('member','leader','technician') FROM profiles WHERE id=auth.uid()),false)$$;
 CREATE TABLE portal_user_access(user_id uuid PRIMARY KEY,allowed_modalities text[]);
 INSERT INTO portal_user_access VALUES('${ftc}',ARRAY['FTC']),('${frc}',ARRAY['FRC']),('${trainee}',ARRAY['FTC']),('${fll}',ARRAY['FLL']),('${obr}',ARRAY['OBR']);
 CREATE TABLE member_registration_settings(singleton bool,modality_access_enabled bool);INSERT INTO member_registration_settings VALUES(true,true);
 CREATE TABLE portal_page_visibility(page_key text PRIMARY KEY,visible boolean DEFAULT true,revision int DEFAULT 0,updated_at timestamptz DEFAULT now());
 INSERT INTO portal_page_visibility(page_key) VALUES('ExistingPage');
 CREATE TABLE existing_data(id int,content text);INSERT INTO existing_data VALUES(1,'preserved');`);
 const original=await readFile(new URL('../supabase/migrations/20261106_modality_access.sql',import.meta.url),'utf8');
 await db.exec(original.slice(original.indexOf('CREATE FUNCTION public.portal_modality_all()'),original.indexOf('CREATE FUNCTION public.portal_modality_access()')));
 await db.exec(await readFile(new URL('../supabase/migrations/20261106_demand_boards.sql',import.meta.url),'utf8'));
 const as=async(user,sql,args=[])=>{
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user||'']);await db.exec('SET ROLE authenticated');
  try{return await db.query(sql,args);}finally{await db.exec('RESET ROLE');}
 };
 const write=async(user,action,payload)=>(await as(user,'SELECT portal_demands_write($1,$2) x',[action,JSON.stringify(payload)])).rows[0].x.card;
 const read=async(user,board='personal',archived=false,after=null)=>(await as(user,'SELECT portal_demands_read($1,$2,$3) x',[board,archived,after])).rows[0].x;
 const create=(n,board='personal')=>({id:id(100+n),board,title:'Lista teste',items:[{...item,id:id(300+n)}]});
 const privateFtc=await write(ftc,'create',create(1));
 const shared=await write(ftc,'create',create(2,'FTC'));
 assert.equal(privateFtc.owner_id,ftc);assert.equal((await read(ftc)).items.length,1);
 for(const user of [frc,admin,leader,technician]){
  assert.equal((await as(user,"SELECT * FROM portal_demand_cards WHERE board='personal'")).rows.length,0,'no admin bypass for personal notes');
  await assert.rejects(write(user,'edit',{id:privateFtc.id,revision:0,title:'steal',items:[]}),/ACCESS_DENIED/);
 }
 await assert.rejects(read(frc,'FTC'),/ACCESS_DENIED/);await assert.rejects(write(frc,'toggle',{id:shared.id,revision:0,item:shared.items[0].id,done:true}),/ACCESS_DENIED/);
 assert.equal((await read(trainee,'FTC')).can_edit,false);
 await assert.rejects(write(trainee,'create',create(3,'FTC')),/ACCESS_DENIED/);
 assert.equal((await write(trainee,'create',create(4))).owner_id,trainee,'trainees may organize their own private notes');
 await assert.rejects(read(student),/ACCESS_DENIED/);await assert.rejects(read(null),/ACCESS_DENIED/);
 for(const user of [admin,leader,technician])assert.deepEqual((await read(user,'FRC')).boards,['personal','FRC','FTC','FLL','OBR']);
 assert.deepEqual((await read(fll,'FLL')).boards,['personal','FLL']);assert.deepEqual((await read(obr,'OBR')).boards,['personal','OBR']);
 await write(frc,'create',create(5,'FRC'));await write(fll,'create',create(6,'FLL'));await write(obr,'create',create(7,'OBR'));
 assert.equal((await read(ftc,'FTC')).items.length,1);
 const done=await write(ftc,'toggle',{id:privateFtc.id,revision:0,item:privateFtc.items[0].id,done:true});
 assert.equal(done.items[0].done,true);assert.equal(done.revision,1);
 await assert.rejects(write(ftc,'edit',{id:done.id,revision:0,title:'stale',items:[]}),/CONFLICT/);
 const reopened=await write(ftc,'toggle',{id:done.id,revision:1,item:done.items[0].id,done:false});assert.equal(reopened.items[0].done,false);
 await assert.rejects(write(ftc,'create',{...create(8),owner_id:frc}),/INVALID/);
 await assert.rejects(write(ftc,'edit',{id:done.id,revision:2,title:'move',items:[],board:'FTC'}),/INVALID/);
 await assert.rejects(write(ftc,'edit',{id:done.id,revision:2,title:'same ids',items:[item,item]}),/INVALID/);
 await assert.rejects(as(ftc,'UPDATE portal_demand_cards SET title=$1 WHERE id=$2',['bypass',done.id]),/permission denied/);
 await assert.rejects(as(ftc,'DELETE FROM portal_demand_cards'),/permission denied/);
 const retried=await write(ftc,'create',create(2,'FTC'));assert.equal(retried.id,shared.id);
 const archived=await write(ftc,'archive',{id:done.id,revision:2,archived:true});assert.equal((await read(ftc)).items.length,0);assert.equal((await read(ftc,'personal',true)).items.length,1);
 await assert.rejects(write(ftc,'toggle',{id:done.id,revision:3,item:done.items[0].id,done:true}),/ARCHIVED/);
 await write(ftc,'archive',{id:archived.id,revision:3,archived:false});assert.equal((await read(ftc)).items.length,1);
 // More than one page; keyset cursor does not duplicate or skip.
 for(let n=10;n<62;n++)await write(ftc,'create',create(n));
 const first=await read(ftc);assert.equal(first.items.length,50);assert.equal(first.has_more,true);
 const next=await read(ftc,'personal',false,first.next_cursor);assert.equal(next.items.length,3);assert.equal(next.has_more,false);
 assert.equal(new Set([...first.items,...next.items].map(c=>c.id)).size,53);
 await db.query("UPDATE portal_user_access SET allowed_modalities=ARRAY['FRC'] WHERE user_id=$1",[ftc]);
 await assert.rejects(read(ftc,'FTC'),/ACCESS_DENIED/);assert.equal((await read(ftc)).items.length,50,'private notes survive modality change');
 await db.exec("UPDATE portal_page_visibility SET visible=false WHERE page_key='InternalDemands'");
 await assert.rejects(read(ftc),/ACCESS_DENIED/);assert.equal((await read(admin,'FTC')).items.length,1);
 await db.exec("UPDATE portal_page_visibility SET visible=true WHERE page_key='InternalDemands'");
 const count=(await db.query('SELECT count(*)::int n FROM portal_demand_cards')).rows[0].n;
 await db.exec(await readFile(new URL('../supabase/rollbacks/20261106_demand_boards.sql',import.meta.url),'utf8'));
 await assert.rejects(read(admin,'FTC'),/permission denied/);
 assert.equal((await db.query('SELECT count(*)::int n FROM portal_demand_cards')).rows[0].n,count);
 assert.equal((await db.query('SELECT content FROM existing_data')).rows[0].content,'preserved');
 }finally{await db.close();}
});
