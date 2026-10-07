import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../api/_lib/supabaseServer.js',import.meta.url),'utf8');
const validate=vm.runInNewContext(source.slice(source.indexOf('export function validateUploadPermission')).replace('export function','function')+';validateUploadPermission');
test('AVA-only approved profile cannot upload private internal or public project assets',()=>{
 const user={profile:{status:'approved',member_role:'member',portal_internal:false,is_admin:false,ava_admin:false}};
 for(const context of ['projects','daily-logs','meeting-notes','prototype-tests','ava'])assert.throws(()=>validate(user,context));
});
test('AVA-only flags cannot bypass the requirement of Membro Líder for content uploads',()=>{
 const user={profile:{status:'pending',portal_internal:false,is_admin:false,ava_admin:true}};
 assert.throws(()=>validate(user,'ava'),/Membro Líder/);
 for(const context of ['projects','fll-audio','products','test'])assert.throws(()=>validate(user,context));
});
test('Internal membership does not authorize AVA content uploads',()=>{
 assert.throws(()=>validate({profile:{status:'approved',portal_internal:true,is_admin:false,ava_admin:false}},'ava'),/administração/);
 assert.equal(validate({profile:{status:'approved',portal_internal:true,is_admin:true}},'ava'),true);
});
const mediaSource=fs.readFileSync(new URL('../api/_lib/mediaSecurity.js',import.meta.url),'utf8');
const accessSource=mediaSource.slice(mediaSource.indexOf('async function handlePrivateAccess'))+';handlePrivateAccess';
test('Private AVA media checks the enrolled reference instead of legacy internal approval',async()=>{
 let authorized=false,calls=0;
 const handle=vm.runInNewContext(accessSource,{
  validateUserAuth:async()=>({profile:{status:'approved',portal_internal:true,is_admin:false}}),
  createScopedUserSupabaseClient:token=>({rpc:async(name,args)=>{assert.equal(token,'session');assert.equal(name,'ava_media_allowed');assert.equal(args.p_file,'lesson-file');calls++;return {data:authorized,error:null};}})
 });
 const params={fileMeta:{id:'lesson-file',appProperties:{context:'ava'}},req:{headers:{authorization:'Bearer session'}}};
 assert.equal((await handle(params)).statusCode,403);
 authorized=true;
 assert.equal((await handle(params)).allowed,true);
 assert.equal(calls,2);
 assert.equal((await handle({...params,req:{headers:{},query:{token:'session'}}})).statusCode,401);
 assert.equal(calls,2);
});
