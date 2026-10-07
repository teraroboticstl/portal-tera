import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ProtectedRoute, { isAdmin } from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import { ModalityFilter, ModalityBadges } from '@/components/common/ModalityFields';
import { matchesProject, MODALITIES, OBR_CATEGORIES } from '@/lib/modalities';

function Content({ user }) {
  const requested = new URLSearchParams(window.location.search).get('modality');
  const [filter, setFilter] = useState([...MODALITIES, ...OBR_CATEGORIES].includes(requested) ? requested : 'all');
  const [search, setSearch] = useState('');
  const { data: projects = [], isLoading, isError } = useQuery({ queryKey: ['projects', 'internal'], queryFn: () => base44.entities.Project.list('-created_date') });
  const rows = projects.filter(p => matchesProject(p, filter) && `${p.title} ${p.description}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  return <InternalPageLayout user={user} currentPage="InternalSocialProjects" title="Projetos Sociais"><div className="space-y-6"><p className="text-gray-400">Projetos cadastrados e gerenciados no painel admin. Um projeto pode envolver uma, várias ou todas as modalidades, incluindo as subcategorias da OBR.</p>{isAdmin(user) && <Link className="inline-block text-[#E10600] hover:underline" to="/AdminPanel?tab=projects">Gerenciar projetos e vínculos no painel admin →</Link>}<div className="grid sm:grid-cols-2 gap-4"><ModalityFilter value={filter} onChange={setFilter} /><label className="text-sm">Buscar projeto<input className="block mt-2 w-full p-3 bg-[#111217] border border-[#1F222B] rounded-lg" value={search} onChange={e => setSearch(e.target.value)} /></label></div>{isLoading ? <p>Carregando projetos...</p> : isError ? <p role="alert">Não foi possível carregar os projetos sociais.</p> : <><p className="text-gray-400">{rows.length} projeto(s)</p><div className="grid md:grid-cols-2 gap-4">{rows.map(p => <article key={p.id} className="bg-[#111217] border border-[#1F222B] p-5 rounded-xl"><h2 className="text-xl font-bold">{p.title}</h2><ModalityBadges project={p} /><p className="text-sm text-gray-400 mb-3">{p.status === 'active' ? 'Ativo' : p.status} {p.date_period && `· ${p.date_period}`}</p><p className="text-gray-300 whitespace-pre-wrap">{p.description}</p><Link className="inline-block mt-4 text-blue-400 hover:underline" to={`/ProjectDetail?id=${encodeURIComponent(p.id)}`}>Ver projeto →</Link></article>)}</div>{!rows.length && <p>Nenhum projeto corresponde ao filtro.</p>}</>}</div></InternalPageLayout>;
}
export default function InternalSocialProjects() { return <ProtectedRoute requireApproved><Content /></ProtectedRoute>; }
