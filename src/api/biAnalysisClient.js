import {supabase} from './supabaseClient.js';
import {requestDeadline} from './requestDeadline.js';
import {BI_CHUNK_SIZE,validateBiFile} from '../lib/biAnalysisFiles.js';
async function sessionFor(actor){
 const {data,error}=await supabase.auth.getUser();if(error||!actor||data?.user?.id!==actor)throw Error('A sessão mudou. Entre novamente.');
 const {data:{session}}=await supabase.auth.getSession();if(session?.user?.id!==actor||!session.access_token)throw Error('Sessão inválida.');return session;
}
async function call(program,actor,{method='GET',ticket,offset,body,scope='analysis-upload',signal}={}){
 return requestDeadline(async deadline=>{
  const session=await sessionFor(actor),combined=new AbortController();const stop=()=>combined.abort();
  signal?.addEventListener('abort',stop,{once:true});deadline.addEventListener('abort',stop,{once:true});if(signal?.aborted||deadline.aborted)combined.abort();
  try{
   const response=await fetch(`/api/bi?scope=${scope}&program=${encodeURIComponent(program)}${offset!==undefined?'&offset='+offset:''}`,{method,signal:combined.signal,headers:{Authorization:'Bearer '+session.access_token,...(ticket?{'X-BI-Upload':ticket}:{}),...(body?{'Content-Type':method==='POST'?'application/json':'application/octet-stream'}:{})},body});
   const packet=await response.json();await sessionFor(actor);if(!response.ok)throw Object.assign(Error(packet.error||'Transferência indisponível.'),{code:packet.code,status:response.status});if(packet.actor!==actor||packet.program!==program)throw Error('A sessão mudou.');return packet;
  }finally{signal?.removeEventListener('abort',stop);deadline.removeEventListener('abort',stop);}
 },60000);
}
export async function readBiFiles(program,actor,cursor,signal){
 return requestDeadline(async deadline=>{
  const session=await sessionFor(actor);const response=await fetch(`/api/bi?scope=analysis&program=${encodeURIComponent(program)}${cursor?'&cursor='+encodeURIComponent(cursor):''}`,{signal:signal?AbortSignal.any([signal,deadline]):deadline,headers:{Authorization:'Bearer '+session.access_token}});
  const packet=await response.json();await sessionFor(actor);if(!response.ok)throw Error(packet.error||'Arquivos indisponíveis.');
  if(packet.actor!==actor||packet.program!==program||!Array.isArray(packet.files)||!packet.files.every(f=>typeof f.id==='string'&&/^[\w-]{10,100}$/.test(f.id)&&f.url==='/api/media/'+f.id&&typeof f.name==='string'&&Number.isSafeInteger(f.size)&&f.size>0)||(packet.nextCursor!==null&&typeof packet.nextCursor!=='string'))throw Error('Resposta de arquivos inválida.');
  return {...packet,files:packet.files.map(f=>({...f,program}))};
 },25000);
}
export async function uploadBiFile(file,program,actor,{signal,onProgress=()=>{}}={}){
 validateBiFile(file);const init=await call(program,actor,{method:'POST',body:JSON.stringify({name:file.name,size:file.size}),signal});
 if(typeof init.ticket!=='string'||init.chunkSize!==BI_CHUNK_SIZE)throw Error('Sessão de envio inválida.');
 let offset=0,failures=0;while(offset<file.size){if(signal?.aborted)throw Error('Envio cancelado.');
  let packet;try{packet=await call(program,actor,{method:'PUT',ticket:init.ticket,offset,body:file.slice(offset,offset+BI_CHUNK_SIZE),signal});}
  catch(error){if(signal?.aborted||++failures>2)throw error;packet=await call(program,actor,{ticket:init.ticket,signal});}
  if(!Number.isSafeInteger(packet.offset)||packet.offset<offset||packet.offset>file.size||(!packet.complete&&packet.offset%BI_CHUNK_SIZE!==0))throw Error('Progresso do envio inválido.');
  if(packet.offset===offset){if(++failures>2)throw Error('O servidor não confirmou esta parte. Tente novamente.');continue;}
  offset=packet.offset;failures=0;onProgress(Math.round(offset/file.size*100));
  if(packet.complete){if(offset!==file.size||!/^[\w-]{10,100}$/.test(packet.fileId||''))throw Error('Confirmação inválida.');return {fileId:packet.fileId};}
 }
 throw Error('Envio não confirmado. Atualize a biblioteca antes de tentar novamente.');
}
async function range(file,actor,offset,signal){
 if(!file||file.url!=='/api/media/'+file.id||!/^[\w-]{10,100}$/.test(file.id)||!['FRC','FTC','FLL'].includes(file.program))throw Error('Arquivo inválido.');
 return requestDeadline(async deadline=>{
  const session=await sessionFor(actor);const response=await fetch(`/api/bi?scope=analysis-download&program=${file.program}&file=${encodeURIComponent(file.id)}&offset=${offset}`,{signal:signal?AbortSignal.any([signal,deadline]):deadline,headers:{Authorization:'Bearer '+session.access_token}});
  if(response.status!==206)throw Error('Não foi possível baixar a análise com suas permissões atuais.');
  const match=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get('content-range')||'');
  if(!match||Number(match[1])!==offset||Number(match[3])!==file.size||Number(match[2])!==Math.min(offset+BI_CHUNK_SIZE,file.size)-1)throw Error('Tamanho da análise mudou. Atualize a biblioteca.');
  const bytes=await response.blob();if(bytes.size!==Number(match[2])-offset+1)throw Error('Download incompleto.');await sessionFor(actor);return bytes;
 },60000);
}
export async function downloadBiFile(file,actor,signal,onProgress=()=>{}){validateBiFile(file);const parts=[];for(let offset=0;offset<file.size;offset+=BI_CHUNK_SIZE){if(signal?.aborted)throw Error('Download cancelado.');parts.push(await range(file,actor,offset,signal));onProgress(Math.round(Math.min(offset+BI_CHUNK_SIZE,file.size)/file.size*100));}return new Blob(parts,{type:file.type||'application/octet-stream'});}
export async function readBiCsvSample(file,actor,signal){if(!file.name.toLowerCase().endsWith('.csv'))throw Error('Selecione um CSV.');const blob=await range(file,actor,0,signal);const bytes=await blob.arrayBuffer();let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes,{stream:file.size>blob.size});}catch{text=new TextDecoder('windows-1252').decode(bytes);}return {text,partial:file.size>blob.size};}
