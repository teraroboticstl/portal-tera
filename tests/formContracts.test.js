import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {transform} from 'sucrase';
import {encodeForm,decodeForm,formOrder,FORM_CONTRACTS} from '../src/lib/legacyFormContracts.js';
import {formatPortalDate,formErrorMessage} from '../src/lib/formRecovery.js';

const samples={
 fll_missions:{name:'Missão teste',max_score:30,best_score:15,status:'em_teste',notes:'Notas preservadas',order:5},
 fll_tasks:{title:'Testar robô',responsible:'Participante de teste',deadline:'2026-12-03',status:'em_andamento',priority:'urgente',notes:'Detalhe'},
 fll_innovation_projects:{title:'Projeto teste',date:'2026-11-06',problem:'Problema',solution:'Solução',research:'Pesquisa e especialistas',prototypes:'Protótipo',feedbacks:'Feedback',evolution:'Evolução',status:'em_andamento',links:['https://example.test/doc']},
 fll_core_values:{date:'2026-11-06',value:'Descoberta',activity:'Atividade teste',reflection:'Reflexão',participants:'Participante de teste'},
 fll_judge_preps:{category:'Robot Game',question:'Como testar?',answer:'Resposta teste',notes:'Nota',ready:true},
 fll_members:{name:'Membro fictício',role:'Programação',photo_url:'/api/media/synthetic-member-image',skills:'CAD',contributions:'Teste',order:2},
 fll_attachments:{title:'Anexo de teste',file_url:'/api/media/synthetic-attachment',file_type:'documento',description:'Descrição',date:'2026-11-06'},
 board_diaries:{program:'FRC',section:'Engenharia',date:'2026-11-06',participants:'Participante de teste',brainstorm:'Ideia',build_notes:'Montagem',process_description:'Processo',links:['/api/media/synthetic-diary']},
 team_logs:{title:'Registro de equipe',content:'Conteúdo teste',date:'2026-11-06',program:'FLL',section:'robot_game'},
 project_risks:{project:'Interclasse 2026',title:'Risco teste',cause:'Causa',impact:'Médio',probability:'Médio',preventive_action:'Prevenção',responsible:'Pessoa de teste',prevent_plan:'Plano',mitigate_plan:'Mitigar',plan_b:'Alternativa',status:'em_atencao'},
 esg_initiatives:{title:'Iniciativa teste',description:'Descrição',theme:'Resíduos',effort:'médio',horizon:'curto prazo'},
};
test('canonical fields and supplemental fields preserve every visible form value',()=>{
 for(const [table,sample] of Object.entries(samples)){
  const encoded=encodeForm(table,sample,{future_editorial_field:'preserved'});
  assert.equal(encoded.portal_form_data.future_editorial_field,'preserved');
  assert.ok(Object.keys(encoded).every(k=>FORM_CONTRACTS[table].columns.includes(k)||k==='portal_form_data'));
  const decoded=decodeForm(table,encoded);
  for(const [key,value] of Object.entries(sample))assert.deepEqual(decoded[key],value,`${table}.${key}`);
 }
 assert.equal(encodeForm('fll_tasks',samples.fll_tasks).area,'Geral');
 assert.equal(encodeForm('fll_tasks',{status:'concluida'},{},{isUpdate:true}).area,undefined);
 assert.equal(encodeForm('board_diaries',{brainstorm:'Atualizado'},{},{isUpdate:true}).title,undefined);
 assert.equal(formOrder('fll_missions','order'),'mission_number');
 assert.equal(formOrder('fll_innovation_projects','date'),'portal_form_data->>date');
 assert.equal(decodeForm('fll_judge_preps',{category:'Robot Design',key_points:'Anterior'}).category,'Robot Game');
 assert.throws(()=>encodeForm('fll_missions',{status:'unknown'}),/Status inválido/);
 const unsafe=decodeForm('fll_members',{id:'real',portal_form_data:{id:'fake',role:'admin',skills:{bad:true}}});
 assert.equal(unsafe.id,'real');assert.notEqual(unsafe.role,'admin');assert.equal(unsafe.skills,'');
});
test('invalid legacy dates and null badge variants cannot cause a blank screen; error text excludes secrets',async()=>{
 assert.equal(formatPortalDate(new Date('undefinedT12:00:00'),'dd/MM/yyyy'),'Data não informada');
 assert.equal(formatPortalDate(new Date('2026-11-06T12:00:00'),'dd/MM/yyyy'),'06/11/2026');
 assert.doesNotMatch(formErrorMessage({code:'PGRST204',message:'private-secret-value'}),/private-secret/);
 for(const code of ['42501','23514','42703','22P02','other'])assert.ok(formErrorMessage({code}).length>20);
 const load=async file=>{
  const module={exports:{}};
  vm.runInNewContext(transform(await fs.readFile(new URL('../'+file,import.meta.url),'utf8'),{transforms:['jsx','imports']}).code,
   {module,exports:module.exports,require:name=>{assert.equal(name,'react');return React;}});
  return module.exports.default;
 };
 const Badge=await load('src/components/common/Badge.jsx');
 assert.match(renderToStaticMarkup(React.createElement(Badge,{variant:null},'Conteúdo')),/Conteúdo/);
 const Boundary=await load('src/components/common/PortalErrorBoundary.jsx');
 const instance=new Boundary({children:'original'});instance.state=Boundary.getDerivedStateFromError(new Error('do-not-render-secret'));
 const html=renderToStaticMarkup(instance.render());assert.match(html,/Esta tela encontrou um erro/);assert.doesNotMatch(html,/do-not-render-secret/);
 const index=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');assert.match(index,/lang="pt-BR"/);assert.match(index,/translate="no"/);
});

