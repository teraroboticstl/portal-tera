import React,{useEffect,useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {supabase} from '@/api/supabaseClient';
import {createModalityAccessClient} from '@/api/modalityAccessClient';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
const api=createModalityAccessClient(supabase);
export default function ModalityAccessManagement({actor,target,onClose}) {
 const [record,setRecord]=useState(null),[selected,setSelected]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const cache=useQueryClient();
 useEffect(()=>{let active=true;api.read(actor,target.id).then(data=>{if(active){setRecord(data);setSelected(data.modalities);}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[actor,target.id]);
 async function save(){setBusy(true);setError('');try{await api.set(actor,target.id,selected,record.revision);await cache.invalidateQueries({queryKey:['page-visibility']});onClose();}catch(e){setError(e.message);setRecord(null);}finally{setBusy(false);}}
 return <Dialog open onOpenChange={open=>{if(!open && !busy)onClose();}}><DialogContent className="ava-shell bg-[#111217] border-white/20 text-white max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Modalidades de {target.full_name}</DialogTitle><DialogDescription>Marque as modalidades que este membro pode acessar. Para trocar de FTC para FRC, desmarque FTC e marque FRC. Os registros e PDIs anteriores são preservados.</DialogDescription></DialogHeader>
 <p className="text-sm text-gray-400">Administradores e líderes mantêm acesso a todas as modalidades. Esta alteração não muda o nível de acesso, a conta ou as matrículas do AVA.</p>
 {error && <p role="alert" className="text-red-300">{error} Feche e abra esta janela para recarregar.</p>}
 {!record && !error?<p role="status">Carregando permissões…</p>:record && <fieldset disabled={busy} className="grid grid-cols-2 gap-3">{['FLL','FTC','FRC','OBR'].map(mode=><label key={mode} className="flex items-center gap-3 rounded-lg border border-white/20 p-4"><input type="checkbox" checked={selected.includes(mode)} onChange={e=>setSelected(e.target.checked?[...selected,mode]:selected.filter(x=>x!==mode))}/>{mode}</label>)}</fieldset>}
 <p className="text-sm text-gray-400">Nenhuma marcada: somente conteúdos gerais. Mais de uma marcada: acesso às modalidades selecionadas. OBR inclui Resgate e Artística.</p>
 <div className="flex flex-wrap justify-end gap-3"><Button variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button className="bg-[#E10600]" disabled={!record || busy} onClick={save}>{busy?'Salvando…':'Salvar modalidades'}</Button></div>
 </DialogContent></Dialog>;
}
