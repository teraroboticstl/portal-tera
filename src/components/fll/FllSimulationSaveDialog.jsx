import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function FllSimulationSaveDialog({ user, snapshot, sharing, onClose, onSave }) {
  const [team, setTeam] = useState(snapshot.teamName || '');
  const [email, setEmail] = useState('');
  const [portfolio, setPortfolio] = useState(false);
  const [title, setTitle] = useState(snapshot.roundName || '');
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const input = 'mt-1 w-full rounded-lg bg-black/30 border border-white/20 p-2 text-white';
  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    setPending(true); setError('');
    try { await onSave({ state: { ...snapshot, teamName: team.trim() }, email, portfolio, iterationTitle: title, notes }); }
    catch (err) { setError(err.message); setPending(false); }
  }
  return <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
    <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="save-round-title" className="w-full max-w-lg max-h-[90vh] overflow-auto rounded-2xl border border-white/20 bg-[#111217] p-5 space-y-4">
      <h2 id="save-round-title" className="text-xl font-bold text-white">{sharing ? 'Salvar e compartilhar round' : 'Salvar round no portal'}</h2>
      <p className="text-sm text-gray-300">{user ? 'Este resultado ficará vinculado à sua conta e à temporada.' : 'Informe sua equipe e e-mail para salvar. Seu contato ficará disponível somente para consulta interna da administração, junto aos resultados para comparação de simulações.'}</p>
      <label className="block text-sm text-gray-200">Nome da equipe<input autoFocus required maxLength={120} className={input} value={team} onChange={e=>setTeam(e.target.value)} /></label>
      {!user && <label className="block text-sm text-gray-200">E-mail<input required type="email" maxLength={254} className={input} value={email} onChange={e=>setEmail(e.target.value)} /></label>}
      {user && <label className="flex gap-2 text-sm text-gray-200"><input type="checkbox" checked={portfolio} onChange={e=>setPortfolio(e.target.checked)} />Adicionar ao portfólio da temporada como iteração de round</label>}
      {portfolio && <><label className="block text-sm text-gray-200">Título da iteração<input required maxLength={120} className={input} value={title} onChange={e=>setTitle(e.target.value)} /></label><label className="block text-sm text-gray-200">Observações privadas<textarea maxLength={2000} className={input} value={notes} onChange={e=>setNotes(e.target.value)} /></label></>}
      {sharing && <p className="text-xs text-gray-400">O link exibirá equipe, respostas e pontuação. E-mail e observações privadas não serão compartilhados.</p>}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={pending}>{pending ? 'Salvando…' : sharing ? 'Salvar e liberar compartilhamento' : 'Salvar no Supabase'}</Button></div>
    </form>
  </div>;
}
