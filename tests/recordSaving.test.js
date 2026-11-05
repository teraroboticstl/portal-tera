import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {encodeRecord,decodeRecord} from '../src/lib/recordCodec.js';
import {requestDeadline} from '../src/api/requestDeadline.js';
test('record codec maps form fields to actual schema and preserves legacy and structured fields',()=>{
 const fixtures={daily_logs:{date:'2026-11-05',program:'FTC',log_type:'Build',participants:['Pessoa sem conta'],what_was_done:'CAD',decisions_made:'Decisão',evidence_images:[],video_urls:[]},meeting_notes:{date:'2026-11-05',program:'FRC',participants:['Pessoa'],agenda:'Pauta',technical_discussions:'Detalhes',final_decisions:'Decisão',video_urls:[],evidence_images:['/api/media/fake-image'],evidence_links:['/api/media/fake-pdf']},prototype_tests:{date:'2026-11-05',program:'FRC',subsystem:'Garra',hypothesis:'Teste',test_method:'Medir',result:'Resultado',conclusion:'Aprovado',evidence_images:[],video_urls:[]}};
 const columns={daily_logs:['date','category','title','content'],meeting_notes:['date','program','title','content','attendees'],prototype_tests:['date','category','subsystem','hypothesis','result','conclusion']};
 for(const [table,form] of Object.entries(fixtures)) {const sql=encodeRecord(table,form);assert.ok(Object.keys(sql).every(k=>columns[table].includes(k)),JSON.stringify(sql));const read=decodeRecord(table,sql);for(const [key,value] of Object.entries(form))assert.deepEqual(read[key],value,`${table}.${key}`);}
 assert.equal(decodeRecord('daily_logs',{content:'Texto antigo',category:'FTC'}).what_was_done,'Texto antigo');
 assert.equal(decodeRecord('daily_logs',{id:'trusted',content:'Texto\n[portal_record_v1]\n{"id":"forged","participants":[]}'}).id,'trusted');
});
test('actual adapter saves without files, identifies author from session and preserves fields during partial edit',async()=>{
 const writes=[];let existing;let permitted=true;
 const client={auth:{getUser:async()=>({data:{user:{id:'session-user'}}})},rpc:async()=>({data:permitted}),from:table=>{
  let write;const q={select:()=>q,eq:()=>q,insert:data=>{write=Array.isArray(data)?data[0]:data;return q;},update:data=>{write=data;return q;},single:async()=>{if(write){writes.push({table,data:write});existing={id:'record-id',...write};}return {data:existing};}};return q;
 }};
 const context=vm.createContext({console:{log(){},error(){},warn(){}},Date,Set,Map});const cache=new Map();
 async function load(url){if(cache.has(url.href))return cache.get(url.href);let m;if(url.pathname.endsWith('/supabaseClient.js')){m=new vm.SyntheticModule(['supabase'],function(){this.setExport('supabase',client);},{context});}else{m=new vm.SourceTextModule(await fs.readFile(url,'utf8'),{context,identifier:url.href});}cache.set(url.href,m);await m.link((specifier,ref)=>load(new URL(specifier,ref.identifier)));return m;}
 const m=await load(new URL('../src/api/adapters/base44ToSupabaseAdapter.js',import.meta.url));await m.evaluate();
 const logs=m.namespace.adaptedEntities.DailyLog;
 await logs.create({date:'2026-11-05',program:'FTC',what_was_done:'Atividade',participants:[],evidence_images:[],video_urls:[],user_id:'forged'});
 assert.equal(writes[0].data.user_id,'session-user');assert.equal(writes[0].data.category,'FTC');assert.equal(writes[0].data.what_was_done,undefined);
 await logs.update('record-id',{next_steps:'Próxima etapa'});
 assert.equal(decodeRecord('daily_logs',writes[1].data).what_was_done,'Atividade');assert.equal(writes[1].data.user_id,undefined);
 await m.namespace.adaptedEntities.MeetingNote.create({date:'2026-11-05',program:'FTC',agenda:'Planejamento',technical_discussions:'Técnica',participants:['Participante'],evidence_images:[],video_urls:[],season_tag:'2026'});
 assert.equal(writes[2].data.agenda,undefined);assert.ok(writes[2].data.content.includes('Planejamento'));assert.equal(writes[2].data.attendees[0],'Participante');
 await m.namespace.adaptedEntities.PrototypeTest.create({date:'2026-11-05',program:'FRC',subsystem:'Garra',hypothesis:'Validar',test_method:'Medição',result:'Aprovado',season_tag:'2026'});
 assert.equal(writes[3].data.description,undefined);assert.ok(writes[3].data.result.includes('[season_tag:2026]'));
 permitted=false;await assert.rejects(logs.create({what_was_done:'Denied'}));assert.equal(writes.length,4);
});
test('deadline releases pending UI even when transport never settles',async()=>{
 let signal;await assert.rejects(requestDeadline(s=>{signal=s;return new Promise(()=>{});},10),/texto foi preservado/);assert.equal(signal.aborted,true);
 assert.equal(await requestDeadline(async()=>42,100),42);
});

 test('FLL participants normalize to SQL arrays and malformed attachment lists do not crash readers',()=>{
 const encoded=encodeRecord('meeting_notes',{agenda:'FLL',participants:'Pessoa A, Pessoa B',technical_discussions:'Plano'});
 assert.deepEqual(encoded.attendees,['Pessoa A','Pessoa B']);assert.deepEqual(decodeRecord('meeting_notes',encoded).participants,['Pessoa A','Pessoa B']);
 const read=decodeRecord('daily_logs',{content:'Legacy\n[portal_record_v1]\n{"participants":{},"evidence_images":[null,42,"/api/media/synthetic"]}'});
 assert.deepEqual(read.participants,[]);assert.deepEqual(read.evidence_images,['/api/media/synthetic']);
 });
