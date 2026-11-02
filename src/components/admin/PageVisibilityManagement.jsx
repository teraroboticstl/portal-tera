import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { INTERNAL_PAGES } from '@/lib/internalPageVisibility';
import { usePageVisibility, pageVisibilityClient, pageVisibilityQueryKey } from '@/lib/usePageVisibility';

export default function PageVisibilityManagement() {
  const { actor, snapshot, isError, refetch } = usePageVisibility();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState('');
  async function change(key, label) {
    setBusy(key); setMessage('');
    try {
      const current = snapshot.pages[key];
      const result = await pageVisibilityClient.set(actor, key, !current.visible, current.revision);
      queryClient.setQueryData(pageVisibilityQueryKey(actor), result);
      await queryClient.invalidateQueries({ queryKey: pageVisibilityQueryKey(actor) });
      setMessage(`${label}: ${result.pages[key].visible ? 'visível' : 'oculta'} para usuários comuns.`);
    } catch {
      setMessage('Não foi possível salvar. A configuração pode ter sido alterada por outro administrador. Atualize antes de tentar novamente.');
      await refetch();
    } finally { setBusy(null); }
  }
  return <section className="rounded-2xl border border-[#1F222B] bg-[#111217] p-4 sm:p-6">
    <h2 className="text-xl font-bold mb-2">Visibilidade de Páginas</h2>
    <p className="text-[#B8BDC7] mb-4">Páginas ocultas saem do menu e ficam indisponíveis pelo endereço direto para usuários comuns. Administradores continuam acessando. Dashboard, Painel Admin, site público e cursos permanecem disponíveis.</p>
    <p role="status" className="mb-4">{message}</p>
    {isError ? <div role="alert">Não foi possível carregar a configuração. <button onClick={() => refetch()} className="text-red-400 underline">Tentar novamente</button></div>
      : !snapshot ? <p>Carregando páginas…</p>
      : !snapshot.is_admin ? <p role="alert">Somente administradores podem gerenciar a visibilidade.</p>
      : <ul className="divide-y divide-[#1F222B]">{INTERNAL_PAGES.map(([key, label]) => <li key={key} className="flex items-center justify-between gap-4 py-3">
        <div><h3 className="font-medium">{label}</h3><p className="text-sm text-[#B8BDC7]">{snapshot.pages[key].visible ? 'Visível' : 'Oculta'}</p></div>
        <button disabled={busy !== null} onClick={() => change(key, label)} aria-label={`${snapshot.pages[key].visible ? 'Ocultar' : 'Mostrar'} ${label}`}
          className="rounded-lg bg-[#E10600] px-4 py-2 text-white disabled:opacity-50">{busy === key ? 'Salvando…' : snapshot.pages[key].visible ? 'Ocultar' : 'Mostrar'}</button>
      </li>)}</ul>}
  </section>;
}
