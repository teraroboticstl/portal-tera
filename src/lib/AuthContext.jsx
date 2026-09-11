import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false); // No public settings required for Supabase
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({ id: 'supabase-portal', public_settings: {} });

  useEffect(() => {
    // 1. Verificar a sessão atual na inicialização
    checkUserSession();

    // 2. Escutar mudanças no estado de autenticação (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Supabase Auth] Evento recebido: ${event}`);
      if (session?.user) {
        await fetchAndSetProfile(session.user);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchAndSetProfile = async (authUser) => {
    try {
      setIsLoadingAuth(true);
      // Buscar dados do perfil na tabela public.profiles
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 é "no rows returned", o que pode ocorrer se a trigger demorar
        console.warn('[AuthContext] Perfil não encontrado ou erro na tabela profiles:', error);
      }

      setUser({
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name || authUser.user_metadata?.full_name || 'Membro do Portal',
        avatar_url: profile?.avatar_url || authUser.user_metadata?.avatar_url || '',
        role: profile?.role || 'aluno',
        category: profile?.category || 'Geral',
        created_at: authUser.created_at
      });
      setIsAuthenticated(true);
    } catch (err) {
      console.error('[AuthContext] Falha ao processar perfil do usuário:', err);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const checkUserSession = async () => {
    try {
      setIsLoadingAuth(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[AuthContext] Erro ao buscar sessão do Supabase:', error);
        setAuthError({
          type: 'auth_required',
          message: 'Necessário realizar autenticação'
        });
        setIsLoadingAuth(false);
        return;
      }

      if (session?.user) {
        await fetchAndSetProfile(session.user);
      } else {
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('[AuthContext] Falha ao checar estado inicial de autenticação:', error);
      setIsLoadingAuth(false);
    }
  };

  const logout = async (shouldRedirect = true) => {
    try {
      console.log('[AuthContext] Executando logout no Supabase Auth...');
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
      
      if (shouldRedirect) {
        window.location.href = window.location.origin;
      }
    } catch (err) {
      console.error('[AuthContext] Erro ao realizar logout:', err);
    }
  };

  const navigateToLogin = async () => {
    try {
      console.log('[AuthContext] Redirecionando para login com Google...');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
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
