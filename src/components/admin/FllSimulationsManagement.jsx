import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { listFllSimulations, classifyTeraSimulation, archiveFllSimulations, saveFllSimulation } from '@/api/fllSimulationsClient';
import { missionsForVersion, normalizeTeam, seasonKey, filterSimulations, analyzeSimulations, demonstrationRounds } from '@/lib/fllSimulationAnalytics';
import { Button } from '@/components/ui/button';
const COLORS=['#f87171','#34d399','#60a5fa','#fbbf24','#c084fc','#fb923c','#22d3ee','#f472b6'];
const number=value=>value===null ? '—' : Number(value).toLocaleString('pt-BR',{maximumFractionDigits:1});
const delta=value=>value===null ? 'Dados insuficientes' : `${value>0?'+':''}${number(value)} pts`;
const control='w-full rounded-lg border border-white/20 bg-[#111217] p-2 text-sm text-white';
export default function FllSimulationsManagement() {
  const [rows,setRows]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  const [season,setSeason]=useState(''),[group,setGroup]=useState('all'),[teams,setTeams]=useState([]);
  const [from,setFrom]=useState(''),[to,setTo]=useState(''),[data,setData]=useState('real');
  const [portfolio,setPortfolio]=useState(false),[trash,setTrash]=useState(false),[metric,setMetric]=useState('score');
  const [confirmation,setConfirmation]=useState(null),[progress,setProgress]=useState('');
  const [notice,setNotice]=useState(''),[recordPage,setRecordPage]=useState(0);
  const demoRequests=useRef(null);
  const seasons=useMemo(()=>Array.from(new Set(rows.map(seasonKey))),[rows]);
  async function load() {
    setLoading(true);setError('');
    try { const result=await listFllSimulations(true);setRows(result.simulations);setSeason(old=>old && result.simulations.some(row=>seasonKey(row)===old) ? old : result.simulations[0] ? seasonKey(result.simulations[0]) : ''); }
    catch(err){setError(err.message);} finally{setLoading(false);}
  }
  useEffect(()=>{load();},[]);
  useEffect(()=>{setRecordPage(0);},[season,group,teams,from,to,data,portfolio,trash]);
  const invalidDates=Boolean(from && to && from>to);
  const filters={season,group,teams,from,to,data,portfolio,trash};
  const visible=invalidDates || !season ? [] : filterSimulations(rows,filters);
  const eligible=filterSimulations(rows,{...filters,teams:[]});
  const availableTeams=Array.from(new Map(eligible.map(row=>[normalizeTeam(row.team_name),row.team_name])).entries()).sort((a,b)=>a[1].localeCompare(b[1]));
  const selectedVersion=visible[0]?.rules_version || rows.find(row=>seasonKey(row)===season)?.rules_version;
  const MISSIONS=missionsForVersion(selectedVersion);
  const scoreMax=selectedVersion==='industria-interclasse-2026-v11' ? 600 : 530;
  const analysis=analyzeSimulations(visible,3,metric),chartTeams=analysis.teams.slice(0,8);
  const metricMax=metric==='score' ? scoreMax : MISSIONS.find(([code])=>code===metric)?.[2] || scoreMax;
  async function classify(row) {
    setLoading(true);setError('');
    try{await classifyTeraSimulation(row.id,!row.is_tera);await load();}catch(err){setError(err.message);setLoading(false);}
  }
  async function executeRemoval() {
    const {ids,restore}=confirmation;setLoading(true);setError('');
    try { let affected=0;for(let i=0;i<ids.length;i+=250)affected+=(await archiveFllSimulations(ids.slice(i,i+250),restore)).affected;
      if (!restore && rows.some(row=>ids.includes(row.id) && row.is_test)) demoRequests.current=null;
      setConfirmation(null);setNotice(`${affected} registro(s) ${restore?'restaurado(s)':'movido(s) para a lixeira'}.`);await load();
    } catch(err){setError(err.message);setLoading(false);}
  }
  async function generateDemo() {
    setLoading(true);setError('');setNotice('');
    demoRequests.current ||= demonstrationRounds().map(state=>({state,requestId:crypto.randomUUID(),testOnly:true}));
    try { for(let i=0;i<demoRequests.current.length;i++) {
        setProgress(`Criando demonstração ${i+1}/18…`);
        const {simulation}=await saveFllSimulation(demoRequests.current[i]);
        if(demoRequests.current[i].state.teamName.startsWith('Tera Robotics'))await classifyTeraSimulation(simulation.id,true);
      }
      setData('test');setGroup('all');setTeams(Array.from(new Set(demoRequests.current.map(item=>normalizeTeam(item.state.teamName)))));setFrom('');setTo('');setPortfolio(false);setTrash(false);
      setNotice('18 rounds de demonstração: 6 tentativas de cada uma das 3 equipes, separados dos dados reais.');await load();
    } catch(err){setError(`${err.message} Os rounds criados permanecem marcados como teste. Repetir nesta sessão retoma sem duplicar.`);setLoading(false);}
    finally{setProgress('');}
  }
  const testRows=rows.filter(row=>row.is_test && !row.deleted_at);
  return <section className="space-y-5 text-white">
    <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-bold">Análise de simulações FLL</h2><p className="text-sm text-gray-400">Evolução por equipe, comparação de rounds e desempenho por missão.</p></div><Button onClick={load} disabled={loading}>{loading ? progress || 'Carregando…' : 'Atualizar'}</Button></div>
    {error && <p role="alert" className="text-red-400">{error}</p>}{notice && <p role="status" className="text-emerald-300">{notice}</p>}
    <div className="rounded-xl border border-white/10 bg-[#111217] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <label className="text-sm">Temporada e regras<select className={control} value={season} onChange={e=>{setSeason(e.target.value);setTeams([]);setMetric('score');}}><option value="">Selecione a temporada</option>{seasons.map(item=><option key={item}>{item}</option>)}</select></label>
      <label className="text-sm">Comparação<select className={control} value={group} onChange={e=>{setGroup(e.target.value);setTeams([]);}}><option value="all">Todas as equipes</option><option value="tera">Exclusivamente Tera confirmados</option><option value="others">Outras equipes (não Tera)</option></select></label>
      <label className="text-sm">Conjunto de dados<select className={control} value={data} onChange={e=>{setData(e.target.value);setTeams([]);}}><option value="real">Somente dados reais</option><option value="test">Somente demonstração / testes</option><option value="all">Reais e testes (misturados)</option></select></label>
      <label className="text-sm">Registros<select className={control} value={trash?'trash':'active'} onChange={e=>setTrash(e.target.value==='trash')}><option value="active">Ativos</option><option value="trash">Lixeira — restaurar registros</option></select></label>
      <label className="text-sm">Data inicial<input type="date" className={control} value={from} onChange={e=>setFrom(e.target.value)} /></label><label className="text-sm">Data final<input type="date" className={control} value={to} onChange={e=>setTo(e.target.value)} /></label>
      <label className="text-sm">Métrica do gráfico<select className={control} value={metric} onChange={e=>setMetric(e.target.value)}><option value="score">Pontuação total</option>{MISSIONS.map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={portfolio} onChange={e=>setPortfolio(e.target.checked)} />Somente iterações de portfólio</label>
      <div className="sm:col-span-2 lg:col-span-4"><p className="text-sm mb-2">Equipes comparadas — sem seleção, inclui todas do filtro</p><div className="flex flex-wrap gap-3 max-h-40 overflow-auto">{availableTeams.map(([key,name])=><label key={key} className="text-sm flex gap-1.5 items-center"><input type="checkbox" checked={teams.includes(key)} onChange={e=>setTeams(old=>e.target.checked?[...old,key]:old.filter(item=>item!==key))} />{name}</label>)}</div></div>
    </div>
    <p className="text-xs text-gray-400">Resultados informados no simulador e recalculados pelo portal. Equipes agrupadas pelo nome normalizado; a classificação Tera depende da confirmação administrativa.</p>
    {invalidDates && <p role="alert" className="text-amber-300">A data final deve ser igual ou posterior à data inicial.</p>}{data==='all' && <p className="text-amber-300 text-sm">Esta visualização mistura resultados reais e demonstrações.</p>}{trash && <p className="text-amber-300 text-sm">A lixeira fica fora das análises ativas e desativa os links públicos.</p>}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[['Rounds',analysis.count],['Equipes',analysis.teams.length],['Média por round',number(analysis.average)+' pts'],['Melhor round',number(analysis.best)+' pts']].map(([label,value])=><div key={label} className="rounded-xl border border-white/10 p-4"><p className="text-xs text-gray-400">{label}</p><p className="text-2xl font-bold">{value}</p></div>)}</div>
    {!loading && !visible.length && <p className="text-gray-400">Nenhum round corresponde aos filtros. Para explorar o painel, gere a demonstração abaixo.</p>}
    {analysis.count>0 && <>
      <div className="rounded-xl border border-white/10 p-4"><h3 className="font-bold mb-2">Evolução por tentativa — {metric==='score'?'pontuação total':MISSIONS.find(([code])=>code===metric)?.[1]}</h3><p className="text-xs text-gray-400 mb-4">Cada equipe é ordenada pela data de seus próprios rounds. Linha contínua: resultado; tracejada: média móvel de até 3 tentativas. Gráfico e mapa mostram até 8 equipes; selecione as equipes para comparar.</p>
        <div className="h-80 w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><LineChart data={analysis.evolution} margin={{top:10,right:15,left:0,bottom:15}}><CartesianGrid stroke="#ffffff15" /><XAxis dataKey="round" stroke="#9ca3af" label={{value:'Tentativa',position:'insideBottom',offset:-10}} allowDecimals={false} /><YAxis stroke="#9ca3af" domain={[0,metricMax]} /><Tooltip contentStyle={{background:'#111217',borderColor:'#4b5563',color:'#fff'}} labelFormatter={value=>`Tentativa ${value}`} formatter={value=>number(value)+' pts'} /><Legend />{chartTeams.flatMap((team,i)=>[<Line key={team.key} type="linear" dataKey={`team${i}`} name={team.name} stroke={COLORS[i]} strokeWidth={2} dot={{r:3}} connectNulls={false} isAnimationActive={false} />,<Line key={team.key+'mean'} type="linear" dataKey={`mean${i}`} name={`${team.name} · média móvel`} stroke={COLORS[i]} strokeDasharray="5 4" dot={false} isAnimationActive={false} />])}</LineChart></ResponsiveContainer></div>
      </div>
      <div className="rounded-xl border border-white/10 p-4 overflow-x-auto"><h3 className="font-bold mb-2">Progresso das equipes</h3><p className="text-xs text-gray-400 mb-3">Variação: média dos últimos 3 menos média dos primeiros 3 rounds dentro do período. Exige pelo menos 6 rounds, sem sobreposição entre os grupos.</p><table className="w-full text-sm"><thead><tr className="text-left text-gray-400">{['Equipe','Rounds','Média','Melhor','Último','Primeiros 3','Últimos 3','Variação'].map(label=><th key={label} className="p-2 whitespace-nowrap">{label}</th>)}</tr></thead><tbody>{analysis.teams.map(team=><tr key={team.key} className="border-t border-white/10"><td className="p-2">{team.name}</td>{[team.rounds.length,number(team.average),team.best,team.latest,number(team.firstAverage),number(team.recentAverage)].map((value,i)=><td key={i} className="p-2">{value}</td>)}<td className={`p-2 whitespace-nowrap ${team.gain>0?'text-emerald-300':team.gain<0?'text-red-300':'text-gray-400'}`}>{delta(team.gain)}</td></tr>)}</tbody></table></div>
      <div className="rounded-xl border border-white/10 p-4 overflow-x-auto"><h3 className="font-bold mb-2">Mapa de desempenho por missão</h3><p className="text-xs text-gray-400 mb-3">Média / máximo, aproveitamento, frequência de rounds sem pontuação e variação das médias. Zero pontos pode indicar missão não executada.</p><table className="w-full text-xs"><thead><tr className="text-left"><th className="p-2">Missão</th>{chartTeams.map(team=><th key={team.key} className="p-2 min-w-44">{team.name}</th>)}</tr></thead><tbody>{MISSIONS.map(([code,label,max],index)=><tr key={code} className="border-t border-white/10"><th className="p-2 text-left whitespace-nowrap">{label}<span className="block text-gray-400">Máx. {max} pts</span></th>{chartTeams.map(team=>{const m=team.missions[index];return <td key={team.key} className="p-2" style={{background:`rgba(16,185,129,${0.03+m.percentage/500})`}}><strong>{number(m.average)} / {max} pts · {number(m.percentage)}%</strong><span className="block text-gray-400">Sem pontos: {number(m.zeroRate)}%</span><span className="block">Variação: {delta(m.gain)}</span></td>;})}</tr>)}</tbody></table></div>
      <div className="grid md:grid-cols-2 gap-3">{chartTeams.map(team=><div key={team.key} className="rounded-xl border border-white/10 p-4"><h3 className="font-bold">Oportunidades — {team.name}</h3><p className="text-xs text-gray-400 mb-2">Máximo da missão menos a média dos últimos 3 rounds (ou disponíveis).</p>{[...team.missions].sort((a,b)=>b.opportunity-a.opportunity).slice(0,3).map(m=><p key={m.code} className="text-sm">{m.label}: {number(m.recent)} / {m.max} pts · potencial de +{number(m.opportunity)} pts</p>)}</div>)}</div>
    </>}
    <div className="flex flex-wrap gap-2 items-center rounded-xl border border-white/10 p-4"><Button variant="outline" disabled={loading} onClick={generateDemo}>Gerar 18 rounds de demonstração</Button><Button variant="outline" disabled={loading || !testRows.length} onClick={()=>setConfirmation({ids:testRows.map(row=>row.id),restore:false,label:`todos os ${testRows.length} rounds de teste ativos, inclusive fora dos filtros`})}>Limpar todos os testes ({testRows.length})</Button><p className="text-xs text-gray-400">Dados fictícios, identificados como teste e excluídos do filtro de dados reais.</p></div>
    <h3 className="font-bold">Registros do filtro ({visible.length})</h3>
    {visible.slice(recordPage*20,recordPage*20+20).map(row=><article key={row.id} className="rounded-xl border border-white/10 p-4 space-y-2"><div className="flex flex-wrap justify-between gap-2"><h4 className="font-bold">{row.team_name} · {row.round_name} · {row.score} pts {row.is_test && <span className="text-amber-300">[TESTE]</span>}</h4><div className="flex flex-wrap gap-2">{!row.deleted_at && <Button variant="outline" disabled={loading} onClick={()=>classify(row)}>{row.is_tera?'Remover classificação Tera':'Confirmar como Tera'}</Button>}<Button variant="outline" className={row.deleted_at?'text-emerald-300':'text-red-300'} disabled={loading} onClick={()=>setConfirmation({ids:[row.id],restore:Boolean(row.deleted_at),label:`${row.team_name} — ${row.round_name}`})}>{row.deleted_at?'Restaurar':'Excluir simulação'}</Button></div></div>
      <p className="text-sm text-gray-400">{new Date(row.created_at).toLocaleString('pt-BR')} · {row.season_theme} {row.season_year} · {row.origin==='guest'?'Visitante':'Usuário cadastrado'} · {row.is_tera?'Tera confirmado':'Sem classificação Tera'}</p>{row.fll_simulation_contacts?.email && <p className="text-sm">Contato interno: {row.fll_simulation_contacts.email}</p>}{row.is_portfolio && <p className="text-sm">Portfólio — {row.iteration_title}{row.notes && ` · ${row.notes}`}</p>}<details><summary className="cursor-pointer text-sm">Pontuação por missão e respostas</summary><pre className="text-xs whitespace-pre-wrap break-words mt-2">{JSON.stringify({pontuacao:row.breakdown,respostas:row.state_snapshot},null,2)}</pre></details>
    </article>)}
    {visible.length>20 && <div className="flex gap-3 items-center"><Button variant="outline" disabled={!recordPage} onClick={()=>setRecordPage(old=>old-1)}>Anteriores</Button><span>Página {recordPage+1} de {Math.ceil(visible.length/20)}</span><Button variant="outline" disabled={(recordPage+1)*20>=visible.length} onClick={()=>setRecordPage(old=>old+1)}>Próximos</Button></div>}
    {confirmation && <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"><div role="dialog" aria-modal="true" aria-labelledby="archive-round-title" className="rounded-xl border border-white/20 bg-[#111217] p-5 max-w-lg space-y-4"><h3 id="archive-round-title" className="font-bold">{confirmation.restore?'Restaurar simulação':'Excluir simulação'}</h3><p>{confirmation.label}</p><p className="text-sm text-gray-400">{confirmation.restore?'O registro voltará às análises ativas e o link compartilhado voltará a funcionar.':'O registro irá para a lixeira, sairá das análises ativas e seu link público será desativado. Você poderá restaurá-lo.'}</p><div className="flex justify-end gap-2"><Button variant="outline" disabled={loading} onClick={()=>setConfirmation(null)}>Cancelar</Button><Button disabled={loading} onClick={executeRemoval}>{loading?'Processando…':confirmation.restore?'Confirmar restauração':'Confirmar exclusão'}</Button></div></div></div>}
  </section>;
}
