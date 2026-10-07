import React, { useEffect, useState } from 'react';
import { listFllSimulations, classifyTeraSimulation } from '@/api/fllSimulationsClient';
import { Button } from '@/components/ui/button';

export default function FllSimulationsManagement() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('all');
  async function load() {
    setLoading(true); setError('');
    try { setRows((await listFllSimulations(true)).simulations || []); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(()=>{ load(); }, []);
  async function classify(row) {
    setLoading(true);
    try { await classifyTeraSimulation(row.id, !row.is_tera); await load(); }
    catch (err) { setError(err.message); setLoading(false); }
  }
  const visible = rows.filter(row => `${row.team_name} ${row.round_name} ${row.season_theme} ${row.season_year}`.toLowerCase().includes(search.toLowerCase()) && (group === 'all' || group === 'tera' && row.is_tera || group === 'guests' && row.origin === 'guest' || group === 'portfolio' && row.is_portfolio));
  const average = groupRows => groupRows.length ? Math.round(groupRows.reduce((sum,row)=>sum+row.score,0)/groupRows.length) : '—';
  return <section className="space-y-5 text-white">
    <div className="flex justify-between gap-3"><div><h2 className="text-xl font-bold">Simulações de round FLL</h2><p className="text-sm text-gray-400">Até 100 registros recentes. Dados de contato restritos à administração.</p></div><Button onClick={load} disabled={loading}>{loading ? 'Carregando…' : 'Atualizar'}</Button></div>
    {error && <p role="alert" className="text-red-400">{error}</p>}
    <div className="flex flex-wrap gap-3"><input aria-label="Buscar equipe ou temporada" className="rounded border border-white/20 bg-black p-2" placeholder="Equipe, round ou temporada" value={search} onChange={e=>setSearch(e.target.value)} /><select aria-label="Filtrar registros" className="rounded border border-white/20 bg-black p-2" value={group} onChange={e=>setGroup(e.target.value)}><option value="all">Todos</option><option value="tera">Tera confirmados</option><option value="guests">Visitantes</option><option value="portfolio">Portfólio</option></select></div>
    <p className="text-sm text-gray-300">Filtro: {visible.length} rounds · Média: {average(visible)} pts · Tera: {average(visible.filter(row=>row.is_tera))} pts · Visitantes: {average(visible.filter(row=>row.origin==='guest'))} pts. Pontuações autodeclaradas, recalculadas pelo portal.</p>
    {!loading && !visible.length && <p className="text-gray-400">Nenhuma simulação encontrada.</p>}
    {visible.map(row=><article key={row.id} className="rounded-xl border border-white/10 p-4 space-y-2">
      <div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">{row.team_name} · {row.round_name} · {row.score} pts</h3><Button variant="outline" disabled={loading} onClick={()=>classify(row)}>{row.is_tera ? 'Remover classificação Tera' : 'Confirmar como Tera'}</Button></div>
      <p className="text-sm text-gray-400">{new Date(row.created_at).toLocaleString('pt-BR')} · {row.season_theme} {row.season_year} · {row.origin==='guest' ? 'Visitante' : 'Usuário cadastrado'} · {row.rules_version}</p>
      {row.fll_simulation_contacts?.email && <p className="text-sm">Contato interno: {row.fll_simulation_contacts.email}</p>}
      {row.is_portfolio && <p className="text-sm">Portfólio — iteração: {row.iteration_title}{row.notes && ` · ${row.notes}`}</p>}
      <details><summary className="cursor-pointer text-sm">Pontuação por missão e respostas</summary><pre className="text-xs whitespace-pre-wrap break-words mt-2">{JSON.stringify({pontuacao:row.breakdown,respostas:row.state_snapshot},null,2)}</pre></details>
    </article>)}
  </section>;
}
