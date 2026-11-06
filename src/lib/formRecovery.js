import {format,isValid} from 'date-fns';
export function formatPortalDate(value,pattern,options) {
 const date=value instanceof Date?value:new Date(value);
 return isValid(date)?format(date,pattern,options):'Data não informada';
}
export function formErrorMessage(error) {
 if(!error)return '';
 const code=String(error.code||'');
 if(code==='42501')return 'Seu acesso não permite salvar este registro. Confira a modalidade e o nível com o administrador. O formulário foi mantido.';
 if(['42703','PGRST204'].includes(code))return 'O formulário e o banco ainda não estão compatíveis. O registro não foi confirmado; mantenha esta tela e avise o administrador.';
 if(['23514','22P02','23502','22007','22008'].includes(code))return 'Confira os campos obrigatórios, o status, as pontuações e a data. O formulário foi mantido para correção.';
 return 'Não foi possível confirmar o salvamento. O formulário foi mantido. Confira sua conexão e atualize a lista antes de reenviar para evitar duplicação.';
}
