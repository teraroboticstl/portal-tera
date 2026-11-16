import React,{useEffect,useState} from 'react';
import {supabase} from '@/api/supabaseClient';
import {createDemandPlanningClient} from '@/api/demandPlanningClient';
import {demandWhatsAppLink} from '@/lib/demandPlanning';
import {Button} from '@/components/ui/button';
const api=createDemandPlanningClient(supabase);
export default function DemandWhatsApp({actor,card,item}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[link,setLink]=useState(null);
 useEffect(()=>{if(!link)return;const timer=setTimeout(()=>setLink(null),Math.max(0,link.expires-Date.now()));return ()=>clearTimeout(timer);},[link]);
 async function prepare(){setBusy(true);setMessage('');setLink(null);try{const p=await api.whatsapp(actor,card.id,item.id,card.board);if(p.available)setLink({href:demandWhatsAppLink(p),expires:Date.now()+30000});else setMessage('A conta selecionada não cadastrou ou autorizou contato pelo WhatsApp. Confira o responsável da demanda.');}catch{setMessage('Não foi possível confirmar o contato com suas permissões atuais.');}finally{setBusy(false);}}
 // A native link preserves the user's click on mobile and browsers that block scripted popups.
 // The authorized URL is transient, never stored in persistent storage or logs.
 const ready=link&&link.expires>Date.now();
 function checkExpiry(event){if(!link||link.expires<=Date.now()){event.preventDefault();setLink(null);setMessage('Confira novamente o contato para abrir o WhatsApp.');}}
 return <div className="mb-3 space-y-2 pl-8 text-xs">{ready?<a href={link.href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" onClick={checkExpiry} className="inline-flex min-h-11 items-center rounded-md border border-white/20 px-4 py-2 text-sm font-medium text-white underline">Abrir WhatsApp para enviar</a>:<Button type="button" variant="outline" className="min-h-11 whitespace-normal text-white" disabled={busy} onClick={prepare}>{busy?'Conferindo contato…':'Avisar pelo WhatsApp'}</Button>}{ready&&<p className="text-gray-400">A conversa abrirá com uma mensagem pronta. Confira o destinatário e confirme o envio no WhatsApp; o Portal não confirma a entrega. Este link expira em 30 segundos.</p>}{message&&<p role="status" className="text-amber-200">{message}</p>}</div>;
}
