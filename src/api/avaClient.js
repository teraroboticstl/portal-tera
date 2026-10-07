import { supabase } from './supabaseClient';
export async function avaRequest(view='dashboard',id=null) {
  const {data:{session}}=await supabase.auth.getSession();
  const query=new URLSearchParams({view});if(id)query.set('id',id);
  const response=await fetch(`/api/ava/data?${query}`,{headers:session?{Authorization:`Bearer ${session.access_token}`}:{}});
  const result=await response.json();if(!response.ok)throw new Error(result.error);
  return result.data;
}
export async function avaMutate(action,data={}) {
  const {data:{session}}=await supabase.auth.getSession();
  if(!session)throw new Error('Faça login novamente.');
  const response=await fetch('/api/ava/data',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({action,data})});
  const result=await response.json();if(!response.ok)throw new Error(result.error);
  return result.data;
}
export async function avaMediaBlob(fileId) {
  const {data:{session}}=await supabase.auth.getSession();
  if(!session)throw new Error('Faça login novamente.');
  const response=await fetch(`/api/media/${encodeURIComponent(fileId)}`,{headers:{Authorization:`Bearer ${session.access_token}`}});
  if(!response.ok)throw new Error('Não foi possível carregar este material protegido.');
  return response.blob();
}
