import {useId,useRef,useState} from 'react';
import {Upload,Loader2,FileText,X} from 'lucide-react';
import PortalMedia from '@/components/common/PortalMedia';
import {uploadToGoogleDrive} from '@/api/googleDriveClient';

const imageTypes=['image/jpeg','image/png','image/webp','image/gif'];
export function pdiUploadError(error) {
  if(error?.code==='GOOGLE_DRIVE_REAUTH_REQUIRED'||/expirou ou foi revogada/i.test(error?.message||''))return 'A conexão institucional com o Google Drive precisa ser renovada pelo administrador em Painel Admin → Google Drive. Suas respostas foram preservadas.';
  if(error?.status===401)return 'Sua sessão expirou. Entre novamente para enviar o arquivo; suas respostas ainda não foram salvas.';
  if(error?.status===403)return 'Sua conta não tem permissão para enviar este arquivo. Consulte o administrador.';
  return error?.message?.slice(0,400)||'Não foi possível enviar o arquivo. Suas respostas foram preservadas; tente novamente.';
}
export async function uploadPdiFile(file,{program,season,photo=false}) {
  if(!file)throw Error('Selecione um arquivo.');
  if(![...imageTypes,...(photo?[]:['application/pdf'])].includes(file.type))throw Error('Formato não suportado. Use JPG, PNG, WebP ou GIF'+(photo?'.':' ou PDF.')+' Fotos HEIC precisam ser exportadas como JPG.');
  if(file.size>4*1024*1024)throw Error('O envio direto aceita até 4 MB por arquivo. Reduza o arquivo ou exporte uma cópia menor antes de tentar novamente.');
  const media=await uploadToGoogleDrive({file,context:'pdi',program,season,subfolder:'PDI'});
  if(!media?.fileId||!/^[a-zA-Z0-9_-]+$/.test(media.fileId))throw Error('O servidor não confirmou o arquivo. Tente novamente.');
  return '/api/media/'+media.fileId;
}
export function PdiFiles({value=[],onRemove,disabled=false}) {
  return <ul className="min-w-0 space-y-2">{(Array.isArray(value)?value:[]).map((item,index)=><li key={index} className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-[#1F222B] bg-[#111217] p-3"><FileText className="h-4 w-4 shrink-0 text-orange-400"/><span className="min-w-0 flex-1 break-words text-sm text-white">{item.name||'Anexo do PDI'}</span><PortalMedia src={item.url} type="link" className="inline-flex min-h-11 items-center px-2 text-sm text-blue-300 underline">Abrir</PortalMedia>{onRemove&&<button type="button" disabled={disabled} aria-label={`Remover anexo ${index+1}`} onClick={()=>onRemove(index)} className="min-h-11 min-w-11 rounded-lg text-red-400 disabled:opacity-50"><X size={18} aria-hidden="true"/></button>}</li>)}</ul>;
}
export default function PdiMediaField({photo=false,value,onChange,onBusyChange,program,season}) {
  const id=useId(),locked=useRef(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[name,setName]=useState('');
  const files=Array.isArray(value)?value:[];
  async function select(event) {
    const input=event.currentTarget,file=input.files?.[0];input.value='';
    if(!file||locked.current)return;
    locked.current=true;setBusy(true);setError('');onBusyChange?.(true);
    try {
      const url=await uploadPdiFile(file,{program,season,photo});
      onChange(photo?url:[...files,{name:name.trim()||file.name.replace(/\.[^.]+$/,''),url}]);setName('');
    }catch(failure){setError(pdiUploadError(failure));}
    finally {locked.current=false;setBusy(false);onBusyChange?.(false);}
  }
  return <div className="min-w-0 space-y-3">
    {photo&&value&&<PortalMedia src={value} alt="Foto do membro no PDI" className="h-16 w-16 rounded-full object-cover border-2 border-red-600/50"/>}
    {!photo&&<PdiFiles value={files} disabled={busy} onRemove={index=>onChange(files.filter((_,i)=>i!==index))}/>}
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
      {!photo&&<input value={name} disabled={busy} onChange={e=>setName(e.target.value)} aria-label="Nome do anexo (opcional)" placeholder="Nome do anexo (opcional)" className="min-h-11 w-full min-w-0 flex-1 rounded-lg border border-[#1F222B] bg-[#111217] px-3 text-base text-white"/>}
      <label htmlFor={id} className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#1F222B] bg-[#111217] px-3 py-2 text-sm text-white focus-within:ring-2 focus-within:ring-red-500 ${busy?'opacity-60':''}`}>
        {busy?<Loader2 size={17} className="animate-spin" aria-hidden="true"/>:<Upload size={17} aria-hidden="true"/>}
        {busy?'Enviando…':photo?(value?'Trocar foto':'Adicionar foto'):'Adicionar arquivo'}
        <input id={id} type="file" className="sr-only" aria-label={photo?'Enviar foto do PDI':'Enviar anexo do PDI'} accept={photo?'image/jpeg,image/png,image/webp,image/gif':'application/pdf,image/jpeg,image/png,image/webp,image/gif'} disabled={busy} onChange={select}/>
      </label>
    </div>
    <p className="text-xs text-gray-400">{photo?'JPG, PNG, WebP ou GIF':'PDF, JPG, PNG, WebP ou GIF'} · até 4 MB · acesso privado. Salve o PDI após concluir o envio.</p>
    {busy&&<p role="status" className="text-sm text-gray-300">Aguarde a confirmação do arquivo antes de salvar o PDI.</p>}
    {error&&<p role="alert" className="rounded-lg border border-red-500/40 p-3 text-sm text-red-200">{error}</p>}
  </div>;
}
