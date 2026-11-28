import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {transform} from 'sucrase';
import React from 'react';
import {recordUploadError} from '../src/lib/recordUploadErrors.js';

test('backend resolves the authenticated profile under user RLS, not an anonymous server client',async()=>{
 let profileReads=0,accessError=null,invalid=false;
 const profile={status:'approved',role:'mentor',member_role:'member'};
 const createClient=(_url,_key,options)=>({auth:{getUser:async()=>invalid?{error:{message:'invalid'}}:{data:{user:{id:'actor',email:'synthetic@example.invalid'}}}},
  from:table=>{assert.equal(table,'profiles');assert.equal(options.global?.headers?.Authorization,'Bearer synthetic-session');profileReads++;const q={select:()=>q,eq:(key,id)=>{assert.equal(key,'id');assert.equal(id,'actor');return q;},maybeSingle:async()=>({data:profile})};return q;},
  rpc:async name=>{assert.equal(name,'ava_identity');return {data:accessError?null:{access_level:'member',portal_internal:true,portal_can_edit:true,allowed_modalities:['FRC'],modality_access_enabled:true},error:accessError};}});
 const module={exports:{}};
 vm.runInNewContext(transform(readFileSync(new URL('../api/_lib/supabaseServer.js',import.meta.url),'utf8'),{transforms:['imports']}).code,{module,exports:module.exports,process:{env:{}},require:name=>name==='@supabase/supabase-js'?{createClient}:{serverSupabaseConfig:()=>({publicConfig:{url:'https://example.invalid',publicKey:'synthetic-public-key'},serverKey:'synthetic-public-key'})}});
 const {validateUserAuth,validateUploadPermission}=module.exports;
 const actor=await validateUserAuth('Bearer synthetic-session');assert.equal(profileReads,1);assert.equal(validateUploadPermission(actor,'seasons'),true);
 accessError={code:'denied'}; // Missing authorization must remain denied.
 const denied=await validateUserAuth('Bearer synthetic-session');assert.equal(denied.profile.portal_can_edit,false);assert.throws(()=>validateUploadPermission(denied,'seasons'));
 invalid=true;const before=profileReads;await assert.rejects(validateUserAuth('Bearer synthetic-session'));assert.equal(profileReads,before);
 await assert.rejects(validateUserAuth(''));
});

function harness(upload){
 const slots=[];let cursor=0,draft,saved;
 const react={...React,useState:value=>{const n=cursor++;if(!(n in slots))slots[n]=typeof value==='function'?value():value;return [slots[n],next=>slots[n]=typeof next==='function'?next(slots[n]):next];}};
 const stub=()=>null;
 const mocks={react,'date-fns':{format:()=> '2026-11-28'},'@/lib/modalities':{RECORD_PROGRAMS:['FRC','FTC','FLL','OBR']},'@/lib/usePageVisibility':{usePageVisibility:()=>({canShowModality:()=>true})},'@/lib/recordUploadErrors':{recordUploadError},'@/api/base44Client':{base44:{integrations:{Core:{UploadFile:upload}},entities:{}}},'@/api/requestDeadline':{requestDeadline:fn=>fn()},'@tanstack/react-query':{useQueryClient:()=>({invalidateQueries(){}}),useMutation:()=>({mutate:value=>saved=value})},'./useDraft':{useDraft:(_key,initial)=>{draft??={...initial,what_was_done:'Original text',evidence_images:['/api/media/old']};return {form:draft,setForm:next=>draft=typeof next==='function'?next(draft):next,clearDraft:stub};}},sonner:{toast:{error:stub,success:stub}},'lucide-react':new Proxy({},{get:()=>stub})};
 const module={exports:{}};vm.runInNewContext(transform(readFileSync(new URL('../src/components/internal/DailyLogForm.jsx',import.meta.url),'utf8'),{transforms:['jsx','imports']}).code,{module,exports:module.exports,require:name=>mocks[name]||new Proxy({},{get:()=>stub})});
 const nodes=tree=>!tree||typeof tree!=='object'?[]:[tree,...React.Children.toArray(tree.props?.children).flatMap(nodes)];
 return {render(){cursor=0;return module.exports.default({});},nodes,draft:()=>draft,saved:()=>saved};
}
const event=file=>({target:{files:[file],value:file.name}});
test('actual daily log failure reports the cause, preserves text/attachments and releases upload for retry',async()=>{
 let calls=0;const h=harness(async()=>{calls++;throw {status:403,message:'secret must not be reflected'};});
 const input=()=>h.nodes(h.render()).find(n=>n.props?.type==='file'&&n.props.accept.startsWith('image/'));
 const file={name:'evidence.png',type:'image/png',size:68};const first=event(file);await input().props.onChange(first);
 assert.equal(first.target.value,'');assert.equal(input().props.disabled,false);assert.equal(h.draft().evidence_images.length,1);assert.equal(h.draft().what_was_done,'Original text');
 const alert=h.nodes(h.render()).find(n=>n.props.role==='alert');assert.match(alert.props.children,/não autorizou/);assert.doesNotMatch(alert.props.children,/secret|4 MB/);
 await input().props.onChange(event(file));assert.equal(calls,2);
});
test('real image/video handlers accept the size boundary and keep current edits when upload completes',async()=>{
 for(const type of ['image/png','video/mp4']){
  let resolve,request;const h=harness(args=>{request=args;return new Promise(yes=>resolve=yes);});
  const input=()=>h.nodes(h.render()).find(n=>n.props?.type==='file'&&n.props.accept.startsWith(type.startsWith('image')?'image/':'video/'));
  const file={type,name:type.startsWith('image')?'evidence.png':'clip.mp4',size:4*1024*1024};const pending=input().props.onChange(event(file));
  assert.ok(h.nodes(h.render()).filter(n=>n.props?.type==='file').every(n=>n.props.disabled));
  h.render().props.onSubmit({preventDefault(){}});assert.equal(h.saved(),undefined);
  h.nodes(h.render()).find(n=>n.props.placeholder==='Descreva as atividades realizadas...').props.onChange({target:{value:'Latest edits'}});
  resolve({file_url:'/api/media/synthetic-file'});await pending;
  assert.equal(h.draft().what_was_done,'Latest edits');assert.equal(request.context,'seasons');assert.equal(request.program,'FRC');
  assert.ok((type.startsWith('image')?h.draft().evidence_images:h.draft().video_urls).includes('/api/media/synthetic-file'));
 }
});
test('upload errors are safe, specific and never expose arbitrary provider messages',()=>{
 for(const [error,pattern] of [[{code:'GOOGLE_DRIVE_REAUTH_REQUIRED'},/renovada/],[{status:401},/sessão/],[{status:403},/não autorizou/],[{status:413},/4 MB/],[{status:400},/MP4/],[{status:503},/indisponível/],[{name:'AbortError'},/demorou/]])assert.match(recordUploadError({...error,message:'PRIVATE_TOKEN'}),pattern);
 assert.doesNotMatch(recordUploadError({message:'PRIVATE_TOKEN'}),/PRIVATE_TOKEN/);
});
