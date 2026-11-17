import test from 'node:test';
import assert from 'node:assert/strict';
import {shopPrice,shopCatalog,shopCategories,shopFilter,shopWhatsApp} from '../src/lib/teraShop.js';
test('public shop handles database numeric strings, invalid prices and unavailable products',()=>{
 assert.match(shopPrice('35.90'),/35,90/);for(const n of [null,undefined,NaN,-1,Infinity,'bad','',0])assert.equal(shopPrice(n),'Valor a consultar');
 const rows=[{id:'a',name:'Camiseta',price:'35.90',category:'Vestuário'},{id:'b',name:'Chaveiro',category:'Colecionáveis',available:false},{id:'c',name:'Caneca',in_stock:false},{id:'d',name:'Botton',category:'Outros'}];
 const catalog=shopCatalog(rows);assert.deepEqual(catalog.map(p=>p.id),['a','d']);assert.deepEqual(shopCategories(catalog),['Outros','Vestuário']);assert.equal(shopFilter(catalog,'Vestuário','CAMISETA').length,1);assert.equal(shopFilter(catalog,'Outros','Camiseta').length,0);assert.deepEqual(shopCatalog(null),[]);
});
test('shop never directs customers to placeholder phone and escapes product text in WhatsApp URL',()=>{
 for(const phone of ['',null,'5567999999999','123'])assert.equal(shopWhatsApp(phone,{name:'Teste',price:5}),null);
 const url=new URL(shopWhatsApp('+1 (555) 555-0123',{name:'Camiseta & Robô #1',price:'35.90'}));assert.equal(url.origin,'https://wa.me');assert.equal(url.pathname,'/15555550123');assert.match(url.searchParams.get('text'),/Camiseta & Robô #1/);assert.match(url.searchParams.get('text'),/35,90/);
});
import fs from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {transform} from 'sucrase';
import * as shop from '../src/lib/teraShop.js';
function pageHarness(){
 let query={},state=[],index=0,requests=[];
 const react={...React,useState:initial=>{const n=index++;if(!(n in state))state[n]=initial;return [state[n],v=>state[n]=v];}};
 const noop=()=>null,wrap=({children})=>React.createElement('div',null,children);
 const mocks={react,'@tanstack/react-query':{useQuery:opts=>{requests.push(opts);return query;}},'react-router-dom':{Link:({to,children,...props})=>React.createElement('a',{href:to,...props},children)},'lucide-react':new Proxy({},{get:()=>noop}),'@/api/base44Client':{base44:{entities:{Product:{filter:async(...args)=>{requests.push(args);return [];}}}}},'@/components/ui/button':{Button:({children,...props})=>React.createElement('button',props,children)},'@/components/ui/dialog':{Dialog:({open,children})=>open?React.createElement('div',{role:'dialog'},children):null,DialogContent:wrap,DialogHeader:wrap,DialogTitle:wrap,DialogDescription:wrap},'@/components/common/SafeImage':{__esModule:true,default:({alt})=>React.createElement('span',null,alt)},'@/lib/teraShop':shop};
 const mod={exports:{}};const source=fs.readFileSync(new URL('../src/pages/TeraShop.jsx',import.meta.url),'utf8').replace('import.meta.env.VITE_TERASHOP_WHATSAPP_NUMBER',"''");
 vm.runInNewContext(transform(source,{transforms:['jsx','imports']}).code,{module:mod,exports:mod.exports,require:n=>mocks[n]});
 return {requests,set:q=>query=q,select:id=>state[2]=id,render(){index=0;return renderToStaticMarkup(mod.exports.default());}};
}
test('actual public storefront queries available products, handles load/error/empty and renders safe product details without login',async()=>{
 const h=pageHarness();h.set({isLoading:true});assert.match(h.render(),/Carregando produtos/);await h.requests[0].queryFn();assert.deepEqual(JSON.parse(JSON.stringify(h.requests.at(-1))),[{available:true},'-created_date',200]);
 h.set({isError:true,data:[{id:'a',name:'STALE PRIVATE ITEM'}]});const error=h.render();assert.match(error,/Não foi possível carregar/);assert.doesNotMatch(error,/STALE PRIVATE ITEM/);
 h.set({data:[]});assert.match(h.render(),/Novidades chegando/);
 h.set({data:[{id:'a',name:'Camiseta <script>',description:'Descrição & detalhes',price:'35.90',category:'Vestuário'},{id:'b',name:'HIDDEN PRODUCT',available:false}]});let html=h.render();assert.match(html,/35,90/);assert.match(html,/Camiseta &lt;script&gt;/);assert.doesNotMatch(html,/HIDDEN PRODUCT|<script>/);assert.match(html,/Ver produto/);
 h.select('a');html=h.render();assert.match(html,/role="dialog"/);assert.match(html,/Consultar a equipe/);assert.doesNotMatch(html,/5567999999999|window.open/);
});
