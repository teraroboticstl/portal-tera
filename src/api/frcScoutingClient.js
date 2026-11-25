const uuid = value => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);
export function createFrcScoutingClient(db) {
 async function identity(actor) {
  const {data,error}=await db.auth.getUser();
  if(error||!actor||data?.user?.id!==actor) throw Error('Sessão alterada. Entre novamente.');
 }
 async function result(query,actor) {
  const {data,error}=await query;
  await identity(actor);
  if(error) throw Error('Não foi possível acessar o scouting. Confira a configuração e suas permissões.');
  return data;
 }
 return {
  async create(actor,kind,fields){
   await identity(actor);let table,payload;
   const name=String(fields.name||'').trim();
   if(!name||name.length>120)throw Error('Informe um nome de até 120 caracteres.');
   if(kind==='season'){
    if(!/^20\d{2}$/.test(fields.number))throw Error('Informe o ano com quatro dígitos.');
    table='seasons';payload={year:Number(fields.number),theme:name,program:'FRC'};
   }else if(kind==='event'){
    if(!uuid(fields.season))throw Error('Selecione a temporada.');
    table='tournament_configs';payload={tournament_name:name,category:'FRC',scouting_season_id:fields.season};
   }else if(kind==='team'){
    if(!/^\d{1,6}$/.test(fields.number)||Number(fields.number)===0)throw Error('Informe o número oficial da equipe.');
    table='teams';payload={number:String(Number(fields.number)),name,program:'FRC'};
   }else throw Error('Configuração inválida.');
   await result(db.from(table).insert(payload).select('id').single(),actor);
  },
  async load(actor){
   await identity(actor);
   const [seasons,events,teams]=await Promise.all([
    result(db.from('seasons').select('id,year,theme').eq('program','FRC').order('year',{ascending:false}).limit(200),actor),
    result(db.from('tournament_configs').select('id,tournament_name,scouting_season_id').eq('category','FRC').order('created_at',{ascending:false}).limit(200),actor),
    result(db.from('teams').select('id,number,name').eq('program','FRC').order('number').limit(1000),actor)]);
   return {actor,seasons,events,teams};
  },
  async event(actor,event){
   if(!uuid(event))throw Error('Selecione um campeonato.');await identity(actor);
   const [participants,records]=await Promise.all([
    result(db.from('frc_scouting_event_teams').select('team_id').eq('event_id',event).limit(1000),actor),
    result(db.from('frc_scouts').select('id,team_number,match_number,auto_points,teleop_points,notes,scouting_user_id,created_at').eq('scouting_event_id',event).order('created_at',{ascending:false}).limit(200),actor)]);
   return {actor,event,participants,records};
  },
  async configure(actor,event,season){
   if(!uuid(event)||!uuid(season))throw Error('Selecione temporada e campeonato.');await identity(actor);
   await result(db.from('tournament_configs').update({scouting_season_id:season}).eq('id',event).select('id').single(),actor);
  },
  async enroll(actor,event,team){
   if(!uuid(event)||!uuid(team))throw Error('Selecione campeonato e equipe.');await identity(actor);
   await result(db.from('frc_scouting_event_teams').insert({event_id:event,team_id:team}),actor);
  },
  async save(actor,context,form){
   if(!uuid(context.event)||!uuid(context.season)||!/^\d{1,6}$/.test(form.team)||!form.match?.trim()||form.match.length>40)throw Error('Confira equipe e partida.');
   const points=value=>{if(value===''||!/^\d+$/.test(String(value))||!Number.isSafeInteger(Number(value))||Number(value)>100000)throw Error('Informe os pontos observados, inclusive zero.');return Number(value);};
   const payload={team_number:form.team,match_number:form.match.trim(),auto_points:points(form.auto),teleop_points:points(form.teleop),notes:String(form.notes||'').slice(0,5000),scouting_season_id:context.season,scouting_event_id:context.event};
   await identity(actor);
   // The trigger fills scouting_user_id from auth.uid(). Never accept a form author.
   return result(db.from('frc_scouts').insert(payload).select('id,scouting_user_id').single(),actor);
  }
 };
}
