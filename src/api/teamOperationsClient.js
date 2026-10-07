import {supabase} from './supabaseClient';
export async function loadOperations(){
 const allItems=async()=>{let items=[];for(let offset=0;;offset+=500){const result=await supabase.from('portal_work_items').select('*').order('id').range(offset,offset+499);if(result.error)return result;items.push(...(result.data||[]));if(result.data.length<500)return {data:items.sort((a,b)=>b.updated_at.localeCompare(a.updated_at))};}};
 const results=await Promise.all([allItems(),supabase.rpc('portal_work_roster')]);
 for(const result of results)if(result.error)throw result.error;
 return {items:results[0].data||[],roster:results[1].data||[]};
}
export async function loadSources(query=''){
 const {data,error}=await supabase.rpc('portal_work_sources',{p_query:query});if(error)throw error;return data||[];
}
export async function saveWork(form){
 const {id,version}=form,payload={...form};
 for(const key of ['id','version','author_id','created_at','updated_at'])delete payload[key];
 let request=id?supabase.from('portal_work_items').update(payload).eq('id',id).eq('version',version):supabase.from('portal_work_items').insert(payload);
 const {data,error}=await request.select().single();
 if(error)throw new Error(error.code==='PGRST116'?'Este item mudou enquanto você editava. Atualize o painel antes de tentar novamente.':error.message);
 return data;
}
export async function archiveWork(item,archived){
 const {error,data}=await supabase.from('portal_work_items').update({archived}).eq('id',item.id).eq('version',item.version).select('id').single();
 if(error||!data)throw new Error(error?.code==='PGRST116'?'O item mudou. Atualize o painel.':error?.message||'Não foi possível atualizar o item.');
}
export async function loadWorkAudit(id){
 const {data,error}=await supabase.from('portal_work_audit').select('id,actor_id,changed_at,action,before_data,after_data').eq('item_id',id).order('changed_at',{ascending:false}).limit(30);
 if(error)throw error;return data||[];
}
