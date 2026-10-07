import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import { OBR_CATEGORIES, OBR_MANUALS_URL, matchesProgram } from '@/lib/modalities';

function Content({ user }) {
  const requested = new URLSearchParams(window.location.search).get('program');
  const [category, setCategory] = useState(OBR_CATEGORIES.includes(requested) ? requested : 'OBR');
  const { data: logs = [], isError: logError } = useQuery({ queryKey: ['daily-logs'], queryFn: () => base44.entities.DailyLog.list('-date') });
  const { data: meetings = [], isError: meetingError } = useQuery({ queryKey: ['meetings'], queryFn: () => base44.entities.MeetingNote.list('-date') });
  const { data: prototypes = [], isError: prototypeError } = useQuery({ queryKey: ['prototypes'], queryFn: () => base44.entities.PrototypeTest.list('-date') });
  const { data: seasons = [] } = useQuery({ queryKey: ['seasons'], queryFn: () => base44.entities.Season.list('-year') });
  const season = seasons.find(s => s.program === 'OBR');
  const active = rows => rows.filter(r => !r.season_tag && matchesProgram(r.program, category));
  const selectedLogs = active(logs);
  return <InternalPageLayout user={user} currentPage="InternalOBR" title="OBR — Resgate e Artística"><div className="space-y-6"><p className="text-gray-400">Preparação, registros de engenharia e ações sociais das quatro subcategorias OBR. OBR geral reúne registros ainda sem nível definido.</p><label className="block text-sm">Subcategoria OBR<select value={category} onChange={e => setCategory(e.target.value)} className="block mt-2 w-full bg-[#111217] rounded-lg border border-[#1F222B] p-3"><option value="OBR">Todas as subcategorias OBR</option>{OBR_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
    {season && <section className="bg-[#111217] border border-[#1F222B] rounded-xl p-5"><h2 className="font-bold text-xl">{season.season_name} · {season.year}</h2>{season.team_objectives && <p className="mt-3 text-gray-300 whitespace-pre-wrap">{season.team_objectives}</p>}<p className="text-sm text-gray-400 mt-2">Regional / Estadual: {season.regional_date?.split('T')[0] || 'Não informado'}</p></section>}
    {(logError || meetingError || prototypeError) && <p role="alert">Alguns registros não puderam ser carregados. Atualize a página para tentar novamente.</p>}
    <section className="grid sm:grid-cols-3 gap-4">{[['Logs', selectedLogs.length, 'InternalLogs'], ['Reuniões', active(meetings).length, 'InternalMeetings'], ['Protótipos', active(prototypes).length, 'InternalPrototypes']].map(([label, count, path]) => <Link key={path} to={`/${path}?program=${encodeURIComponent(category)}`} className="bg-[#111217] border border-[#1F222B] hover:border-blue-500 rounded-xl p-5"><p className="text-3xl font-bold">{count}</p><h2>{label}</h2><p className="text-sm text-blue-400 mt-2">Consultar e registrar →</p></Link>)}</section>
    <section><h2 className="text-xl font-bold mb-4">Frentes de preparação</h2><div className="grid md:grid-cols-2 gap-4">{OBR_CATEGORIES.map(c => <button key={c} onClick={() => setCategory(c)} className="text-left bg-[#111217] border border-[#1F222B] rounded-xl p-5 hover:border-blue-500"><h3 className="font-bold">{c.replace('OBR ', '')}</h3><p className="text-gray-400 text-sm mt-2">{c.includes('Resgate') ? 'Sensores, navegação, mecanismos e testes de resgate.' : 'Narrativa, movimentos, programação e ensaios da apresentação.'}</p></button>)}</div></section>
    <section className="bg-[#111217] border border-[#1F222B] rounded-xl p-5"><h2 className="text-xl font-bold mb-4">Logs recentes do filtro</h2>{selectedLogs.slice(0, 8).map(r => <article key={r.id} className="border-t border-[#1F222B] py-3"><h3 className="font-semibold">{r.title || r.log_type || 'Registro'}</h3><p className="text-xs text-blue-300">{r.program} · {r.date}</p><p className="text-gray-400 text-sm whitespace-pre-wrap line-clamp-3">{r.what_was_done || r.content}</p></article>)}{!selectedLogs.length && <p className="text-gray-400">Nenhum log desta subcategoria. Registre o primeiro pela área de logs.</p>}</section>
    <div className="flex flex-wrap gap-4"><Link className="text-blue-400 hover:underline" to={`/InternalProjects?modality=${encodeURIComponent(category)}`}>Projetos sociais desta modalidade →</Link><a className="text-blue-400 hover:underline" href={OBR_MANUALS_URL} target="_blank" rel="noopener noreferrer">Manuais oficiais ↗</a></div>
  </div></InternalPageLayout>;
}
export default function InternalOBR() { return <ProtectedRoute requireApproved><Content /></ProtectedRoute>; }
