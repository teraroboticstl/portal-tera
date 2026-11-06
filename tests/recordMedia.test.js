import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { requestDeadline } from '../src/api/requestDeadline.js';

async function moduleWith(url, mocks, globals={}) {
 const context=vm.createContext({console:{log(){},warn(){},error(){}},Date,Set,Map,AbortController,AbortSignal,FormData,Blob,URL,...globals});
 const cache=new Map();
 async function load(url) {
  if(cache.has(url.href))return cache.get(url.href);
  const match=Object.keys(mocks).find(s=>url.pathname.endsWith(s));
  const m=match ? new vm.SyntheticModule(Object.keys(mocks[match]),function(){for(const [key,value] of Object.entries(mocks[match]))this.setExport(key,value);},{context,identifier:url.href}) : new vm.SourceTextModule(await fs.readFile(url,'utf8'),{context,identifier:url.href});
  cache.set(url.href,m);await m.link((specifier,ref)=>load(new URL(specifier,ref.identifier)));return m;
 }
 const m=await load(url);await m.evaluate();return m.namespace;
}

test('upload: private context and bearer, missing session, size limit, 413 and network failure',async()=>{
 let session={access_token:'synthetic-session-only',user:{id:'actor'}},response,request;
 const m=await moduleWith(new URL('../src/api/googleDriveClient.js',import.meta.url),{
  '/supabaseClient.js':{supabase:{auth:{getSession:async()=>({data:{session}})}}},
  '/requestDeadline.js':{requestDeadline:operation=>requestDeadline(operation,50)}
 },{fetch:async(url,init)=>{request={url,init};if(response instanceof Error)throw response;return response;}});
 const file=new Blob(['test'],{type:'image/png'});
 response={ok:true,json:async()=>({data:{fileId:'synthetic-file'}})};
 assert.equal((await m.uploadToGoogleDrive({file,context:'seasons'})).fileId,'synthetic-file');
 assert.equal(request.url,'/api/media/upload');assert.equal(request.init.headers.Authorization,'Bearer synthetic-session-only');assert.equal(request.init.body.get('context'),'seasons');
 await assert.rejects(m.uploadToGoogleDrive({file:{size:4*1024*1024+1}}),/4 MB/);
 session=null;await assert.rejects(m.uploadToGoogleDrive({file}),/autenticado/);session={access_token:'synthetic-session-only'};
 response={ok:false,status:413,json:async()=>{throw Error();}};await assert.rejects(m.uploadToGoogleDrive({file}),/limite/);
 response=new Error('Network down');await assert.rejects(m.uploadToGoogleDrive({file}),/Network down/);
 response={ok:false,json:async()=>({error:'Permissão negada'})};await assert.rejects(m.uploadToGoogleDrive({file}),/Permissão negada/);
 response={ok:true,json:async()=>({authUrl:'https://accounts.google.com/synthetic-consent'})};assert.equal((await m.getGoogleAuthUrl()).authUrl,'https://accounts.google.com/synthetic-consent');assert.equal(request.url,'/api/auth/google/url');
 session=null;await assert.rejects(m.getGoogleAuthUrl(),/autenticado/);
});

test('private media never sends token to external URL, checks current actor and refuses denied file',async()=>{
 let session={access_token:'synthetic',user:{id:'owner'}},calls=0,ok=true;
 const m=await moduleWith(new URL('../src/api/privateMedia.js',import.meta.url),{
  '/supabaseClient.js':{supabase:{auth:{getSession:async()=>({data:{session}})}}},
  '/requestDeadline.js':{requestDeadline:operation=>requestDeadline(operation,50)}
 },{fetch:async()=>{calls++;return {ok,blob:async()=>new Blob(['fake'])};}});
 const signal=new AbortController().signal;
 await assert.rejects(m.fetchPrivateMedia('https://example.com/api/media/id','owner',signal));assert.equal(calls,0);
 await assert.rejects(m.fetchPrivateMedia('/api/media/id','other',signal));assert.equal(calls,0);
 assert.equal((await m.fetchPrivateMedia('/api/media/id','owner',signal)).size,4);
 ok=false;await assert.rejects(m.fetchPrivateMedia('/api/media/id','owner',signal));
 session=null;await assert.rejects(m.fetchPrivateMedia('/api/media/id','owner',signal));
 assert.equal(m.isMediaAddress('javascript:alert(1)'),false);assert.equal(m.isMediaAddress('//foreign.example/file'),false);
});

