export const MANAGEMENT_SOURCES = [
 ['pdis','PDIs — FTC, FLL e OBR'],['pdi_frcs','PDIs — FRC'],
 ['daily_logs','Registros diários'],['team_logs','Registros da equipe'],['meeting_notes','Reuniões e atas'],
 ['board_diaries','Diários de bordo'],['portal_work_items','Operação: metas, tarefas e atividades'],
 ['frc_scouts','Scouting FRC'],['scout_ftcs','Scouting FTC'],
 ['fll_missions','FLL — Missões'],['fll_tasks','FLL — Prioridades'],
 ['fll_innovation_projects','FLL — Inovação'],['fll_core_values','FLL — Core Values'],
 ['fll_judge_preps','FLL — Preparação de juízes'],['fll_members','FLL — Equipe'],['fll_attachments','FLL — Anexos'],
 ['tir_equipes','OBR — Equipes'],['tir_regras','OBR — Regras'],
 ['internal_projects','Projetos internos'],['project_risks','Análise de risco'],['esg_initiatives','Sustentabilidade ESG']
];
export function createManagementReadClient(db){
 async function identity(actor){const {data,error}=await db.auth.getUser();if(error||!actor||data?.user?.id!==actor)throw Error('Sua sessão mudou. Entre novamente.');}
 return {async read(actor,source,after=null){
  if(!MANAGEMENT_SOURCES.some(([key])=>key===source)||after!==null&&(typeof after!=='string'||after.length>200))throw Error('Consulta inválida.');
  await identity(actor);
  const {data,error}=await db.rpc('portal_management_records',{p_source:source,p_after:after});
  await identity(actor);
  if(error||data?.actor!==actor||data?.source!==source||!Array.isArray(data?.items)||data.items.length>50||typeof data.has_more!=='boolean'
   ||data.has_more&&(typeof data.next_cursor!=='string'||!data.next_cursor||data.next_cursor===after)
   ||!data.items.every(item=>typeof item.cursor==='string'&&item.record&&typeof item.record==='object'&&!Array.isArray(item.record)))
   throw Error('Não foi possível confirmar a consulta de Gestão-leitura. Atualize seu acesso ou procure a administração.');
  return data;
 }};
}
