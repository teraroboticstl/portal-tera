import { supabase } from './supabaseClient';
import { adaptedEntities } from './adapters/base44ToSupabaseAdapter';

/**
 * SHIM DE COMPATIBILIDADE - PORTAL TERA
 * 
 * Este arquivo foi reescrito para eliminar COMPLETAMENTE a dependência do SDK `@base44/sdk`.
 * Todas as chamadas herdadas feitas por componentes React e hooks de consulta ao objeto `base44`
 * são interceptadas e mapeadas diretamente para as APIs nativas do Supabase (Auth, Database e Storage).
 * 
 * Isso possibilita que o Portal Tera continue compilando sem erros e com todas as páginas 100%
 * operacionais durante o processo de migração definitiva.
 */

// Mock de logs silencioso para o NavigationTracker
const appLogsShim = {
  async logUserInApp(pageName) {
    // Apenas loga no console para desenvolvimento, sem dependências
    console.log(`[Navigation Tracker] Membro visualizou a página: ${pageName}`);
    return { success: true };
  }
};

// Integrações de arquivos mapeadas para o Supabase Storage
const integrationsShim = {
  Core: {
    /**
     * Faz upload de arquivos diretamente no Supabase Storage.
     * Mapeia para a assinatura do SDK antigo para não quebrar as chamadas existentes.
     */
    async UploadFile({ file, bucketName = 'gallery' }) {
      console.log(`[Supabase Storage] Iniciando upload de ${file.name} para o bucket "${bucketName}"...`);
      
      // Gerar um nome de arquivo único para evitar colisões
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('[Supabase Storage] Erro ao realizar upload:', error);
        throw error;
      }

      // Buscar a URL pública do arquivo enviado
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      console.log('[Supabase Storage] Upload concluído com sucesso. URL pública:', publicUrl);
      return { file_url: publicUrl };
    }
  }
};

// E-mails dos administradores seed
const SEED_ADMIN_EMAILS = ['teraroboticstl@gmail.com', 'nathannovaes16@gmail.com'];

// Autenticação integrada diretamente com Supabase Auth e Profiles
const authShim = {
  /**
   * Retorna o usuário logado atualmente no Supabase com seu perfil completo.
   */
  async me() {
    try {
      // 1. Tentar obter o usuário da sessão em cache local primeiro
      const { data: { session } } = await supabase.auth.getSession();
      let user = session?.user;

      if (!user) {
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        if (error || !authUser) return null;
        user = authUser;
      }

      // 2. Buscar dados complementares da tabela de perfis (profiles)
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const isSeedAdmin = user.email && SEED_ADMIN_EMAILS.includes(user.email.toLowerCase());
      const role = profile?.role || (isSeedAdmin ? 'admin' : 'aluno');
      const memberRole = profile?.member_role || (role === 'admin' || isSeedAdmin ? 'admin' : role === 'mentor' ? 'member' : 'user');
      const status = profile?.status || (role === 'admin' || isSeedAdmin ? 'approved' : 'pending');

      return {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Membro do Portal',
        avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
        category: profile?.category || 'Geral',
        program: profile?.program || 'Geral',
        created_at: user.created_at,
        ...(profile || {}),
        role,
        member_role: memberRole,
        status
      };
    } catch (err) {
      console.warn('[Supabase Auth Shim] Falha ao recuperar perfil do usuário:', err);
      return null;
    }
  },

  /**
   * Verifica se existe um usuário autenticado.
   */
  async isAuthenticated() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    } catch {
      return false;
    }
  },

  /**
   * Atualiza os dados cadastrais do perfil do próprio usuário no Supabase.
   */
  async updateMe(payload) {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user || (await supabase.auth.getUser()).data?.user;
    if (!user) throw new Error('Usuário não autenticado no Supabase');

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[Supabase Auth Shim] Erro ao atualizar perfil:', error);
      throw error;
    }
    return data;
  },

  /**
   * Executa o logout no Supabase Auth.
   */
  async logout(redirectTo = '/') {
    console.log('[Supabase Auth Shim] Executando logout...');
    await supabase.auth.signOut();
    const destination = !redirectTo || redirectTo === '/Home' ? '/' : redirectTo;
    window.location.href = destination;
  },

  /**
   * Redireciona para o login do Google OAuth via Supabase.
   */
  async redirectToLogin(redirectTo = window.location.href) {
    console.log('[Supabase Auth Shim] Redirecionando para login com Google...');
    
    const targetUrl = redirectTo && redirectTo.startsWith('http') 
      ? redirectTo 
      : `${window.location.origin}${!redirectTo || redirectTo === '/' ? '' : (redirectTo.startsWith('/') ? redirectTo : '/' + redirectTo)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: targetUrl
      }
    });

    if (error) {
      console.error('[Supabase Auth Shim] Erro ao iniciar login com Google:', error.message);
      throw error;
    }
  }
};

// Exportar o cliente fake de compatibilidade apontado para o Supabase
export const base44 = {
  entities: adaptedEntities,
  auth: authShim,
  appLogs: appLogsShim,
  integrations: integrationsShim
};
