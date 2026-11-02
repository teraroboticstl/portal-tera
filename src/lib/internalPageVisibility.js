// Explicit catalogue: public/AVA pages and recovery/admin entry points cannot be hidden.
export const INTERNAL_PAGES = [
  ['InternalOperations', 'Operação Tera e ULTRON'],
  ['InternalLogs', 'Logs Diários'], ['InternalMeetings', 'Reuniões'],
  ['InternalPrototypes', 'Protótipos'], ['InternalMemorial', 'Memorial'],
  ['InternalEventGallery', 'Galeria de Eventos'], ['InternalRiskAnalysis', 'Análise de Risco'],
  ['InternalESG', 'Sustentabilidade (ESG)'], ['InternalProjects', 'Projetos'],
  ['InternalProjectsDashboard', 'Painel de Projetos'], ['InternalSocialProjects', 'Projetos Sociais'],
  ['InternalOBR', 'Área OBR'], ['InternalFRC', 'FRC — Visão Geral'],
  ['InternalFRCMatchHistory', 'FRC — Histórico de Partidas'], ['InternalFRCMatches', 'FRC — Partidas'],
  ['InternalFRCPDI', 'FRC — PDI'], ['InternalFRCPicklist', 'FRC — Picklist'],
  ['InternalFRCScout', 'FRC — Scout'], ['InternalFRCTeams', 'FRC — Equipes'],
  ['InternalFRCTeamsRegister', 'FRC — Cadastro de Equipes'],
  ['InternalFTC', 'FTC — Visão Geral'], ['InternalFTCMatches', 'FTC — Partidas'],
  ['InternalFTCPDI', 'FTC — PDI'], ['InternalFTCQualifiersScout', 'FTC — Scout Classificatórias'],
  ['InternalFTCScorer', 'FTC — Pontuação'], ['InternalFTCScout', 'FTC — Scout'],
  ['InternalFTCTeams', 'FTC — Equipes'], ['InternalBoardDiary', 'Diário de Bordo'],
  ['InternalCADAssistant', 'Assistente Geral'], ['InternalCADConfig', 'Configuração CAD'],
  ['InternalFLL', 'FLL — Visão Geral'], ['InternalFLLDashboard', 'FLL — Dashboard'],
  ['InternalFLLMeetings', 'FLL — Reuniões'], ['InternalFLLMissions', 'FLL — Missões'],
  ['InternalFLLInnovation', 'FLL — Projeto de Inovação'], ['InternalFLLCoreValues', 'FLL — Core Values'],
  ['InternalFLLTeam', 'FLL — Equipe'], ['InternalFLLTasks', 'FLL — Prioridades'],
  ['InternalFLLJudgePrep', 'FLL — Preparação de Juízes'], ['InternalFLLAttachments', 'FLL — Anexos'],
  ['InternalSeasonArchive', 'Arquivo de Temporadas'],
];
export const visibilityKey = page => INTERNAL_PAGES.find(([key]) => key.toLowerCase() === String(page).toLowerCase())?.[0];
export function canDisplayPage(page, snapshot, actor) {
  const key = visibilityKey(page);
  if (!key) return true;
  if (!actor || snapshot?.actor !== actor) return false;
  return snapshot.is_admin === true || snapshot.pages?.[key]?.visible === true;
}
