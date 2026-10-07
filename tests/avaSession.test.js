import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/api/avaClient.js',import.meta.url),'utf8').replace(/^import .*;\s*/,'').replaceAll('export async function','async function');
test('AVA refreshes rejected sessions once, preserves mutation payload and does not retry permission denials',async()=>{
 let statuses=[401,200],calls=[],refreshes=0;
 const context={URLSearchParams,supabase:{auth:{getSession:async()=>({data:{session:{access_token:'old'}}}),refreshSession:async()=>{refreshes++;return{data:{session:{access_token:'new'}},error:null};}}},fetch:async(url,opts)=>{calls.push({url,...opts});return{status:statuses.shift(),ok:statuses.length===0,json:async()=>({data:{success:true},error:'Acesso negado'})};}};
 const mutate=vm.runInNewContext(source+';avaMutate',context);
 assert.deepEqual(JSON.parse(JSON.stringify(await mutate('set_access',{access_level:'student'}))),{success:true});
 assert.equal(refreshes,1);assert.equal(calls.length,2);assert.equal(calls[0].body,calls[1].body);assert.equal(calls[1].headers.Authorization,'Bearer new');
 statuses=[403,500];calls=[];refreshes=0;
 await assert.rejects(()=>mutate('set_access',{}),/Acesso negado/);assert.equal(calls.length,1);assert.equal(refreshes,0);
});
