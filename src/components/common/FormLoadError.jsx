import React from 'react';
export default function FormLoadError({onRetry}) {
 return <div role="alert" className="rounded-xl border border-red-600/50 bg-red-600/10 p-5 text-red-100 space-y-3"><p>Não foi possível carregar os registros. Isso não significa que a lista esteja vazia.</p><button type="button" className="rounded-lg border border-red-500 px-4 py-3" onClick={onRetry}>Tentar novamente</button></div>;
}
