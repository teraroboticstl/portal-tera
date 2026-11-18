import test from 'node:test';import assert from 'node:assert/strict';
import {createBiTransferHandler} from '../api/_lib/biFileTransfer.js';
import {BI_CHUNK_SIZE,BI_FILE_LIMIT} from '../src/lib/biAnalysisFiles.js';
const actor={id:'member-a',profile:{portal_internal:true,portal_can_edit:true}},snapshot=()=>({actor:actor.id,modalities:['FRC'],pages:{InternalFRCScout:{visible:true}}});
function harness(){let metaOverride={},onDownload=()=>{},user=actor,view=snapshot(),time=1000,size=0,offset=0,fileId='synthetic-bi-file-123',finished=false,loseFinal=false,calls=[],bytes;const folder='private-bi-folder',session='https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=synthetic-private-session';
 const metadata=()=>({id:fileId,size:String(size),parents:[folder],appProperties:{app:'portal_tera',context:'bi-analysis',program:'FRC',visibility:'private'},...metaOverride});
 const drive={files:{generateIds:async()=>({data:{ids:[fileId]}}),get:async(q,o)=>{if(q.alt==='media'){onDownload();const [,start,end]=/bytes=(\d+)-(\d+)/.exec(o.headers.Range);return {data:bytes.subarray(Number(start),Number(end)+1)};}if(!finished)throw Object.assign(Error(),{response:{status:404}});return {data:metadata()};}}};
 const transport={request:async q=>{calls.push(q);if(q.method==='POST'){assert.equal(q.data.appProperties.visibility,'private');assert.equal(q.data.appProperties.program,'FRC');size=Number(q.headers['X-Upload-Content-Length']);bytes=Buffer.alloc(Math.min(size,8*1024*1024));return {status:200,headers:{location:session}};}
 if(q.headers['Content-Range']===`bytes */${size}`){if(finished)throw Object.assign(Error(),{response:{status:404}});return {status:308,headers:offset?{range:`bytes=0-${offset-1}`}:{}};}
 const [,start,end,total]=/bytes (\d+)-(\d+)\/(\d+)/.exec(q.headers['Content-Range']);assert.equal(Number(total),size);assert.equal(Number(start),offset);assert.ok(q.data.length<=BI_CHUNK_SIZE);q.data.copy(bytes,offset);offset=Number(end)+1;finished=offset===size;
 if(finished&&loseFinal)throw Error('ACK_LOST');return finished?{status:200,data:{id:fileId}}:{status:308,headers:{range:`bytes=0-${offset-1}`}};}};
 const handler=createBiTransferHandler({authenticate:async()=>{if(!user)throw Error('secret-auth-detail');return user;},scopedClient:()=>({rpc:async()=>({data:view})}),getDrive:async()=>drive,getTransport:async()=>transport,resolveFolder:async()=>folder,key:()=> 'ab'.repeat(32),now:()=>time});
 async function run(method,{scope='analysis-upload',ticket,body=Buffer.alloc(0),...query}={}){const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(p){this.packet=p;return this;},end(p){this.binary=p;return this;}};await handler({method,query:{program:'FRC',scope,...query},headers:{authorization:'Bearer synthetic',...(ticket?{'x-bi-upload':ticket}:{})},body},res);return res;}
 return {run,calls,metadata:v=>metaOverride=v,onDownload:f=>onDownload=f,view:v=>view=v,user:u=>user=u,time:n=>time=n,loseFinal:()=>loseFinal=true,bytes:()=>bytes};
}
test('resumable PBIX over 4MB stays private, encrypts session and bounds every request/response to 2MB',async()=>{
 const h=harness(),size=BI_CHUNK_SIZE*2+1000;let r=await h.run('POST',{body:Buffer.from(JSON.stringify({name:'robot.pbix',size}))});assert.equal(r.code,200);const ticket=r.packet.ticket;assert.ok(ticket);assert.doesNotMatch(JSON.stringify(r.packet),/googleapis|upload_id|private-session|private-bi-folder/);
 const chunks=[];for(let offset=0;offset<size;offset+=BI_CHUNK_SIZE){const bytes=Buffer.alloc(Math.min(BI_CHUNK_SIZE,size-offset),3);if(!offset)Buffer.from([80,75,3,4]).copy(bytes);chunks.push(bytes);r=await h.run('PUT',{ticket,offset,body:bytes});assert.equal(r.code,200);assert.equal(r.packet.offset,Math.min(offset+BI_CHUNK_SIZE,size));}assert.equal(r.packet.complete,true);
 const received=[];for(let offset=0;offset<size;offset+=BI_CHUNK_SIZE){r=await h.run('GET',{scope:'analysis-download',file:'synthetic-bi-file-123',offset});assert.equal(r.code,206);assert.ok(r.binary.length<=BI_CHUNK_SIZE);received.push(r.binary);}assert.deepEqual(Buffer.concat(received),Buffer.concat(chunks));
});
test('transfer denies anonymous, forbidden modality/page, readonly, tampered and expired tickets before Drive',async()=>{
 const h=harness();h.user(null);assert.equal((await h.run('POST')).code,401);assert.equal(h.calls.length,0);h.user(actor);h.view({...snapshot(),modalities:['FTC']});assert.equal((await h.run('POST')).code,403);h.view({...snapshot(),pages:{}});assert.equal((await h.run('POST')).code,403);h.view(snapshot());h.user({...actor,profile:{...actor.profile,portal_can_edit:false}});assert.equal((await h.run('POST')).code,403);h.user(actor);
 const init=await h.run('POST',{body:Buffer.from(JSON.stringify({name:'test.csv',size:100}))});const ticket=init.packet.ticket;const before=h.calls.length;assert.equal((await h.run('PUT',{ticket:ticket+'tampered',offset:0,body:Buffer.alloc(100)})).code,403);h.time(3700000);assert.equal((await h.run('GET',{ticket})).code,403);assert.equal(h.calls.length,before);
});
test('lost final upload acknowledgement recovers the same generated file ID without another upload',async()=>{
 const h=harness();const init=await h.run('POST',{body:Buffer.from(JSON.stringify({name:'test.csv',size:10}))});h.loseFinal();const failed=await h.run('PUT',{ticket:init.packet.ticket,offset:0,body:Buffer.from('team,score')});assert.equal(failed.code,503);assert.doesNotMatch(JSON.stringify(failed.packet),/ACK_LOST|googleapis/);
 const recovered=await h.run('GET',{ticket:init.packet.ticket});assert.equal(recovered.code,200);assert.equal(recovered.packet.complete,true);assert.equal(recovered.packet.fileId,'synthetic-bi-file-123');assert.equal(h.calls.filter(c=>c.method==='POST').length,1);
});
test('invalid format, oversized metadata and offsets do not start unauthorized transfers',async()=>{
 const h=harness();for(const data of [{name:'evil.exe',size:10},{name:'test.pbix',size:BI_FILE_LIMIT+1},{name:'../test.csv',size:10}])assert.ok((await h.run('POST',{body:Buffer.from(JSON.stringify(data))})).code>=400);assert.equal(h.calls.length,0);
 const init=await h.run('POST',{body:Buffer.from(JSON.stringify({name:'test.pbix',size:100}))});const before=h.calls.length;assert.equal((await h.run('PUT',{ticket:init.packet.ticket,offset:1,body:Buffer.alloc(99)})).code,400);assert.ok((await h.run('PUT',{ticket:init.packet.ticket,offset:0,body:Buffer.alloc(100)})).code>=400);assert.equal(h.calls.length,before);
});
import fs from 'node:fs/promises';import vm from 'node:vm';
import {validateBiFile} from '../src/lib/biAnalysisFiles.js';
async function browserClient(fetcher,identity=()=>actor.id){
 const context=vm.createContext({AbortSignal,AbortController,Blob,TextDecoder,encodeURIComponent,Number,Error});
 const mod=new vm.SourceTextModule(await fs.readFile(new URL('../src/api/biAnalysisClient.js',import.meta.url),'utf8'),{context});
 const mocks={'./supabaseClient.js':{supabase:{auth:{getUser:async()=>({data:{user:{id:identity()}}}),getSession:async()=>({data:{session:{user:{id:identity()},access_token:'synthetic'}}})}}},'./requestDeadline.js':{requestDeadline:operation=>operation(new AbortController().signal)},'../lib/biAnalysisFiles.js':{BI_CHUNK_SIZE,validateBiFile}};
 context.fetch=fetcher;await mod.link(s=>new vm.SyntheticModule(Object.keys(mocks[s]),function(){for(const [k,v]of Object.entries(mocks[s]))this.setExport(k,v);},{context}));await mod.evaluate();return mod.namespace;
}
test('actual browser client transfers sliced PBIX, downloads identical bytes with no cross-origin token',async()=>{
 const h=harness();h.loseFinal();let fetches=0;const client=await browserClient(async(raw,options)=>{
  fetches++;assert.ok(raw.startsWith('/api/bi?'));assert.equal(options.headers.Authorization,'Bearer synthetic');const url=new URL(raw,'https://portal.invalid');const query=Object.fromEntries(url.searchParams);
  const body=options.body instanceof Blob?Buffer.from(await options.body.arrayBuffer()):Buffer.from(options.body||'');assert.ok(body.length<=BI_CHUNK_SIZE);const r=await h.run(options.method||'GET',{...query,ticket:options.headers['X-BI-Upload'],body});
  return r.binary?new Response(r.binary,{status:r.code,headers:r.headers}):Response.json(r.packet,{status:r.code,headers:r.headers});
 });
 const data=Buffer.alloc(BI_CHUNK_SIZE*2+1000,3);Buffer.from([80,75,3,4]).copy(data);const blob=new Blob([data]);blob.name='synthetic.pbix';const result=await client.uploadBiFile(blob,'FRC',actor.id);assert.equal(result.fileId,'synthetic-bi-file-123');assert.equal(h.calls.filter(c=>c.method==='POST').length,1);
 const file={id:result.fileId,name:blob.name,size:blob.size,program:'FRC',url:'/api/media/'+result.fileId};const downloaded=await client.downloadBiFile(file,actor.id,new AbortController().signal);assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()),data);
 const before=fetches;await assert.rejects(client.downloadBiFile({...file,url:'https://evil.invalid'},actor.id,new AbortController().signal));assert.equal(fetches,before);
});
test('browser listing discards a response after identity changes; absent user cannot start upload',async()=>{
 let who=actor.id,fetches=0;const client=await browserClient(async()=>{fetches++;who='other';return Response.json({actor:actor.id,program:'FRC',files:[],nextCursor:null});},()=>who);
 await assert.rejects(client.readBiFiles('FRC',actor.id));const before=fetches;const csv=new Blob(['a,b\n1,2']);csv.name='test.csv';await assert.rejects(client.uploadBiFile(csv,'FRC',actor.id));assert.equal(fetches,before);
});


