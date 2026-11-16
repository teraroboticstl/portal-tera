import React,{useState} from 'react';
import {supabase} from '@/api/supabaseClient';
import {createDemandPlanningClient} from '@/api/demandPlanningClient';
import {demandWhatsAppLink} from '@/lib/demandPlanning';
import {Button} from '@/components/ui/button';
const api=createDemandPlanningClient(supabase);
export default function DemandWhatsApp({actor,card,item}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[ready,setReady]=useState(false);
 async function prepare(){setBusy(true);setMessage('');try{const p=await api.whatsapp(actor,card.id,item.id,card.board);setReady(p.available);if(!p.available)setMessage('O responsável ainda não cadastrou ou autorizou contato pelo WhatsApp.');}catch{setMessage('Não foi possível confirmar o contato com suas permissões atuais.');}finally{setBusy(false);}}
 // Revalidate on the final click; never retain the recipient phone in component state.
 async function open(){setBusy(true);setMessage('');const popup=window.open('about:blank','_blank');if(popup)popup.opener=null;try{const p=await api.whatsapp(actor,card.id,item.id,card.board);if(!p.available)throw Error();const href=demandWhatsAppLink(p);if(popup)popup.location.replace(href);else setMessage('Permita abrir uma nova aba e tente novamente.');}catch{popup?.close();setReady(false);setMessage('Contato indisponível. Confira as permissões e a autorização do responsável.');}finally{setBusy(false);}}
 return <div className="mb-3 space-y-2 pl-8 text-xs"><Button type="button" variant="outline" className="min-h-11 whitespace-normal text-white" disabled={busy} onClick={ready?open:prepare}>{busy?'Conferindo contato…':ready?'Abrir WhatsApp para enviar':'Avisar pelo WhatsApp'}</Button>{ready&&<p className="text-gray-400">A conversa abrirá com uma mensagem pronta. Confira o destinatário e confirme o envio no WhatsApp; o Portal não confirma a entrega.</p>}{message&&<p role="status" className="text-amber-200">{message}</p>}</div>;
}
