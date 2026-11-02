import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transform } from 'sucrase';
import { pathToFileURL } from 'node:url';
import { INTERNAL_PAGES, canDisplayPage, visibilityKey } from '../src/lib/internalPageVisibility.js';
import { createPageVisibilityClient } from '../src/api/pageVisibilityClient.js';

const packet = (admin=false) => ({ actor:'member', is_admin:admin,
  pages:Object.fromEntries(INTERNAL_PAGES.map(([key])=>[key,{visible:true,revision:0}])) });

test('catalogue covers all internal routes except administrative audit; recovery/public routes cannot be hidden', () => {
  const config=fs.readFileSync(new URL('../src/pages.config.js',import.meta.url),'utf8');
  const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
  const names=new Set([...config.matchAll(/"(Internal\w+)":/g),...app.matchAll(/currentPageName="(Internal\w+)"/g)].map(m=>m[1]));
  for(const name of names) if(name!=='InternalAuditLog') assert.ok(visibilityKey(name),name);
  for(const page of ['AreaInterna','AdminPanel','SeasonConfig','AVA','Home','InternalAuditLog']) assert.equal(visibilityKey(page),undefined);
  assert.equal(visibilityKey('internalriskanalysis'),'InternalRiskAnalysis');
  assert.equal(new Set(INTERNAL_PAGES.map(([key])=>key)).size,INTERNAL_PAGES.length);
});

test('visibility denies hidden, missing, wrong-account data; backend admin can inspect hidden pages', () => {
  const data=packet(); data.pages.InternalRiskAnalysis.visible=false;
  assert.equal(canDisplayPage('InternalRiskAnalysis',data,'member'),false);
  assert.equal(canDisplayPage('internalriskanalysis',data,'member'),false);
  assert.equal(canDisplayPage('InternalLogs',data,'member'),true);
  assert.equal(canDisplayPage('InternalLogs',data,'other'),false);
  assert.equal(canDisplayPage('InternalLogs',null,'member'),false);
  assert.equal(canDisplayPage('AreaInterna',null,'member'),true);
  data.is_admin=true;
  assert.equal(canDisplayPage('InternalRiskAnalysis',data,'member'),true);
});

test('RPC client preserves session identity, validates snapshot, uses exact fields and never exposes provider errors', async () => {
  let data=packet(), actor='member', fail=false;
  const calls=[];
  const api=createPageVisibilityClient({auth:{getUser:async()=>({data:{user:{id:actor}}})},
    rpc:async(name,args)=>{calls.push({name,args});return fail ? {error:{message:'secret-provider-detail'}} : {data};}});
  assert.equal((await api.read('member')).is_admin,false);
  await api.set('member','InternalRiskAnalysis',false,0);
  assert.deepEqual(calls.at(-1),{name:'portal_page_visibility_set',args:{p_page:'InternalRiskAnalysis',p_visible:false,p_revision:0}});
  await assert.rejects(api.set('member','AdminPanel',false,0));
  await assert.rejects(api.set('member','InternalLogs','false',0));
  data={...data,actor:'other'};
  await assert.rejects(api.read('member'),/confirmar a visibilidade/);
  data=packet(); delete data.pages.InternalLogs;
  await assert.rejects(api.read('member'),/confirmar a visibilidade/);
  data=packet(); fail=true;
  await assert.rejects(api.read('member'),e=>!e.message.includes('secret-provider-detail'));
  actor='other'; await assert.rejects(api.read('member'));
});

test('actual route gate never mounts hidden content or its requests; visible/admin paths render', () => {
  const source=fs.readFileSync(new URL('../src/components/internal/PageVisibilityGate.jsx',import.meta.url),'utf8');
  const module={exports:{}};
  const mocks={react:React,'react-router-dom':{Link:({children})=>React.createElement('a',null,children)},
    '@/lib/usePageVisibility':{usePageVisibility:()=>({})},
    '@/lib/internalPageVisibility':{canDisplayPage,visibilityKey}};
  vm.runInNewContext(transform(source,{transforms:['jsx','imports']}).code,{module,exports:module.exports,require:name=>mocks[name]});
  let mounted=0;
  const Child=()=>{mounted++;return React.createElement('p',null,'sensitive-content');};
  const render=(snapshot,error=false)=>renderToStaticMarkup(React.createElement(module.exports.PageVisibilityState,
    {page:'InternalRiskAnalysis',actor:'member',snapshot,error,retry:()=>{}},React.createElement(Child)));
  const data=packet(); data.pages.InternalRiskAnalysis.visible=false;
  assert.match(render(data),/temporariamente indisponível/);
  assert.match(render(null,true),/Tentar novamente/);
  render({...data,actor:'other'}); assert.equal(mounted,0);
  data.is_admin=true; assert.match(render(data),/sensitive-content/);
  data.is_admin=false;data.pages.InternalRiskAnalysis.visible=true;
  assert.match(render(data),/sensitive-content/); assert.equal(mounted,2);
});