test('resumable metadata accepts a 150MB report without sending a large request',async()=>{
 const h=harness();const r=await h.run('POST',{body:Buffer.from(JSON.stringify({name:'large.pbix',size:150*1024*1024}))});assert.equal(r.code,200);assert.equal(h.calls.length,1);assert.equal(h.calls[0].headers['X-Upload-Content-Length'],String(150*1024*1024));assert.equal(r.packet.chunkSize,BI_CHUNK_SIZE);
});
test('CSV sample requests only the authorized first chunk and reports partial coverage',async()=>{
 const size=BI_CHUNK_SIZE+100,bytes=Buffer.alloc(BI_CHUNK_SIZE,32);Buffer.from('team,score\nA,2\n').copy(bytes);
 let calls=0;const client=await browserClient(async(raw)=>{calls++;assert.match(raw,/scope=analysis-download&program=FRC/);assert.match(raw,/offset=0$/);return new Response(bytes,{status:206,headers:{'content-range':`bytes 0-${BI_CHUNK_SIZE-1}/${size}`}});});
 const sample=await client.readBiCsvSample({id:'synthetic-bi-file-123',url:'/api/media/synthetic-bi-file-123',name:'scout.csv',program:'FRC',size},actor.id,new AbortController().signal);assert.equal(sample.partial,true);assert.match(sample.text,/team,score/);assert.equal(calls,1);
});


test('download rechecks revocation after retrieving bytes and rejects private metadata of another modality',async()=>{
 const h=harness();const init=await h.run('POST',{body:Buffer.from(JSON.stringify({name:'test.csv',size:10}))});await h.run('PUT',{ticket:init.packet.ticket,offset:0,body:Buffer.from('team,score')});
 h.user({...actor,profile:{...actor.profile,portal_can_edit:false}});let r=await h.run('GET',{scope:'analysis-download',file:'synthetic-bi-file-123',offset:0});assert.equal(r.code,206,'readonly members may download their modality');
 h.metadata({appProperties:{app:'portal_tera',context:'bi-analysis',program:'FTC',visibility:'private'}});r=await h.run('GET',{scope:'analysis-download',file:'synthetic-bi-file-123',offset:0});assert.equal(r.code,403);assert.equal(r.binary,undefined);
 h.metadata({});h.onDownload(()=>h.view({...snapshot(),modalities:['FTC']}));r=await h.run('GET',{scope:'analysis-download',file:'synthetic-bi-file-123',offset:0});assert.equal(r.code,403);assert.equal(r.binary,undefined);
});
