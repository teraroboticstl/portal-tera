import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {validateBiFile} from '../src/lib/biAnalysisFiles.js';
import {authorizeBiFiles,validateBiBytes,createBiFilesHandler} from '../api/_lib/biAnalysisFiles.js';

const user={id:'actor',profile:{portal_internal:true,portal_can_edit:true,status:'approved'}};
const snapshot=(program='FRC')=>({actor:'actor',modalities:[program],pages:{InternalFRCScout:{visible:true},InternalFTCScout:{visible:true},InternalFLLDashboard:{visible:true}}});
const metadata=(program='FRC')=>({id:'synthetic-file-123',name:'grafico.png',mimeType:'image/png',size:'70',createdTime:'2026-11-13T15:00:00Z',appProperties:{app:'portal_tera',context:'bi-analysis',program,visibility:'private',uploaderId:'unnecessary-identity'}});
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(body){this.body=body;return this;},end(){this.ended=true;return this;}};}
test('analysis formats: explicit extensions, byte signatures, size limits and inert CSV/ZIP storage',()=>{
 for(const [name,bytes]of [['report.pdf',Buffer.from('%PDF-1.4\n')],['chart.png',Buffer.from([137,80,78,71,13,10,26,10])],['chart.jpg',Buffer.from([255,216,255])],['chart.webp',Buffer.from('RIFF0000WEBP')],['scout.csv',Buffer.from('team,score\n1,20')],['report.xlsx',Buffer.from([80,75,3,4])],['report.pbix',Buffer.from([80,75,3,4])]])assert.equal(validateBiBytes({filename:name,size:bytes.length,buffer:bytes}),validateBiFile({name,size:bytes.length}));
 for(const name of ['evil.svg','evil.html','evil.exe','report.xlsm','report.png.html'])assert.throws(()=>validateBiFile({name,size:20}));
 assert.throws(()=>validateBiFile({name:'report.pbix',size:4*1024*1024+1}));
 assert.throws(()=>validateBiBytes({filename:'chart.png',size:8,buffer:Buffer.from('<script>')}));
 assert.throws(()=>validateBiBytes({filename:'scout.csv',size:2,buffer:Buffer.from([0,1])}));
});
test('access enforces identity, allowed modality, hidden page and current write permission',async()=>{
 let actor=user,access=snapshot(),calls=0;
 const options={header:'Bearer synthetic',program:'FRC',authenticate:async()=>actor,scopedClient:()=>({rpc:async()=>{calls++;return {data:access};}})};
 assert.equal((await authorizeBiFiles(options)).id,'actor');
 actor={...user,profile:{...user.profile,portal_can_edit:false}};await assert.rejects(authorizeBiFiles({...options,write:true}),e=>e.status===403);
 assert.equal((await authorizeBiFiles(options)).id,'actor');
 for(const changed of [snapshot('FTC'),{...snapshot(),actor:'other'},{...snapshot(),pages:{}}]){access=changed;await assert.rejects(authorizeBiFiles(options),e=>e.status===403);}
 const before=calls;await assert.rejects(authorizeBiFiles({...options,header:''}),e=>e.status===401);assert.equal(calls,before);
});
test('catalogue checks permission before and after Drive, paginates and projects no credentials/identities',async()=>{
 let access=snapshot(),driveCalls=0,authCalls=0,params;
 const handler=createBiFilesHandler({authenticate:async()=>{authCalls++;return user;},scopedClient:()=>({rpc:async()=>({data:access})}),getDrive:async()=>({files:{list:async p=>{driveCalls++;params=p;return {data:{files:[metadata(),metadata('FTC'),{...metadata(),appProperties:{}}],nextPageToken:'next-page'}};}}})});
 const req={method:'GET',query:{program:'FRC',cursor:'~!!~opaque.token'},headers:{authorization:'Bearer synthetic'}};
 const res=response();await handler(req,res);assert.equal(res.code,200);assert.equal(res.body.files.length,1);assert.equal(res.body.canUpload,true);assert.equal(res.body.nextCursor,'next-page');assert.equal(params.pageSize,30);assert.equal(params.pageToken,'~!!~opaque.token');assert.match(params.q,/value='FRC'/);assert.match(res.headers['Cache-Control'],/no-store/);assert.doesNotMatch(JSON.stringify(res.body),/uploaderId|unnecessary-identity|appProperties/);
 access=snapshot('FTC');const denied=response();await handler(req,denied);assert.equal(denied.code,403);assert.equal(driveCalls,1);
 const invalid=response();await handler({...req,query:{program:"FRC' or true"}},invalid);assert.equal(invalid.code,403);assert.equal(driveCalls,1);assert.ok(authCalls>=2);
});
test('revocation during listing, anonymous and Drive failure return no partial file metadata',async()=>{
 let revoked=false,fail=false,anonymous=false;
 const handler=createBiFilesHandler({authenticate:async()=>{if(anonymous)throw Error('secret');return user;},scopedClient:()=>({rpc:async()=>({data:revoked?snapshot('FTC'):snapshot()})}),getDrive:async()=>({files:{list:async()=>{if(fail)throw Error('provider-token-sensitive');revoked=true;return {data:{files:[metadata()]}};}}})});
 const req={method:'GET',query:{program:'FRC'},headers:{authorization:'Bearer synthetic'}};
 let res=response();await handler(req,res);assert.equal(res.code,403);assert.equal(res.body.files,undefined);
 revoked=false;fail=true;res=response();await handler(req,res);assert.equal(res.code,503);assert.doesNotMatch(JSON.stringify(res.body),/sensitive|token/);
 anonymous=true;res=response();await handler(req,res);assert.equal(res.code,401);
});

