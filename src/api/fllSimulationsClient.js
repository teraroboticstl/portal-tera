import { supabase } from './supabaseClient.js';
async function request(url, body) {
  const {data:{session}} = await supabase.auth.getSession();
  const response = await fetch(url, { method:body ? 'POST' : 'GET', headers:{ ...(body ? {'Content-Type':'application/json'} : {}), ...(session ? {Authorization:`Bearer ${session.access_token}`} : {}) }, ...(body ? {body:JSON.stringify(body)} : {}) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Não foi possível salvar a simulação.');
  return result;
}
export const saveFllSimulation = body => request('/api/fll/simulations',body);
export async function listFllSimulations(admin=false) {
  if (!admin) return request('/api/fll/simulations');
  const rows=[];
  let before='';
  for(let page=0;page<=200;page++) {
    const result=await request(`/api/fll/simulations?scope=admin&page=${page}${before ? `&before=${encodeURIComponent(before)}` : ''}`);
    before=result.before;
    rows.push(...result.simulations);
    if (!result.hasMore) return {simulations:Array.from(new Map(rows.map(row=>[row.id,row])).values())};
  }
  throw new Error('Mais de 50 mil registros. A consulta exige agregação adicional no servidor.');
}
export const archiveFllSimulations = (ids,restore=false) => request('/api/fll/simulations',{action:restore ? 'restore' : 'archive',ids});
export const fetchSharedSimulation = token => request(`/api/fll/simulations?share=${encodeURIComponent(token)}`);
export const classifyTeraSimulation = (id,isTera) => request('/api/fll/simulations',{action:'classify',id,isTera});
export function simulationForHistory(row) {
  return { id:row.id, savedAt:row.created_at, teamName:row.team_name, roundName:row.round_name, score:row.score, stateSnapshot:row.state_snapshot, remote:true, portfolio:row.is_portfolio, iterationTitle:row.iteration_title };
}
