export const ULTRON_SOURCES = Object.freeze({
  portal_work_items: { label: 'Operação Tera', page: 'InternalOperations' },
  priorities: { label: 'Prioridade', page: 'InternalFTC' },
  fll_tasks: { label: 'Tarefa FLL', page: 'InternalFLLTasks' },
  projects: { label: 'Projeto institucional', page: 'Projects' },
  seasons: { label: 'Temporada', page: 'InternalSeasonArchive' },
  team_knowledge_bases: { label: 'Identidade institucional', page: 'KnowledgeBase' },
});
export const ULTRON_PAGE_SIZE = 25;
export const ULTRON_MAX_RESULTS = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = () => { throw new Error('Consulta indisponível ou acesso não autorizado. Nenhum resultado foi liberado.'); };

// Defense in depth for accidentally pasted common credentials. Not a proof that prose
// contains no secrets or personal information; sources must also follow data governance.
export function safeSourceText(value, limit) {
  if (typeof value !== 'string') return '';
  return value.replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, '[credencial removida]')
    .replace(/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{12,}\b/g, '[credencial removida]')
    .replace(/\b(?:sk-[A-Za-z0-9_-]{10,}|gh[pousr]_[A-Za-z0-9_]{10,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/g, '[credencial removida]')
    .replace(/\b(?:api[_ -]?key|access[_ -]?key|secret[_ -]?key|client[_ -]?secret|refresh[_ -]?token|access[_ -]?token|password|senha)\s*[:=]\s*[^\s,;]+/gi, '[credencial removida]')
    .slice(0, limit);
}

export function createUltronReadOnlySearch(client) {
  async function authorize(expectedId) {
    const auth = await client.auth.getUser().catch(fail);
    const id = auth.data?.user?.id;
    if (auth.error || !UUID.test(id || '') || id !== expectedId) fail();
    const access = await client.rpc('ava_identity').catch(fail);
    if (access.error || access.data?.portal_internal !== true) fail();
    return id;
  }
  async function page(source, query, after, limit, ids, actor) {
    const result = await client.rpc('portal_work_sources', {
      p_query: query, p_source: source, p_after: after, p_limit: limit, p_ids: ids,
    }).catch(fail);
    const packet = result.data;
    if (result.error || packet?.actor_id !== actor || !Array.isArray(packet.items)
      || packet.items.length > limit || typeof packet.has_more !== 'boolean'
      || (packet.has_more && (!UUID.test(packet.next_cursor || '') || packet.next_cursor === after))) fail();
    const seen = new Set();
    for (const item of packet.items) {
      if (item.source !== source || !UUID.test(item.id || '') || seen.has(item.id)
        || (ids && !ids.includes(item.id))) fail();
      seen.add(item.id);
    }
    return packet;
  }
  function normalize(item) {
    return { source: item.source, id: item.id, kind: safeSourceText(item.kind, 60),
      title: safeSourceText(item.title, 200), text: safeSourceText(item.text, 2000),
      date: typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(item.date) ? item.date.slice(0,10) : null,
      area: safeSourceText(item.area, 100), program: safeSourceText(item.program, 100),
      status: safeSourceText(item.status, 60), archived: item.archived === true,
      truncated: item.truncated === true, untrusted: true };
  }
  return async function search(query, expectedId, previous = null) {
    if (typeof query !== 'string' || query.length > 160) fail();
    query = query.trim();
    const actor = await authorize(expectedId);
    if (previous && (previous.actor !== actor || previous.query !== query)) fail();
    const prior = previous?.items || [];
    if (prior.length >= ULTRON_MAX_RESULTS) fail();
    const coverage = { ...(previous?.coverage || {}) };
    const candidates = [...prior];
    // Fixed allowlist, bounded pages, literal query, UUID cursor. No fetch of documents,
    // generic entity aliases, member roster, service-role key or action/write API.
    for (const source of Object.keys(ULTRON_SOURCES)) {
      if (coverage[source]?.hasMore === false) continue;
      const remaining = ULTRON_MAX_RESULTS - candidates.length;
      if (!remaining) break;
      const packet = await page(source, query, coverage[source]?.cursor || null,
        Math.min(ULTRON_PAGE_SIZE, remaining), null, actor);
      candidates.push(...packet.items);
      coverage[source] = { cursor: packet.next_cursor, hasMore: packet.has_more };
    }
    await authorize(actor);
    // Re-read every candidate, including old pages, through CURRENT caller RLS.
    // Revoked/private/deleted rows disappear; stale context is never merged blindly.
    const visible = [];
    for (const source of Object.keys(ULTRON_SOURCES)) {
      const ids = [...new Set(candidates.filter(item => item.source === source).map(item => item.id))];
      for (let offset = 0; offset < ids.length; offset += 100) {
        const packet = await page(source, query, null, 100, ids.slice(offset, offset + 100), actor);
        if (packet.has_more) fail();
        visible.push(...packet.items.map(normalize));
      }
    }
    await authorize(actor);
    const hasMore = Object.keys(ULTRON_SOURCES).some(source => coverage[source]?.hasMore !== false);
    return { actor, query, items: visible, coverage, hasMore,
      capped: candidates.length >= ULTRON_MAX_RESULTS && hasMore, mode: 'deterministic' };
  };
}
