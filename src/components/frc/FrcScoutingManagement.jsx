import React,{useState} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';

const control='min-h-11 min-w-0 w-full rounded-lg border border-gray-600 bg-[#181a21] p-3 text-white';
const button='min-h-11 rounded-lg border border-gray-600 px-4 py-2 text-white disabled:opacity-40';
export default function FrcScoutingManagement({data,season,busy,onManage}){
 const [kind,setKind]=useState('event'),[id,setId]=useState(''),[name,setName]=useState(''),[confirm,setConfirm]=useState(false),[deleteOpen,setDeleteOpen]=useState(false),[confirmation,setConfirmation]=useState('');
 const rows=kind==='season'?data.seasons:kind==='team'?data.teams:data.events.filter(row=>!season||row.scouting_season_id===season);
 const selected=rows.find(row=>row.id===id);
 const title=row=>kind==='season'?row.theme:kind==='event'?row.tournament_name:row.name;
 const request=action=>({kind,id,action,name,expectedName:title(selected),expectedArchived:!!selected.scouting_archived_at});
 return <details className="rounded-xl border border-gray-700 p-4"><summary className="min-h-11 cursor-pointer">Editar, arquivar ou excluir cadastros</summary>
  <div className="space-y-3">
   <p className="text-sm text-gray-300">Arquivar preserva o histórico e permite restaurar. Excluir definitivamente remove campeonatos sem registros de scouting e suas inscrições; equipes e temporadas são preservadas.</p>
   <label className="block">Tipo de cadastro<select className={control} disabled={busy} value={kind} onChange={e=>{setKind(e.target.value);setId('');setName('');}}><option value="event">Campeonatos</option><option value="season">Temporadas</option><option value="team">Equipes</option></select></label>
   <label className="block">Cadastro para editar<select className={control} disabled={busy} value={id} onChange={e=>{setId(e.target.value);setName('');}}><option value="">Selecione</option>{rows.map(row=><option key={row.id} value={row.id}>{kind==='season'?row.year+' — ':kind==='team'?'#'+row.number+' — ':''}{title(row)}{row.scouting_archived_at?' (arquivado)':''}</option>)}</select></label>
   {selected&&<>
    <label className="block">Novo nome<input className={control} maxLength={120} disabled={busy} placeholder={title(selected)} value={name} onChange={e=>setName(e.target.value)}/></label>
    <div className="flex flex-wrap gap-3"><button className={button} disabled={busy||!name.trim()||name.trim()===title(selected)} onClick={()=>onManage(request('rename'))}>Salvar nome</button>
     <button className={button} disabled={busy} onClick={()=>setConfirm(true)}>{selected.scouting_archived_at?'Restaurar cadastro':'Arquivar cadastro'}</button>{kind==='event'&&<button className={button+' border-red-600 bg-red-950'} disabled={busy} onClick={()=>{setConfirmation('');setDeleteOpen(true);}}>Excluir definitivamente</button>}</div>
    <Dialog open={confirm} onOpenChange={open=>{if(!busy)setConfirm(open);}}><DialogContent className="bg-[#111217] text-white border-gray-700"><DialogHeader><DialogTitle>{selected.scouting_archived_at?'Restaurar cadastro?':'Remover do scouting?'}</DialogTitle><DialogDescription>{title(selected)}. Nenhuma partida ou vínculo será apagado.</DialogDescription></DialogHeader><div className="flex flex-wrap gap-3"><button className={button} disabled={busy} onClick={()=>setConfirm(false)}>Cancelar</button><button className={button} disabled={busy} onClick={()=>{onManage(request(selected.scouting_archived_at?'restore':'archive'));setConfirm(false);}}>Confirmar</button></div></DialogContent></Dialog>
    {kind==='event'&&<Dialog open={deleteOpen} onOpenChange={open=>{if(!busy){setDeleteOpen(open);setConfirmation('');}}}><DialogContent className="bg-[#111217] text-white border-red-700"><DialogHeader><DialogTitle>Excluir campeonato definitivamente?</DialogTitle><DialogDescription>{title(selected)}. Esta ação não pode ser desfeita. As inscrições serão removidas, mas as equipes e a temporada permanecerão. A exclusão será bloqueada se houver registros de scouting.</DialogDescription></DialogHeader><label className="block">Digite EXCLUIR para confirmar<input className={control} value={confirmation} disabled={busy} autoComplete="off" onChange={e=>setConfirmation(e.target.value)}/></label><div className="flex flex-wrap gap-3"><button className={button} disabled={busy} onClick={()=>{setDeleteOpen(false);setConfirmation('');}}>Cancelar exclusão</button><button className={button+' border-red-600 bg-red-950'} disabled={busy||confirmation!=='EXCLUIR'} onClick={()=>{if(confirmation!=='EXCLUIR')return;onManage({...request('delete'),confirmation});setDeleteOpen(false);setConfirmation('');}}>Confirmar exclusão definitiva</button></div></DialogContent></Dialog>}
   </>}
  </div>
 </details>;
}
