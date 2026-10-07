import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://dqmagpxjsdelpwuofxzz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_SNMwsaz2myKNUpcyM18xjw_mAZOMKtd';

// Cliente Supabase server-side com privilégios de execução
export const supabaseServer = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

/**
 * Cria um cliente Supabase com o token do usuário para operações respeitando RLS
 */
export function createScopedUserSupabaseClient(token) {
  if (!token) return supabaseServer;
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
}

const SEED_ADMIN_EMAILS = ['teraroboticstl@gmail.com', 'nathannovaes16@gmail.com'];

/**
 * Valida o token JWT do Supabase Auth enviado no cabeçalho Authorization
 * @param {string} authHeader - Cabeçalho "Bearer <token>"
 * @returns {Promise<{ user: object, profile: object }>}
 */
export async function validateUserAuth(authHeaderOrToken) {
  if (!authHeaderOrToken || typeof authHeaderOrToken !== 'string') {
    throw new Error('Cabeçalho de autorização ausente ou malformatado.');
  }

  let token = authHeaderOrToken.trim();
  if (token.startsWith('Bearer ')) {
    token = token.substring(7).trim();
  }

  if (!token) {
    throw new Error('Token JWT ausente na requisição.');
  }

  // 1. Validação estrita do JWT via Supabase Auth server-side
  const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);

  if (authError || !user) {
    throw new Error(`Autenticação recusada pelo Supabase: ${authError?.message || 'Token inválido ou expirado'}.`);
  }

  // 2. Consulta do perfil associado
  const { data: profile } = await supabaseServer
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const isSeedAdmin = user.email && SEED_ADMIN_EMAILS.includes(user.email.toLowerCase());
  const role = profile?.role || (isSeedAdmin ? 'admin' : 'aluno');
  const memberRole = profile?.member_role || (role === 'admin' || isSeedAdmin ? 'admin' : role === 'mentor' ? 'member' : 'user');
  const status = profile?.status || (role === 'admin' || isSeedAdmin ? 'approved' : 'pending');

  const { data: access, error: accessError } = await createScopedUserSupabaseClient(token).rpc('ava_identity');
  const fullUser = {
    ...user,
    profile: {
      ...(profile || {}),
      role,
      member_role: memberRole,
      status,
      is_admin: role === 'admin' || memberRole === 'admin' || isSeedAdmin,
      portal_internal: !accessError && access?.portal_internal === true,
      ava_status: access?.ava_status || 'pending',
      ava_admin: !accessError && access?.ava_admin === true
    }
  };

  return fullUser;
}

/**
 * Valida se o usuário tem permissão para o contexto de upload solicitado
 * @param {object} user - Usuário com perfil validado
 * @param {string} context - Contexto do upload (products, projects, robots, etc.)
 */
export function validateUploadPermission(user, context) {
  const isAdmin = user.profile.is_admin;
  if (context === 'ava') {
    if (!isAdmin && !user.profile.ava_admin) throw new Error('Upload restrito à administração do AVA.');
    return true;
  }
  const isApproved = (user.profile.status === 'approved' && user.profile.portal_internal !== false) || isAdmin;

  if (!isApproved) {
    throw new Error('Acesso negado: seu cadastro ainda aguarda aprovação da equipe.');
  }

  // Contextos puramente administrativos
  const adminOnlyContexts = ['products', 'robots', 'sponsors', 'featured-news', 'fll-missions', 'fll-audio', 'test'];
  if (adminOnlyContexts.includes(context) && !isAdmin) {
    throw new Error(`Permissão insuficiente: o contexto "${context}" exige privilégios de administrador.`);
  }
  // Projetos podem receber mídias de qualquer usuário aprovado na Área Interna.

  return true;
}
