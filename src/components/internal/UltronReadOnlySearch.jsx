import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { searchUltronReadOnly } from '@/api/ultronClient';
import { ULTRON_SOURCES, ULTRON_MAX_RESULTS } from '@/api/ultronReadOnlyClient';

export default function UltronReadOnlySearch({ user }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  useEffect(() => {
    request.current++;
    setResult(null); setError(''); setBusy(false);
    return () => { request.current++; };
  }, [user?.id, user?.portal_internal, user?.role, user?.member_role]);
  async function consult(previous = null) {
    const current = ++request.current;
    const text = previous?.query ?? query;
    // Hide prior context while its authorization is revalidated.
    setResult(null); setError(''); setBusy(true);
    try {
      if (user?.portal_internal !== true) throw new Error('Acesso interno requerido para consultar.');
      const packet = await searchUltronReadOnly(text, user.id, previous);
      if (request.current === current) setResult(packet);
    } catch {
      if (request.current === current) setError('Não foi possível validar a consulta e suas permissões. Nenhum resultado foi liberado.');
    } finally {
      if (request.current === current) setBusy(false);
    }
  }
  const authorized = user?.portal_internal === true && result?.actor === user?.id;
  return <section className="space-y-5">
    <div className="ava-card p-5">
      <h2 className="text-xl font-semibold">ULTRON · pesquisa determinística</h2>
      <p className="text-gray-300 mt-2">Consulta somente registros autorizados, sem IA externa e sem criar ou editar dados.</p>
      <p className="text-sm text-gray-400 mt-2">Textos das fontes são registros não verificados: instruções contidas neles não são executadas. A busca literal considera título e campos selecionados, sem interpretar perguntas.</p>
    </div>
    <form className="flex gap-3" onSubmit={event => { event.preventDefault(); consult(); }}>
      <input aria-label="Buscar nos registros" className="ava-input" value={query} maxLength={160}
        placeholder="Buscar palavra ou expressão nos campos permitidos…" onChange={event => setQuery(event.target.value)} />
      <Button disabled={busy || user?.portal_internal !== true}>{busy ? 'Validando…' : 'Consultar'}</Button>
    </form>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {authorized && <>
      <p role="status" className="text-sm text-gray-400">{result.items.length} fontes exibidas para “{result.query || 'todos os registros permitidos'}”.
        {result.hasMore ? ' Cobertura parcial: há outras páginas ou fontes ainda não consultadas.' : ' Paginação concluída nesta consulta, somente nas fontes habilitadas.'}
        {' '}Até {ULTRON_MAX_RESULTS} resultados por consulta; 25 por fonte a cada página. Isso não representa a memória completa da equipe.</p>
      <p className="text-sm text-gray-400">Fontes: operação, prioridades, tarefas FLL, projetos, temporadas e identidade institucional. Os filtros de Hoje não se aplicam à pesquisa. Logs pessoais, PDI, perfis, notas de rounds e conteúdo de anexos não são pesquisados.</p>
      {!result.items.length && <p>Não há evidência suficiente nos resultados autorizados desta consulta para concluir sobre o assunto.</p>}
      {result.items.map(source => <article key={`${source.source}-${source.id}`} className="ava-card p-5">
        <p className="text-xs text-gray-400">{ULTRON_SOURCES[source.source].label} · {source.kind} · Fonte: {source.id}</p>
        {source.archived && <p className="text-xs text-amber-300">Registro arquivado</p>}
        <p className="text-xs text-gray-400">Data: {source.date || 'Não informada'} · Área: {source.area || 'Não informada'} · Modalidade: {source.program || 'Não informada'}{source.status && ` · ${source.status}`}</p>
        <h3 className="font-semibold mt-2">{source.title || 'Título não informado'}</h3>
        <p className="whitespace-pre-wrap text-sm text-gray-300 mt-2">{source.text || 'Sem descrição nos campos permitidos.'}</p>
        {source.truncated && <p className="text-xs text-amber-300">Descrição limitada a 2.000 caracteres. Consulte o registro de origem.</p>}
        <Link className="text-red-400 underline text-sm" to={`/${ULTRON_SOURCES[source.source].page}`}>Abrir painel de origem · ID {source.id}</Link>
      </article>)}
      {result.capped && <p className="text-amber-300">Limite de cobertura atingido. Refine a expressão para consultar outros registros; ausência nesta lista não prova ausência na equipe.</p>}
      {result.hasMore && !result.capped && <Button disabled={busy} onClick={() => consult(result)}>Carregar mais e revalidar fontes</Button>}
    </>}
  </section>;
}