test('real adapter creates/updates/reads all form contracts against production columns/checks in isolated PostgreSQL',
 {skip:!process.env.PDI_TEST_PGLITE_MODULE},async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.PDI_TEST_PGLITE_MODULE).href);const db=new PGlite();
 const fixture=JSON.parse(await fs.readFile(new URL('./fixtures/legacyFormSchema.json',import.meta.url),'utf8'));
 const actor='90000000-0000-0000-0000-000000000001';
 try{
 await db.exec('CREATE FUNCTION uuid_generate_v4() RETURNS uuid LANGUAGE sql AS $$SELECT gen_random_uuid()$$;');
 for(const [table,columns] of Object.entries(fixture.columns)){
  const ddl=columns.map(c=>`"${c.name}" ${c.type==='ARRAY'?'text[]':c.type} ${c.nullable==='NO'?'NOT NULL':''} ${c.default?'DEFAULT '+c.default:''}`).join(',');
  await db.exec(`CREATE TABLE ${table} (${ddl},PRIMARY KEY(id))`);
 }
 for(const check of fixture.checks)await db.exec(`ALTER TABLE ${check.table} ADD ${check.constraint}`);
 await assert.rejects(db.exec("INSERT INTO fll_missions(name,status) VALUES('legacy','em_teste')"),/name/);
 await assert.rejects(db.exec("INSERT INTO fll_missions(mission_number,title,status) VALUES(1,'legacy','em_teste')"),/check constraint/);
 await db.exec("INSERT INTO fll_missions(mission_number,title) VALUES(1,'Histórico preservado')");
 const before=(await db.query('SELECT to_jsonb(r) row FROM fll_missions r')).rows[0].row;
 await db.exec(await fs.readFile(new URL('../supabase/migrations/20261106_form_contract_metadata.sql',import.meta.url),'utf8'));
 const after=(await db.query("SELECT to_jsonb(r)-'portal_form_data' row FROM fll_missions r")).rows[0].row;assert.deepEqual(after,before);
 const expression=field=>{
  const match=/^(\w+)(?:->(>?)(\w+))?$/.exec(field);assert.ok(match,field);
  return `"${match[1]}"${match[3]?`->${match[2]}'${match[3]}'`:''}`;
 };
 const client={auth:{getUser:async()=>({data:{user:{id:actor,user_metadata:{full_name:'Membro de teste'}}}})},rpc:async()=>({data:true,error:null}),from(table){
  assert.ok(table in fixture.columns);
  const state={action:'select',fields:'*',filters:[]};
  const q={select(fields='*'){state.fields=fields;return q;},eq(k,v){state.filters.push([k,v]);return q;},single(){state.single=true;return q;},maybeSingle(){state.single=true;return q;},
   order(k,{ascending=true}={}){state.order=[k,ascending];return q;},limit(n){state.limit=n;return q;},insert(v){state.action='insert';state.payload=v[0];return q;},update(v){state.action='update';state.payload=v;return q;},
   async then(resolve){
    const args=[];const param=value=>{args.push(value&&typeof value==='object'&&!Array.isArray(value)?JSON.stringify(value):value);return '$'+args.length;};
    let sql;
    const returning=state.fields==='*'?'*':state.fields.split(',').map(expression).join(',');
    if(state.action==='insert'){const keys=Object.keys(state.payload);sql=`INSERT INTO ${table} (${keys.map(k=>`"${k}"`).join(',')}) VALUES (${keys.map(k=>param(state.payload[k])).join(',')}) RETURNING ${returning}`;}
    else{
     const set=state.action==='update'?' SET '+Object.keys(state.payload).map(k=>`"${k}"=${param(state.payload[k])}`).join(','):'';
     const where=state.filters.length?' WHERE '+state.filters.map(([k,v])=>`${expression(k)}=${param(v)}`).join(' AND '):'';
     sql=state.action==='update'?`UPDATE ${table}${set}${where} RETURNING ${returning}`:`SELECT ${returning} FROM ${table}${where}${state.order?' ORDER BY '+expression(state.order[0])+(state.order[1]?' ASC':' DESC'):''}${state.limit?' LIMIT '+state.limit:''}`;
    }
    try{const result=await db.query(sql,args);const rows=result.rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,value instanceof Date?(fixture.columns[table].find(c=>c.name===key)?.type==='date'?value.toISOString().slice(0,10):value.toISOString()):value])));resolve({data:state.single?rows[0]:rows,error:null});}
    catch(error){resolve({data:null,error:{code:error.code,message:error.message}});}
   }};return q;
 }};
 const context=vm.createContext({console:{log(){},error(){},warn(){}},Date,Set,Map,Object,Array,Number,JSON});const cache=new Map();
 const load=async url=>{
  if(cache.has(url.href))return cache.get(url.href);
  const module=url.pathname.endsWith('/supabaseClient.js')?new vm.SyntheticModule(['supabase'],function(){this.setExport('supabase',client);},{context,identifier:url.href}):new vm.SourceTextModule(await fs.readFile(url,'utf8'),{context,identifier:url.href});
  cache.set(url.href,module);await module.link((name,ref)=>load(new URL(name,ref.identifier)));return module;
 };
 const module=await load(new URL('../src/api/adapters/base44ToSupabaseAdapter.js',import.meta.url));await module.evaluate();
 for(const [table,sample] of Object.entries(samples)){
  const adapter=module.namespace.createEntityAdapter('ContractTest',table);
  const created=await adapter.create(sample);
  for(const [key,value] of Object.entries(sample))assert.deepEqual(JSON.parse(JSON.stringify(created[key])),value,`${table}.${key}`);
  const update=table==='fll_missions'?{status:'concluida'}:table==='fll_tasks'?{status:'concluida'}:{[FORM_CONTRACTS[table].extra[0]]:sample[FORM_CONTRACTS[table].extra[0]]};
  const updated=await adapter.update(created.id,update);
  for(const key of Object.keys(sample).filter(k=>!Object.hasOwn(update,k)))assert.deepEqual(JSON.parse(JSON.stringify(updated[key])),sample[key],`${table}.${key} kept after partial update`);
  const listed=await adapter.list(table==='fll_missions'||table==='fll_members'?'order':FORM_CONTRACTS[table].extra.includes('date')?'-date':'-created_date');assert.ok(listed.some(r=>r.id===created.id),table);
  if(table==='project_risks')assert.equal((await adapter.filter({project:'Interclasse 2026'})).length,1);
  if(table==='board_diaries')assert.equal((await adapter.filter({program:'FRC'})).length,1);
 }
 const mission=module.namespace.createEntityAdapter('Mission','fll_missions');
 for(const status of ['em_teste','concluida','descartada']){const row=await mission.create({...samples.fll_missions,status});assert.equal(row.status,status);}
 const tasks=module.namespace.createEntityAdapter('Task','fll_tasks');
 for(const status of ['pendente','em_andamento','concluida']){const row=await tasks.create({...samples.fll_tasks,status});assert.equal(row.status,status);}
 }finally{await db.close();}
});
