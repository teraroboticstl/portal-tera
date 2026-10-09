import React,{useEffect,useRef,useState} from 'react';
import {avaRequest,avaMutate} from '@/api/avaClient';
import {enrollmentRows} from '@/lib/avaEnrollmentRules';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';

export default function AvaEnrollmentManagement({targetUser,onClose,onSaved}) {
  const [data,setData]=useState(null),[userId,setUserId]=useState(targetUser?.id || ''),[search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const live=useRef(true);
  async function load(){const fresh=await avaRequest('admin');if(live.current)setData(fresh);}
  useEffect(()=>{live.current=true;load().catch(e=>{if(live.current)setError(e.message);});return()=>{live.current=false;};},[]);
  const student=data?.users.find(u=>u.id===userId);
  async function change(track,status){
    setBusy(true);setError('');setNotice('');
    try{await avaMutate('enroll_user',{user_id:userId,track_id:track.id,status});setNotice(`${track.title}: ${status==='active'?'matrícula incluída':'matrícula retirada'}.`);await load();onSaved?.();}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  const rows=data?enrollmentRows(data,student):[];
  return <Dialog open onOpenChange={open=>{if(!open && !busy)onClose();}}><DialogContent className="ava-shell bg-[#111217] border-white/20 text-white max-w-4xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Gestão de matrículas nas trilhas</DialogTitle><DialogDescription>Inclua ou retire matrículas no Supabase. A retirada preserva o histórico e o progresso; somente o administrador pode reativá-la. A matrícula não altera o nível de acesso do aluno.</DialogDescription></DialogHeader>
    {error && <p role="alert" className="text-red-300">{error}</p>}{notice && <p role="status" className="text-emerald-300">{notice}</p>}
    {!data?<p role="status">{error?'Não foi possível carregar as matrículas.':'Carregando matrículas…'}</p>:<>
      <label className="text-sm">Aluno<select className="ava-input mt-1" value={userId} disabled={busy} onChange={e=>{setUserId(e.target.value);setNotice('');setError('');}}><option value="">Selecione um aluno</option>{data.users.map(u=><option key={u.id} value={u.id}>{u.full_name} · {u.email}</option>)}</select></label>
      {student && <><p className="text-sm text-gray-300">{student.full_name} · {student.email} · {rows.filter(r=>r.status==='active').length} matrículas ativas</p><p className="text-sm text-gray-400">A trilha aparecerá em “Trilhas de Aprendizagem” quando estiver publicada, com acesso ao AVA autorizado e público compatível. Rascunhos podem receber matrícula antecipada.</p>
        <div className="grid sm:grid-cols-2 gap-3"><label className="text-sm">Buscar trilha<input className="ava-input mt-1" value={search} onChange={e=>setSearch(e.target.value)} /></label><label className="text-sm">Filtrar matrícula<select className="ava-input mt-1" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todas</option><option value="active">Matriculado</option><option value="revoked">Matrícula retirada</option><option value="none">Não matriculado</option></select></label></div>
        {rows.filter(r=>(filter==='all' || filter===r.status) && r.track.title.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))).map(({track,enrollment,status,canEnroll,reason})=><article key={track.id} className="border border-white/10 rounded-lg p-4 flex flex-wrap justify-between gap-4 items-center"><div><h3 className="font-bold">{track.title}</h3><p className="text-sm text-gray-400 mt-1">{status==='active'?'Matriculado':status==='revoked'?'Matrícula retirada':'Não matriculado'} · {({published:'Publicado',draft:'Rascunho',archived:'Arquivado'})[track.status]} · {({all:'Todos',tera:'Integrantes Tera',external:'Alunos externos'})[track.audience]}</p>{enrollment && <p className="text-sm text-gray-400 mt-1">Progresso preservado: {enrollment.progress || 0}%</p>}{reason && <p className="text-sm text-amber-300 mt-2">{reason}</p>}</div><Button variant="outline" disabled={busy || (status!=='active' && !canEnroll)} onClick={()=>change(track,status==='active'?'revoked':'active')}>{busy?'Salvando…':status==='active'?'Retirar matrícula':status==='revoked'?'Reativar matrícula':'Matricular aluno'}</Button></article>)}
        {!rows.length && <p className="text-gray-400">Nenhuma trilha cadastrada.</p>}
      </>}
    </>}
    <div className="flex justify-end"><Button variant="outline" disabled={busy} onClick={onClose}>Fechar</Button></div>
  </DialogContent></Dialog>;
}
