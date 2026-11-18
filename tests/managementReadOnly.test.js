import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {transform} from 'sucrase';
import {createManagementReadClient,MANAGEMENT_SOURCES} from '../src/api/managementReadClient.js';

test('management client validates actor before and after read and never sends a mutation',async()=>{
 let actor='manager',swap=false,fail=false,packet={actor:'manager',source:'pdis',items:[],has_more:false,available:true};
 const calls=[];const client=createManagementReadClient({auth:{getUser:async()=>({data:{user:{id:actor}}})},rpc:async(name,args)=>{calls.push([name,args]);if(swap)actor='other';return {data:packet,error:fail?{message:'SECRET_MUST_NOT_EXPOSE'}:null};}});
 await client.read('manager','pdis');assert.equal(calls[0][0],'portal_management_records');
 await assert.rejects(client.read('manager','google_oauth_credentials'));
 packet={...packet,actor:'other'};await assert.rejects(client.read('manager','pdis'));packet.actor='manager';
 packet={...packet,has_more:true,next_cursor:'previous'};await assert.rejects(client.read('manager','pdis','previous'));packet.has_more=false;
 fail=true;await assert.rejects(client.read('manager','pdis'),e=>!e.message.includes('SECRET'));fail=false;
 swap=true;await assert.rejects(client.read('manager','pdis'));assert.ok(calls.every(([name])=>name==='portal_management_records'));
});
function load(path,mocks){const mod={exports:{}};vm.runInNewContext(transform(fs.readFileSync(new URL(path,import.meta.url),'utf8'),{transforms:['jsx','imports']}).code,{React,module:mod,exports:mod.exports,require:name=>mocks[name]});return mod.exports;}
const Button=props=>React.createElement('button',props,props.children);
test('management view exposes consultation controls only, escapes document text and hides packets for another identity or denied access',()=>{
 const {ManagementReadOnlyView}=load('../src/components/internal/ManagementReadOnly.jsx',{react:React,'@tanstack/react-query':{},'@/api/supabaseClient':{supabase:{}},'@/api/managementReadClient':{createManagementReadClient:()=>({}),MANAGEMENT_SOURCES},'@/lib/AuthContext':{},'@/components/ui/button':{Button}});
 const query={data:{actor:'manager',source:'pdis',items:[{cursor:'1',record:{member_name:'synthetic member',learning_goal:'<script>malicious()</script>'}}],has_more:true,available:true},refetch:()=>{},isFetching:false};
 const args={user:{id:'manager'},query,source:'pdis',search:'',setSearch:()=>{},setSource:()=>{},previous:()=>{},next:()=>{},canPrevious:false};
 const html=renderToStaticMarkup(React.createElement(ManagementReadOnlyView,args));
 assert.match(html,/synthetic member/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script|type="file"|<form|Salvar|Excluir|Aprovar|Novo PDI|Meu PDI/);
 assert.match(html,/Próxima/);assert.match(html,/Buscar nesta página/);
 for(const q of [{...query,isError:true},{...query,data:{...query.data,actor:'other'}},{...query,data:{...query.data,source:'fll_tasks'}}])assert.doesNotMatch(renderToStaticMarkup(React.createElement(ManagementReadOnlyView,{...args,query:q})),/synthetic member|malicious/);
});

test('actual internal gate gives approved management the read-only workspace instead of recadastro, contact or personal PDI',()=>{
 let user={id:'manager',status:'approved',access_level:'management_readonly',portal_internal:false};
 const stub=()=>null;
 const gate=load('../src/components/internal/ProtectedRoute.jsx',{react:React,'react-router-dom':{useNavigate:()=>()=>{}},'@/lib/AuthContext':{useAuth:()=>({user,isAuthenticated:true,isLoadingAuth:false})},'@/utils':{createPageUrl:x=>'/'+x},'@/components/common/LoadingSpinner':stub,'@/components/ui/button':{Button},'lucide-react':{Clock:stub,XCircle:stub,Shield:stub,LogIn:stub},'@/lib/accessLevels':{canEditInternal:()=>false,isManagementReadOnly:u=>u?.access_level==='management_readonly'},'./MemberRegistrationGate':()=>{throw Error('MUST_NOT_MOUNT_RECADASTRO');},'./ManagementReadOnly':()=>React.createElement('p',null,'consultation workspace')}).default;
 assert.match(renderToStaticMarkup(React.createElement(gate,null,React.createElement('p',null,'MUST_NOT_SHOW_EDITOR'))),/consultation workspace/);
 for(const status of ['pending','rejected']){user={...user,status};assert.doesNotMatch(renderToStaticMarkup(React.createElement(gate,null,React.createElement('p',null,'MUST_NOT_SHOW_EDITOR'))),/consultation workspace|MUST_NOT_SHOW_EDITOR/);}
});
