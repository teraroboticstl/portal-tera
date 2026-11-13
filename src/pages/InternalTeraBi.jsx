import {useMemo,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link} from 'react-router-dom';
import {BarChart3,RefreshCw,Download} from 'lucide-react';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import {BiKpi,BiChart,biNumber,biButton,biControl} from '@/components/bi/BiVisuals';
import {readTeraBi} from '@/api/teraBiClient';
import {BI_METRICS,summarizeScouting,biCsv} from '@/lib/teraBi';
import BiAnalysisLibrary from '@/components/bi/BiAnalysisLibrary';

function Dashboard({user,program}) {
  const [filters,setFilters]=useState({team:'',event:'',from:'',to:''});
  const [exporting,setExporting]=useState(false),[exportError,setExportError]=useState('');
  const query=useQuery({queryKey:['tera-bi',user.id,program],queryFn:({signal})=>readTeraBi(program,user.id,signal),staleTime:0,gcTime:0,retry:false,refetchOnMount:'always',refetchOnWindowFocus:'always',refetchInterval:30000});
  // Stale data are never shown while access is being checked again or after a failure.
  const packet=!query.isFetching&&!query.error?query.data:null;
  const rows=packet?.rows||[];
  const summary=useMemo(()=>summarizeScouting(rows,filters),[rows,filters]);
  const set=(key,value)=>setFilters(old=>({...old,[key]:value}));
  async function exportCsv() {
    setExporting(true);setExportError('');
    try {
      const fresh=await readTeraBi(program,user.id);
      const blob=new Blob([biCsv(summarizeScouting(fresh.rows,filters),BI_METRICS[program])],{type:'text/csv;charset=utf-8'});
      const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`tera-bi-${program.toLowerCase()}.csv`;anchor.click();URL.revokeObjectURL(url);
    }catch(error){setExportError(error.message);}finally{setExporting(false);}
  }
  return <InternalPageLayout user={user} currentPage={`Internal${program}BI`} title={`TERA BI — ${program}`}><div className="space-y-6 text-white pb-20">
    <Link to="/InternalTeraBI" className={biButton}>← Todos os meus painéis TERA BI</Link>
    <header className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-950/50 to-[#111217] p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-[.2em] text-red-400">INTELIGÊNCIA DA EQUIPE</p><h1 className="mt-2 text-2xl sm:text-3xl font-bold flex items-center gap-3"><BarChart3 aria-hidden="true"/>TERA BI <span className="text-red-400">{program}</span></h1><p className="mt-3 max-w-2xl text-sm text-gray-300">Scouting e evolução com os registros autorizados do Portal. Indicadores de equipe, sem ranking individual ou pontuação de PDI.</p></div><button className={biButton} onClick={()=>query.refetch()} disabled={query.isFetching}><RefreshCw size={17} aria-hidden="true"/>Atualizar</button></div></header>
    <BiAnalysisLibrary key={program} program={program} user={user}/>
    {query.isFetching&&<p role="status" className="p-6 text-gray-300">Conferindo acesso e carregando as fontes…</p>}
    {query.error&&<div role="alert" className="rounded-xl border border-red-500/50 p-5"><p>{query.error.message}</p><button className={biButton+' mt-3'} onClick={()=>query.refetch()}>Tentar novamente</button></div>}
    {packet&&<>
      <nav aria-label="Painéis por modalidade" className="flex flex-wrap gap-2">{packet.boards.map(mode=><Link key={mode} to={`/Internal${mode}BI`} aria-current={mode===program?'page':undefined} className={biButton+(mode===program?' bg-red-600/40':'')}>{mode}</Link>)}</nav>
      <p className="text-sm text-gray-300">{packet.coverage}. Atualizado em {new Date(packet.updated_at).toLocaleString('pt-BR')}.</p>
      {packet.partial&&<p role="status" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-200">Cobertura parcial: uma fonte atingiu o limite de 5.000 registros. Filtros e indicadores abrangem somente os registros carregados.</p>}
      <section aria-label="Filtros de scouting" className="grid gap-4 rounded-2xl border border-white/10 bg-[#111217] p-4 sm:grid-cols-2">
        <label className="text-sm space-y-2"><span>Equipe</span><select className={biControl} value={filters.team} onChange={e=>set('team',e.target.value)}><option value="">Todas as equipes autorizadas</option>{[...new Set(rows.map(r=>r.team))].sort().map(value=><option key={value}>{value}</option>)}</select></label>
        <label className="text-sm space-y-2"><span>Evento / temporada</span><select className={biControl} value={filters.event} onChange={e=>set('event',e.target.value)}><option value="">Todos os eventos carregados</option>{[...new Set(rows.map(r=>r.event))].sort().map(value=><option key={value}>{value}</option>)}</select></label>
        <label className="text-sm space-y-2"><span>De (data do registro)</span><input type="date" className={biControl+' [color-scheme:dark]'} value={filters.from} onChange={e=>set('from',e.target.value)}/></label>
        <label className="text-sm space-y-2"><span>Até (data do registro)</span><input type="date" className={biControl+' [color-scheme:dark]'} value={filters.to} onChange={e=>set('to',e.target.value)}/></label>
        <button className={biButton} onClick={()=>setFilters({team:'',event:'',from:'',to:''})}>Limpar filtros</button><button className={biButton} disabled={exporting||!summary.count} onClick={exportCsv}><Download size={17}/>{exporting?'Conferindo acesso…':'Exportar resumo CSV'}</button>
      </section>
      {filters.from&&filters.to&&filters.from>filters.to&&<p role="alert" className="text-amber-200">A data inicial é posterior à final. Ajuste o período.</p>}
      {exportError&&<p role="alert" className="text-red-300">{exportError}</p>}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3"><BiKpi label="Observações" value={summary.count} hint="Pode haver mais de um registro por partida."/><BiKpi label="Equipes no recorte" value={summary.teams.length}/><BiKpi label="Média" value={summary.average} hint={BI_METRICS[program]}/><BiKpi label="Melhor registro" value={summary.best} hint={BI_METRICS[program]}/></div>
      <p className="text-xs leading-relaxed text-gray-400">{summary.measured} de {summary.count} observações possuem valor numérico. Datas seguem o horário de Três Lagoas. {program==='FRC'?'Auto + teleop não inclui endgame e não representa o placar oficial completo.':program==='FTC'?'IEF é o índice registrado no scouting, não o placar oficial da competição.':'Somente regras Bioglow 2026/2027; outras simulações não são misturadas.'} Médias entre eventos e temporadas podem ter regras distintas: selecione um evento para comparar.</p>
      {!summary.count&&<div className="rounded-2xl border border-dashed border-white/20 p-8 text-center"><h2 className="text-lg font-semibold">Nenhum registro neste recorte</h2><p className="mt-2 text-gray-400">Registre scouting na modalidade ou ajuste os filtros. Nenhum dado de demonstração é utilizado.</p></div>}
      <div className="grid gap-5 2xl:grid-cols-2"><BiChart title="Média por equipe" data={summary.teams.map(r=>({name:r.name,value:r.average}))}/><BiChart line title="Evolução por data do registro" data={summary.days.map(r=>({name:r.name,value:r.average}))}/></div>
      <section className="min-w-0 rounded-2xl border border-white/10 bg-[#111217] p-4"><h2 className="text-lg font-semibold mb-3">Comparativo de equipes</h2><div className="overflow-x-auto"><table className="w-full text-sm text-left"><caption className="sr-only">Resumo do scouting por equipe no recorte</caption><thead><tr>{['Equipe','Observações','Média','Melhor'].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{summary.teams.map(r=><tr key={r.name} className="border-t border-white/10"><th className="p-3 font-medium break-words">{r.name}</th><td className="p-3">{r.records}</td><td className="p-3">{biNumber(r.average)}</td><td className="p-3">{biNumber(r.best)}</td></tr>)}</tbody></table></div></section>
      {program==='FLL'&&<section className="rounded-2xl border border-white/10 bg-[#111217] p-4"><h2 className="text-lg font-semibold">Missões — fotografia atual</h2><p className="my-2 text-sm text-gray-400">Fonte separada dos rounds e independente dos filtros acima; não representa evolução histórica.</p>{!packet.missions.length?<p>Nenhuma missão autorizada cadastrada.</p>:<ul className="divide-y divide-white/10">{packet.missions.map((m,i)=><li key={i} className="py-3 flex flex-wrap justify-between gap-2"><span className="break-words">{m.name}</span><span className="text-sm text-gray-300">{biNumber(m.score)} / {biNumber(m.maximum)} · {m.status}</span></li>)}</ul>}</section>}
    </>}
    <p className="text-xs text-gray-400">Painéis nativos do Portal · Integração Microsoft Power BI ainda não configurada. Fontes consultadas em modo somente leitura.</p>
  </div></InternalPageLayout>;
}
export default function InternalTeraBi({program}) {return <ProtectedRoute requireApproved><Dashboard key={program} program={program}/></ProtectedRoute>;}
