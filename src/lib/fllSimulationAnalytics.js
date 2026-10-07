import { INITIAL_ROUND_STATE } from './fllBioglowRules.js';
export const MISSIONS = [
  ['inspection','Inspeção',20], ['m01','M01 Drone',30], ['m02','M02 Sementes',30], ['m03','M03 Rocha',30],
  ['m04','M04 Folhas',30], ['m05','M05 Raízes',20], ['m06','M06 Saúvas',30], ['m07','M07 Fungo',40],
  ['m08','M08 Cipó',30], ['m09','M09 Pesquisa',30], ['m10','M10 Habitats',20], ['m11','M11 Janela',20],
  ['m12','M12 Guardião',30], ['m13','M13 Espécie',30], ['m14','M14 Renovação',50], ['m15','M15 Arquitetura',40], ['m16','M16 Precisão',50]
];
export const normalizeTeam = name => String(name).normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');
export const seasonKey = row => `${row.season_theme} ${row.season_year} · ${row.rules_version}`;
const average = rows => rows.length ? rows.reduce((sum,row)=>sum+row.score,0)/rows.length : null;
const ordered = rows => [...rows].sort((a,b)=>a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
function localDay(value) { const date=new Date(value); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function filterSimulations(rows,{season,group='all',teams=[],from='',to='',data='real',portfolio=false,trash=false}={}) {
  return rows.filter(row=>Boolean(row.deleted_at)===trash && (!season || seasonKey(row)===season) &&
    (data==='all' || Boolean(row.is_test)===(data==='test')) && (group==='all' || Boolean(row.is_tera)===(group==='tera')) &&
    (!teams.length || teams.includes(normalizeTeam(row.team_name))) && (!portfolio || row.is_portfolio) &&
    (!from || localDay(row.created_at)>=from) && (!to || localDay(row.created_at)<=to));
}
export function analyzeSimulations(rows,window=3,metric='score') {
  const groups=new Map();
  for(const row of ordered(rows)) { const key=normalizeTeam(row.team_name); if(!groups.has(key))groups.set(key,[]); groups.get(key).push(row); }
  const teams=Array.from(groups,([key,rounds])=>{
    const first=rounds.slice(0,window),last=rounds.slice(-window);
    const canCompare=rounds.length>=window*2;
    const missions=MISSIONS.map(([code,label,max])=>{
      const mean=sample=>sample.reduce((sum,row)=>sum+(Number(row.breakdown?.[code]) || 0),0)/sample.length;
      const points=mean(rounds),recent=mean(last);
      return {code,label,max,average:points,recent,percentage:100*points/max,zeroRate:100*rounds.filter(row=>!row.breakdown?.[code]).length/rounds.length,gain:canCompare ? recent-mean(first) : null,opportunity:max-recent};
    });
    return {key,name:rounds[0].team_name,rounds,average:average(rounds),best:Math.max(...rounds.map(row=>row.score)),latest:rounds.at(-1).score,firstAverage:average(first),recentAverage:average(last),gain:canCompare ? average(last)-average(first) : null,missions};
  });
  const count=Math.max(0,...teams.map(team=>team.rounds.length));
  const evolution=Array.from({length:count},(_,index)=>{
    const point={round:index+1};
    const value=row=>metric==='score' ? row.score : Number(row.breakdown?.[metric]) || 0;
    teams.forEach((team,i)=>{if(team.rounds[index]){point[`team${i}`]=value(team.rounds[index]);point[`mean${i}`]=average(team.rounds.slice(Math.max(0,index-window+1),index+1).map(row=>({score:value(row)})));}});
    return point;
  });
  return {teams,evolution,count:rows.length,average:average(rows),best:rows.length ? Math.max(...rows.map(row=>row.score)) : null};
}
export function demonstrationRounds() {
  const result=[];
  for(const [teamName,offset] of [['Tera Robotics (demonstração)',0],['Equipe Aurora (demonstração)',1],['Equipe Horizonte (demonstração)',2]]) {
    for(let index=0;index<6;index++) {
      const progress=Math.max(0,index-offset);
      result.push({ ...INITIAL_ROUND_STATE,teamName,roundName:`Demonstração · tentativa ${index+1}`,
        inspectionSmallArea:index>0,m01_droneLaunched:true,m01_lidarBonus:progress>=2,m02_seedsReleased:Math.min(3,progress+1),
        m03_flagDown:progress>=1,m03_rockResetBonus:progress>=3,m04_leavesRemoved:progress>=3?2:1,
        m05_rootState:progress>=3?'complete':progress>=1?'partial':'none',m06_antInNest:progress>=1,m06_leafFragments:Math.min(3,progress),
        m07_myceliumExtended:progress>=2,m07_connections:progress>=2?Math.min(2,progress-1):0,m08_vineTouchingMat:progress>=2,
        m09_cameraTrapDeployed:true,m09_platformRaised:progress>=2,m09_seedOffTree:progress>=4,
        m10_spiderUndisturbed:true,m10_snailUndisturbed:index!==2,m11_rootCoverDown:progress>=3,
        m12_caneRaised:progress>=2,m12_supportTieAround:progress>=4,m13_speciesDeliveredAndTreesRaised:progress>=4,
        m14_seedsInStation:Math.min(5,progress+1),m14_seedsTouchingMat:Math.min(5,progress),
        m15_nestingCanopy:progress>=1,m15_gardenSkylight:progress>=3,m15_compostHatch:progress>=4,m15_ecologicalBonus:progress>=1?'canopy':'none',
        m16_precisionTokens:[3,4,2,4,5,6][index] });
    }
  }
  return result;
}
