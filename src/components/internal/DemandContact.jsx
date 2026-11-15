import React,{useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {supabase} from '@/api/supabaseClient';
import {createDemandPlanningClient} from '@/api/demandPlanningClient';
import {normalizeDemandPhone} from '@/lib/demandPlanning';
import {Button} from '@/components/ui/button';
const api=createDemandPlanningClient(supabase);
export function DemandContactForm({initial={},busy=false,error,onSubmit}){
 const [phone,setPhone]=useState(initial.phone||''),[noPhone,setNoPhone]=useState(initial.no_phone||false),[whatsapp,setWhatsapp]=useState(initial.whatsapp_opt_in||false),[email,setEmail]=useState(initial.email_opt_in||false),[localError,setLocalError]=useState('');
 function submit(event){event.preventDefault();setLocalError('');try{const normalized=noPhone?null:normalizeDemandPhone(phone);if(!noPhone&&!normalized)throw Error('Informe seu número ou selecione “Não possuo número”.');onSubmit({phone:normalized,no_phone:noPhone,whatsapp_opt_in:!noPhone&&whatsapp,email_opt_in:email});}catch(failure){setLocalError(failure.message);}}
 return <form onSubmit={submit} className="space-y-4 text-white"><fieldset disabled={busy} className="min-w-0 space-y-4">
  <p className="text-sm text-gray-300">Seu número será usado somente para avisos de demandas. Ele não aparece para outros membros. E-mail e WhatsApp ainda não estão ativados; as notificações do Portal não dependem desse consentimento.</p>
  <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={noPhone} onChange={e=>{setNoPhone(e.target.checked);if(e.target.checked){setPhone('');setWhatsapp(false);}}}/>Não possuo número</label>
  {!noPhone&&<label className="block text-sm">Meu telefone com DDD<input aria-label="Meu telefone para avisos" type="tel" inputMode="tel" autoComplete="tel" value={phone} required maxLength={24} onChange={e=>{setPhone(e.target.value);setWhatsapp(false);}} placeholder="+55 (DDD) número" className="mt-2 block min-h-11 w-full rounded-lg border border-white/20 bg-[#0B0B0D] px-3 text-base text-white"/></label>}
  <label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={whatsapp} disabled={noPhone} onChange={e=>setWhatsapp(e.target.checked)}/><span>Quero receber avisos de demandas no meu WhatsApp quando esse canal for ativado. Posso retirar esta autorização aqui a qualquer momento.</span></label>
  <label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={email} onChange={e=>setEmail(e.target.checked)}/><span>Quero receber avisos de demandas no e-mail da minha conta quando esse canal for ativado.</span></label>
  <p className="text-xs text-gray-400">Informe apenas seu próprio contato. Nenhuma mensagem externa será enviada nesta etapa. A ativação futura depende de configuração administrativa e confirmação do contato.</p>
  {(error||localError)&&<p role="alert" className="text-sm text-red-300">{error||localError}</p>}
  <Button type="submit" className="min-h-11 bg-red-600 text-white">{busy?'Salvando…':'Salvar preferências'}</Button>
 </fieldset></form>;
}
export default function DemandContactGate({user,children}){
 const cache=useQueryClient(),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const query=useQuery({queryKey:['demand-contact',user.id],queryFn:()=>api.contact(user.id),retry:false,staleTime:0,gcTime:0,refetchOnWindowFocus:false});
 async function save(data){setBusy(true);setError('');try{const packet=await api.contact(user.id,data);cache.setQueryData(['demand-contact',user.id],packet);}catch(failure){setError(failure.message);}finally{setBusy(false);}}
 // A gradual rollout cannot lock out members before the additive migration exists.
 if(query.error?.code==='NOT_INSTALLED'||query.data?.actor===user.id&&query.data.required===false)return children;
 return <main className="min-h-screen bg-[#0B0B0D] p-4 text-white"><section className="mx-auto max-w-xl space-y-5 rounded-2xl border border-red-500/30 bg-[#111217] p-5 sm:p-7"><h1 className="text-2xl font-bold">Contato para avisos de demandas</h1>{query.data?.actor===user.id&&query.data.required?<DemandContactForm initial={query.data} busy={busy} error={error} onSubmit={save}/>:query.error?<><p role="alert">Não foi possível confirmar suas preferências de contato.</p><Button onClick={()=>query.refetch()}>Tentar novamente</Button></>:<p role="status">Conferindo preferências…</p>}<a href="/" className="block min-h-11 text-red-300 underline">Voltar ao site público</a></section></main>;
}
