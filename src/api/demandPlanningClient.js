import {createDemandBoardsClient,DEMAND_BOARDS,validDemandCard} from './demandBoardsClient.js';
import {DEMAND_PRIORITIES} from '../lib/demandPlanning.js';
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function createDemandPlanningClient(client,{timeoutMs=20000}={}){
 const legacy=createDemandBoardsClient(client,{timeoutMs});
 async function rpc(actor,name,args={}){
  const controller=new AbortController();let timer;
  try{return await Promise.race([(async()=>{
   const before=await client.auth.getUser();if(controller.signal.aborted||!actor||before.error||before.data?.user?.id!==actor)throw Error();
   let query=client.rpc(name,args);if(typeof query.abortSignal==='function')query=query.abortSignal(controller.signal);const {data,error}=await query;
   if(controller.signal.aborted)throw Error();
   const after=await client.auth.getUser();if(after.error||after.data?.user?.id!==actor)throw Error();
   if(error){if(['PGRST202','42883'].includes(error.code))throw Object.assign(Error('Recurso ainda não instalado.'),{code:'NOT_INSTALLED'});throw Error();}
   if(data?.actor!==actor)throw Error();return data;
  })(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error());},timeoutMs);})]);}
  catch(error){if(error.code==='NOT_INSTALLED')throw error;throw Error('Não foi possível confirmar sua sessão ou as permissões. Atualize e tente novamente.');}finally{clearTimeout(timer);}
 }
 function validateCard(c,actor,board){return validDemandCard(c,actor,board)&&c.item_meta&&typeof c.item_meta==='object'&&!Array.isArray(c.item_meta)&&Object.entries(c.item_meta).every(([id,m])=>c.items.some(i=>i.id===id)&&Object.hasOwn(DEMAND_PRIORITIES,m?.priority)&&(m.assignee_id===null||uuid(m.assignee_id)));}
 return {
  async read(actor,board='personal',archived=false,after=null,focusCard=null){
   if(!Object.hasOwn(DEMAND_BOARDS,board))throw Error('Quadro inválido.');
   if(focusCard!==null&&!uuid(focusCard))throw Error('Demanda inválida.');
   if(typeof after==='string')return {...await legacy.read(actor,board,archived,after),advanced:false,recipients:[]};
   try{
    if(after!==null&&(!uuid(after?.id)||!Number.isInteger(after?.rank)||after.rank<0||after.rank>4))throw Error('Página inválida.');
    const p=await rpc(actor,'portal_demands_v2_read',{p_board:board,p_archived:archived,p_after_rank:after?.rank??null,p_after_id:after?.id??null,p_card:focusCard});
    if(p.board!==board||!Array.isArray(p.boards)||p.boards.some(b=>!Object.hasOwn(DEMAND_BOARDS,b))||!p.boards.includes(board)||typeof p.can_edit!=='boolean'||typeof p.has_more!=='boolean'||!Array.isArray(p.items)||p.items.length>50||p.items.some(c=>!validateCard(c,actor,board)||c.archived!==archived)||!Array.isArray(p.recipients)||p.recipients.length>500||p.recipients.some(r=>!uuid(r.id)||typeof r.name!=='string')||(p.has_more&&(!uuid(p.next_cursor?.id)||!Number.isInteger(p.next_cursor.rank))))throw Error('Resposta de demandas inválida.');
    return {...p,advanced:true};
   }catch(error){if(error.code!=='NOT_INSTALLED')throw error;return {...await legacy.read(actor,board,archived,after),advanced:false,recipients:[]};}
  },
  write:legacy.write,
  async contact(actor,data=null){const p=await rpc(actor,'portal_demand_contact',{p_data:data});if(typeof p.required!=='boolean'||typeof p.completed!=='boolean'||(p.phone!==null&&!/^\+[1-9][0-9]{7,14}$/.test(p.phone)))throw Error('Resposta de contato inválida.');return p;},
  async inbox(actor,after=null){const p=await rpc(actor,'portal_demand_inbox',{p_after:after?.date??null,p_after_id:after?.id??null});if(!Array.isArray(p.items)||p.items.length>30||!Number.isSafeInteger(p.unread)||p.unread<0||typeof p.has_more!=='boolean'||p.items.some(n=>!uuid(n.id)||!uuid(n.card_id)||!uuid(n.item_id)||!Object.hasOwn(DEMAND_BOARDS,n.board)||n.board==='personal'||typeof n.title!=='string'||typeof n.item_text!=='string'||!Object.hasOwn(DEMAND_PRIORITIES,n.priority)))throw Error('Notificações inválidas.');return p;},
  async markRead(actor,id){if(!uuid(id))throw Error('Notificação inválida.');return rpc(actor,'portal_demand_notice_read',{p_id:id});},
  async whatsapp(actor,cardId,itemId,board){if(!uuid(cardId)||!uuid(itemId)||!Object.hasOwn(DEMAND_BOARDS,board)||board==='personal')throw Error('Demanda inválida.');const p=await rpc(actor,'portal_demand_whatsapp',{p_card:cardId,p_item:itemId});if(typeof p.available!=='boolean'||p.available&&(p.card_id!==cardId||p.item_id!==itemId||p.board!==board||!uuid(p.assignee_id)||!/^\+[1-9][0-9]{7,14}$/.test(p.phone)))throw Error('Contato não confirmado.');return p;}
 };
}
