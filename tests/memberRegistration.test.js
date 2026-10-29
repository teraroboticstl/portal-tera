import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transform } from 'sucrase';
import { createMemberRegistrationClient } from '../src/api/memberRegistrationClient.js';

test('registration client binds both reads to session and hides sensitive failures', async () => {
  let actor='owner', packet={actor:'owner',enabled:true,required:true,completed_version:0}, fail=false;
  const calls=[];
  const client=createMemberRegistrationClient({ auth:{getUser:async()=>({data:{user:{id:actor}}})},
    rpc(name,args) { calls.push({name,args}); return { then(resolve) {
      if(fail) { actor='other'; return Promise.resolve(resolve({error:{message:'secret provider error'}})); }
      return Promise.resolve(resolve({data:packet}));
    } }; } });
  assert.equal((await client.status('owner')).required,true);
  packet={actor:'owner',enabled:true,required:false,completed_version:1,preferred_name:'<script>nome</script>',private_data:'never forwarded'};
  const result=await client.complete('owner',{preferred_name:'Nome'});
  assert.equal(result.preferred_name,'<script>nome</script>');
  assert.equal(result.private_data,undefined);
  assert.deepEqual(calls[1],{name:'member_registration_complete',args:{p_data:{preferred_name:'Nome'}}});
  packet={...packet,actor:'other'};
  await assert.rejects(client.status('owner'),/Não foi possível confirmar/);
  packet={...packet,actor:'owner',completed_version:0};
  await assert.rejects(client.status('owner'),/Não foi possível confirmar/);
  fail=true;
  await assert.rejects(client.complete('owner',{}),error=>!error.message.includes('secret'));
  const count=calls.length;
  await assert.rejects(client.status('owner'));
  assert.equal(calls.length,count,'wrong session does not query context');
});

const button=({children,...props})=>React.createElement('button',props,children);
function component(file,extra={}) {
  const source=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
  const mocks={react:React,'@/api/supabaseClient':{supabase:{}},
    '@/api/memberRegistrationClient':{createMemberRegistrationClient:()=>({})},
    '@/components/ui/button':{Button:button},...extra};
  mocks['@/lib/registrationContext'] ??= {RegistrationProfileContext:React.createContext(null)};
  const module={exports:{}};
  vm.runInNewContext(transform(source,{transforms:['jsx','imports']}).code,{module,exports:module.exports,
    require(name){assert.ok(name in mocks,name);return mocks[name];}});
  return module.exports;
}
test('actual registration gate blocks protected children, including errors and wrong identity; form is private and complete',()=>{
  const {MemberRegistrationState:Gate}=component('src/components/internal/MemberRegistrationGate.jsx');
  let mounts=0;
  const Child=({user})=>{mounts++;return React.createElement('p',null,user.preferred_name);};
  const user={id:'owner',role:'admin'};
  const render=status=>renderToStaticMarkup(React.createElement(Gate,{status,user,error:'Falha genérica',onRetry:()=>{},onSubmit:()=>{}},React.createElement(Child)));
  assert.match(render(null),/Falha genérica/);
  assert.equal(mounts,0);
  assert.match(render({actor:'other',required:false}),/Verificando recadastro/);
  const form=render({actor:'owner',required:true});
  for(const text of ['Como quer ser chamado','Idade atual','Por que entrou','Modalidade','Área(s)','Experiências anteriores','contribuir','Temporada','Objetivos','Habilidades','revisão do mentor']) assert.ok(form.includes(text),text);
  assert.equal(mounts,0);
  const html=render({actor:'owner',required:false,preferred_name:'<img src=x onerror=alert(1)>'});
  assert.equal(mounts,1);
  assert.match(html,/&lt;img/);
});
test('existing authorization and public/AVA routes remain; admin and member pass through same registration gate',()=>{
  let auth;
  const {default:Route}=component('src/components/internal/ProtectedRoute.jsx',{
    'react-router-dom':{useNavigate:()=>()=>{}},'@/lib/AuthContext':{useAuth:()=>auth},
    '@/utils':{createPageUrl:x=>'/'+x},'@/components/common/LoadingSpinner':{__esModule:true,default:()=>null},
    'lucide-react':Object.fromEntries(['Clock','XCircle','Shield','LogIn'].map(x=>[x,()=>null])),
    '@/lib/accessLevels':{canEditInternal:user=>user.portal_can_edit},
    './MemberRegistrationGate':{__esModule:true,default:()=>React.createElement('p',null,'REGISTRATION_GATE')}
  });
  for(const role of ['admin','aluno']) {
    auth={isAuthenticated:true,user:{id:'owner',role,status:'approved',portal_internal:true}};
    assert.match(renderToStaticMarkup(React.createElement(Route,null,React.createElement('p',null,'protected'))),/REGISTRATION_GATE/);
  }
  auth={isAuthenticated:true,user:{id:'owner',role:'aluno',status:'approved',portal_internal:false}};
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(Route,null,React.createElement('p',null,'protected'))),/REGISTRATION_GATE/);
  const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
  assert.match(app,/startsWith\('Internal'\)/);
  assert.doesNotMatch(app,/MemberRegistration|registration_complete/);
});

test('floating ULTRON receives chosen greeting through nested layouts, only for current session',()=>{
  const context=React.createContext(null);
  const wrap=({children})=>React.createElement('div',null,children);
  const {default:Chat}=component('src/components/fll/TerAIChat.jsx',{
    'lucide-react':{Bot:()=>null},'@/lib/AuthContext':{useAuth:()=>({isAuthenticated:true,user:{id:'owner',portal_internal:true}})},
    '@/lib/registrationContext':{RegistrationProfileContext:context},
    '@/components/ui/dialog':Object.fromEntries(['Dialog','DialogTrigger','DialogContent','DialogHeader','DialogTitle','DialogDescription'].map(name=>[name,wrap])),
    '@/components/internal/UltronReadOnlySearch':{__esModule:true,default:({user})=>React.createElement('p',null,user.preferred_name)},
    '@/pages/AVA.css':{}
  });
  const render=actor=>renderToStaticMarkup(React.createElement(context.Provider,{value:{actor,preferred_name:'Nome <escolhido>'}},React.createElement(Chat)));
  assert.match(render('owner'),/Nome &lt;escolhido&gt;/);
  assert.doesNotMatch(render('other'),/Nome/);
});
