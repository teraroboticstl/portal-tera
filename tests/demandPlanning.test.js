import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {transform} from 'sucrase';
import {createDemandPlanningClient} from '../src/api/demandPlanningClient.js';
import {DEMAND_PRIORITIES,demandMeta,orderDemandItems,normalizeDemandPhone,demandWhatsAppLink} from '../src/lib/demandPlanning.js';
const id=n=>`92000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const actor=id(1),recipient=id(2),item={id:id(10),text:'Synthetic task',done:false};
const card={id:id(20),owner_id:actor,board:'FTC',title:'Synthetic card',items:[item],item_meta:{[item.id]:{priority:'urgent',assignee_id:recipient}},revision:0,archived:false};
const packet=()=>({actor,board:'FTC',boards:['personal','FTC'],items:[card],can_edit:true,recipients:[{id:recipient,name:'Synthetic recipient'}],has_more:false,next_cursor:null});
test('planning client validates current identity, same board and metadata; missing rollout RPC alone falls back',async()=>{
 let current=actor,result=packet(),error=null;const calls=[];
 const client={auth:{getUser:async()=>({data:{user:{id:current}}})},rpc:async(name,args)=>{calls.push({name,args});return {data:result,error};}};
 const api=createDemandPlanningClient(client);
 assert.equal((await api.read(actor,'FTC')).advanced,true);assert.equal(calls.at(-1).args.p_card,null);
 result={...packet(),items:[{...card,board:'FRC'}]};await assert.rejects(api.read(actor,'FTC'));
 result={...packet(),items:[{...card,item_meta:{[item.id]:{priority:'execute_script',assignee_id:recipient}}}]};await assert.rejects(api.read(actor,'FTC'));
 current=recipient;const before=calls.length;await assert.rejects(api.read(actor,'FTC'));assert.equal(calls.length,before);
 current=actor;result=packet();error={code:'42501',message:'sensitive database details'};await assert.rejects(api.read(actor,'FTC'),e=>!e.message.includes('sensitive'));assert.equal(calls.at(-1).name,'portal_demands_v2_read');
 const fallback=createDemandPlanningClient({auth:client.auth,rpc:async(name)=>name==='portal_demands_v2_read'?{error:{code:'PGRST202'}}:{data:{...packet(),has_more:false,next_cursor:null}}});
 assert.equal((await fallback.read(actor,'FTC')).advanced,false);
});
test('priority order is stable and completed items never precede urgent pending work; phone normalization is separate from consent',()=>{
 const c={...card,items:[{id:id(11),text:'low',done:false},{id:id(12),text:'done',done:true},{id:id(13),text:'urgent',done:false}],item_meta:{[id(11)]:{priority:'low'},[id(12)]:{priority:'urgent'},[id(13)]:{priority:'urgent'}}};
 assert.deepEqual(orderDemandItems(c).map(i=>i.text),['urgent','low','done']);assert.equal(demandMeta({items:[]},{id:'old'}).priority,'normal');
 assert.equal(normalizeDemandPhone('+1 (555) 555-0123'),'+15555550123');assert.equal(normalizeDemandPhone(''),null);
});
const elements=tree=>!tree||typeof tree!=='object'?[]:[tree,...React.Children.toArray(tree.props?.children).flatMap(elements)];
function contactHarness(){
 const state=[];let index=0,query={};
 const react={...React,useState:initial=>{const n=index++;if(!(n in state))state[n]=initial;return [state[n],next=>state[n]=typeof next==='function'?next(state[n]):next];}};
 const button=({children,...props})=>React.createElement('button',props,children);
 const mocks={react,'@tanstack/react-query':{useQuery:()=>query,useQueryClient:()=>({})},'./DemandWhatsApp':{default:()=>null},'@/api/supabaseClient':{supabase:{}},'@/api/demandPlanningClient':{createDemandPlanningClient:()=>({})},'@/lib/demandPlanning':{normalizeDemandPhone},'@/components/ui/button':{Button:button}};
 const mod={exports:{}};vm.runInNewContext(transform(fs.readFileSync(new URL('../src/components/internal/DemandContact.jsx',import.meta.url),'utf8'),{transforms:['jsx','imports']}).code,{module:mod,exports:mod.exports,require:n=>mocks[n]});
 return {api:mod.exports,query:q=>query=q,render(fn,props){index=0;return fn(props);}};
}
test('contact gate blocks protected children until own status is confirmed; only a missing migration permits rollout fallback',()=>{
 const h=contactHarness();let mounts=0;const child=React.createElement(()=>{mounts++;return React.createElement('p',null,'PROTECTED');});
 const props={user:{id:actor},children:child};
 const html=()=>renderToStaticMarkup(h.render(h.api.default,props));
 assert.doesNotMatch(html(),/PROTECTED/);h.query({data:{actor:recipient,required:false}});assert.doesNotMatch(html(),/PROTECTED/);
 h.query({error:Error('network')});assert.doesNotMatch(html(),/PROTECTED/);assert.equal(mounts,0);
 h.query({data:{actor,required:true}});assert.match(html(),/Não possuo número/);assert.equal(mounts,0);
 h.query({data:{actor,required:false}});assert.match(html(),/PROTECTED/);
 h.query({error:Object.assign(Error(),{code:'NOT_INSTALLED'})});assert.match(html(),/PROTECTED/);
});
test('actual contact form clears WhatsApp consent after changing number and supports no-number without forcing consent',()=>{
 const h=contactHarness();let saved;const props={initial:{phone:'+15555550123',manual_whatsapp_opt_in:true},onSubmit:data=>saved=data};
 const render=()=>h.render(h.api.DemandContactForm,props);
 let tree=render();elements(tree).find(n=>n.type==='input'&&n.props.type==='tel').props.onChange({target:{value:'+15555550124'}});
 tree=render();const checks=elements(tree).filter(n=>n.type==='input'&&n.props.type==='checkbox');assert.equal(checks[1].props.checked,false);
 checks[0].props.onChange({target:{checked:true}});tree=render();assert.equal(elements(tree).some(n=>n.type==='input'&&n.props.type==='tel'),false);
 tree.props.onSubmit({preventDefault(){}});assert.equal(saved.phone,null);assert.equal(saved.no_phone,true);assert.equal(saved.whatsapp_opt_in,false);
});
test('actual demand card shows per-item priority and responsible without injecting text',()=>{
 const mod={exports:{}},noop=()=>null,container=({children,...props})=>React.createElement('div',props,children);
 const mocks={react:React,'@tanstack/react-query':{},'lucide-react':new Proxy({},{get:()=>noop}),'@/api/supabaseClient':{supabase:{}},'@/api/demandBoardsClient':{},'@/api/demandPlanningClient':{createDemandPlanningClient:()=>({})},'@/lib/demandPlanning':{DEMAND_PRIORITIES,demandMeta,orderDemandItems},'@/components/ui/button':{Button:({children,...props})=>React.createElement('button',props,children)},'@/components/ui/dialog':new Proxy({},{get:()=>container})};
 vm.runInNewContext(transform(fs.readFileSync(new URL('../src/components/internal/DemandBoard.jsx',import.meta.url),'utf8'),{transforms:['jsx','imports']}).code,{module:mod,exports:mod.exports,require:n=>mocks[n]});
 const html=renderToStaticMarkup(React.createElement(mod.exports.DemandCard,{card,advanced:true,editable:true,recipients:[{id:recipient,name:'<script>recipient</script>'}]}));assert.match(html,/Urgente/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
});

test('actual notification dialog links only the authorized item and hides stale/error data',()=>{
 const mod={exports:{}},noop=()=>null;
 let query={data:{actor,unread:1,has_more:false,items:[{id:id(30),card_id:card.id,board:'FTC',title:'<script>card</script>',item_text:'Synthetic task',priority:'urgent',done:false,created_at:'2026-11-15T14:00:00Z'}]}};
 const wrap=({children})=>React.createElement('div',null,children),button=({children,...props})=>React.createElement('button',props,children);
 const mocks={react:React,'react-router-dom':{Link:({to,children})=>React.createElement('a',{href:to},children)},'lucide-react':{Bell:noop},'@tanstack/react-query':{useQuery:()=>query,useQueryClient:()=>({})},'@/api/supabaseClient':{supabase:{}},'@/api/demandPlanningClient':{createDemandPlanningClient:()=>({})},'@/lib/demandPlanning':{DEMAND_PRIORITIES},'./DemandContact':{DemandContactForm:noop},'@/components/ui/button':{Button:button},'@/components/ui/dialog':Object.fromEntries(['Dialog','DialogContent','DialogHeader','DialogTitle','DialogDescription'].map(k=>[k,wrap]))};
 vm.runInNewContext(transform(fs.readFileSync(new URL('../src/components/internal/DemandNotifications.jsx',import.meta.url),'utf8'),{transforms:['jsx','imports']}).code,{module:mod,exports:mod.exports,require:n=>mocks[n]});
 const html=()=>renderToStaticMarkup(React.createElement(mod.exports.default,{actor,open:true,onOpenChange:noop}));
 assert.match(html(),/Urgente/);assert.match(html(),/&lt;script&gt;/);assert.match(html(),new RegExp('board=FTC&amp;card='+card.id));assert.match(html(),/ainda não estão configurados/);
 query={...query,isFetching:true};assert.doesNotMatch(html(),/Synthetic task|Abrir demanda/);
 query={...query,isFetching:false,error:Error('revoked')};assert.doesNotMatch(html(),/Synthetic task|Abrir demanda/);
});


test('manual WhatsApp link uses fixed destination and generic authorized Portal link only',()=>{
 const p={phone:'+15555550123',board:'FTC',card_id:card.id};const url=new URL(demandWhatsAppLink(p));
 assert.equal(url.origin,'https://wa.me');assert.equal(url.pathname,'/15555550123');
 assert.match(url.searchParams.get('text'),/https:\/\/portal-tera.vercel.app\/InternalDemands/);
 assert.ok(!url.searchParams.get('text').includes(card.title));
 assert.throws(()=>demandWhatsAppLink({...p,board:'personal'}));assert.throws(()=>demandWhatsAppLink({...p,phone:'javascript:alert(1)'}));
});


test('WhatsApp uses a native authorized expiring link without scripted popup or external navigation in tests',async()=>{
 const state=[];let index=0,now=1000,result={actor,available:true,phone:'+15555550123',board:'FTC',card_id:card.id,item_id:item.id,assignee_id:recipient};
 const react={...React,useEffect:()=>{},useState:initial=>{const n=index++;if(!(n in state))state[n]=initial;return [state[n],value=>state[n]=value];}};
 const mocks={react,'@/api/supabaseClient':{supabase:{}},'@/api/demandPlanningClient':{createDemandPlanningClient:()=>({whatsapp:async()=>result})},'@/lib/demandPlanning':{demandWhatsAppLink},'@/components/ui/button':{Button:({children,...props})=>React.createElement('button',props,children)}};
 const mod={exports:{}};class Clock extends Date{static now(){return now;}}
 vm.runInNewContext(transform(fs.readFileSync(new URL('../src/components/internal/DemandWhatsApp.jsx',import.meta.url),'utf8'),{transforms:['jsx','imports']}).code,{module:mod,exports:mod.exports,require:n=>mocks[n],Date:Clock});
 const render=()=>{index=0;return mod.exports.default({actor,card,item});};
 let tree=render();assert.equal(elements(tree).some(n=>n.type==='a'),false);
 await elements(tree).find(n=>typeof n.props?.onClick==='function').props.onClick();tree=render();
 const link=elements(tree).find(n=>n.type==='a');assert.equal(new URL(link.props.href).origin,'https://wa.me');assert.equal(link.props.target,'_blank');assert.equal(link.props.rel,'noopener noreferrer');assert.equal(link.props.referrerPolicy,'no-referrer');assert.ok(!decodeURIComponent(link.props.href).includes(item.text));
 now=32000;let prevented=false;link.props.onClick({preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(elements(render()).some(n=>n.type==='a'),false);
 result={actor,available:false};tree=render();await elements(tree).find(n=>typeof n.props?.onClick==='function').props.onClick();tree=render();assert.equal(elements(tree).some(n=>n.type==='a'),false);assert.match(renderToStaticMarkup(tree),/conta selecionada/);
});
