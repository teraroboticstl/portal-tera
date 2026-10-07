import { validateUserAuth, createScopedUserSupabaseClient, supabaseServer } from '../_lib/supabaseServer.js';
import { validateContents } from '../../src/lib/avaRules.js';

const messages={AVA_UNAUTHENTICATED:'Faça login com sua conta Google.',AVA_ACCESS_DENIED:'Seu acesso ao AVA aguarda autorização ou foi bloqueado.',AVA_ADMIN_REQUIRED:'Ação restrita à administração do AVA.',AVA_ENROLLMENT_REQUIRED:'Matricule-se em uma trilha autorizada para acessar o módulo.',AVA_PAYLOAD_TOO_LARGE:'Conteúdo excede o tamanho permitido.'};
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  try {
    if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Método não permitido.'});
    if(req.method==='GET' && req.query?.view==='catalog') {
      const {data,error}=await supabaseServer.rpc('ava_catalog');
      if(error)throw error;
      return res.status(200).json({data});
    }
    try {await validateUserAuth(req.headers?.authorization);} catch {return res.status(401).json({error:'Faça login novamente para continuar.'});}
    const token=req.headers.authorization.replace(/^Bearer\s+/i,'');
    const db=createScopedUserSupabaseClient(token);
    let result;
    if(req.method==='GET')result=await db.rpc('ava_read',{p_view:req.query?.view || 'dashboard',p_id:req.query?.id || null});
    else {
      let body;
      try {body=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch{return res.status(400).json({error:'Dados inválidos.'});}
      if(!body || Buffer.byteLength(JSON.stringify(body))>150000)return res.status(413).json({error:'Conteúdo excede o tamanho permitido.'});
      if(body.action==='save_module')validateContents(body.data?.contents);
      result=await db.rpc('ava_mutate',{p_action:body.action,p_data:body.data || {}});
    }
    if(result.error)throw result.error;
    return res.status(200).json({data:result.data});
  } catch(error) {
    const message=error.message || '';
    const key=Object.keys(messages).find(k=>message.includes(k));
    const infra=['42P01','42883','42501','PGRST202','PGRST205'].includes(error.code);
    const validation=error.code==='P0001' || /^(22|23)/.test(error.code || '') || !error.code;
    return res.status(key ? 403 : infra ? 503 : validation ? 422 : 503).json({error:key?messages[key]:infra?'AVA temporariamente indisponível. Verifique a implantação do banco.':validation?message:'Não foi possível concluir esta operação.'});
  }
}
