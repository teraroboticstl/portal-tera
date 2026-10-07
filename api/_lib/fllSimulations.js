import { createHash, randomBytes } from 'node:crypto';
import { supabaseServer, validateUserAuth, createScopedUserSupabaseClient } from './supabaseServer.js';
import { INITIAL_ROUND_STATE, calculateScores } from '../../src/lib/fllBioglowRules.js';

export const RULES_VERSION = 'bioglow-2026-2027-v1';
const PUBLIC_FIELDS = 'id,created_at,season_theme,season_year,team_name,round_name,state_snapshot,score,breakdown,rules_version,share_token';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxNumbers = { m02_seedsReleased:3, m04_leavesRemoved:2, m06_leafFragments:3, m07_connections:2, m14_seedsInStation:5, m14_seedsTouchingMat:5, m16_precisionTokens:6 };
const enums = { m05_rootState:['none','partial','complete'], m15_ecologicalBonus:['none','canopy','skylight','compost'] };
function invalid(message, status = 422) { return Object.assign(new Error(message), { status }); }
export function normalizeSimulationState(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw invalid('Respostas da simulação inválidas.');
  const result = {};
  for (const [key, fallback] of Object.entries(INITIAL_ROUND_STATE)) {
    const value = input[key] ?? fallback;
    if (typeof value !== typeof fallback) throw invalid(`Resposta inválida: ${key}.`);
    if (typeof value === 'number' && (!Number.isInteger(value) || value < 0 || value > maxNumbers[key])) throw invalid(`Quantidade inválida: ${key}.`);
    if (enums[key] && !enums[key].includes(value)) throw invalid(`Opção inválida: ${key}.`);
    if (typeof value === 'string' && value.length > 120) throw invalid('Nome de equipe ou round muito longo.');
    result[key] = typeof value === 'string' ? value.trim() : value;
  }
  if (!result.teamName) throw invalid('Informe o nome da equipe.');
  result.roundName ||= 'Round 1';
  return result;
}

export function buildSimulationRecord(body, user, season) {
  if (!UUID.test(body.requestId || '')) throw invalid('Identificador de salvamento inválido.');
  const state = normalizeSimulationState(body.state);
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!user && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)) throw invalid('Informe um e-mail válido.');
  if (!user && body.portfolio) throw invalid('Faça login para registrar uma iteração no portfólio.', 403);
  const title = body.portfolio ? String(body.iterationTitle || '').trim() : null;
  if (body.portfolio && (!title || title.length > 120)) throw invalid('Informe a identificação da iteração (até 120 caracteres).');
  const notes = body.portfolio ? String(body.notes || '').trim() : null;
  if (notes?.length > 2000) throw invalid('As observações devem ter até 2000 caracteres.');
  const { total, breakdown } = calculateScores(state);
  const record = { request_id:body.requestId, user_id:user?.id || null, email:user ? null : email,
    season_id:season.id, season_theme:season.theme, season_year:season.year,
    team_name:state.teamName, round_name:state.roundName, state_snapshot:state,
    score:total, breakdown, rules_version:RULES_VERSION, is_portfolio:Boolean(body.portfolio), iteration_title:title, notes,
    origin:user ? 'member' : 'guest' };
  record.payload_hash = createHash('sha256').update(JSON.stringify(record)).digest('hex');
  record.share_token = body.share === true ? randomBytes(32).toString('hex') : null;
  return record;
}

export async function handleFllSimulations(req, res, getSeason) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET' && req.query?.share) {
      if (!/^[0-9a-f]{64}$/.test(req.query.share)) throw invalid('Link inválido.', 404);
      const { data, error } = await supabaseServer.from('fll_round_simulations').select(PUBLIC_FIELDS).eq('share_token', req.query.share).maybeSingle();
      if (error) throw invalid('Não foi possível consultar a simulação.', 503);
      if (!data) throw invalid('Simulação não encontrada.', 404);
      return res.status(200).json({ simulation:data });
    }
    let user = null;
    if (req.headers?.authorization) {
      try { user = await validateUserAuth(req.headers.authorization); }
      catch { throw invalid('Sua sessão expirou. Entre novamente.', 401); }
      if (!user.profile?.is_admin) {
        const token = req.headers.authorization.replace(/^Bearer\s+/i, '');
        const {data:profile} = await createScopedUserSupabaseClient(token).from('profiles').select('role,member_role').eq('id',user.id).maybeSingle();
        if (profile?.role === 'admin' || profile?.member_role === 'admin') user.profile = {...user.profile,is_admin:true};
      }
    }
    if (req.method === 'GET') {
      if (!user) throw invalid('Faça login para consultar seu histórico.', 401);
      const admin = req.query?.scope === 'admin';
      if (admin && !user.profile?.is_admin) throw invalid('Consulta restrita à administração.', 403);
      let query = supabaseServer.from('fll_round_simulations').select(admin ? `${PUBLIC_FIELDS},user_id,origin,is_tera,is_portfolio,iteration_title,notes,fll_simulation_contacts(email)` : `${PUBLIC_FIELDS},is_portfolio,iteration_title,notes`).order('created_at', {ascending:false}).limit(100);
      if (!admin) query = query.eq('user_id', user.id);
      const {data,error} = await query;
      if (error) throw invalid('Não foi possível carregar o histórico.', 503);
      return res.status(200).json({ simulations:data });
    }
    if (req.method !== 'POST') { res.setHeader('Allow','GET, POST'); throw invalid('Método não permitido.',405); }
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    if (Buffer.byteLength(raw) > 24000) throw invalid('Simulação muito grande.',413);
    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch { throw invalid('Dados inválidos.',400); }
    if (body?.action === 'classify') {
      if (!user?.profile?.is_admin) throw invalid('Apenas administradores classificam registros Tera.',403);
      if (!UUID.test(body.id || '') || typeof body.isTera !== 'boolean') throw invalid('Classificação inválida.');
      const {error} = await supabaseServer.from('fll_round_simulations').update({is_tera:body.isTera}).eq('id',body.id);
      if (error) throw invalid('Não foi possível classificar o registro.',503);
      return res.status(200).json({success:true});
    }
    if (!body) throw invalid('Dados ausentes.',400);
    const season = await getSeason();
    if (season.theme !== 'BIOGLOW') throw invalid('Estas regras correspondem à temporada BIOGLOW.');
    const record = buildSimulationRecord(body,user,season);
    // RPC transacional: contato e round são gravados juntos; retries não duplicam.
    const { data, error } = await supabaseServer.rpc('save_fll_round_simulation', {p_record:record});
    if (error) {
      if (error.message?.includes('SIMULATION_RATE_LIMIT')) throw invalid('Limite de salvamentos atingido. Tente novamente mais tarde.',429);
      if (error.message?.includes('SIMULATION_CONFLICT')) throw invalid('Este identificador já foi usado para outro resultado.',409);
      throw invalid('Não foi possível salvar no Supabase. Seus dados continuam no rascunho.',503);
    }
    const safe = Object.fromEntries(PUBLIC_FIELDS.split(',').map(key=>[key,data[key]]));
    return res.status(200).json({simulation:{...safe,is_portfolio:data.is_portfolio,iteration_title:data.iteration_title}});
  } catch (error) {
    return res.status(error.status || 503).json({error:error.status ? error.message : 'Serviço de simulações indisponível.'});
  }
}
