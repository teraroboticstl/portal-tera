import {accessLevel} from './accessLevels.js';

export function studentCatalog(data) {
  return (data.catalog || []).map(track=>({...track,...(data.tracks || []).find(t=>t.id===track.id)}));
}

export function enrollmentRows(data,user) {
  const level=accessLevel(user),internal=['trainee','member','leader'].includes(level);
  const authorized=!!user && (level==='leader' || user.access?.ava_status==='active');
  return (data.tracks || []).map(track=>{
    const enrollment=(data.enrollments || []).find(e=>e.user_id===user?.id && e.track_id===track.id);
    const audienceAllowed=track.audience==='all' || (track.audience==='tera' && internal) || (track.audience==='external' && !internal);
    const reason=!authorized?'O acesso deste aluno ao AVA precisa estar autorizado.':!audienceAllowed?'Esta trilha é destinada a outro público.':track.status==='archived'?'Esta trilha está arquivada.':'';
    return {track,enrollment,status:enrollment?.status || 'none',canEnroll:!reason,reason};
  }).sort((a,b)=>(a.track.position || 0)-(b.track.position || 0));
}