test('media security: private PDI is author/admin only and record references prevent deletion',async()=>{
 let actor={id:'owner',profile:{status:'approved',portal_internal:true,is_admin:false}};
 let failed=false,published=false;
 const client={from:table=>{const q={select:()=>q,ilike:()=>q,or:()=>q,eq:()=>q,then:resolve=>resolve({data:[],count:table==='daily_logs'?1:table==='event_medias' && published?1:0,error:failed && table==='meeting_notes'?{message:'offline'}:null})};return q;}};
 const m=await moduleWith(new URL('../api/_lib/mediaSecurity.js',import.meta.url),{
  '/googleDrive.js':{getRootFolderId:async()=>null},
  '/supabaseServer.js':{supabaseServer:client,validateUserAuth:async()=>actor,createScopedUserSupabaseClient:()=>client}
 });
 const fileMeta={id:'personal-file',appProperties:{app:'portal_tera',context:'pdi',visibility:'private',uploaderId:'owner'}};
 const req={headers:{authorization:'Bearer synthetic'}};
 assert.equal((await m.verifyMediaAccess({fileMeta,req})).allowed,true);
 actor={...actor,id:'other'};assert.equal((await m.verifyMediaAccess({fileMeta,req})).statusCode,403);
 actor.profile.is_admin=true;assert.equal((await m.verifyMediaAccess({fileMeta,req})).allowed,true);
 assert.equal((await m.verifyMediaAccess({fileMeta,req:{headers:{}}})).statusCode,401);
 const ref=await m.isFileReferencedInDb('record-only');assert.equal(ref.isReferenced,true);assert.ok(ref.entities.includes('daily_logs'));
 failed=true;assert.equal((await m.isFileReferencedInDb('record-failure')).conclusive,false);failed=false;
 const linked={id:'event-file',appProperties:{app:'portal_tera',context:'event-assets',visibility:'record'}};
 published=true;assert.equal((await m.verifyMediaAccess({fileMeta:linked,req:{headers:{}}})).isPublic,true);
 published=false;assert.equal((await m.verifyMediaAccess({fileMeta:linked,req:{headers:{}}})).statusCode,401);
});

test('actual upload endpoint accepts new private/record contexts without public sharing',async()=>{
 let context='seasons',upload,deny=false,program='FTC';
 const m=await moduleWith(new URL('../api/media/[id].js',import.meta.url),{
  '/crypto':{default:{createHash:()=>({update:()=>({digest:()=> 'synthetic-digest'})})}},
  '/googleDrive.js':{getDriveErrorInfo:()=>({status:500,code:'failure',message:'Falha'}),getGoogleDriveClient:()=>({files:{get:async()=>({data:{id:'synthetic-file-123',appProperties:{context},mimeType:'image/png',size:1}})}}),resolveTargetFolder:async()=> 'private-folder',sanitizeFileName:name=>name,uploadBufferToDrive:async params=>{upload=params;return {id:'synthetic-file',name:'fixture.png',mimeType:'image/png'};}},
  '/mediaSecurity.js':{verifyMediaAccess:()=>({allowed:true,isPublic:true}),isFileReferencedInDb:()=>{},invalidateFileDbCache:()=>{}},
  '/supabaseServer.js':{supabaseServer:{},validateUserAuth:async()=>{if(deny)throw Error('unauthorized');return {id:'actor',email:'synthetic@example.invalid',profile:{portal_internal:true,modality_access_enabled:true,allowed_modalities:['FTC']}};},validateUploadPermission:()=>{}},
  '/multipart.js':{parseMultipart:async()=>({fields:{context,program},file:{buffer:new Uint8Array([1]),size:1,mimeType:'image/png',filename:'fixture.png'}})},
  '/fllAudioStorage.js':{cacheAudioBytes:()=>{}}
 });
 function response(){return {code:0,body:null,headers:{},setHeader(key,value){this.headers[key]=value;},status(code){this.code=code;return this;},json(body){this.body=body;return this;},end(){return this;}};}
 for(context of ['seasons','pdi','event-assets']){const res=response();await m.default({method:'POST',headers:{authorization:'Bearer synthetic'}},res);assert.equal(res.code,200,JSON.stringify(res.body));assert.equal(upload.context,context);assert.equal(upload.isPublic,false);assert.equal(upload.uploaderId,'actor');}
 upload=null;program='FRC';const blocked=response();await m.default({method:'POST',headers:{authorization:'Bearer synthetic'}},blocked);assert.equal(blocked.code,403);assert.equal(upload,null);
 upload=null;deny=true;const res=response();await m.default({method:'POST',headers:{}},res);assert.equal(res.code,401);assert.equal(upload,null);
 context='event-assets';const head=response();await m.default({method:'HEAD',url:'/api/media/synthetic-file-123',headers:{}},head);assert.equal(head.code,200);assert.match(head.headers['Cache-Control'],/no-store/);
});
