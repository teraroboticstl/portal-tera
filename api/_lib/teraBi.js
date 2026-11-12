import {BI_PAGES,canReadBi,scoutingRow,missionRows,publicBi} from '../../src/lib/teraBi.js';
export function createBiHandler({publicClient,scopedClient,authenticate,limit=5000}) {
  async function all(client,table,fields='*',configure=q=>q) {
    const rows=[];
    for(let offset=0;offset<limit;offset+=500) {
      let query=configure(client.from(table).select(fields)).order('id').range(offset,Math.min(offset+499,limit-1));
      if(typeof query.abortSignal==='function')query=query.abortSignal(AbortSignal.timeout(15000));
      const {data,error}=await query;
      if(error||!Array.isArray(data))throw new Error('SERVICE');
      rows.push(...data);
      if(data.length<Math.min(500,limit-offset))return {rows,partial:false};
    }
    return {rows,partial:true};
  }
  return async(req,res)=>{
    res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
    if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Somente consulta.'});}
    try {
      if(req.query?.scope==='public') {
        const [projects,robots,memorials]=await Promise.all([
          all(publicClient,'projects','id,title,created_at',q=>q.eq('status','Ativo')),
          all(publicClient,'robots','id,name,category'),all(publicClient,'tournament_memorials','id,title,date,program,category')]);
        return res.status(200).json({scope:'public',data:publicBi(projects.rows,robots.rows,memorials.rows),partial:[projects,robots,memorials].some(s=>s.partial),updated_at:new Date().toISOString()});
      }
      const program=req.query?.program;
      if(typeof program!=='string'||!Object.hasOwn(BI_PAGES,program))return res.status(400).json({error:'Modalidade inválida.'});
      let user;
      try {user=await authenticate(req.headers?.authorization);}catch{return res.status(401).json({error:'Entre no Portal para consultar o TERA BI.'});}
      const token=req.headers?.authorization?.replace(/^Bearer\s+/i,'').trim();
      if(!token)return res.status(401).json({error:'Sessão inválida.'});
      const client=scopedClient(token);
      const access=async()=>{const {data,error}=await client.rpc('portal_page_visibility_snapshot');if(error||!canReadBi(program,user,data))throw new Error('DENIED');return data;};
      const before=await access();
      let records,missions=[];
      if(program==='FLL') {
        records=await all(client,'fll_round_simulations','id,created_at,team_name,round_name,score,season_theme,season_year,rules_version',q=>{
          q=q.eq('rules_version','bioglow-2026-2027-v1').eq('is_test',false).is('deleted_at',null);
          return before.is_admin===true?q:q.eq('user_id',user.id);
        });
        const missionSource=await all(client,'fll_missions','id,title,current_score,max_score,status,portal_form_data');
        missions=missionRows(missionSource.rows);records.partial ||= missionSource.partial;
      }else records=await all(client,program==='FRC'?'frc_scouts':'scout_ftcs',program==='FRC'?'id,created_at,team_number,match_number,auto_points,teleop_points':'id,created_at,team_number,match_number,event,efficiency_index');
      const rows=records.rows.map(r=>scoutingRow(r,program));
      const afterUser=await authenticate(req.headers.authorization);
      if(afterUser.id!==user.id)throw new Error('DENIED');
      user=afterUser;const after=await access();
      const boards=Object.keys(BI_PAGES).filter(p=>canReadBi(p,user,after));
      return res.status(200).json({actor:user.id,program,boards,rows,missions,partial:records.partial,updated_at:new Date().toISOString(),
        coverage:program==='FLL'?(after.is_admin?'Rounds Bioglow autorizados; testes e lixeira excluídos':'Meus rounds Bioglow; testes e lixeira excluídos'):'Registros de scouting autorizados pela sua sessão'});
    }catch(error){return res.status(error.message==='DENIED'?403:503).json({error:error.message==='DENIED'?'Seu acesso a esta modalidade ou página não está liberado.':'Não foi possível consultar as fontes. Nenhum indicador parcial foi exibido.'});}
  };
}
