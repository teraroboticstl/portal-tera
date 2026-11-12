// Local presentation fixtures, never inserted into scouting or sent to the API.
const scores=[[80,95,110],[60,75,90],[100,105,120],[45,65,85]];
export const FRC_BI_DEMO=Object.freeze(scores.flatMap((values,team)=>values.map((value,day)=>Object.freeze({
  team:`Equipe ${String.fromCharCode(65+team)} (demo)`,date:`2026-11-${9+day<10?'0':''}${9+day}`,
  event:'Evento fictício — demonstração',match:`Exemplo ${day+1}`,value
}))));
export function biPresentation(program,packet,choice=null) {
  if(!packet||packet.program!==program||!Array.isArray(packet.rows))return {rows:[],demo:false};
  const demo=program==='FRC'&&(choice===true||(choice===null&&packet.rows.length===0));
  return {demo,rows:demo?FRC_BI_DEMO:packet.rows};
}
