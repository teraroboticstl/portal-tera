import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Clock, XCircle, Shield } from 'lucide-react';

// E-mails dos admins seed (bootstrap admins) - sempre aprovados automaticamente
const SEED_ADMIN_EMAILS = ['teraroboticstl@gmail.com', 'nathannovaes16@gmail.com'];

// Níveis de acesso: user (viewer), member (editor), admin
export const ROLES = {
  USER: 'user',
  MEMBER: 'member',
  ADMIN: 'admin'
};

// Helper para verificar se pode editar (member ou admin)
export const canEdit = (user) => {
  if (!user) return false;
  // Admin do sistema (role = 'admin') SEMPRE pode editar
  if (user.role === 'admin') return true;
  // Verificar member_role para outros usuários
  const memberRole = user.member_role || 'user';
  // member_role pode ser 'admin' ou 'member' para permitir edição
  return memberRole === 'member' || memberRole === 'admin';
};

// Helper para verificar se é admin
export const isAdmin = (user) => {
  if (!user) return false;
  // Prioridade: role='admin' do sistema OU member_role='admin'
  return user.role === 'admin' || user.member_role === 'admin';
};

// Helper para obter o nível de acesso do usuário
export const getUserRole = (user) => {
  if (!user) return null;
  // Se role do sistema é 'admin', retornar 'admin'
  if (user.role === 'admin') return 'admin';
  // Caso contrário, retornar member_role (padrão: 'user')
  return user.member_role || 'user';
};

// Helper para obter label do role
export const getRoleLabel = (role) => {
  const labels = {
    user: 'Usuário (Viewer)',
    member: 'Membro (Editor)',
    admin: 'Administrador'
  };
  return labels[role] || role;
};

export default function ProtectedRoute({ 
  children, 
  requireApproved = true, 
  requireAdmin = false,
  requireMember = false 
}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [denialReason, setDenialReason] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          base44.auth.redirectToLogin(window.location.pathname);
          return;
        }
        
        let userData = await base44.auth.me();
        
        // BOOTSTRAP ADMIN: Se for um dos e-mails seed, garantir admin e approved
        if (SEED_ADMIN_EMAILS.includes(userData.email)) {
          if (userData.status !== 'approved' || userData.member_role !== 'admin') {
            await base44.auth.updateMe({ status: 'approved', member_role: 'admin' });
            userData = await base44.auth.me();
          }
        }
        
        // CRITICAL: Verificar se é admin (role='admin' OU member_role='admin')
        const userIsAdmin = userData.role === 'admin' || userData.member_role === 'admin';
        
        // BYPASS TOTAL: Admins sempre têm acesso completo, sem verificações
        if (userIsAdmin) {
          setUser(userData);
          setLoading(false);
          return;
        }
        
        // Verificar status de aprovação
        if (userData.status === 'pending') {
          setAccessDenied(true);
          setDenialReason('pending');
          setLoading(false);
          return;
        }
        
        if (userData.status === 'rejected') {
          setAccessDenied(true);
          setDenialReason('rejected');
          setLoading(false);
          return;
        }
        
        // Para não-admins, verificar se requer admin
        if (requireAdmin) {
          setAccessDenied(true);
          setDenialReason('admin_required');
          setLoading(false);
          return;
        }
        
        // Verificar se requer member (editor)
        if (requireMember && userData.member_role !== 'member') {
          setAccessDenied(true);
          setDenialReason('member_required');
          setLoading(false);
          return;
        }
        
        // Para não-admins, verificar aprovação
        if (requireApproved && userData.status !== 'approved') {
          setAccessDenied(true);
          setDenialReason('approval_required');
          setLoading(false);
          return;
        }
        
        setUser(userData);
      } catch (e) {
        console.error('Auth error:', e);
        base44.auth.redirectToLogin(window.location.pathname);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [requireApproved, requireAdmin, requireMember]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center">
        <LoadingSpinner text="Verificando acesso..." />
      </div>
    );
  }

  if (accessDenied) {
    const denialContent = {
      pending: {
        icon: <Clock className="w-12 h-12 text-yellow-500" />,
        title: 'Aguardando Aprovação',
        message: 'Seu cadastro foi recebido e está aguardando aprovação de um administrador. Você receberá acesso assim que for aprovado.',
        color: 'text-yellow-500'
      },
      rejected: {
        icon: <XCircle className="w-12 h-12 text-red-500" />,
        title: 'Acesso Negado',
        message: 'Seu cadastro foi analisado e não foi aprovado. Entre em contato com a equipe para mais informações.',
        color: 'text-red-500'
      },
      admin_required: {
        icon: <Shield className="w-12 h-12 text-[#E10600]" />,
        title: 'Área Restrita',
        message: 'Esta área é exclusiva para administradores do sistema.',
        color: 'text-[#E10600]'
      },
      member_required: {
        icon: <Shield className="w-12 h-12 text-[#E10600]" />,
        title: 'Permissão Necessária',
        message: 'Você precisa ser Membro (Editor) para realizar esta ação. Entre em contato com um administrador.',
        color: 'text-[#E10600]'
      },
      approval_required: {
        icon: <Clock className="w-12 h-12 text-yellow-500" />,
        title: 'Aprovação Necessária',
        message: 'Você precisa ser aprovado por um administrador para acessar esta área.',
        color: 'text-yellow-500'
      }
    };

    const content = denialContent[denialReason] || denialContent.approval_required;

    return (
      <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center p-4">
        <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-8 text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-[#1F222B] rounded-full flex items-center justify-center">
            {content.icon}
          </div>
          <h1 className={`text-2xl font-bold mb-4 ${content.color}`}>{content.title}</h1>
          <p className="text-[#B8BDC7] mb-6">{content.message}</p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => navigate(createPageUrl('Home'))}
              className="bg-[#E10600] hover:bg-[#E10600]/90"
            >
              Voltar ao Site
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl('Contact'))}
              className="border-[#1F222B]"
            >
              Entrar em Contato
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return React.cloneElement(children, { user });
}