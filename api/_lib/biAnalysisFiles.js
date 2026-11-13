import {canReadBi} from '../../src/lib/teraBi.js';
import {BI_FILE_LIMIT,validateBiFile} from '../../src/lib/biAnalysisFiles.js';

export async function authorizeBiFiles({header,program,authenticate,scopedClient,write=false}) {
 if(typeof header!=='string'||!/^Bearer\s+\S+$/i.test(header))throw Object.assign(Error('Entre no Portal.'),{status:401});
 let user;try{user=await authenticate(header);}catch{throw Object.assign(Error('Sessão inválida.'),{status:401});}
 const {data,error}=await scopedClient(header.replace(/^Bearer\s+/i,'')).rpc('portal_page_visibility_snapshot');
 if(error||!canReadBi(program,user,data)||(write&&!(user.profile?.is_admin===true||user.profile?.portal_can_edit===true)))throw Object.assign(Error('Acesso à análise não autorizado.'),{status:403});
 return user;
}
export function validateBiBytes(file){
 const type=validateBiFile({name:file.filename,size:file.buffer?.length});
 if(file.size!==file.buffer.length||file.size>BI_FILE_LIMIT)throw Error('Tamanho de arquivo inválido.');
 const b=file.buffer;
 const starts=signature=>b.subarray(0,signature.length).equals(Buffer.from(signature));
 const valid=type==='application/pdf'?starts('%PDF-'):type==='image/png'?starts([137,80,78,71,13,10,26,10]):type==='image/jpeg'?starts([255,216,255]):type==='image/webp'?starts('RIFF')&&b.subarray(8,12).toString()==='WEBP':type==='text/csv'?!b.includes(0):starts([80,75,3,4]);
 if(!valid)throw Error('O conteúdo não corresponde ao formato informado. Exporte novamente o arquivo.');
 return type;
}
export function createBiFilesHandler({authenticate,scopedClient,getDrive}) {
 return async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET')return res.status(405).json({error:'Método não permitido.'});
  const {program,cursor}=req.query||{};
  // Drive page tokens are opaque, not IDs. Never interpolate them into the query.
  if(cursor!==undefined&&(typeof cursor!=='string'||!cursor.length||cursor.length>4096||/[\u0000-\u0020\u007f]/.test(cursor)))return res.status(400).json({error:'Página inválida.'});
  try{
   const access=()=>authorizeBiFiles({header:req.headers?.authorization,program,authenticate,scopedClient});
   const before=await access();const drive=await getDrive();
   const {data}=await drive.files.list({q:`trashed = false and appProperties has { key='app' and value='portal_tera' } and appProperties has { key='context' and value='bi-analysis' } and appProperties has { key='program' and value='${program}' }`,pageSize:30,pageToken:cursor||undefined,orderBy:'createdTime desc',fields:'nextPageToken,files(id,name,mimeType,size,createdTime,appProperties)'});
   const after=await access();if(after.id!==before.id)throw Object.assign(Error('Sessão alterada.'),{status:403});
   const files=(data.files||[]).filter(f=>/^[\w-]{10,100}$/.test(f.id)&&f.appProperties?.app==='portal_tera'&&f.appProperties?.context==='bi-analysis'&&f.appProperties?.program===program&&f.appProperties?.visibility==='private').map(f=>({id:f.id,name:f.name.slice(0,220),type:f.mimeType,size:Number(f.size)||0,date:f.createdTime,url:'/api/media/'+f.id}));
   return res.status(200).json({actor:after.id,program,files,canUpload:after.profile?.is_admin===true||after.profile?.portal_can_edit===true,nextCursor:data.nextPageToken||null});
  }catch(error){return res.status(error.status||503).json({error:error.status?'Seu acesso a esta modalidade ou página não está liberado.':'Não foi possível carregar os arquivos. Confira a conexão institucional com o Drive.'});}
 };
}
