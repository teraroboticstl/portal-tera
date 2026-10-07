import { supabase } from './supabaseClient.js';
async function request(url, body) {
  const {data:{session}} = await supabase.auth.getSession();
  const response = await fetch(url, { method:body ? 'POST' : 'GET', headers:{ ...(body ? {'Content-Type':'application/json'} : {}), ...(session ? {Authorization:`Bearer ${session.access_token}`} : {}) }, ...(body ? {body:JSON.stringify(body)} : {}) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Não foi possível salvar a simulação.');
  return result;
}
export const saveFllSimulation = body => request('/api/fll/simulations',body);
export const listFllSimulations = (admin=false) => request(`/api/fll/simulations${admin ? '?scope=admin' : ''}`);
export const fetchSharedSimulation = token => request(`/api/fll/simulations?share=${encodeURIComponent(token)}`);
export const classifyTeraSimulation = (id,isTera) => request('/api/fll/simulations',{action:'classify',id,isTera});
export function simulationForHistory(row) {
  return { id:row.id, savedAt:row.created_at, teamName:row.team_name, roundName:row.round_name, score:row.score, stateSnapshot:row.state_snapshot, remote:true, portfolio:row.is_portfolio, iterationTitle:row.iteration_title };
}
