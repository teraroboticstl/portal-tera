import {authorizeBiFiles,validateBiBytes} from './biAnalysisFiles.js';
import {BI_FILE_LIMIT,BI_CHUNK_SIZE,validateBiFile} from '../../src/lib/biAnalysisFiles.js';
import {encryptionKey,seal,unseal} from './googleOAuthSecurity.js';
const purpose='portal-bi-upload:v1';
const fail=(status=400)=>{throw Object.assign(Error('TRANSFER_DENIED'),{status});};
const header=(headers,key)=>headers?.get?.(key)||headers?.[key.toLowerCase()];
const id=value=>typeof value==='string'&&/^[\w-]{10,100}$/.test(value);
const sessionUrl=value=>{const u=new URL(value);if(u.origin!=='https://www.googleapis.com'||u.pathname!=='/upload/drive/v3/files'||!u.searchParams.get('upload_id'))fail();return u.href;};
async function body(req,max){if(Buffer.isBuffer(req.body)){if(req.body.length>max)fail(413);return req.body;}const parts=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>max)fail(413);parts.push(chunk);}return Buffer.concat(parts);}
export function createBiTransferHandler({authenticate,scopedClient,getDrive,getTransport,resolveFolder,key,now=Date.now}){
 const access=(req,write)=>authorizeBiFiles({header:req.headers?.authorization,program:req.query?.program,authenticate,scopedClient,write});
 const request=async options=>(await getTransport()).request({...options,timeout:45000,retry:false,validateStatus:status=>status>=200&&status<400});
 async function ticket(req,user){try{const raw=req.headers?.['x-bi-upload'];if(typeof raw!=='string'||raw.length>8192)fail(403);const t=JSON.parse(unseal(raw,encryptionKey(key()),purpose));if(t.actor!==user.id||t.program!==req.query.program||t.expires<=now()||!Number.isSafeInteger(t.size)||t.size<1||t.size>BI_FILE_LIMIT)fail(403);sessionUrl(t.url);return t;}catch{fail(403);}}
 async function uploadResult(req,res,user,t,result){
  const after=await access(req,true);if(after.id!==user.id)fail(403);
  if(result.status===308){const range=header(result.headers,'range');if(range&&!/^bytes=0-\d+$/.test(range))fail(503);const offset=range?Number(range.split('-')[1])+1:0;if(!Number.isSafeInteger(offset)||offset>t.size)fail(503);return res.status(200).json({actor:user.id,program:t.program,offset,complete:false});}
  if(!id(result.data?.id)||result.data.id!==t.fileId)fail(503);const drive=await getDrive();const {data:f}=await drive.files.get({fileId:result.data.id,fields:'id,size,trashed,parents,appProperties'});
  if(f.trashed||Number(f.size)!==t.size||!f.parents?.includes(t.folder)||f.appProperties?.app!=='portal_tera'||f.appProperties?.context!=='bi-analysis'||f.appProperties?.program!==t.program||f.appProperties?.visibility!=='private')fail(503);
  const final=await access(req,true);if(final.id!==user.id)fail(403);
  return res.status(200).json({actor:user.id,program:t.program,offset:t.size,complete:true,fileId:f.id});
 }
 return async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
  try{
   const download=req.query?.scope==='analysis-download';
   if(download){
    if(req.method!=='GET')fail(405);const user=await access(req,false),fileId=req.query.file;
    if(!id(fileId))fail();const offset=Number(req.query.offset||0);if(!Number.isSafeInteger(offset)||offset<0||offset%BI_CHUNK_SIZE!==0)fail();
    const drive=await getDrive();const {data:f}=await drive.files.get({fileId,fields:'id,name,size,mimeType,trashed,appProperties'});
    if(f.trashed||f.appProperties?.app!=='portal_tera'||f.appProperties?.context!=='bi-analysis'||f.appProperties?.program!==req.query.program||f.appProperties?.visibility!=='private')fail(403);
    const size=Number(f.size);if(!Number.isSafeInteger(size)||size<1||size>BI_FILE_LIMIT||offset>=size)fail();const end=Math.min(offset+BI_CHUNK_SIZE,size)-1;
    const result=await drive.files.get({fileId,alt:'media'},{responseType:'arraybuffer',headers:{Range:`bytes=${offset}-${end}`},timeout:45000});
    const bytes=Buffer.from(result.data);if(bytes.length!==end-offset+1)fail(503);
    const after=await access(req,false);if(after.id!==user.id)fail(403);
    res.setHeader('Content-Type','application/octet-stream');res.setHeader('Content-Length',bytes.length);res.setHeader('Content-Range',`bytes ${offset}-${end}/${size}`);res.setHeader('Content-Security-Policy',"sandbox; default-src 'none'");return res.status(206).end(bytes);
   }
   const user=await access(req,true);
   if(req.method==='POST'){
    let input;try{input=JSON.parse((await body(req,4096)).toString('utf8'));}catch{fail();}
    if(!input||typeof input.name!=='string'||input.name.length>220||/[\u0000-\u001f/\\]/.test(input.name)||!Number.isSafeInteger(input.size))fail();
    let type;try{type=validateBiFile(input);}catch{fail(422);}const secret=encryptionKey(key());
    const drive=await getDrive(),folder=await resolveFolder(drive,'bi-analysis',{program:req.query.program});
    const generated=await drive.files.generateIds({count:1,space:'drive'});const fileId=generated.data?.ids?.[0];if(!id(fileId))fail(503);
    const result=await request({url:'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id',method:'POST',headers:{'Content-Type':'application/json','X-Upload-Content-Type':type,'X-Upload-Content-Length':String(input.size)},data:{id:fileId,name:input.name,parents:[folder],appProperties:{app:'portal_tera',context:'bi-analysis',program:req.query.program,visibility:'private',uploaderId:user.id}}});
    const url=sessionUrl(header(result.headers,'location'));const after=await access(req,true);if(after.id!==user.id)fail(403);
    const token=seal(JSON.stringify({actor:user.id,program:req.query.program,url,folder,fileId,name:input.name,size:input.size,expires:now()+60*60*1000}),secret,purpose);
    return res.status(200).json({actor:user.id,program:req.query.program,ticket:token,chunkSize:BI_CHUNK_SIZE});
   }
   if(!['PUT','GET'].includes(req.method))fail(405);const t=await ticket(req,user);
   if(req.method==='GET'){
    let result;try{result=await request({url:t.url,method:'PUT',headers:{'Content-Range':`bytes */${t.size}`},data:Buffer.alloc(0)});}
    catch(error){if(error.response?.status!==404)throw error;result={status:200,data:{id:t.fileId}};}
    return uploadResult(req,res,user,t,result);
   }
   const offset=Number(req.query.offset);if(!Number.isSafeInteger(offset)||offset<0||offset>=t.size||offset%BI_CHUNK_SIZE!==0)fail();
   const bytes=await body(req,BI_CHUNK_SIZE);if(bytes.length!==Math.min(BI_CHUNK_SIZE,t.size-offset))fail();
   if(offset===0){try{validateBiBytes({filename:t.name,size:bytes.length,buffer:bytes});}catch{fail(422);}}
   return uploadResult(req,res,user,t,await request({url:t.url,method:'PUT',headers:{'Content-Type':'application/octet-stream','Content-Range':`bytes ${offset}-${offset+bytes.length-1}/${t.size}`},data:bytes}));
  }catch(error){const providerStatus=Number(error.response?.status)||0;const providerReason=error.response?.data?.error;const reauth=providerReason==='invalid_grant'||providerReason==='invalid_client'||providerStatus===401;const storageFull=['storageQuotaExceeded','teamDriveFileLimitExceeded'].includes(error.response?.data?.error?.errors?.[0]?.reason);const status=providerStatus?503:error.status||503;console.warn('[BI transfer]',{method:['GET','POST','PUT'].includes(req.method)?req.method:'OTHER',status,providerStatus});return res.status(status).json({code:reauth?'GOOGLE_DRIVE_REAUTH_REQUIRED':'BI_TRANSFER_FAILED',error:storageFull?'O Drive institucional está sem espaço ou atingiu o limite de arquivos. Solicite ao administrador.':reauth?'A conexão institucional com o Drive precisa ser renovada pelo administrador.':status===401?'Entre novamente no Portal.':status===403?'Seu acesso ao arquivo, modalidade ou sessão de envio mudou.':status===422?'O conteúdo não corresponde ao formato. Para CSV, use UTF-8.':status===413?'Esta parte do arquivo excedeu o tamanho permitido.':'Transferência não concluída. Confira sua conexão e a integração institucional com o Drive.'});}
 };
}
