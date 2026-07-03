import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Shield, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function SetupAdmin() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);

  // Verificar se já existe algum admin no sistema
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['check-admins'],
    queryFn: () => base44.entities.User.list(),
  });

  const existingAdmin = users.find(u => u.role === 'admin' || u.member_role === 'admin');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          base44.auth.redirectToLogin(window.location.pathname);
          return;
        }
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin(window.location.pathname);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleBecomeAdmin = async () => {
    if (!user) return;
    
    setPromoting(true);
    try {
      // Atualizar o próprio usuário para approved e admin
      await base44.auth.updateMe({ status: 'approved', member_role: 'admin' });
      
      toast.success('Você agora é o administrador do sistema!');
      
      // Redirecionar para o painel admin
      setTimeout(() => {
        navigate(createPageUrl('AdminPanel'));
      }, 1500);
    } catch (e) {
      console.error('Erro ao promover admin:', e);
      toast.error('Erro ao configurar admin. Tente novamente.');
    } finally {
      setPromoting(false);
    }
  };

  if (loading || loadingUsers) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center">
        <LoadingSpinner text="Verificando sistema..." />
      </div>
    );
  }

  // Se já existe um admin, bloquear acesso
  if (existingAdmin) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#111217] border border-[#1F222B] rounded-2xl p-8 text-center max-w-md"
        >
          <div className="w-16 h-16 mx-auto mb-6 bg-green-500/10 rounded-full flex items-center justify-center">
            <Check className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-4 text-[#F5F7FA]">Sistema Configurado</h1>
          <p className="text-[#B8BDC7] mb-6">
            O sistema já possui um administrador configurado. 
            Esta página não está mais disponível.
          </p>
          <Button
            onClick={() => navigate(createPageUrl('Home'))}
            className="bg-[#E10600] hover:bg-[#E10600]/90"
          >
            Ir para o Site
          </Button>
        </motion.div>
      </div>
    );
  }

  // Se o usuário já é admin
  if (user?.role === 'admin') {
    return (
      <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#111217] border border-[#1F222B] rounded-2xl p-8 text-center max-w-md"
        >
          <div className="w-16 h-16 mx-auto mb-6 bg-[#E10600]/10 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-[#E10600]" />
          </div>
          <h1 className="text-2xl font-bold mb-4 text-[#F5F7FA]">Você já é Admin!</h1>
          <p className="text-[#B8BDC7] mb-6">
            Você já possui privilégios de administrador no sistema.
          </p>
          <Button
            onClick={() => navigate(createPageUrl('AdminPanel'))}
            className="bg-[#E10600] hover:bg-[#E10600]/90"
          >
            Ir para o Painel Admin
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#111217] border border-[#1F222B] rounded-2xl p-8 max-w-lg"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#E10600] to-[#E10600]/50 rounded-2xl flex items-center justify-center">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-[#E10600]">Setup</span> Inicial
          </h1>
          <p className="text-[#B8BDC7]">
            Configure o primeiro administrador do sistema TeraRobotics
          </p>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-500 mb-1">Atenção</h3>
              <p className="text-sm text-[#B8BDC7]">
                O sistema ainda não possui um administrador. 
                Clique no botão abaixo para se tornar o primeiro admin.
                Esta ação só pode ser feita uma vez.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#0B0B0D] border border-[#1F222B] rounded-xl p-4 mb-6">
          <h3 className="font-medium mb-3">Usuário atual:</h3>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#E10600] flex items-center justify-center text-white font-bold text-lg">
              {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-[#F5F7FA]">{user?.full_name || 'Usuário'}</p>
              <p className="text-sm text-[#B8BDC7]">{user?.email}</p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleBecomeAdmin}
          disabled={promoting}
          className="w-full bg-[#E10600] hover:bg-[#E10600]/90 py-6 text-lg"
        >
          {promoting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Configurando...
            </>
          ) : (
            <>
              <Shield className="w-5 h-5 mr-2" />
              Tornar-me Administrador
            </>
          )}
        </Button>

        <p className="text-xs text-[#B8BDC7] text-center mt-4">
          Após se tornar admin, você poderá aprovar outros membros 
          e gerenciar todo o sistema.
        </p>
      </motion.div>
    </div>
  );
}