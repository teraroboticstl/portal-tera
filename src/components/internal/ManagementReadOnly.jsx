import React,{useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/api/supabaseClient';
import {createManagementReadClient,MANAGEMENT_SOURCES} from '@/api/managementReadClient';
import {useAuth} from '@/lib/AuthContext';
import {Button} from '@/components/ui/button';
const api=createManagementReadClient(supabase);
const labels={member_name:'Membro',full_name:'Nome',title:'Título',name:'Nome',description:'Descrição',objectives:'Objetivos',competencies:'Competências',goals:'Metas',skills:'Habilidades',progress:'Progresso',percentage:'Porcentagem',status:'Estado',modality:'Modalidade',program:'Modalidade',category:'Categoria',area:'Área',content:'Conteúdo',notes:'Observações',summary:'Resumo',decisions:'Decisões',season:'Temporada',created_at:'Criado em',updated_at:'Atualizado em',date:'Data',priority:'Prioridade',due_date:'Prazo',score:'Pontuação',team_name:'Equipe',team_number:'Número da equipe',evidence:'Evidências',attachments:'Anexos',images:'Imagens',file_url:'Arquivo',image_url:'Imagem'};
function printable(value){return typeof value==='object'?JSON.stringify(value,null,2):String(value);}
export function ManagementReadOnlyView({user,query,source,setSource,previous,next,canPrevious,search,setSearch}){
 const packet=!query.isError&&!query.isFetching&&query.data?.actor===user.id&&query.data?.source===source?query.data:null;
 const items=packet?.items.filter(({record})=>!search||JSON.stringify(record).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))||[];
 return <section className="space-y-5 text-white"><div className="rounded-xl border border-red-500/30 bg-[#111217] p-4"><h1 className="text-2xl font-bold">Gestão-leitura</h1>
  <p className="mt-2 text-sm text-gray-300">Consulta de todas as modalidades, registros e PDIs. Esta categoria não permite editar, excluir, aprovar usuários ou alterar permissões.</p>
  <p className="mt-2 text-sm text-gray-400">Sem questionário de membro e sem criação de PDI pessoal. As informações dos membros continuam privadas; não compartilhe fora da equipe.</p></div>
  <div className="grid gap-4 sm:grid-cols-2"><label className="min-w-0">Consultar<select value={source} onChange={e=>setSource(e.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-white/20 bg-[#111217] p-3 text-base">{MANAGEMENT_SOURCES.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
  <label className="min-w-0">Buscar nesta página<input value={search} onChange={e=>setSearch(e.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-white/20 bg-[#111217] p-3 text-base"/></label></div>
  <Button variant="outline" onClick={()=>query.refetch()} disabled={query.isFetching} className="min-h-11">Atualizar consulta</Button>
  {query.isError?<p role="alert" className="text-red-300">Não foi possível confirmar o acesso aos registros. Tente atualizar a consulta.</p>:!packet?<p role="status">Confirmando acesso de consulta…</p>:<>
   <p className="text-sm text-gray-400">{packet.items.length} registros carregados nesta página, até 50 por consulta. A busca filtra apenas esta página; use Próxima para continuar.</p>
   {!packet.available?<p role="status">Esta fonte não está disponível no banco atual.</p>:!items.length?<p role="status">Nenhum registro neste recorte.</p>:items.map(({cursor,record})=><article key={cursor} className="min-w-0 rounded-xl border border-white/15 bg-[#111217] p-4">
    <h2 className="break-words text-lg font-semibold">{record.title||record.member_name||record.full_name||record.name||'Registro'}</h2>
    <dl className="mt-3 space-y-3">{Object.entries(record).filter(([key,value])=>key!=='id'&&value!==null&&value!=='').map(([key,value])=><div key={key} className="min-w-0"><dt className="text-xs font-semibold text-gray-400">{labels[key]||key.replaceAll('_',' ')}</dt><dd className="whitespace-pre-wrap break-words text-sm text-gray-100 [overflow-wrap:anywhere]">{printable(value)}</dd></div>)}</dl>
   </article>)}
  </>}
  <nav aria-label="Páginas da consulta" className="flex flex-wrap gap-3"><Button variant="outline" disabled={!canPrevious||query.isFetching} onClick={previous} className="min-h-11">Anterior</Button><Button variant="outline" disabled={!packet?.has_more||query.isFetching} onClick={()=>next(packet.next_cursor)} className="min-h-11">Próxima</Button></nav>
 </section>;
}
export function ManagementRecords({user}){
 const [source,choose]=useState('pdis'),[cursors,setCursors]=useState([null]),[search,setSearch]=useState('');
 const after=cursors.at(-1);
 const query=useQuery({queryKey:['management-readonly',user.id,source,after],queryFn:()=>api.read(user.id,source,after),retry:false,staleTime:0,gcTime:0,refetchOnWindowFocus:true,refetchInterval:30000});
 return <ManagementReadOnlyView user={user} query={query} source={source} setSource={value=>{choose(value);setCursors([null]);setSearch('');}} search={search} setSearch={setSearch} canPrevious={cursors.length>1} previous={()=>{setCursors(v=>v.slice(0,-1));setSearch('');}} next={value=>{setCursors(v=>[...v,value]);setSearch('');}}/>;
}
export default function ManagementReadOnly({user}){
 const {logout}=useAuth();
 return <main className="min-h-screen bg-[#0B0B0D] px-4 py-6 text-white"><div className="mx-auto max-w-5xl"><header className="mb-6 flex flex-wrap items-center justify-between gap-3"><a href="/" className="min-h-11 py-3 text-red-300 underline">Voltar ao site público</a><Button variant="outline" onClick={()=>logout()} className="min-h-11">Sair</Button></header><ManagementRecords key={user.id} user={user}/></div></main>;
}
