import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, RotateCcw, X } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { DEMAND_BOARDS } from '@/api/demandBoardsClient';
import {createDemandPlanningClient} from '@/api/demandPlanningClient';
import {DEMAND_PRIORITIES,demandMeta,orderDemandItems} from '@/lib/demandPlanning';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import DemandWhatsApp from './DemandWhatsApp';
const api=createDemandPlanningClient(supabase);
const newItem=()=>({id:crypto.randomUUID(),text:'',done:false});
export function DemandCard({card,editable,busy,onToggle,onEdit,onArchive,advanced=false,recipients=[],actor}) {
  const ordered=orderDemandItems(card),pending=ordered.filter(i=>!i.done),done=ordered.filter(i=>i.done);
  const row=item=><div key={item.id}><label className="flex items-start gap-3 min-h-11 py-2 cursor-pointer">
    <input type="checkbox" aria-label={`${item.done?'Reabrir':'Concluir'}: ${item.text}`} checked={item.done} disabled={!editable||busy||card.archived}
      onChange={e=>onToggle(item,e.target.checked)} className="accent-red-600 w-5 h-5 mt-0.5 shrink-0" />
    <span className="min-w-0 flex-1"><span className={`block whitespace-pre-wrap [overflow-wrap:anywhere] ${item.done?'line-through text-gray-500':'text-gray-100'}`}>{item.text}</span>{advanced&&<span className="mt-2 flex flex-wrap gap-2 text-xs"><span className={`rounded-full border px-2 py-1 ${DEMAND_PRIORITIES[demandMeta(card,item).priority].color}`}>{DEMAND_PRIORITIES[demandMeta(card,item).priority].label}</span><span className="rounded-full border border-white/15 px-2 py-1 text-gray-300">{demandMeta(card,item).assignee_id?(recipients.find(r=>r.id===demandMeta(card,item).assignee_id)?.name||'Responsável sem acesso atual'):'Sem responsável'}</span></span>}</span>
  </label>{actor&&advanced&&editable&&!busy&&!card.archived&&!item.done&&card.board!=='personal'&&demandMeta(card,item).assignee_id&&<DemandWhatsApp key={`${actor}:${card.revision}:${item.id}`} actor={actor} card={card} item={item}/>}</div>;
  return <article className="rounded-2xl border border-[#34343d] bg-[#111217] p-4 flex flex-col min-w-0 h-fit" aria-label={card.title}>
    <h3 className="text-lg font-semibold text-white whitespace-pre-wrap [overflow-wrap:anywhere] mb-3">{card.title}</h3>
    <div className="text-sm space-y-1">{pending.map(row)}</div>
    {!card.items.length&&<p className="text-gray-500 text-sm py-2">Lista vazia. Edite o cartão para adicionar uma demanda.</p>}
    {done.length>0&&<details className="mt-2 text-sm"><summary className="cursor-pointer min-h-11 py-3 text-gray-400">{done.length} {done.length===1?'item concluído':'itens concluídos'}</summary><div>{done.map(row)}</div></details>}
    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/10 text-xs text-gray-500">
      <span className="w-full sm:w-auto sm:mr-auto">{done.length}/{card.items.length} concluídos</span>
      {editable&&!card.archived&&<Button variant="ghost" className="min-h-11 text-gray-300" aria-label={`Editar ${card.title}`} disabled={busy} onClick={onEdit}><Pencil className="w-4 h-4 mr-2" />Editar</Button>}
      {editable&&<Button variant="ghost" className={`min-h-11 ${card.archived?'text-gray-300':'text-red-400 hover:text-red-300'}`} disabled={busy} onClick={onArchive} aria-label={`${card.archived?'Restaurar':'Excluir'} ${card.title}`}>
        {card.archived?<RotateCcw className="w-4 h-4 mr-2" />:<Trash2 className="w-4 h-4 mr-2" />}{card.archived?'Restaurar':'Excluir'}</Button>}
    </div>
  </article>;
}
export function DemandRemovalConfirm({card,busy,error,onCancel,onConfirm}) {
  const pending=card.items.filter(item=>!item.done).length;
  return <Dialog open onOpenChange={open=>{if(!open&&!busy)onCancel();}}><DialogContent className="ava-shell bg-[#111217] border-white/20 text-white w-[calc(100%_-_2rem)] max-w-md max-h-[90dvh] overflow-y-auto">
    <DialogHeader><DialogTitle>Excluir caixa de demandas?</DialogTitle><DialogDescription>A caixa e todos os seus itens sairão do quadro e irão para a Lixeira. Você poderá restaurá-los depois.</DialogDescription></DialogHeader>
    <p className="font-medium whitespace-pre-wrap [overflow-wrap:anywhere]">{card.title}</p>
    {pending>0&&<p className="text-sm text-amber-200">Esta caixa ainda tem {pending} {pending===1?'item pendente':'itens pendentes'}.</p>}
    {card.board!=='personal'&&<p className="text-sm text-gray-300">Esta alteração vale para todo o quadro da modalidade.</p>}
    {error&&<p role="alert" className="text-red-300">{error}</p>}
    <div className="flex flex-wrap justify-end gap-3"><Button variant="outline" className="min-h-11" disabled={busy} onClick={onCancel}>Cancelar</Button><Button className="min-h-11 bg-[#E10600] hover:bg-red-700" disabled={busy} onClick={onConfirm}>{busy?'Excluindo…':'Excluir caixa'}</Button></div>
  </DialogContent></Dialog>;
}
export function DemandEditor({initial,onClose,onSave,busy,saveError,advanced=false,recipients=[]}) {
  const [title,setTitle]=useState(initial?.title||'');
  const [items,setItems]=useState(initial?.items?.length?initial.items.map(i=>({...i})):[newItem()]);
  const [error,setError]=useState('');
  const [meta,setMeta]=useState(initial?.item_meta||{});
  function submit(e) {
    e.preventDefault();
    const cleaned=items.filter(i=>i.text.trim()).map(i=>({...i,text:i.text.trim()}));
    if(!title.trim()){setError('Dê um título ao cartão.');return;}
    onSave({title:title.trim(),items:cleaned,...(advanced?{item_meta:Object.fromEntries(cleaned.map(item=>[item.id,{priority:meta[item.id]?.priority||'normal',assignee_id:meta[item.id]?.assignee_id||null}]))}:{})});
  }
  return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="ava-shell bg-[#111217] border-white/20 text-white w-[calc(100%_-_2rem)] max-w-xl max-h-[90dvh] overflow-y-auto">
    <DialogHeader><DialogTitle>{initial?'Editar cartão':'Nova caixa de demandas'}</DialogTitle><DialogDescription>Uma demanda por linha. Marque as concluídas no quadro.</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="space-y-4"><fieldset disabled={busy} className="space-y-4 min-w-0">
      <label className="block text-sm">Título<input autoFocus className="ava-input w-full mt-1" value={title} maxLength={160} onChange={e=>setTitle(e.target.value)} required placeholder="Ex.: Preparação para o regional" /></label>
      <div className="space-y-2">{items.map((item,index)=><div key={item.id} className="flex gap-2 items-start min-w-0">
        <div className="min-w-0 flex-1 space-y-2"><textarea aria-label={`Demanda ${index+1}`} className="ava-input w-full min-w-0 text-base" rows={2} maxLength={500} value={item.text} placeholder="Escreva uma demanda…"
          onChange={e=>setItems(old=>old.map(i=>i.id===item.id?{...i,text:e.target.value}:i))} />
        {advanced&&<div className="grid min-w-0 gap-2 sm:grid-cols-2"><label className="min-w-0 text-xs text-gray-300">Prioridade<select aria-label={`Prioridade da demanda ${index+1}`} className="ava-input mt-1 w-full min-h-11 text-base" value={meta[item.id]?.priority||'normal'} onChange={e=>setMeta(old=>({...old,[item.id]:{...old[item.id],priority:e.target.value}}))}>{Object.entries(DEMAND_PRIORITIES).map(([key,p])=><option key={key} value={key}>{p.label}</option>)}</select></label><label className="min-w-0 text-xs text-gray-300">Responsável<select aria-label={`Responsável pela demanda ${index+1}`} className="ava-input mt-1 w-full min-h-11 text-base" value={meta[item.id]?.assignee_id||''} onChange={e=>setMeta(old=>({...old,[item.id]:{...old[item.id],assignee_id:e.target.value||null}}))}><option value="">Sem responsável</option>{meta[item.id]?.assignee_id&&!recipients.some(r=>r.id===meta[item.id].assignee_id)&&<option value={meta[item.id].assignee_id}>Responsável sem acesso atual</option>}{recipients.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label></div>}</div>
        <Button type="button" variant="ghost" className="min-h-11 min-w-11 shrink-0" aria-label={`Remover demanda ${index+1}`} onClick={()=>setItems(old=>old.filter(i=>i.id!==item.id))}><X className="w-4 h-4" /></Button>
      </div>)}</div>
      <Button type="button" variant="outline" className="min-h-11" disabled={items.length>=80} onClick={()=>setItems(old=>[...old,newItem()])}><Plus className="w-4 h-4 mr-2" />Adicionar demanda</Button>
      <p className="text-xs text-gray-500">Até 80 demandas por cartão. Linhas vazias são ignoradas.</p>
      {advanced&&<p className="text-xs text-gray-400">Atribuições em quadros de modalidade notificam o responsável dentro do Portal. O botão de WhatsApp depende da autorização de contato do responsável; envios automáticos e e-mail estão desativados. A atribuição não muda o nível de acesso do membro.</p>}
      {error&&<p role="alert" className="text-red-300">{error}</p>}
      {saveError&&<p role="alert" className="text-red-300">{saveError}</p>}
      <div className="flex flex-wrap gap-3"><Button type="submit" className="bg-[#E10600] min-h-11">{busy?'Salvando…':'Salvar cartão'}</Button><Button type="button" variant="outline" className="min-h-11" onClick={onClose}>Cancelar</Button></div>
    </fieldset></form>
  </DialogContent></Dialog>;
}
export default function DemandBoard({actor,board,onBoardChange,focusCard=null,onClearFocus}) {
  const cache=useQueryClient();
  const [archived,setArchived]=useState(false);
  const [cursors,setCursors]=useState([null]);
  const [editor,setEditor]=useState(null);
  const [removal,setRemoval]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const after=cursors.at(-1);
  const query=useQuery({queryKey:['demand-cards',actor,board,archived,after,focusCard],queryFn:()=>api.read(actor,board,archived,after,focusCard),enabled:!!actor,
    staleTime:0,gcTime:0,retry:false,refetchOnWindowFocus:'always',refetchInterval:30000});
  const packet=!query.isError&&query.data?.actor===actor&&query.data.board===board?query.data:null;
  async function write(action,payload) {
    if(busy)return;
    setBusy(true);setError('');
    try{
      await api.write(actor,action,payload,board);
      setEditor(null);
      setRemoval(null);
      await cache.invalidateQueries({queryKey:['demand-cards',actor]});
      await cache.invalidateQueries({queryKey:['demand-inbox',actor]});
    }catch(e){setError(e.message);}
    finally{setBusy(false);}
  }
  function save(fields) {
    const initial=editor.initial;
    write(initial?'edit':'create',{id:initial?.id||editor.id,...(initial?{revision:initial.revision}:{board}),...fields});
  }
  return <section className="ava-shell space-y-5 text-white min-w-0">
    {focusCard&&<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/30 p-4"><p>Demanda aberta pela notificação, conforme seu acesso atual.</p><Button variant="outline" onClick={onClearFocus}>Ver todas as demandas</Button></div>}
    <div className="rounded-xl bg-red-600/5 border border-red-600/25 p-4 text-sm text-gray-300">
      {board==='personal'?'Só você acessa este quadro pessoal. Ele não aparece no quadro da modalidade nem é enviado ao ULTRON.':`Quadro compartilhado da ${board}. Integrantes autorizados podem consultar; membros com edição podem organizar as demandas.`}
      <p className="mt-2 text-xs text-gray-500">Marcar uma demanda como concluída risca o texto. Isso não gera pontos no PDI.</p>
    </div>
    <div className="flex flex-wrap items-end gap-3">
      <label className="block w-full sm:flex-1 sm:min-w-56 max-w-sm text-sm">Quadro<select aria-label="Quadro de demandas" value={board} disabled={busy} onChange={e=>onBoardChange(e.target.value)} className="ava-input w-full mt-1 min-h-11">
        {(packet?.boards||[board]).map(b=><option key={b} value={b}>{DEMAND_BOARDS[b]}</option>)}
      </select></label>
      <Button variant="outline" disabled={busy||!packet} className="min-h-11" onClick={()=>{setArchived(v=>!v);setCursors([null]);setError('');}}>{archived?'Ver cartões ativos':'Lixeira'}</Button>
      {packet?.can_edit&&!archived&&<Button disabled={busy} className="min-h-11 bg-[#E10600]" onClick={()=>setEditor({id:crypto.randomUUID(),initial:null})}><Plus className="w-4 h-4 mr-2" />Nova caixa</Button>}
      <Button variant="ghost" disabled={busy||query.isFetching} className="min-h-11" onClick={()=>query.refetch()}>Atualizar</Button>
    </div>
    {query.isError&&<div role="alert" className="rounded-xl border border-red-700 p-4"><p>Não foi possível carregar este quadro com suas permissões.</p><div className="flex flex-wrap gap-3 mt-3"><Button onClick={()=>query.refetch()}>Tentar novamente</Button>{board!=='personal'&&<Button variant="outline" onClick={()=>onBoardChange('personal')}>Minhas demandas</Button>}</div></div>}
    {!packet&&!query.isError&&<p role="status">Carregando demandas…</p>}
    {error&&<p role="alert" className="text-red-300">{error}</p>}
    {packet&&<>
      {packet.advanced&&<p className="text-sm text-gray-300">Ordem de execução: <strong className="text-red-200">Urgente</strong> → Alta → Normal → Baixa. Caixas com demandas pendentes prioritárias aparecem primeiro; caixas concluídas ficam no final.</p>}
      {!packet.can_edit&&<p className="text-sm text-amber-200">Seu nível permite consultar este quadro. Para editar demandas da modalidade, peça a liberação ao administrador.</p>}
      {!packet.items.length&&<div className="rounded-2xl border border-dashed border-gray-700 p-8 text-gray-400 text-center">{archived?'Nenhuma caixa na lixeira.':'Nenhuma caixa neste quadro ainda.'}{packet.can_edit&&!archived&&' Use “Nova caixa” para começar.'}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4 items-start">{packet.items.map(card=><DemandCard key={card.id} actor={actor} card={card} editable={packet.can_edit} busy={busy} advanced={packet.advanced} recipients={packet.recipients}
        onToggle={(item,done)=>write('toggle',{id:card.id,revision:card.revision,item:item.id,done})}
        onEdit={()=>setEditor({id:card.id,initial:card})} onArchive={()=>{if(card.archived)write('archive',{id:card.id,revision:card.revision,archived:false});else{setError('');setRemoval(card);}}} />)}</div>
      <div className="flex gap-3 flex-wrap">{cursors.length>1&&<Button variant="outline" disabled={busy} onClick={()=>setCursors(old=>old.slice(0,-1))}>Página anterior</Button>}{packet.has_more&&<Button variant="outline" disabled={busy} onClick={()=>setCursors(old=>[...old,packet.next_cursor])}>Mais cartões</Button>}</div>
    </>}
    {editor&&packet?.can_edit&&<DemandEditor key={editor.id} initial={editor.initial} busy={busy} saveError={error} onClose={()=>setEditor(null)} onSave={save} advanced={packet.advanced} recipients={packet.recipients} />}
    {removal&&packet?.can_edit&&<DemandRemovalConfirm card={removal} busy={busy} error={error} onCancel={()=>setRemoval(null)} onConfirm={()=>write('archive',{id:removal.id,revision:removal.revision,archived:true})} />}
  </section>;
}
