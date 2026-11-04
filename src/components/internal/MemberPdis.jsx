import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { createMemberPdisClient } from '@/api/memberPdisClient';
import { useAuth } from '@/lib/AuthContext';

const read = createMemberPdisClient(supabase);
function PdiList({ actor, all }) {
  const [cursors, setCursors] = useState([null]);
  const after = cursors[cursors.length - 1];
  const query = useQuery({ queryKey: ['member-pdis', actor, all, after],
    queryFn: () => read(actor, { all, after }), enabled: Boolean(actor), staleTime: 0, gcTime: 0, retry: false });
  if (query.isError) return <p role="alert">Não foi possível carregar os PDIs. <button onClick={() => query.refetch()} className="text-red-400 underline">Tentar novamente</button></p>;
  if (query.isFetching || !query.data || query.data.actor !== actor) return <p role="status">Carregando PDIs…</p>;
  return <div className="space-y-4">
    <p className="text-gray-300">Um PDI por modalidade informada no cadastro. O cadastro não concede acesso a novas modalidades. Objetivos preenchidos não geram pontuação automática.</p>
    {!query.data.items.length && <p>Nenhum PDI disponível. Se você já concluiu o cadastro, contate o administrador; não precisa preenchê-lo novamente.</p>}
    {query.data.items.map(({ cursor, pdi }) => <article key={cursor} className="rounded-xl border border-red-600/30 bg-[#111217] p-5 space-y-3">
      <h3 className="text-lg font-bold">{pdi.member_name} · {pdi.modality}</h3>
      <p className="text-sm text-gray-400">Temporada: {pdi.season} · {pdi.registration_version ? 'Criado a partir do cadastro' : 'Registro anterior'}{!pdi.participant_id && ' · Vínculo do participante pendente de revisão'}</p>
      <p><strong>Área(s):</strong> {pdi.main_role}</p>
      <div><h4 className="font-semibold">Objetivos</h4><p className="whitespace-pre-wrap text-gray-300">{pdi.learning_goal || 'Ainda não informados'}</p></div>
      {Array.isArray(pdi.initial_competencies) && pdi.initial_competencies.length > 0 && <div><h4 className="font-semibold">Competências a desenvolver</h4><ul className="list-disc pl-5">{pdi.initial_competencies.map((text, index) => <li key={index}>{text}</li>)}</ul></div>}
      <p className="text-sm text-gray-400">{pdi.registration_version ? 'PDI inicial criado. Avaliação de evolução ainda pendente; nenhuma nota de IA foi atribuída.' : 'Histórico preservado.'}</p>
    </article>)}
    <div className="flex gap-4">
      {cursors.length > 1 && <button className="text-red-400 underline" onClick={() => setCursors(previous => previous.slice(0,-1))}>Página anterior</button>}
      {query.data.has_more && <button className="text-red-400 underline" onClick={() => setCursors(previous => [...previous,query.data.next_cursor])}>Próxima página</button>}
    </div>
  </div>;
}
export default function MemberPdis({ all = false }) {
  const { user, isAuthenticated } = useAuth();
  const actor = isAuthenticated ? user?.id : null;
  return <section className="space-y-5 text-white"><h2 className="text-xl font-bold">{all ? 'Todos os PDIs' : 'Meu PDI'}</h2>
    {actor ? <PdiList key={`${actor}:${all}`} actor={actor} all={all} /> : <p>Entre novamente para consultar os PDIs.</p>}
  </section>;
}
