import React from 'react';
import { Link } from 'react-router-dom';
import { usePageVisibility } from '@/lib/usePageVisibility';
import { canDisplayPage, visibilityKey } from '@/lib/internalPageVisibility';

export function PageVisibilityState({ page, actor, snapshot, error, retry, children }) {
  if (canDisplayPage(page, snapshot, actor)) return children;
  const ready = snapshot?.actor === actor && Boolean(actor);
  return <div className="min-h-screen bg-[#0B0B0D] text-white flex items-center justify-center p-6">
    <section className="max-w-lg rounded-2xl border border-[#1F222B] bg-[#111217] p-6 text-center">
      <h1 className="text-xl font-bold mb-3">{error ? 'Não foi possível verificar esta página' : ready ? 'Página temporariamente indisponível' : 'Verificando disponibilidade…'}</h1>
      {ready && !error && <p className="text-[#B8BDC7] mb-4">Esta página foi ocultada pelo administrador. Ela estará disponível quando for liberada novamente.</p>}
      {error && <button onClick={retry} className="bg-[#E10600] rounded-lg px-4 py-2 mb-4">Tentar novamente</button>}
      <Link to="/AreaInterna" className="block text-red-400">Voltar ao Dashboard</Link>
    </section>
  </div>;
}
function ManagedPage({ page, children }) {
  const { actor, snapshot, isError, isFetchedAfterMount, refetch } = usePageVisibility();
  // A new URL must revalidate with the server before mounting its page,
  // even if the sidebar has a cached snapshot for this account.
  return <PageVisibilityState page={page} actor={actor} snapshot={isFetchedAfterMount ? snapshot : null} error={isError} retry={refetch}>{children}</PageVisibilityState>;
}
export default function PageVisibilityGate({ page, children }) {
  return visibilityKey(page) ? <ManagedPage key={page} page={page}>{children}</ManagedPage> : children;
}
