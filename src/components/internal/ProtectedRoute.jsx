import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Button } from "@/components/ui/button";
import { Clock, XCircle, Shield, LogIn } from 'lucide-react';

// E-mails dos admins seed (bootstrap admins) - sempre aprovados automaticamente
export const SEED_ADMIN_EMAILS = ['teraroboticstl@gmail.com', 'nathannovaes16@gmail.com'];

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
  // Seed admin sempre pode editar
  if (user.email && SEED_ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
  // Verificar member_role para outros usuários
  const memberRole = user.member_role || 'user';
  // member_role pode ser 'admin' ou 'member' para permitir edição
  return memberRole === 'member' || memberRole === 'admin';
};

// Helper para verificar se é admin
export const isAdmin = (user) => {
  if (!user) return false;
  // Seed admin
  if (user.email && SEED_ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
  // Prioridade: role='admin' do sistema OU member_role='admin'
  return user.role === 'admin' || user.member_role === 'admin';
};

// Helper para obter o nível de acesso do usuário
export const getUserRole = (user) => {
  if (!user) return null;
  if (user.email && SEED_ADMIN_EMAILS.includes(user.email.toLowerCase())) return 'admin';
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
  const { user, isAuthenticated, isLoadingAuth, navigateToLogin } = useAuth();
  const navigate = useNavigate();

  // 1. Enquanto o AuthContext estiver restaurando a sessão ou carregando o perfil:
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center">
        <LoadingSpinner text="Verificando acesso..." />
      </div>
    );
  }

  // 2. Se a sessão finalizou de carregar e o usuário não está logado:
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center p-4">
        <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-8 text-center max-w-md w-full shadow-2xl">
          <div className="w-20 h-20 mx-auto mb-6 bg-[#1F222B] rounded-full flex items-center justify-center">
            <Shield className="w-10 h-10 text-[#E10600]" />
          </div>
          <h1 className="text-2xl font-bold mb-3 text-[#F5F7FA]">Área Interna Tera</h1>
          <p className="text-[#B8BDC7] mb-6 text-sm leading-relaxed">
            Esta área é restrita aos membros da equipe. Faça login com sua conta Google autorizada para continuar.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => navigateToLogin(window.location.href)}
              className="bg-[#E10600] hover:bg-[#E10600]/90 text-white font-bold flex items-center justify-center gap-2 h-11"
            >
              <LogIn className="w-4 h-4" /> Entrar com o Google
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl('Home'))}
              className="border-[#1F222B] text-[#B8BDC7] hover:text-[#F5F7FA] hover:bg-[#1F222B] h-11"
            >
              Voltar ao Site
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Usuário autenticado: verificar se é admin (role, member_role ou seed admin)
  const isSeedAdmin = user.email && SEED_ADMIN_EMAILS.includes(user.email.toLowerCase());
  const userIsAdmin = user.role === 'admin' || user.member_role === 'admin' || isSeedAdmin;

  // BYPASS TOTAL: Admins sempre têm acesso completo e irrestrito
  if (userIsAdmin) {
    return React.cloneElement(children, { user });
  }

  // 4. Verificação de status para usuários comuns
  let denialReason = null;
  if (user.status === 'pending') {
    denialReason = 'pending';
  } else if (user.status === 'rejected') {
    denialReason = 'rejected';
  } else if (requireAdmin) {
    denialReason = 'admin_required';
  } else if (requireMember && user.member_role !== 'member' && user.role !== 'mentor') {
    denialReason = 'member_required';
  } else if (requireApproved && user.status !== 'approved') {
    denialReason = 'approval_required';
  }

  if (denialReason) {
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
        <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-8 text-center max-w-md w-full shadow-2xl">
          <div className="w-20 h-20 mx-auto mb-6 bg-[#1F222B] rounded-full flex items-center justify-center">
            {content.icon}
          </div>
          <h1 className={`text-2xl font-bold mb-4 ${content.color}`}>{content.title}</h1>
          <p className="text-[#B8BDC7] mb-6 text-sm leading-relaxed">{content.message}</p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => navigate(createPageUrl('Home'))}
              className="bg-[#E10600] hover:bg-[#E10600]/90 text-white font-bold h-11"
            >
              Voltar ao Site
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl('Contact'))}
              className="border-[#1F222B] text-[#B8BDC7] hover:text-[#F5F7FA] hover:bg-[#1F222B] h-11"
            >
              Entrar em Contato
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Acesso concedido
  return React.cloneElement(children, { user });
}