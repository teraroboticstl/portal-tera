export const BI_PAGES={FRC:'InternalFRCScout',FTC:'InternalFTCScout',FLL:'InternalFLLDashboard'};
export const BI_METRICS={FRC:'Auto + teleop (pontos)',FTC:'Índice de eficiência (IEF)',FLL:'Pontuação do round'};
export const biText=(value,max=160)=>typeof value==='string'?value.replace(/[\u0000-\u001f]/g,' ').slice(0,max):'';
const number=value=>['number','string'].includes(typeof value)&&String(value).trim()!==''&&Number.isFinite(Number(value))&&Math.abs(Number(value))<1e9?Number(value):null;
export function canReadBi(program,user,snapshot) {
  return typeof program==='string'&&Object.hasOwn(BI_PAGES,program)&&Boolean(user?.id)&&snapshot?.actor===user.id&&
    (user.profile?.portal_internal===true||user.profile?.is_admin===true)&&
    (snapshot.is_admin===true||snapshot.pages?.[BI_PAGES[program]]?.visible===true)&&
    (snapshot.is_admin===true||snapshot.all_modalities===true||snapshot.modalities?.includes(program)===true);
}
export function biDate(value) {
  if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))return '';
  if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Campo_Grande',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));
  const part=t=>parts.find(p=>p.type===t).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function scoutingRow(row,program) {
  const auto=number(row.auto_points??row.auto_score),teleop=number(row.teleop_points??row.teleop_score);
  const value=program==='FRC'?(auto!==null&&teleop!==null?auto+teleop:null):number(program==='FTC'?row.efficiency_index:row.score);
  return {date:biDate(row.created_at),team:biText(String((program==='FLL'?row.team_name:row.team_number)||'Equipe não informada'),90),
    event:biText(program==='FLL'?`${row.season_theme||'Temporada'} ${row.season_year||''} · ${row.rules_version||''}`:row.event_key||row.event||'Evento não informado'),
    match:biText(String(row.match_number||row.round_name||'Registro'),60),value};
}
const mean=rows=>{const values=rows.map(r=>r.value).filter(v=>typeof v==='number'&&Number.isFinite(v));return values.length?values.reduce((a,b)=>a+b,0)/values.length:null;};
export function summarizeScouting(rows,{team='',event='',from='',to=''}={}) {
  const selected=rows.filter(r=>(!team||r.team===team)&&(!event||r.event===event)&&(!from||(r.date&&r.date>=from))&&(!to||(r.date&&r.date<=to)));
  const group=key=>{
    const buckets=new Map();for(const row of selected){const bucket=buckets.get(row[key])||[];bucket.push(row);buckets.set(row[key],bucket);}
    return Array.from(buckets,([name,sample])=>({name,records:sample.length,average:mean(sample),best:sample.some(r=>r.value!==null)?Math.max(...sample.filter(r=>r.value!==null).map(r=>r.value)):null}));
  };
  const teams=group('team').sort((a,b)=>a.name.localeCompare(b.name,'pt-BR',{numeric:true}));
  return {count:selected.length,measured:selected.filter(r=>r.value!==null).length,average:mean(selected),
    best:selected.some(r=>r.value!==null)?Math.max(...selected.filter(r=>r.value!==null).map(r=>r.value)):null,
    teams,days:group('date').filter(r=>r.name).sort((a,b)=>a.name.localeCompare(b.name))};
}
export function missionRows(rows) {
  return rows.map(r=>({name:biText(r.title||r.name||'Missão'),score:number(r.current_score??r.best_score),maximum:number(r.max_score),status:biText(r.portal_form_data?.status||r.status||'Não informado',40)}));
}
export function publicBi(projects,robots,memorials) {
  // Explicit output allowlist; descriptions, links, members and identities never leave this projection.
  return {projects:projects.map(r=>({id:r.id,title:biText(r.title),date:biDate(r.created_at)})),
    robots:robots.map(r=>({name:biText(r.name),program:['FRC','FTC','FLL','OBR'].includes(r.category)?r.category:'Não informado'})),
    milestones:memorials.map(r=>({title:biText(r.title),date:biDate(r.date),program:['FRC','FTC','FLL','OBR'].includes(r.program)?r.program:'Geral',category:biText(r.category,60)}))};
}
export function biCsv(summary,metric) {
  const cell=value=>typeof value==='number'?String(value):'"'+(/^[\s]*[=+@-]/.test(String(value))?"'":'')+String(value??'').replace(/"/g,'""')+'"';
  return '\uFEFF'+[['Equipe','Registros','Média','Melhor', 'Métrica'],...summary.teams.map(t=>[t.name,t.records,t.average??'',t.best??'',metric])].map(row=>row.map(cell).join(';')).join('\r\n');
}
