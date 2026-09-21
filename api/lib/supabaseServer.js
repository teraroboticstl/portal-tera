import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://dqmagpxjsdelpwuofxzz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_SNMwsaz2myKNUpcyM18xjw_mAZOMKtd';

// Cliente Supabase server-side
export const supabaseServer = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

const SEED_ADMIN_EMAILS = ['teraroboticstl@gmail.com', 'nathannovaes16@gmail.com'];

/**
 * Valida o token JWT do Supabase Auth enviado no cabeçalho Authorization
 * @param {string} authHeader - Cabeçalho "Bearer <token>"
 * @returns {Promise<{ user: object, profile: object }>}
 */
export async function validateUserAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Cabeçalho de autorização ausente ou malformatado (esperado: "Bearer <token>").');
  }

  const token = authHeader.split(' ')[1]?.trim();
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

  const fullUser = {
    ...user,
    profile: {
      ...(profile || {}),
      role,
      member_role: memberRole,
      status,
      is_admin: role === 'admin' || isSeedAdmin
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
  const isApproved = user.profile.status === 'approved' || isAdmin;

  if (!isApproved) {
    throw new Error('Acesso negado: seu cadastro ainda aguarda aprovação da equipe.');
  }

  // Contextos puramente administrativos
  const adminOnlyContexts = ['products', 'robots', 'sponsors', 'featured-news', 'test'];
  if (adminOnlyContexts.includes(context) && !isAdmin) {
    throw new Error(`Permissão insuficiente: o contexto "${context}" exige privilégios de administrador.`);
  }

  // Contextos editoriais de projetos
  if (context === 'projects' && !isAdmin && user.profile.member_role !== 'member') {
    throw new Error('Permissão insuficiente para upload de mídias de projetos.');
  }

  return true;
}
