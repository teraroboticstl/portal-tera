import {useEffect,useId,useRef,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Upload,Download,FileText,RefreshCw} from 'lucide-react';
import {readBiFiles,uploadBiFile,downloadBiFile} from '@/api/biAnalysisClient';
import {biButton} from './BiVisuals';
import PortalMedia from '@/components/common/PortalMedia';

export default function BiAnalysisLibrary({program,user}) {
 const id=useId(),client=useQueryClient(),lock=useRef(false),alive=useRef(true),downloadAbort=useRef(null);
 const [cursor,setCursor]=useState(null),[history,setHistory]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[preview,setPreview]=useState(null),[downloading,setDownloading]=useState(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;downloadAbort.current?.abort();};},[]);
 // File pickers change window focus; avoid unmounting their input mid-selection.
 // Every list refresh and binary request still checks permissions on the server.
 const query=useQuery({queryKey:['bi-analysis',user.id,program,cursor],queryFn:({signal})=>readBiFiles(program,user.id,cursor,signal),retry:false,gcTime:0,staleTime:0,refetchOnMount:'always',refetchOnWindowFocus:false});
 const packet=!query.isFetching&&!query.error?query.data:null;
 async function upload(event){
  const input=event.currentTarget,file=input.files?.[0];input.value='';if(!file||lock.current)return;
  lock.current=true;setBusy(true);setError('');setNotice('');
  try{await uploadBiFile(file,program,user.id);if(alive.current){setCursor(null);setHistory([]);setPreview(null);setNotice('Arquivo enviado à biblioteca privada.');await client.invalidateQueries({queryKey:['bi-analysis',user.id,program]});}}
  catch(failure){if(alive.current)setError(failure.code==='GOOGLE_DRIVE_REAUTH_REQUIRED'?'A conexão institucional com o Drive expirou. Solicite a renovação ao administrador em Painel Admin → Google Drive.':failure.status===403?'Seu nível não permite enviar arquivos nesta modalidade.':failure.message||'Envio não confirmado. Atualize a biblioteca antes de tentar novamente.');}finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 async function download(file){
  setDownloading(file.id);setError('');const controller=new AbortController();downloadAbort.current=controller;
  try{const blob=await downloadBiFile(file,user.id,controller.signal);if(!alive.current)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  catch{if(alive.current)setError('Não foi possível baixar o arquivo. Confira sua conexão e seu acesso à modalidade.');}finally{if(alive.current)setDownloading(null);}
 }
 return <section aria-labelledby={id+'-title'} className="min-w-0 space-y-4 rounded-2xl border border-red-500/30 bg-[#111217] p-4 sm:p-6">
  <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 id={id+'-title'} className="text-xl font-bold text-white">Arquivos de análise — {program}</h2><p className="mt-2 max-w-3xl text-sm text-gray-300">Guarde gráficos, relatórios exportados do Power BI e arquivos de scouting. Compartilhados somente com quem tem acesso a este painel da modalidade.</p></div><button type="button" className={biButton} disabled={query.isFetching||busy} onClick={()=>query.refetch()}><RefreshCw size={17}/>Atualizar arquivos</button></div>
  <p className="text-sm text-gray-400">PDF, PNG, JPG, WebP, CSV, XLSX e PBIX · até 4 MB por arquivo. Para arquivos maiores, exporte uma versão reduzida. Anexar não importa linhas para os indicadores. PBIX é disponibilizado para download e abertura no Power BI Desktop.</p>
  {packet?.canUpload&&<label htmlFor={id} className={biButton+' w-full cursor-pointer sm:w-auto focus-within:ring-2 focus-within:ring-red-400'}><Upload size={18}/>{busy?'Enviando arquivo…':'Enviar arquivo de análise'}<input id={id} className="sr-only" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx,.pbix" disabled={busy} aria-label="Enviar arquivo de análise" onChange={upload}/></label>}
  {packet&&!packet.canUpload&&<p className="text-sm text-gray-400">Seu nível permite consultar e baixar. O envio exige permissão de edição da Área Interna.</p>}
  {busy&&<p role="status" className="text-sm text-gray-300">Enviando com acesso privado. Aguarde a confirmação antes de sair.</p>}
  {notice&&<p role="status" className="text-sm text-green-300">{notice}</p>}
  {(error||query.error)&&<p role="alert" className="rounded-lg border border-red-500/40 p-3 text-sm text-red-200">{error||query.error.message}</p>}
  {query.isFetching&&<p role="status" className="text-sm text-gray-300">Conferindo acesso aos arquivos…</p>}
  {packet&&<>{!packet.files.length&&<p className="rounded-xl border border-dashed border-white/20 p-5 text-gray-400">Nenhum arquivo nesta página. Envie a primeira análise da modalidade ou volte à página anterior.</p>}
   <ul className="grid min-w-0 gap-4 lg:grid-cols-2">{packet.files.map(file=><li key={file.id} className="min-w-0 rounded-xl border border-white/10 p-4"><h3 className="flex min-w-0 items-start gap-2 text-white"><FileText size={19} className="shrink-0"/><span className="min-w-0 break-all font-semibold">{file.name}</span></h3><p className="mt-2 text-xs text-gray-400">{Math.ceil(file.size/1024)} KB · {Number.isFinite(Date.parse(file.date))?new Date(file.date).toLocaleDateString('pt-BR'):'Data não informada'}</p><div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap"><button className={biButton} type="button" disabled={downloading!==null} onClick={()=>download(file)}><Download size={17}/>{downloading===file.id?'Baixando…':'Baixar arquivo'}</button>{['image/png','image/jpeg','image/webp'].includes(file.type)&&<button type="button" className={biButton} onClick={()=>setPreview(preview===file.id?null:file.id)}>{preview===file.id?'Fechar gráfico':'Ver gráfico'}</button>}</div>{preview===file.id&&<PortalMedia src={file.url} alt={'Gráfico: '+file.name} className="mt-4 h-auto max-h-[32rem] w-full rounded-lg bg-white object-contain"/>}</li>)}</ul>
   <nav aria-label="Páginas de arquivos de análise" className="flex flex-wrap gap-3"><button className={biButton} disabled={!history.length||busy} onClick={()=>{setCursor(history.at(-1));setHistory(old=>old.slice(0,-1));setPreview(null);}}>Anterior</button><button className={biButton} disabled={!packet.nextCursor||busy} onClick={()=>{setHistory(old=>[...old,cursor]);setCursor(packet.nextCursor);setPreview(null);}}>Próxima página</button></nav>
  </>}
 </section>;
}
