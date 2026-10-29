import React, { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { createMemberRegistrationClient } from '@/api/memberRegistrationClient';
import { Button } from '@/components/ui/button';
import { RegistrationProfileContext } from '@/lib/registrationContext';

const registration = createMemberRegistrationClient(supabase);
const modalities = ['FLL','FTC','FRC','OBR','OBR Resgate Nível 1','OBR Resgate Nível 2','OBR Artística Nível 1','OBR Artística Nível 2'];
const empty = { preferred_name:'', age:'', reason:'', modalities:[], areas:'', experience:'', contribution:'', season:'', objectives:'', competencies:'' };
const lines = value => value.split('\n').map(item => item.trim()).filter(Boolean);

export function MemberRegistrationForm({ onSubmit, busy, error }) {
  const [form, setForm] = useState(empty);
  const set = (field, value) => setForm(previous => ({ ...previous, [field]:value }));
  const text = (field, label, max = 2000, list = false) => <label className="block space-y-2">{label}
    <textarea className="w-full rounded-lg border border-white/20 bg-[#0B0B0D] p-3 text-white" required maxLength={max}
      value={form[field]} onChange={event => set(field,event.target.value)} />
    {list && <span className="block text-sm text-gray-400">Um item por linha; até 12 itens de 500 caracteres.</span>}
  </label>;
  return <main className="min-h-screen bg-[#0B0B0D] p-5 text-white"><section className="mx-auto max-w-2xl rounded-xl border border-red-600/40 bg-[#111217] p-6 space-y-5">
    <h1 className="text-2xl font-bold">Recadastro Tera — perfil e PDI inicial</h1>
    <p>Conclua para acessar a Área Interna. Suas contas, permissões e registros anteriores serão preservados.</p>
    <p className="text-sm text-gray-300">As respostas e a proposta de PDI ficam disponíveis somente para você e liderança/mentores autorizados. O nome escolhido será usado na sua saudação do ULTRON. Não inclua senhas ou informações de outras pessoas.</p>
    <form className="space-y-5" onSubmit={event => { event.preventDefault(); onSubmit({ ...form, age:Number(form.age),
      areas:lines(form.areas), objectives:lines(form.objectives), competencies:lines(form.competencies) }); }}>
      <label className="block">Como quer ser chamado<input className="block w-full rounded-lg bg-[#0B0B0D] border border-white/20 p-3 mt-2" required maxLength={80} value={form.preferred_name} onChange={event => set('preferred_name',event.target.value)} /></label>
      <label className="block">Idade atual em anos<input type="number" min="1" max="120" step="1" required className="block w-full rounded-lg bg-[#0B0B0D] border border-white/20 p-3 mt-2" value={form.age} onChange={event => set('age',event.target.value)} /></label>
      {text('reason','Por que entrou na equipe?')}
      <fieldset><legend>Modalidade(s) em que participa</legend><div className="grid sm:grid-cols-2 gap-3 mt-2">{modalities.map(mode => <label key={mode}><input type="checkbox" checked={form.modalities.includes(mode)} onChange={event => set('modalities',event.target.checked ? [...form.modalities,mode] : form.modalities.filter(item => item!==mode))} /> {mode}</label>)}</div></fieldset>
      {text('areas','Área(s) de atuação',6000,true)}
      {text('experience','Experiências anteriores (se não tiver, informe isso)')}
      {text('contribution','O que quer contribuir para a equipe?')}
      <label className="block">Temporada de referência (informe ano e contexto)<input required maxLength={100} className="block w-full rounded-lg bg-[#0B0B0D] border border-white/20 p-3 mt-2" value={form.season} onChange={event => set('season',event.target.value)} /></label>
      {text('objectives','Objetivos para a temporada',6000,true)}
      {text('competencies','Habilidades e competências que quer desenvolver',6000,true)}
      <p className="text-sm text-gray-300">Será criada uma proposta para revisão do mentor, sem notas automáticas e sem substituir PDIs anteriores.</p>
      {error && <p role="alert" className="text-red-300">{error}</p>}
      <Button type="submit" disabled={busy || !form.modalities.length} className="bg-[#E10600] text-white">{busy ? 'Salvando…' : 'Concluir cadastro e entrar'}</Button>
    </form>
    <a className="text-red-400 underline" href="/">Voltar ao site público</a>
    <p className="text-sm text-gray-400">O AVA continua disponível conforme seu acesso atual.</p>
  </section></main>;
}

// Keyed by authenticated identity in ProtectedRoute; no protected children mount before status is known.
export function MemberRegistrationState({ status, user, children, error, busy, onSubmit, onRetry }) {
  if (status?.actor === user.id && status.required === false) {
    return <RegistrationProfileContext.Provider value={{ actor:user.id, preferred_name:status.preferred_name }}>
      {React.cloneElement(children, { user:{ ...user, preferred_name:status.preferred_name } })}
    </RegistrationProfileContext.Provider>;
  }
  if (status?.actor === user.id && status.required === true) return <MemberRegistrationForm onSubmit={onSubmit} busy={busy} error={error} />;
  return <main className="min-h-screen bg-[#0B0B0D] p-6 text-white"><h1 className="text-xl font-bold">Verificando recadastro</h1>
    {error ? <><p role="alert" className="text-red-300">{error}</p><Button onClick={onRetry}>Tentar novamente</Button><p><a href="/" className="text-red-400 underline">Voltar ao site público</a></p></> : <p role="status">Aguarde a confirmação do seu acesso.</p>}
  </main>;
}

export default function MemberRegistrationGate({ user, children }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const current = React.useRef(0);
  useEffect(() => {
    const request = ++current.current;
    setStatus(null); setError('');
    registration.status(user.id).then(packet => { if (current.current===request) setStatus(packet); })
      .catch(failure => { if (current.current===request) setError(failure.message); });
    return () => { current.current++; };
  }, [user.id, retry]);
  async function submit(data) {
    const request = ++current.current;
    setBusy(true); setError('');
    try { const packet = await registration.complete(user.id,data); if (current.current===request) setStatus(packet); }
    catch (failure) { if (current.current===request) setError(failure.message); }
    finally { if (current.current===request) setBusy(false); }
  }
  return <MemberRegistrationState status={status} user={user} error={error} busy={busy} onSubmit={submit} onRetry={() => setRetry(value => value+1)}>{children}</MemberRegistrationState>;
}