async function loadMedia(mocks) {
 const context=vm.createContext({console:{log(){},warn(){},error(){}},Buffer,Date,Set,Map,AbortSignal,AbortController,encodeURIComponent});const cache=new Map();
 function load(url){if(cache.has(url.href))return cache.get(url.href);const promise=(async()=>{const key=Object.keys(mocks).find(k=>url.pathname.endsWith(k));const mod=key?new vm.SyntheticModule(Object.keys(mocks[key]),function(){for(const [k,v]of Object.entries(mocks[key]))this.setExport(k,v);},{context,identifier:url.href}):new vm.SourceTextModule(await fs.readFile(url,'utf8'),{context,identifier:url.href});await mod.link((s,r)=>load(new URL(s,r.identifier)));return mod;})();cache.set(url.href,promise);return promise;}
 const mod=await load(new URL('../api/media/[id].js',import.meta.url));await mod.evaluate();return mod.namespace.default;
}
test('real media route: analysis upload private/program-bound; HEAD requires current permissions; deletion blocked',async()=>{
 let actor=user,access=snapshot(),uploaded,context='bi-analysis',program='FRC';
 let file={filename:'grafico.png',mimeType:'application/octet-stream',size:8,buffer:Buffer.from([137,80,78,71,13,10,26,10])};
 const drive={files:{get:async()=>({data:metadata()})}};
 const handler=await loadMedia({
  '/crypto':{default:{createHash:()=>({update:()=>({digest:()=> 'synthetic-hash'})})}},
  '/googleDrive.js':{getRootFolderId:async()=>null,getDriveErrorInfo:()=>({status:503,code:'UNAVAILABLE',message:'Indisponível'}),getGoogleDriveClient:async()=>drive,resolveTargetFolder:async()=> 'private-folder',sanitizeFileName:n=>n,uploadBufferToDrive:async p=>{uploaded=p;return {id:'synthetic-file-123',name:p.fileName,mimeType:p.mimeType};}},
  '/supabaseServer.js':{supabaseServer:{},validateUserAuth:async()=>actor,validateUploadPermission:()=>{},createScopedUserSupabaseClient:()=>({rpc:async()=>({data:access})})},
  '/multipart.js':{parseMultipart:async()=>({fields:{context,program},file})},'/fllAudioStorage.js':{cacheAudioBytes:()=>{}}
 });
 const headers={authorization:'Bearer synthetic'},req={method:'POST',headers};let res=response();await handler(req,res);assert.equal(res.code,200);assert.equal(uploaded.isPublic,false);assert.equal(uploaded.context,'bi-analysis');assert.equal(uploaded.program,'FRC');assert.equal(uploaded.uploaderId,'actor');assert.equal(uploaded.mimeType,'image/png');
 actor={...user,profile:{...user.profile,portal_can_edit:false}};uploaded=null;res=response();await handler(req,res);assert.equal(res.code,403);assert.equal(uploaded,null);
 actor=user;file={...file,buffer:Buffer.from('<script>')};res=response();await handler(req,res);assert.equal(res.code,422);assert.equal(uploaded,null);
 for(const allowed of [true,false]){access=snapshot(allowed?'FRC':'FTC');res=response();await handler({method:'HEAD',query:{id:'synthetic-file-123'},headers},res);assert.equal(res.code,allowed?200:403);if(allowed){assert.match(res.headers['Cache-Control'],/no-store/);assert.equal(res.headers['X-Content-Type-Options'],'nosniff');assert.match(res.headers['Content-Disposition'],/^attachment;/);}else assert.equal(res.headers['Content-Type'],undefined);}
 access=snapshot();actor={...user,profile:{...user.profile,is_admin:true}};res=response();await handler({method:'DELETE',query:{id:'synthetic-file-123'},headers},res);assert.equal(res.code,409);
 context='pdi';program='FRC';file={filename:'photo.png',mimeType:'image/png',buffer:Buffer.from([1]),size:1};res=response();await handler(req,res);assert.equal(res.code,200);assert.equal(uploaded.program,undefined);
});

