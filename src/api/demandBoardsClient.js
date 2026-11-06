export const DEMAND_BOARDS = Object.freeze({personal:'Minhas demandas',FRC:'Demandas FRC',FTC:'Demandas FTC',FLL:'Demandas FLL',OBR:'Demandas OBR'});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validDemandCard(card,actor,board) {
  return card && UUID.test(card.id||'') && Object.hasOwn(DEMAND_BOARDS,card.board) && card.board===board
    && UUID.test(card.owner_id||'') && (board!=='personal'||card.owner_id===actor)
    && typeof card.title==='string' && card.title.trim().length>0 && card.title.length<=160
    && Number.isSafeInteger(card.revision) && card.revision>=0 && typeof card.archived==='boolean'
    && Array.isArray(card.items) && card.items.length<=80
    && new Set(card.items.map(i=>i?.id)).size===card.items.length
    && card.items.every(i=>UUID.test(i?.id||'')&&typeof i.text==='string'&&i.text.trim().length>0&&i.text.length<=500&&typeof i.done==='boolean');
}
export function createDemandBoardsClient(client,{timeoutMs=20000}={}) {
  async function rpc(actor,name,args) {
    const controller=new AbortController();
    let timer;
    try {
      const operation=(async()=>{
      const before=await client.auth.getUser();
      if(controller.signal.aborted||!actor||before.error||before.data?.user?.id!==actor)throw new Error();
      let query=client.rpc(name,args);
      if(typeof query.abortSignal==='function')query=query.abortSignal(controller.signal);
      const response=await query;
      if(controller.signal.aborted)throw new Error();
      const after=await client.auth.getUser();
      if(response.error) {
        if(String(response.error.message).includes('DEMAND_CONFLICT'))throw new Error('CONFLICT');
        throw new Error();
      }
      if(after.error||after.data?.user?.id!==actor||response.data?.actor!==actor)throw new Error();
      return response.data;
      })();
      return await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('TIMEOUT'));},timeoutMs);})]);
    }catch(error){throw new Error(error.message==='CONFLICT'?'Este cartão mudou em outro dispositivo. Atualize o quadro antes de tentar novamente.':'Não foi possível confirmar o quadro e suas permissões. Atualize e tente novamente.');}
    finally{clearTimeout(timer);}
  }
  return {
    async read(actor,board='personal',archived=false,after=null) {
      if(!Object.hasOwn(DEMAND_BOARDS,board)||typeof archived!=='boolean'||(after!==null&&!UUID.test(after)))throw new Error('Quadro inválido.');
      const packet=await rpc(actor,'portal_demands_read',{p_board:board,p_archived:archived,p_after:after});
      if(packet.board!==board||!Array.isArray(packet.boards)||!packet.boards.includes(board)
        ||packet.boards.some(b=>!Object.hasOwn(DEMAND_BOARDS,b))||typeof packet.can_edit!=='boolean'
        ||!Array.isArray(packet.items)||packet.items.length>50||typeof packet.has_more!=='boolean'
        ||packet.items.some(c=>!validDemandCard(c,actor,board)||c.archived!==archived)
        ||new Set(packet.items.map(c=>c.id)).size!==packet.items.length
        ||(packet.has_more&&(!UUID.test(packet.next_cursor||'')||packet.next_cursor===after)))throw new Error('O quadro retornou dados inválidos. Atualize a página.');
      return packet;
    },
    async write(actor,action,payload,board) {
      const packet=await rpc(actor,'portal_demands_write',{p_action:action,p_data:payload});
      if(!validDemandCard(packet.card,actor,board))throw new Error('Não foi possível confirmar a alteração. Atualize o quadro.');
      return packet.card;
    },
  };
}
