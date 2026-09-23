import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Users, Clock, Check, X, Shield, Search, 
  AlertTriangle, Filter, Loader2 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Badge from '@/components/common/Badge';

export default function UsersManagement() {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmAction, setConfirmAction] = useState(null); // { user, action: 'admin'|'reject'|'reactivate', targetRole?: string }

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list('-created_date'),
  });

  const updateUser = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setConfirmAction(null);
      if (variables.data.status === 'rejected') {
        toast.success('Usuário desativado/rejeitado com sucesso.');
      } else if (variables.data.member_role === 'admin') {
        toast.success('Permissão de Administrador concedida com sucesso.');
      } else {
        toast.success('Usuário atualizado com sucesso!');
      }
    },
    onError: (err) => {
      console.error('Erro ao atualizar usuário:', err);
      toast.error('Erro ao atualizar usuário: ' + (err.message || 'Verifique as permissões de acesso.'));
    }
  });

  // Separação por status
  const pendingUsers = users.filter(u => !u.status || u.status === 'pending');
  const approvedUsers = users.filter(u => u.status === 'approved');
  const rejectedUsers = users.filter(u => u.status === 'rejected');

  // Filtro de aprovados por busca e perfil
  const filteredApproved = approvedUsers.filter(u => {
    const matchesRole = roleFilter === 'all' || (u.member_role || 'user') === roleFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      (u.full_name && u.full_name.toLowerCase().includes(query)) ||
      (u.email && u.email.toLowerCase().includes(query)) ||
      (u.program && u.program.toLowerCase().includes(query));
    return matchesRole && matchesSearch;
  });

  const getRoleLabel = (role) => {
    const labels = { user: 'Viewer', member: 'Editor', admin: 'Admin' };
    return labels[role] || 'Viewer';
  };

  const getRoleBadgeVariant = (role) => {
    const variants = { user: 'default', member: 'success', admin: 'accent' };
    return variants[role] || 'default';
  };

  const handleRoleChange = (targetUser, newMemberRole) => {
    let newRole = 'aluno';
    if (newMemberRole === 'admin') newRole = 'admin';
    else if (newMemberRole === 'member') newRole = 'mentor';

    if (newMemberRole === 'admin') {
      // Exige confirmação para promoção a administrador
      setConfirmAction({
        user: targetUser,
        action: 'admin',
        payload: { status: 'approved', member_role: 'admin', role: 'admin' },
        title: 'Confirmar Concessão de Privilégios de Administrador',
        description: `Tem certeza que deseja conceder acesso total de Administrador para "${targetUser.full_name}" (${targetUser.email})? Administradores têm acesso a todo o sistema, exclusões e arquivos.`
      });
    } else {
      updateUser.mutate({
        id: targetUser.id,
        data: { member_role: newMemberRole, role: newRole, status: 'approved' }
      });
    }
  };

  const handleRejectPrompt = (targetUser) => {
    setConfirmAction({
      user: targetUser,
      action: 'reject',
      payload: { status: 'rejected' },
      title: 'Desativar / Rejeitar Usuário',
      description: `Tem certeza que deseja desativar o acesso de "${targetUser.full_name}" (${targetUser.email})? Ele perderá acesso imediato às áreas autenticadas do Portal.`
    });
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center">
        <LoadingSpinner text="Carregando diretório de membros..." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Usuários Pendentes */}
      <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-white">
            <Clock className="w-5 h-5 text-yellow-500" />
            Usuários Pendentes ({pendingUsers.length})
          </h2>
          <span className="text-xs text-[#B8BDC7]">Aguardando liberação de acesso</span>
        </div>

        {pendingUsers.length === 0 ? (
          <p className="text-[#B8BDC7] text-sm py-4">Nenhum membro aguardando aprovação no momento.</p>
        ) : (
          <div className="space-y-3">
            {pendingUsers.map((pUser) => (
              <div 
                key={pUser.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-[#0B0B0D] border border-[#1F222B] rounded-xl hover:border-[#1F222B]/80 transition-colors"
              >
                <div>
                  <p className="font-semibold text-white">{pUser.full_name || 'Sem nome cadastrado'}</p>
                  <p className="text-sm text-[#B8BDC7] font-mono">{pUser.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="pending">{pUser.program || 'Geral'}</Badge>
                    <span className="text-xs text-[#B8BDC7]">
                      Cadastrado em: {pUser.created_at ? new Date(pUser.created_at).toLocaleDateString('pt-BR') : 'Recentemente'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    defaultValue={pUser.program || 'FRC'}
                    onValueChange={(v) => updateUser.mutate({ id: pUser.id, data: { program: v } })}
                  >
                    <SelectTrigger className="w-28 h-8 bg-[#111217] border-[#1F222B] text-xs text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111217] border-[#1F222B] text-white [&_*]:text-white">
                      <SelectItem value="FRC">FRC</SelectItem>
                      <SelectItem value="FTC">FTC</SelectItem>
                      <SelectItem value="FLL">FLL</SelectItem>
                      <SelectItem value="Técnico">Técnico</SelectItem>
                      <SelectItem value="Geral">Geral</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    onClick={() => updateUser.mutate({ 
                      id: pUser.id, 
                      data: { status: 'approved', member_role: 'user', role: 'aluno' } 
                    })}
                    variant="outline"
                    className="border-blue-500/40 text-blue-400 hover:bg-blue-500/10 h-8 text-xs"
                    disabled={updateUser.isPending}
                  >
                    <Users className="w-3.5 h-3.5 mr-1" />
                    Aprovar Viewer
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => updateUser.mutate({ 
                      id: pUser.id, 
                      data: { status: 'approved', member_role: 'member', role: 'mentor' } 
                    })}
                    className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs font-medium"
                    disabled={updateUser.isPending}
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Aprovar Editor
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleRoleChange(pUser, 'admin')}
                    className="bg-[#E10600] hover:bg-[#E10600]/90 text-white h-8 text-xs font-medium"
                    disabled={updateUser.isPending}
                  >
                    <Shield className="w-3.5 h-3.5 mr-1" />
                    Admin
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRejectPrompt(pUser)}
                    className="border-red-500/40 text-red-400 hover:bg-red-500/10 h-8 text-xs"
                    disabled={updateUser.isPending}
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Rejeitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usuários Aprovados */}
      <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <Check className="w-5 h-5 text-green-500" />
              Usuários Ativos / Aprovados ({approvedUsers.length})
            </h2>
            <p className="text-xs text-[#B8BDC7] mt-0.5">Gerenciamento de papéis e permissões no sistema</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, e-mail..."
                className="pl-9 h-9 bg-[#0B0B0D] border-[#1F222B] text-xs text-white placeholder:text-zinc-500"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-36 h-9 bg-[#0B0B0D] border-[#1F222B] text-xs text-white">
                <Filter className="w-3 h-3 mr-1 text-zinc-400" />
                <SelectValue placeholder="Filtrar por papel" />
              </SelectTrigger>
              <SelectContent className="bg-[#111217] border-[#1F222B] text-white [&_*]:text-white">
                <SelectItem value="all">Todos os papéis</SelectItem>
                <SelectItem value="user">Viewers</SelectItem>
                <SelectItem value="member">Editors</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredApproved.length === 0 ? (
          <p className="text-[#B8BDC7] text-sm py-4">Nenhum membro encontrado com os critérios selecionados.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredApproved.map((aUser) => {
              const currentRole = aUser.member_role || (aUser.role === 'admin' ? 'admin' : 'user');
              return (
                <div 
                  key={aUser.id}
                  className="p-4 bg-[#0B0B0D] border border-[#1F222B] rounded-xl flex flex-col justify-between hover:border-[#1F222B]/90 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-semibold text-white text-sm line-clamp-1">{aUser.full_name || 'Sem nome'}</p>
                        <p className="text-xs text-[#B8BDC7] font-mono truncate">{aUser.email}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mb-4">
                      <Badge variant={aUser.program?.toLowerCase() || 'default'}>
                        {aUser.program || 'Geral'}
                      </Badge>
                      <Badge variant={getRoleBadgeVariant(currentRole)}>
                        {getRoleLabel(currentRole)}
                      </Badge>
                      {aUser.role === 'admin' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E10600]/20 text-[#E10600] font-semibold border border-[#E10600]/30">
                          Root Admin
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#1F222B] flex items-center justify-between gap-2">
                    <Select
                      value={currentRole}
                      onValueChange={(val) => handleRoleChange(aUser, val)}
                      disabled={updateUser.isPending}
                    >
                      <SelectTrigger className="w-32 h-8 bg-[#111217] border-[#1F222B] text-xs text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111217] border-[#1F222B] text-white [&_*]:text-white">
                        <SelectItem value="user">Viewer</SelectItem>
                        <SelectItem value="member">Editor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRejectPrompt(aUser)}
                      disabled={updateUser.isPending}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2.5 text-xs"
                      title="Desativar acesso deste usuário"
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Desativar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Usuários Rejeitados / Desativados */}
      {rejectedUsers.length > 0 && (
        <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <X className="w-5 h-5 text-red-500" />
            Usuários Desativados ({rejectedUsers.length})
          </h2>
          <div className="space-y-3">
            {rejectedUsers.map((rUser) => (
              <div 
                key={rUser.id}
                className="flex items-center justify-between p-3.5 bg-[#0B0B0D] border border-[#1F222B] rounded-xl opacity-75 hover:opacity-100 transition-opacity"
              >
                <div>
                  <p className="font-medium text-white text-sm">{rUser.full_name || 'Sem nome'}</p>
                  <p className="text-xs text-[#B8BDC7] font-mono">{rUser.email}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => updateUser.mutate({ 
                    id: rUser.id, 
                    data: { status: 'approved', member_role: 'user', role: 'aluno' } 
                  })}
                  variant="outline"
                  className="border-green-500/40 text-green-400 hover:bg-green-500/10 h-8 text-xs font-medium"
                  disabled={updateUser.isPending}
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Reativar Acesso
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Ações Críticas */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <DialogContent className="bg-[#111217] border-[#1F222B] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              {confirmAction?.title || 'Confirmação necessária'}
            </DialogTitle>
            <DialogDescription className="text-[#B8BDC7] text-sm pt-2">
              {confirmAction?.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmAction(null)}
              className="border-[#1F222B] text-[#B8BDC7] hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (confirmAction?.user && confirmAction?.payload) {
                  updateUser.mutate({
                    id: confirmAction.user.id,
                    data: confirmAction.payload
                  });
                }
              }}
              className="bg-[#E10600] hover:bg-[#E10600]/90 text-white font-medium"
              disabled={updateUser.isPending}
            >
              {updateUser.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Confirmando...
                </>
              ) : (
                'Confirmar Operação'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
