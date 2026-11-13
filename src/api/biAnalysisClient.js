import {supabase} from './supabaseClient.js';
import {requestDeadline} from './requestDeadline.js';
import {uploadToGoogleDrive} from './googleDriveClient.js';
import {fetchPrivateMedia} from './privateMedia.js';
import {validateBiFile} from '../lib/biAnalysisFiles.js';
async function sessionFor(actor){
 const {data,error}=await supabase.auth.getUser();if(error||!actor||data?.user?.id!==actor)throw Error('A sessão mudou. Entre novamente.');
 const {data:{session}}=await supabase.auth.getSession();if(session?.user?.id!==actor||!session.access_token)throw Error('Sessão inválida.');return session;
}
export async function readBiFiles(program,actor,cursor,signal){
 return requestDeadline(async deadline=>{
  const session=await sessionFor(actor);
  const response=await fetch(`/api/bi?scope=analysis&program=${encodeURIComponent(program)}${cursor?'&cursor='+encodeURIComponent(cursor):''}`,{signal:signal?AbortSignal.any([signal,deadline]):deadline,headers:{Authorization:'Bearer '+session.access_token}});
  const packet=await response.json();await sessionFor(actor);
  if(!response.ok)throw Error(packet.error||'Arquivos indisponíveis.');
  if(packet.actor!==actor||packet.program!==program||!Array.isArray(packet.files)||!packet.files.every(f=>typeof f.id==='string'&&/^[\w-]{10,100}$/.test(f.id)&&f.url==='/api/media/'+f.id&&typeof f.name==='string')||(packet.nextCursor!==null&&typeof packet.nextCursor!=='string'))throw Error('Resposta de arquivos inválida.');
  return packet;
 },25000);
}
export async function uploadBiFile(file,program,actor){
 validateBiFile(file);await sessionFor(actor);
 const result=await uploadToGoogleDrive({file,context:'bi-analysis',program});await sessionFor(actor);
 if(!/^[\w-]{10,100}$/.test(result?.fileId))throw Error('O servidor não confirmou o envio. Atualize a biblioteca antes de tentar novamente.');
 return result;
}
export async function downloadBiFile(file,actor,signal){
 if(!file||file.url!=='/api/media/'+file.id||!/^[\w-]{10,100}$/.test(file.id))throw Error('Arquivo inválido.');
 await sessionFor(actor);const blob=await fetchPrivateMedia(file.url,actor,signal);await sessionFor(actor);
 if(signal.aborted)throw Error('Download cancelado.');return blob;
}
