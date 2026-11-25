import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transform} from 'sucrase';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createFrcScoutingClient} from '../src/api/frcScoutingClient.js';
const actor='10000000-0000-0000-0000-000000000001',id='20000000-0000-0000-0000-000000000001';
test('management client sends allowlisted actions with expected state, never a SQL table or actor',async()=>{
 let current=actor,packet={actor,id,action:'rename'};const calls=[];
 const api=createFrcScoutingClient({auth:{getUser:async()=>({data:{user:{id:current}}})},rpc:async(name,args)=>{calls.push({name,args});return {data:packet};}});
 const request={kind:'event',id,action:'rename',name:' New name ',expectedName:'Old name',expectedArchived:false};
 await api.manage(actor,request);
 assert.deepEqual(calls[0],{name:'frc_scouting_manage',args:{p_kind:'event',p_id:id,p_action:'rename',p_name:'New name',p_expected_name:'Old name',p_expected_archived:false}});
 for(const patch of [{kind:'users'},{action:'delete'},{id:'invalid'},{name:'   '},{expectedArchived:undefined}])await assert.rejects(api.manage(actor,{...request,...patch}));
 packet={...packet,actor:'other'};await assert.rejects(api.manage(actor,request));
 current='other';const n=calls.length;await assert.rejects(api.manage(actor,request));assert.equal(calls.length,n);
});
function buttons(node,found=[]){if(Array.isArray(node)){node.forEach(n=>buttons(n,found));return found;}if(node?.type==='button')found.push(node);if(node?.props?.children)buttons(node.props.children,found);return found;}

test('permanent deletion uses a dedicated RPC and requires the exact confirmation',async()=>{
 const calls=[];const api=createFrcScoutingClient({auth:{getUser:async()=>({data:{user:{id:actor}}})},rpc:async(name,args)=>{calls.push({name,args});return {data:{actor,id,action:'delete'}};}});
 const request={kind:'event',id,action:'delete',expectedName:'Regional teste',expectedArchived:true};
 for(const confirmation of [undefined,'','excluir'])await assert.rejects(api.manage(actor,{...request,confirmation}));
 await assert.rejects(api.manage(actor,{...request,kind:'season',confirmation:'EXCLUIR'}));assert.equal(calls.length,0);
 await api.manage(actor,{...request,confirmation:'EXCLUIR'});
 assert.deepEqual(calls,[{name:'frc_scouting_delete_event',args:{p_event:id,p_expected_name:'Regional teste',p_expected_archived:true,p_confirmation:'EXCLUIR'}}]);
});

test('actual delete dialog needs typed confirmation and identifies irreversible scope',()=>{
 for(const confirmation of ['','EXCLUIR']){
  let index=0;const state=['event',id,'',false,true,confirmation],requests=[];
  const react={...React,useState:()=>[state[index++],()=>{}]};const wrap=({children})=>React.createElement('div',null,children);
  const dialog={Dialog:({open,children})=>open?React.createElement('div',null,children):null,...Object.fromEntries(['DialogContent','DialogHeader','DialogTitle','DialogDescription'].map(k=>[k,wrap]))};
  const module={exports:{}};vm.runInNewContext(transform(readFileSync(new URL('../src/components/frc/FrcScoutingManagement.jsx',import.meta.url),'utf8'),{transforms:['jsx','imports']}).code,{module,exports:module.exports,require:key=>key==='react'?react:dialog});
  const tree=module.exports.default({data:{events:[{id,tournament_name:'Regional teste',scouting_season_id:'s',scouting_archived_at:'2026-01-01'}],seasons:[],teams:[]},season:'s',busy:false,onManage:r=>requests.push(r)});
  const html=renderToStaticMarkup(tree);assert.match(html,/não pode ser desfeita/);assert.match(html,/bloqueada se houver registros/);
  const confirm=buttons(tree).find(b=>b.props.children==='Confirmar exclusão definitiva');assert.equal(confirm.props.disabled,confirmation!=='EXCLUIR');confirm.props.onClick();
  assert.equal(requests.length,confirmation==='EXCLUIR'?1:0);if(requests.length){assert.equal(requests[0].action,'delete');assert.equal(requests[0].confirmation,'EXCLUIR');}
 }
});
test('actual management UI escapes names and confirms reversible archive/restore with UUID',()=>{
 for(const archived of [false,true]){
  let index=0;const state=['event',id,'New name',true],requests=[];
  const react={...React,useState:()=>[state[index++],()=>{}]};
  const wrap=({children})=>React.createElement('div',null,children);
  const dialog={Dialog:({open,children})=>open?React.createElement('div',null,children):null,...Object.fromEntries(['DialogContent','DialogHeader','DialogTitle','DialogDescription'].map(k=>[k,wrap]))};
  const module={exports:{}};vm.runInNewContext(transform(readFileSync(new URL('../src/components/frc/FrcScoutingManagement.jsx',import.meta.url),'utf8'),{transforms:['jsx','imports']}).code,{module,exports:module.exports,require:key=>key==='react'?react:dialog});
  const tree=module.exports.default({data:{events:[{id,tournament_name:'<script>unsafe</script>',scouting_season_id:'s',scouting_archived_at:archived?'2026-01-01':null}],seasons:[],teams:[]},season:'s',busy:false,onManage:r=>requests.push(r)});
  const html=renderToStaticMarkup(tree);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/Nenhuma partida ou vínculo será apagado/);
  buttons(tree).find(b=>b.props.children==='Confirmar').props.onClick();
  assert.equal(requests[0].id,id);assert.equal(requests[0].action,archived?'restore':'archive');assert.equal(requests[0].expectedArchived,archived);
 }
});
