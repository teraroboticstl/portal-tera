import { supabase } from './supabaseClient';
async function authenticatedFetch(url, options={}) {
  const {data:{session}}=await supabase.auth.getSession();
  if(!session)throw new Error('Faça login novamente para continuar.');
  const send=token=>fetch(url,{...options,headers:{...options.headers,Authorization:`Bearer ${token}`}});
  let response=await send(session.access_token);
  // Retry only rejected authentication; never repeat a permission denial or a completed mutation.
  if(response.status===401){
    const {data,error}=await supabase.auth.refreshSession();
    if(error || !data.session)throw new Error('Faça login novamente para continuar.');
    response=await send(data.session.access_token);
  }
  return response;
}
export async function avaRequest(view='dashboard',id=null) {
  const query=new URLSearchParams({view});if(id)query.set('id',id);
  const response=view==='catalog'?await fetch(`/api/ava/data?${query}`):await authenticatedFetch(`/api/ava/data?${query}`);
  const result=await response.json();if(!response.ok)throw new Error(result.error);
  return result.data;
}
export async function avaMutate(action,data={}) {
  const response=await authenticatedFetch('/api/ava/data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,data})});
  const result=await response.json();if(!response.ok)throw new Error(result.error);
  return result.data;
}
export async function avaMediaBlob(fileId) {
  const response=await authenticatedFetch(`/api/media/${encodeURIComponent(fileId)}`);
  if(!response.ok)throw new Error('Não foi possível carregar este material protegido.');
  return response.blob();
}
