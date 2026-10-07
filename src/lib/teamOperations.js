export const WORK_KINDS={goal:'Meta',task:'Tarefa',activity:'Atividade',meeting:'Reunião / decisão'};
export const WORK_STATUS={planned:'Planejado',active:'Em andamento',blocked:'Bloqueado',done:'Concluído',cancelled:'Cancelado'};
export const WORK_PRIORITY={low:'Baixa',medium:'Média',high:'Alta',urgent:'Urgente'};
export const SOURCE_PAGES={daily_logs:'InternalLogs',team_logs:'InternalFLLDashboard',meeting_notes:'InternalMeetings',priorities:'InternalFTC',fll_tasks:'InternalFLLTasks'};
export const SOURCE_LABELS={daily_logs:'Log diário',team_logs:'Log de equipe',meeting_notes:'Ata existente',priorities:'Prioridade existente',fll_tasks:'Tarefa FLL existente'};
export function teamToday(date=new Date()){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Cuiaba',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
 const get=k=>parts.find(p=>p.type===k).value;
 return `${get('year')}-${get('month')}-${get('day')}`;
}
export function pendingDependencies(item,items){
 return (item.depends_on||[]).filter(id=>items.find(t=>t.id===id)?.status!=='done');
}
export function operationalFacts(items,today=teamToday()){
 const tasks=items.filter(i=>i.kind==='task' && !i.archived && !['done','cancelled'].includes(i.status));
 return {open:tasks,late:tasks.filter(i=>i.due_on && i.due_on<today),dueToday:tasks.filter(i=>i.due_on===today),
 blocked:tasks.filter(i=>i.status==='blocked'||pendingDependencies(i,items).length),unassigned:tasks.filter(i=>!i.responsible_id)};
}
export function goalProgress(goal,items){
 const tasks=items.filter(i=>i.kind==='task' && i.goal_id===goal.id && !i.archived && i.status!=='cancelled');
 return tasks.length?Math.round(tasks.reduce((sum,t)=>sum+(t.status==='done'?100:t.progress),0)/tasks.length):null;
}
export function evidenceForMember(items,userId){
 return items.filter(i=>!i.archived && ['activity','meeting'].includes(i.kind) && i.participants?.some(p=>p.user_id===userId));
}
export function sourceTitle(s){return s.data.title||s.data.name||SOURCE_LABELS[s.kind];}
export function sourceText(s){return s.data.content||s.data.description||'';}
export function displayDate(value){return value?value.slice(0,10).split('-').reverse().join('/'):'Não informada';}
