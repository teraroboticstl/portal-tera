import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

// E-mails dos administradores seed
export const SEED_ADMIN_EMAILS = ['teraroboticstl@gmail.com', 'nathannovaes16@gmail.com'];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({ id: 'supabase-portal', public_settings: {} });

  const fetchAndSetProfile = useCallback(async (authUser) => {
    try {
      setIsLoadingAuth(true);
      // Buscar dados do perfil na tabela public.profiles
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        console.warn('[AuthContext] Aviso ao buscar perfil na tabela profiles:', error.message);
      }

      const isSeedAdmin = authUser.email && SEED_ADMIN_EMAILS.includes(authUser.email.toLowerCase());
      const role = profile?.role || (isSeedAdmin ? 'admin' : 'aluno');
      const memberRole = profile?.member_role || (role === 'admin' || isSeedAdmin ? 'admin' : role === 'mentor' ? 'member' : 'user');
      const status = profile?.status || (role === 'admin' || isSeedAdmin ? 'approved' : 'pending');

      const userProfile = {
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Membro do Portal',
        avatar_url: profile?.avatar_url || authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || '',
        category: profile?.category || 'Geral',
        program: profile?.program || 'Geral',
        created_at: authUser.created_at,
        ...(profile || {}),
        role,
        member_role: memberRole,
        status
      };

      setUser(userProfile);
      setIsAuthenticated(true);
      setAuthError(null);
      return userProfile;
    } catch (err) {
      console.error('[AuthContext] Falha ao processar perfil do usuário:', err);
      setUser(null);
      setIsAuthenticated(false);
      return null;
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  const checkUserSession = useCallback(async () => {
    try {
      setIsLoadingAuth(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('[AuthContext] Sessão não encontrada ou expirada:', error.message);
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        return;
      }

      if (session?.user) {
        await fetchAndSetProfile(session.user);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('[AuthContext] Falha ao checar estado inicial de autenticação:', error);
      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
    }
  }, [fetchAndSetProfile]);

  useEffect(() => {
    // 1. Verificar a sessão atual na inicialização
    checkUserSession();

    // 2. Escutar mudanças no estado de autenticação (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Supabase Auth] Evento recebido: ${event}`);
      if (session?.user) {
        await fetchAndSetProfile(session.user);
      } else if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkUserSession, fetchAndSetProfile]);

  const logout = async (shouldRedirect = true) => {
    try {
      console.log('[AuthContext] Executando logout no Supabase Auth...');
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
      
      if (shouldRedirect) {
        window.location.href = '/';
      }
    } catch (err) {
      console.error('[AuthContext] Erro ao realizar logout:', err);
    }
  };

  const navigateToLogin = async (redirectTo = window.location.href) => {
    try {
      console.log('[AuthContext] Redirecionando para login com Google...');
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
        throw error;
      }
    } catch (err) {
      console.error('[AuthContext] Falha ao redirecionar para login:', err.message);
      setAuthError({
        type: 'auth_failed',
        message: 'Falha ao iniciar autenticação com o Google'
      });
    }
  };

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      return await fetchAndSetProfile(session.user);
    }
    return null;
  };

  const checkAppState = async () => {
    await checkUserSession();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      refreshProfile,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
