import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {transform} from 'sucrase';
const file={id:'synthetic-file-123',name:'<script>chart</script>.png',type:'image/png',size:70,date:'2026-11-13',url:'/api/media/synthetic-file-123'};
function nodes(tree){if(!tree||typeof tree!=='object')return [];return [tree,...React.Children.toArray(tree.props?.children).flatMap(nodes)];}
function harness(){
 const state=[];let index=0,query={data:{files:[file],canUpload:true,nextCursor:'second-page'},isFetching:false},upload=async()=>{},invalidated=0,key;
 const hooks={...React,useId:()=> 'fixture',useEffect:()=>{},useRef:initial=>{const n=index++;return state[n]??(state[n]={current:initial});},useState:initial=>{const n=index++;if(!(n in state))state[n]=initial;return [state[n],next=>state[n]=typeof next==='function'?next(state[n]):next];}};
 const stub=()=>null,mocks={react:hooks,'@tanstack/react-query':{useQuery:options=>{key=options.queryKey;return query;},useQueryClient:()=>({invalidateQueries:async()=>invalidated++})},'@/api/biAnalysisClient':{readBiFiles:()=>{},uploadBiFile:(...args)=>upload(...args),downloadBiFile:()=>{}},'./BiVisuals':{biButton:'min-h-11'},'lucide-react':new Proxy({},{get:()=>stub}),'@/components/common/PortalMedia':stub};
 const mod={exports:{}};vm.runInNewContext(transform(fs.readFileSync(new URL('../src/components/bi/BiAnalysisLibrary.jsx',import.meta.url),'utf8'),{transforms:['jsx','imports']}).code,{React:hooks,module:mod,exports:mod.exports,require:name=>mocks[name],AbortController});
 return {render(){index=0;return mod.exports.default({program:'FRC',user:{id:'actor'}});},query:value=>query=value,upload:fn=>upload=fn,get invalidated(){return invalidated;},get key(){return key;}};
}
test('actual library hides stale/private data while revalidating; text is inert and readonly users cannot upload',()=>{
 const h=harness();let html=renderToStaticMarkup(h.render());assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/Baixar arquivo/);
 h.query({data:{files:[file],canUpload:false},isFetching:false});assert.equal(nodes(h.render()).some(n=>n.type==='input'&&n.props.type==='file'),false);
 h.query({data:{files:[file],canUpload:true},isFetching:true});html=renderToStaticMarkup(h.render());assert.doesNotMatch(html,/chart|Baixar arquivo|Enviar arquivo de análise/);
 h.query({data:{files:[file]},error:Error('Denied'),isFetching:false});assert.doesNotMatch(renderToStaticMarkup(h.render()),/chart|Baixar arquivo/);
});
test('real upload handler resets selection, rejects duplicate events while busy, preserves library on failure and refreshes on success',async()=>{
 const h=harness();let reject,resolve,calls=0;
 h.upload(async(selected,program,actor)=>{calls++;assert.equal(program,'FRC');assert.equal(actor,'actor');return new Promise((yes,no)=>{resolve=yes;reject=no;});});
 const input=()=>nodes(h.render()).find(n=>n.type==='input'&&n.props.type==='file');
 const event=()=>({currentTarget:{value:'chart.png',files:[{name:'chart.png',type:'image/png',size:70}]}});
 const e=event(),pending=input().props.onChange(e);assert.equal(e.currentTarget.value,'');assert.equal(input().props.disabled,true);await input().props.onChange(event());assert.equal(calls,1);
 reject(Object.assign(Error('unavailable'),{code:'GOOGLE_DRIVE_REAUTH_REQUIRED'}));await pending;
 assert.equal(input().props.disabled,false);assert.equal(h.invalidated,0);assert.match(renderToStaticMarkup(h.render()),/renovação ao administrador/);assert.match(renderToStaticMarkup(h.render()),/chart/);
 const retry=input().props.onChange(event());resolve({fileId:'synthetic-file-123'});await retry;assert.equal(h.invalidated,1);assert.match(renderToStaticMarkup(h.render()),/Arquivo enviado/);
});
test('actual library pagination changes query scope and restores previous page',()=>{
 const h=harness();const next=nodes(h.render()).find(n=>n.type==='button'&&n.props.children==='Próxima página');next.props.onClick();h.render();assert.deepEqual(Array.from(h.key),['bi-analysis','actor','FRC','second-page']);
 const previous=nodes(h.render()).find(n=>n.type==='button'&&n.props.children==='Anterior');assert.equal(previous.props.disabled,false);previous.props.onClick();h.render();assert.deepEqual(Array.from(h.key),['bi-analysis','actor','FRC',null]);
});