const runtime=process.env.PDI_TEST_PGLITE_MODULE;
test('real sidebar removes hidden links; admin tab renders Show/Hide and denies non-admin controls', () => {
  let data=packet(); data.pages.InternalRiskAnalysis.visible=false;
  const compile=path=>{
    const source=fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
    const module={exports:{}};
    const mocks={react:React,'react-router-dom':{Link:({children,to})=>React.createElement('a',{href:to},children),useLocation:()=>({})},
      '@/utils':{createPageUrl:x=>'/'+x},
      'lucide-react':new Proxy({}, {get:()=>()=>null}),
      '@tanstack/react-query':{useQueryClient:()=>({})},
      '@/lib/internalPageVisibility':{INTERNAL_PAGES},
      '@/lib/usePageVisibility':{usePageVisibility:()=>({actor:'member',snapshot:data,canShow:page=>canDisplayPage(page,data,'member')})}};
    vm.runInNewContext(transform(source,{transforms:['jsx','imports']}).code,{module,exports:module.exports,require:name=>mocks[name]});
    return module.exports.default;
  };
  const Nav=compile('src/components/internal/InternalNav.jsx');
  const Management=compile('src/components/admin/PageVisibilityManagement.jsx');
  const render=Component=>renderToStaticMarkup(React.createElement(Component));
  assert.doesNotMatch(render(Nav),/href="\/InternalRiskAnalysis"/);
  assert.match(render(Nav),/href="\/InternalLogs"/);
  assert.match(render(Management),/Somente administradores/);
  assert.doesNotMatch(render(Management),/aria-label="Mostrar/);
  data.is_admin=true;
  assert.match(render(Nav),/href="\/InternalRiskAnalysis"/);
  assert.match(render(Management),/aria-label="Mostrar Análise de Risco"/);
  assert.match(render(Management),/aria-label="Ocultar Logs Diários"/);
});
test('isolated PostgreSQL: RLS, admin-only mutation, persistence, revision conflicts, protected routes and rollback', {skip:!runtime}, async()=>{
  const {PGlite}=await import(pathToFileURL(runtime).href);
  const db=new PGlite();
  const admin='10000000-0000-0000-0000-000000000001';
  const member='10000000-0000-0000-0000-000000000002';
  const trainee='10000000-0000-0000-0000-000000000003';
  const student='10000000-0000-0000-0000-000000000004';
  const migration=fs.readFileSync(new URL('../supabase/migrations/20261028_internal_page_visibility.sql',import.meta.url),'utf8');
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated,anon;
      CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT auth.uid()='${admin}'::uuid $$;
      CREATE FUNCTION public.portal_internal_access() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT auth.uid() IN ('${admin}'::uuid,'${member}'::uuid,'${trainee}'::uuid) $$;`);
    await db.exec(migration);
    const login=async(id,role='authenticated')=>{await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec(`SET ROLE ${role}`);};
    const snap=async()=> (await db.query('SELECT public.portal_page_visibility_snapshot() AS result')).rows[0].result;
    const set=async(page,visible,rev)=>db.query('SELECT public.portal_page_visibility_set($1,$2,$3) AS result',[page,visible,rev]);
    await login(admin);
    const initial=await snap(); assert.equal(initial.is_admin,true);
    assert.deepEqual(Object.keys(initial.pages).sort(),INTERNAL_PAGES.map(([key])=>key).sort());
    assert.ok(Object.values(initial.pages).every(row=>row.visible && row.revision===0));
    await set('InternalRiskAnalysis',false,0);
    await assert.rejects(set('InternalRiskAnalysis',true,0),/CONFLICT/);
    await assert.rejects(set('AdminPanel',false,0),/UNKNOWN/);
    for(const id of [member,trainee]) {
      await login(id); const data=await snap(); assert.equal(data.is_admin,false);
      assert.equal(data.pages.InternalRiskAnalysis.visible,false);
      await assert.rejects(set('InternalRiskAnalysis',true,1),/ADMIN_REQUIRED/);
      await assert.rejects(db.exec("UPDATE public.portal_page_visibility SET visible=true"),/permission denied/);
      await assert.rejects(db.exec("INSERT INTO public.portal_page_visibility(page_key) VALUES('AdminPanel')"),/permission denied/);
    }
    await login(student);
    assert.equal((await db.query('SELECT * FROM public.portal_page_visibility')).rows.length,0);
    await assert.rejects(snap(),/ACCESS_DENIED/);
    await login('', 'anon'); await assert.rejects(snap(),/permission denied/);
    await login(admin); await set('InternalRiskAnalysis',true,1);
    assert.equal((await snap()).pages.InternalRiskAnalysis.visible,true);
    await set('InternalRiskAnalysis',false,2);
    await db.exec('RESET ROLE');
    await db.exec(fs.readFileSync(new URL('../supabase/rollbacks/20261028_internal_page_visibility.sql',import.meta.url),'utf8'));
    await login(member); assert.equal((await snap()).pages.InternalRiskAnalysis.visible,true);
  } finally { await db.close(); }
});
