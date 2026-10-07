export const ACCESS_LEVELS = [
 ['public','Público','Conteúdo público, sem necessidade de login.'],
 ['student','Aluno','Somente AVA, após aprovação. Sem Área Interna.'],
 ['trainee','Aluno Membro em treinamento','AVA e Área Interna para consulta, sem edição.'],
 ['member','Membro Integrado','AVA e Área Interna, com edição conforme as regras de cada seção.'],
 ['leader','Membro Líder','Acesso completo ao painel administrativo.']
];
export function accessLevel(user){
 if(!user)return 'public';
 if(user.role==='admin' || user.member_role==='admin')return 'leader';
 if(user.access_level)return user.access_level;
 if(user.access?.access_level)return user.access.access_level;
 if(user.status==='approved' && user.access?.portal_internal!==false && user.portal_internal!==false)return user.member_role==='member'?'member':'trainee';
 return user.access?.ava_status==='active' || user.ava_status==='active'?'student':'public';
}
export const accessLabel=user=>ACCESS_LEVELS.find(([key])=>key===accessLevel(user))?.[1] || 'Público';
export function canEditInternal(user){
 if(!user)return false;
 if(user.portal_can_edit!==undefined)return user.portal_can_edit===true;
 return user.status==='approved' && ['member','leader'].includes(accessLevel(user));
}
