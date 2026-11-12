import {supabase} from './supabaseClient';
import {requestDeadline} from './requestDeadline';
export async function readTeraBi(program,actor,signal) {
  return requestDeadline(async deadline=>{
    const before=await supabase.auth.getUser();
    if(!actor||before.error||before.data?.user?.id!==actor)throw Error('Sessão inválida. Entre novamente.');
    const {data:{session}}=await supabase.auth.getSession();
    if(session?.user?.id!==actor||!session?.access_token)throw Error('Sessão inválida.');
    const response=await fetch('/api/bi?program='+encodeURIComponent(program),{signal:signal?AbortSignal.any([signal,deadline]):deadline,headers:{Authorization:`Bearer ${session.access_token}`}});
    const packet=await response.json();const after=await supabase.auth.getUser();
    if(!response.ok)throw Error(packet.error||'Consulta indisponível.');
    if(after.error||after.data?.user?.id!==actor||packet.actor!==actor||packet.program!==program||!Array.isArray(packet.rows))throw Error('A sessão mudou. Atualize o painel.');
    return packet;
  },25000);
}
export async function readPublicBi({signal}={}) {
  return requestDeadline(async deadline=>{
    // Same-origin cookies allow Vercel Preview protection; no Supabase bearer is sent.
    // The endpoint ignores visitor identity and always queries with its separate anon client.
    const response=await fetch('/api/bi?scope=public',{signal:signal?AbortSignal.any([signal,deadline]):deadline,credentials:'same-origin'});
    if(!response.ok)throw Error('Os dados públicos estão temporariamente indisponíveis.');
    const packet=await response.json();if(packet.scope!=='public'||!packet.data)throw Error('Resposta inválida.');return packet;
  },25000);
}
