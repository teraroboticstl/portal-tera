import { QueryClient, MutationCache } from '@tanstack/react-query';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

test('global mutation errors are visible without duplicating a local handler or exposing service details',async()=>{
 const notices=[];
 const context=vm.createContext({});
 const m=new vm.SourceTextModule(await fs.readFile(new URL('../src/lib/query-client.js',import.meta.url),'utf8'),{context});
 await m.link(async name=>{
  const exports=name==='sonner'?{toast:{error:message=>notices.push(message)}}:{QueryClient,MutationCache};
  return new vm.SyntheticModule(Object.keys(exports),function(){for(const [key,value] of Object.entries(exports))this.setExport(key,value);},{context});
 });
 await m.evaluate();const client=m.namespace.queryClientInstance;
 const fail=async()=>{throw Error('private diagnostic detail');};
 await assert.rejects(client.getMutationCache().build(client,{mutationFn:fail}).execute());
 assert.equal(notices.length,1);assert.ok(!notices[0].includes('private diagnostic detail'));
 let localCalled=false;await assert.rejects(client.getMutationCache().build(client,{mutationFn:fail,onError:()=>{localCalled=true;}}).execute());
 assert.equal(localCalled,true);assert.equal(notices.length,1);client.clear();
});
