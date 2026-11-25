import React,{useState,useRef} from 'react';
import {useQuery,useQueryClient,useMutation} from '@tanstack/react-query';
import {supabase} from '@/api/supabaseClient';
import {createFrcScoutingClient} from '@/api/frcScoutingClient';
import {isAdmin,canEdit} from '@/components/internal/ProtectedRoute';
import FrcScoutingManagement from './FrcScoutingManagement';

const api=createFrcScoutingClient(supabase);
const input='w-full min-h-11 rounded-lg bg-[#181a21] border border-gray-600 p-3 text-white';
const button='min-h-11 rounded-lg bg-red-700 px-4 py-3 text-white disabled:opacity-40';
const empty={team:'',match:'',auto:'',teleop:'',notes:''};
export default function LinkedFrcScouting({user}){
 const [season,setSeason]=useState(''),[event,setEvent]=useState(''),[team,setTeam]=useState(''),[form,setForm]=useState(empty),[message,setMessage]=useState('');
 const [setup,setSetup]=useState({kind:'event',name:'',number:'',date:''});
 const [management,setManagement]=useState(null);
 const submitting=useRef(false);
 const qc=useQueryClient();
 const catalogue=useQuery({queryKey:['frc-linked-catalogue',user.id],queryFn:()=>api.load(user.id),retry:false});
 const details=useQuery({queryKey:['frc-linked-event',user.id,event],queryFn:()=>api.event(user.id,event),enabled:!!event,retry:false});
 const data=catalogue.data?.actor===user.id?catalogue.data:null;
 const current=data?.events.find(e=>e.id===event);
 const activeSeason=data?.seasons.some(s=>s.id===season&&!s.scouting_archived_at);
 const linked=activeSeason&&current?.scouting_season_id===season&&!current?.scouting_archived_at;
 const packet=details.data?.actor===user.id&&details.data.event===event?details.data:null;
 const participants=(data?.teams||[]).filter(t=>!t.scouting_archived_at&&packet?.participants.some(p=>p.team_id===t.id));
 const refresh=async()=>{await Promise.all([qc.invalidateQueries({queryKey:['frc-linked-catalogue']}),qc.invalidateQueries({queryKey:['frc-linked-event']})]);};
 const action=useMutation({mutationFn:async({kind,snapshot})=>{
  if(kind==='configure')await api.configure(user.id,snapshot.event,snapshot.season);
  if(kind==='enroll')await api.enroll(user.id,snapshot.event,snapshot.team);
  if(kind==='save')await api.save(user.id,snapshot,snapshot.form);
  if(kind==='create')await api.create(user.id,snapshot.setup.kind,{...snapshot.setup,season:snapshot.season});
  if(kind==='manage')await api.manage(user.id,snapshot.management);
  return {kind,management:snapshot.management};
 },onSuccess:async ({kind,management:changed})=>{if(kind==='manage'&&changed.action==='archive'){setForm(empty);if(changed.kind==='season'&&changed.id===season){setSeason('');setEvent('');}if(changed.kind==='event'&&changed.id===event)setEvent('');}if(kind==='save')setForm(empty);setMessage(kind==='save'?'Registro salvo com autoria da sessão.':'Configuração salva.');await refresh();},onError:error=>setMessage(error.message),onSettled:()=>{submitting.current=false;}});
 const run=(kind,change=management)=>{if(submitting.current)return;submitting.current=true;setMessage('');action.mutate({kind,snapshot:{event,season,team,form:{...form},setup:{...setup},management:change}});};
 const busy=action.isPending;
 return <div className="space-y-5 text-white min-w-0">
  <header><h2 className="text-2xl font-bold">Tera Scouting</h2><p className="text-gray-300">FRC Strategy Suite · registros vinculados por temporada e campeonato.</p></header>
  {(catalogue.isError||details.isError)&&<p role="alert" className="text-red-300">Não foi possível carregar. Confira a migração, o acesso FRC e tente novamente. <button className={button} onClick={()=>{catalogue.refetch();details.refetch();}}>Tentar novamente</button></p>}
  {catalogue.isPending&&<p role="status">Carregando campeonatos…</p>}
  {data&&<>
   <nav aria-label="Troca rápida de temporada e campeonato" className="sticky top-0 z-10 flex flex-wrap items-end gap-3 rounded-xl border border-gray-700 bg-[#0B0B0D] p-3">
    <label className="min-w-0 flex-1 basis-48">Temporada (obrigatória)<select aria-label="Temporada" aria-required="true" className={input} disabled={busy} value={season} onChange={e=>{setSeason(e.target.value);setEvent('');setForm(empty);setMessage('');}}><option value="">Selecione</option>{data.seasons.filter(s=>!s.scouting_archived_at).map(s=><option key={s.id} value={s.id}>{s.year} — {s.theme}</option>)}</select></label>
    <label className="min-w-0 flex-1 basis-48">Campeonato<select className={input} disabled={!season||busy} value={event} onChange={e=>{setEvent(e.target.value);setForm(empty);setMessage('');}}><option value="">Selecione</option>{data.events.filter(e=>!e.scouting_archived_at&&(e.scouting_season_id===season||(isAdmin(user)&&!e.scouting_season_id))).map(e=><option key={e.id} value={e.id}>{e.tournament_name}{!e.scouting_season_id?' (sem vínculo)':''}</option>)}</select></label>
    {linked&&packet&&canEdit(user)&&<a href="#frc-scouting-record" className={button}>+ Novo registro</a>}
   </nav>
   {isAdmin(user)&&setup.kind==='event'&&!season&&<p role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-amber-200">Selecione uma temporada para cadastrar um campeonato.</p>}
   {isAdmin(user)&&<details className="rounded-xl border border-gray-700 p-4"><summary className="cursor-pointer min-h-11">Cadastrar temporada, campeonato ou equipe</summary><form className="space-y-3" onSubmit={e=>{e.preventDefault();run('create');}}>
    <label className="block">Tipo<select className={input} disabled={busy} value={setup.kind} onChange={e=>setSetup({kind:e.target.value,name:'',number:'',date:''})}><option value="event">Campeonato na temporada selecionada</option><option value="season">Temporada</option><option value="team">Equipe FRC</option></select></label>
    {setup.kind==='event'&&<label className="block">Data do campeonato<input required type="date" className={input} disabled={busy} value={setup.date} onChange={e=>setSetup({...setup,date:e.target.value})}/></label>}
    {setup.kind!=='event'&&<label className="block">{setup.kind==='season'?'Ano':'Número oficial'}<input required className={input} disabled={busy} inputMode="numeric" value={setup.number} onChange={e=>setSetup({...setup,number:e.target.value})}/></label>}
    <label className="block">Nome<input required maxLength={120} className={input} disabled={busy} value={setup.name} onChange={e=>setSetup({...setup,name:e.target.value})}/></label>
    <button className={button} disabled={busy||(setup.kind==='event'&&!season)}>Cadastrar</button>
   </form></details>}

   {isAdmin(user)&&<FrcScoutingManagement data={data} season={season} busy={busy} onManage={change=>{setManagement(change);run('manage',change);}}/>}
   {isAdmin(user)&&event&&<section className="border border-gray-700 rounded-xl p-4 space-y-3"><h3 className="font-bold">Configurar vínculos</h3>
    {!linked?<button className={button} disabled={busy} onClick={()=>run('configure')}>Vincular campeonato à temporada selecionada</button>:<>
     <label>Inscrever equipe<select className={input} value={team} disabled={busy} onChange={e=>setTeam(e.target.value)}><option value="">Selecione</option>{data.teams.filter(t=>!t.scouting_archived_at&&!participants.some(p=>p.id===t.id)).map(t=><option key={t.id} value={t.id}>#{t.number} — {t.name}</option>)}</select></label>
     <button className={button} disabled={busy||!team||details.isPending||details.isError} onClick={()=>run('enroll')}>Inscrever equipe neste campeonato</button>
    </>}
   </section>}
   {linked&&packet&&canEdit(user)&&<form id="frc-scouting-record" className="scroll-mt-32 border border-gray-700 rounded-xl p-4 space-y-4" onSubmit={e=>{e.preventDefault();run('save');}}>
    <h3 className="font-bold">Registrar partida</h3><p className="text-sm text-gray-300">Pontos observados informados manualmente; não há cálculo ou validação de pontuação oficial nesta tela. O autor será identificado pela sessão.</p>
    <label className="block">Equipe inscrita<select required disabled={busy} className={input} value={form.team} onChange={e=>setForm({...form,team:e.target.value})}><option value="">Selecione</option>{participants.map(t=><option key={t.id} value={t.number}>#{t.number} — {t.name}</option>)}</select></label>
    <label className="block">Partida<input required maxLength={40} disabled={busy} className={input} value={form.match} onChange={e=>setForm({...form,match:e.target.value})}/></label>
    <div className="grid gap-4 sm:grid-cols-2">{[['auto','Pontos no autônomo'],['teleop','Pontos no teleoperado']].map(([key,label])=><label key={key}>{label}<input required type="number" min="0" max="100000" step="1" inputMode="numeric" disabled={busy} className={input} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}</div>
    <label className="block">Observações<textarea maxLength={5000} disabled={busy} className={input} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
    <button type="submit" className={button+' w-full'} disabled={busy||!participants.length}>{busy?'Salvando…':'Salvar registro'}</button>
   </form>}
   {message&&<p role="status" className="break-words">{message}</p>}
   {linked&&packet&&<section className="space-y-3"><h3 className="font-bold">Registros deste campeonato</h3><p className="text-sm text-gray-300">Últimos 200 registros; observações independentes não são partidas adicionais. Legados sem vínculo não são misturados.</p>{!packet.records.length&&<p>Nenhum registro vinculado.</p>}{packet.records.map(r=><article key={r.id} className="border border-gray-700 rounded-xl p-4 break-words"><h4 className="font-bold">{r.match_number} · equipe #{r.team_number}</h4><p>Autônomo: {r.auto_points??'Não informado'} · Teleoperado: {r.teleop_points??'Não informado'}</p><p className="whitespace-pre-wrap">{r.notes}</p></article>)}</section>}
  </>}
 </div>;
}
