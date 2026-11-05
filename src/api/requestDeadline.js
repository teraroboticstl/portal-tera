export async function requestDeadline(operation,ms=60000) {
 const controller=new AbortController();let timer;
 try {return await Promise.race([Promise.resolve().then(()=>operation(controller.signal)),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('A conexão demorou demais. Seu texto foi preservado. Antes de reenviar, confira se o registro apareceu na lista.'));},ms);})]);}
 finally {clearTimeout(timer);}
}