test('actual browser client preserves session boundaries and refuses external or forged download locations',async()=>{
 let identity='actor',fetches=0,uploads=0,downloads=0;
 const context=vm.createContext({AbortSignal,encodeURIComponent});
 const mod=new vm.SourceTextModule(await fs.readFile(new URL('../src/api/biAnalysisClient.js',import.meta.url),'utf8'),{context});
 const packet={actor:'actor',program:'FRC',files:[{id:'synthetic-file-123',name:'chart.png',url:'/api/media/synthetic-file-123'}],nextCursor:null};
 const mocks={
  './supabaseClient.js':{supabase:{auth:{getUser:async()=>({data:{user:{id:identity}}}),getSession:async()=>({data:{session:{user:{id:identity},access_token:'synthetic'}}})}}},
  './requestDeadline.js':{requestDeadline:operation=>operation(new AbortController().signal)},
  './googleDriveClient.js':{uploadToGoogleDrive:async params=>{uploads++;assert.equal(params.context,'bi-analysis');assert.equal(params.program,'FRC');return {fileId:'synthetic-file-123'};}},
  './privateMedia.js':{fetchPrivateMedia:async()=>{downloads++;return new Blob(['synthetic']);}},
  '../lib/biAnalysisFiles.js':{validateBiFile}
 };
 context.fetch=async(url,options)=>{fetches++;assert.match(url,/scope=analysis&program=FRC/);assert.equal(options.headers.Authorization,'Bearer synthetic');return {ok:true,json:async()=>packet};};
 await mod.link(s=>new vm.SyntheticModule(Object.keys(mocks[s]),function(){for(const [k,v]of Object.entries(mocks[s]))this.setExport(k,v);},{context}));await mod.evaluate();
 assert.equal((await mod.namespace.readBiFiles('FRC','actor')).files.length,1);
 await mod.namespace.uploadBiFile({name:'report.csv',size:20},'FRC','actor');assert.equal(uploads,1);
 const controller=new AbortController();await mod.namespace.downloadBiFile(packet.files[0],'actor',controller.signal);assert.equal(downloads,1);
 await assert.rejects(mod.namespace.downloadBiFile({...packet.files[0],url:'https://evil.invalid/file'},'actor',controller.signal));assert.equal(downloads,1);
 context.fetch=async()=>{fetches++;identity='changed';return {ok:true,json:async()=>packet};};
 await assert.rejects(mod.namespace.readBiFiles('FRC','actor'));await assert.rejects(mod.namespace.uploadBiFile({name:'report.csv',size:20},'FRC','actor'));assert.equal(uploads,1);assert.equal(fetches,2);
});
