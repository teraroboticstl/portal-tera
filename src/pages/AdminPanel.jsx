import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Users, Clock, Check, X, Trash2, 
  Shield, Calendar, Plus, Edit2,
  Package, Heart, Cpu, FolderOpen, Home, LogOut, LayoutDashboard, Archive, AlertTriangle,
  HardDrive, Upload, Image as ImageIcon, Loader2, ExternalLink
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Badge from '@/components/common/Badge';
import CountdownTimer from '@/components/CountdownTimer';
import GoogleDriveTestManagement from '@/components/admin/GoogleDriveTestManagement';
import { uploadToGoogleDrive } from '@/api/googleDriveClient';
import SafeImage from '@/components/common/SafeImage';
import { saveAdminDraft, loadAdminDraft, clearAdminDraft } from '@/lib/adminDrafts';

// E-mail do admin seed (bootstrap admin) - sempre aprovado automaticamente
const SEED_ADMIN_EMAIL = 'teraroboticstl@gmail.com';

// Identificadores válidos das guias do Painel Admin
const VALID_ADMIN_TABS = [
  'users',
  'tournament',
  'robots',
  'sponsors',
  'projects',
  'products',
  'season_close',
  'google_drive'
];
const DEFAULT_ADMIN_TAB = 'users';
const ADMIN_TAB_STORAGE_KEY = 'portal_tera_admin_active_tab';

/**
 * Recupera e valida a última guia ativa armazenada na sessão da aba
 */
function getInitialAdminTab() {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const savedTab = window.sessionStorage.getItem(ADMIN_TAB_STORAGE_KEY);
      if (savedTab && VALID_ADMIN_TABS.includes(savedTab)) {
        return savedTab;
      }
    }
  } catch (err) {
    console.warn('[AdminPanel] Falha ao ler guia ativa do sessionStorage:', err);
  }
  return DEFAULT_ADMIN_TAB;
}

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(getInitialAdminTab);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleTabChange = (newTab) => {
    if (VALID_ADMIN_TABS.includes(newTab)) {
      setActiveTab(newTab);
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem(ADMIN_TAB_STORAGE_KEY, newTab);
        }
      } catch (err) {
        console.warn('[AdminPanel] Falha ao salvar guia ativa no sessionStorage:', err);
      }
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          base44.auth.redirectToLogin(createPageUrl('AdminPanel'));
          return;
        }
        
        const userData = await base44.auth.me();
        if (!userData) {
          navigate(createPageUrl('Home'));
          return;
        }
        
        const isSeedAdmin = userData.email && (userData.email.toLowerCase() === SEED_ADMIN_EMAIL || userData.email.toLowerCase() === 'nathannovaes16@gmail.com');
        const userIsAdmin = userData.role === 'admin' || userData.member_role === 'admin' || isSeedAdmin;
        
        // Apenas admins podem acessar
        if (!userIsAdmin) {
          navigate(createPageUrl('Home'));
          return;
        }
        
        setUser(userData);
      } catch (e) {
        navigate(createPageUrl('Home'));
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center">
        <LoadingSpinner text="Verificando acesso..." />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0B0B0D]">
      {/* Admin Header - sem navbar */}
      <div className="bg-[#111217] border-b border-[#1F222B] px-4 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="w-8 h-8 text-[#E10600]" />
              Painel Admin
            </h1>
            <p className="text-[#B8BDC7] mt-1">Gerencie usuários, conteúdo e configurações</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('AreaInterna')}>
              <Button className="bg-[#1F222B] text-[#F5F7FA] hover:bg-[#2A2D38] border border-[#B8BDC7]/20">
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Área Interna
              </Button>
            </Link>
            <Link to={createPageUrl('Home')}>
              <Button className="bg-[#1F222B] text-[#F5F7FA] hover:bg-[#2A2D38] border border-[#B8BDC7]/20">
                <Home className="w-4 h-4 mr-2" />
                Site
              </Button>
            </Link>
            <Button 
              onClick={() => base44.auth.logout('/')}
              className="bg-[#E10600]/10 text-[#E10600] hover:bg-[#E10600]/20 border border-[#E10600]/30"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        {/* Tabs */}

        <Tabs value={activeTab} onValueChange={handleTabChange} defaultValue={DEFAULT_ADMIN_TAB}>
          <TabsList className="bg-[#111217] border border-[#1F222B] mb-8">
            <TabsTrigger value="users" className="data-[state=active]:bg-[#E10600]">
              <Users className="w-4 h-4 mr-2" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="tournament" className="data-[state=active]:bg-[#E10600]">
              <Clock className="w-4 h-4 mr-2" />
              Torneio
            </TabsTrigger>
            <TabsTrigger value="robots" className="data-[state=active]:bg-[#E10600]">
              <Cpu className="w-4 h-4 mr-2" />
              Robôs
            </TabsTrigger>
            <TabsTrigger value="sponsors" className="data-[state=active]:bg-[#E10600]">
              <Heart className="w-4 h-4 mr-2" />
              Patrocinadores
            </TabsTrigger>
            <TabsTrigger value="projects" className="data-[state=active]:bg-[#E10600]">
              <FolderOpen className="w-4 h-4 mr-2" />
              Projetos
            </TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:bg-[#E10600]">
              <Package className="w-4 h-4 mr-2" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="season_close" className="data-[state=active]:bg-[#E10600]">
              <Archive className="w-4 h-4 mr-2" />
              Encerrar Temporada
            </TabsTrigger>
            <TabsTrigger value="google_drive" className="data-[state=active]:bg-[#E10600]">
              <HardDrive className="w-4 h-4 mr-2" />
              Google Drive (Teste)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersManagement />
          </TabsContent>
          <TabsContent value="tournament">
            <TournamentSettings />
          </TabsContent>
          <TabsContent value="robots">
            <RobotsManagement />
          </TabsContent>
          <TabsContent value="sponsors">
            <SponsorsManagement />
          </TabsContent>
          <TabsContent value="projects">
            <ProjectsManagement />
          </TabsContent>
          <TabsContent value="products">
            <ProductsManagement />
          </TabsContent>
          <TabsContent value="season_close">
            <SeasonCloseManagement />
          </TabsContent>
          <TabsContent value="google_drive">
            <GoogleDriveTestManagement user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function UsersManagement() {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState('all');
  
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list('-created_date'),
  });

  const updateUser = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Usuário atualizado!');
    },
    onError: (err) => {
      console.error('Erro ao atualizar usuário:', err);
      toast.error('Erro ao atualizar usuário: ' + (err.message || 'Verifique as permissões.'));
    }
  });

  // Usuários sem status ou com status 'pending' são considerados pendentes
  const pendingUsers = users.filter(u => !u.status || u.status === 'pending');
  const approvedUsers = users.filter(u => u.status === 'approved');
  const rejectedUsers = users.filter(u => u.status === 'rejected');

  const filteredApproved = roleFilter === 'all' 
    ? approvedUsers 
    : approvedUsers.filter(u => (u.member_role || 'user') === roleFilter);

  const getRoleLabel = (role) => {
    const labels = { user: 'Viewer', member: 'Editor', admin: 'Admin' };
    return labels[role] || 'Viewer';
  };

  const getRoleBadgeVariant = (role) => {
    const variants = { user: 'default', member: 'success', admin: 'accent' };
    return variants[role] || 'default';
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      {/* Pending Users */}
      <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-yellow-500" />
          Usuários Pendentes ({pendingUsers.length})
        </h2>
        {pendingUsers.length === 0 ? (
          <p className="text-[#B8BDC7]">Nenhum usuário aguardando aprovação.</p>
        ) : (
          <div className="space-y-3">
            {pendingUsers.map((user) => (
              <div 
                key={user.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-[#0B0B0D] rounded-xl"
              >
                <div>
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-sm text-[#B8BDC7]">{user.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="pending">{user.program || 'Não informado'}</Badge>
                    <span className="text-xs text-[#B8BDC7]">
                      {new Date(user.created_date).toLocaleString('pt-BR', { dateStyle: 'short' })}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select
                    defaultValue={user.program || 'FRC'}
                    onValueChange={(v) => updateUser.mutate({ id: user.id, data: { program: v } })}
                  >
                    <SelectTrigger className="w-24 h-8 bg-[#0B0B0D] border-[#1F222B]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111217] border-[#1F222B] text-white [&_*]:text-white">
                      <SelectItem value="FRC">FRC</SelectItem>
                      <SelectItem value="FTC">FTC</SelectItem>
                      <SelectItem value="FLL">FLL</SelectItem>
                      <SelectItem value="Técnico">Técnico</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => updateUser.mutate({ id: user.id, data: { status: 'approved', member_role: 'user' } })}
                    variant="outline"
                    className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
                  >
                    <Users className="w-4 h-4 mr-1" />
                    Viewer
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateUser.mutate({ id: user.id, data: { status: 'approved', member_role: 'member' } })}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Editor
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateUser.mutate({ id: user.id, data: { status: 'approved', member_role: 'admin' } })}
                    className="bg-[#E10600] hover:bg-[#E10600]/90"
                  >
                    <Shield className="w-4 h-4 mr-1" />
                    Admin
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateUser.mutate({ id: user.id, data: { status: 'rejected' } })}
                    className="border-red-500 text-red-500 hover:bg-red-500/10"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Rejeitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved Users */}
      <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            Usuários Aprovados ({approvedUsers.length})
          </h2>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40 bg-[#0B0B0D] border-[#1F222B]">
              <SelectValue placeholder="Filtrar por role" />
            </SelectTrigger>
            <SelectContent className="bg-[#111217] border-[#1F222B] text-white [&_*]:text-white">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="user">Viewers</SelectItem>
              <SelectItem value="member">Editors</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {filteredApproved.length === 0 ? (
          <p className="text-[#B8BDC7]">Nenhum usuário encontrado.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredApproved.map((user) => (
              <div 
                key={user.id}
                className="p-4 bg-[#0B0B0D] rounded-xl"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{user.full_name}</p>
                    <p className="text-sm text-[#B8BDC7]">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant={user.program?.toLowerCase() || 'default'}>
                    {user.program || 'Membro'}
                  </Badge>
                  <Badge variant={getRoleBadgeVariant(user.member_role || 'user')}>
                    {getRoleLabel(user.member_role || 'user')}
                  </Badge>
                  {user.role === 'admin' && (
                    <Badge variant="accent">Sistema</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={user.member_role || 'user'}
                    onValueChange={(v) => updateUser.mutate({ id: user.id, data: { member_role: v } })}
                  >
                    <SelectTrigger className="w-28 h-8 bg-[#111217] border-[#1F222B]">
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
                    onClick={() => updateUser.mutate({ id: user.id, data: { status: 'rejected' } })}
                    className="text-red-500 hover:text-red-400 h-8"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Desativar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rejected Users */}
      {rejectedUsers.length > 0 && (
        <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <X className="w-5 h-5 text-red-500" />
            Usuários Rejeitados/Desativados ({rejectedUsers.length})
          </h2>
          <div className="space-y-3">
            {rejectedUsers.map((user) => (
              <div 
                key={user.id}
                className="flex items-center justify-between p-4 bg-[#0B0B0D] rounded-xl opacity-70"
              >
                <div>
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-sm text-[#B8BDC7]">{user.email}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => updateUser.mutate({ id: user.id, data: { status: 'approved', member_role: 'user' } })}
                  variant="outline"
                  className="border-green-500 text-green-500 hover:bg-green-500/10"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Reativar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TournamentSettings() {
  const { data: seasons = [], isLoading } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => base44.entities.Season.list('-year'),
  });

  const activeSeason = seasons && seasons.length > 0 ? seasons[0] : null;

  return (
    <div className="space-y-8">
      {/* Countdown Timer */}
      <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6">
        {activeSeason && activeSeason.competition_date ? (
          <div>
            <CountdownTimer 
              targetDate={activeSeason.competition_date} 
              label="Countdown para Competição"
            />
            {activeSeason.awards_targeted && activeSeason.awards_targeted.length > 0 && (
              <div className="mt-8 space-y-2">
                <h4 className="text-[#B8BDC7] text-sm font-medium">Awards Almejados:</h4>
                <div className="flex flex-wrap gap-2">
                  {activeSeason.awards_targeted.map((award, idx) => (
                    <div key={idx} className="px-3 py-1 bg-[#1F222B] text-[#B8BDC7] text-sm rounded-full">
                      🏆 {award}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-[#B8BDC7] mb-4">Nenhuma temporada ativa configurada</p>
            <Link to={createPageUrl('SeasonConfig')}>
              <Button className="bg-[#E10600] hover:bg-[#E10600]/90">
                <Calendar className="w-4 h-4 mr-2" />
                Configurar Temporada
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Season Info */}
      {activeSeason && (
        <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Informações da Temporada</h2>
            <Link to={createPageUrl('SeasonConfig')}>
              <Button variant="outline" className="border-[#1F222B]">
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </Link>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[#B8BDC7]">Temporada</p>
              <p className="font-medium">{activeSeason.season_name || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-[#B8BDC7]">Nome do Jogo</p>
              <p className="font-medium">{activeSeason.game_name || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-[#B8BDC7]">Data do Kickoff</p>
              <p className="font-medium">
                {activeSeason.kickoff_date 
                  ? new Date(activeSeason.kickoff_date + 'T12:00:00').toLocaleDateString('pt-BR')
                  : '—'
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-[#B8BDC7]">Data da Competição</p>
              <p className="font-medium">
                {activeSeason.competition_date 
                  ? new Date(activeSeason.competition_date + 'T12:00:00').toLocaleDateString('pt-BR')
                  : '—'
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-[#B8BDC7]">Nome do Robô</p>
              <p className="font-medium">{activeSeason.robot_name || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-[#B8BDC7]">Peso do Robô</p>
              <p className="font-medium">{activeSeason.robot_weight ? `${activeSeason.robot_weight} kg` : '—'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RobotsManagement() {
  const queryClient = useQueryClient();
  const savedDraft = loadAdminDraft('robots');
  const [showForm, setShowForm] = useState(Boolean(savedDraft?.isOpen && savedDraft?.mode === 'create'));
  const [editingRobot, setEditingRobot] = useState(
    savedDraft?.isOpen && savedDraft?.mode === 'edit' && savedDraft?.recordId
      ? { id: savedDraft.recordId, ...(savedDraft.data || {}) }
      : null
  );
  const [form, setForm] = useState(
    savedDraft?.mode === 'create' && savedDraft?.data
      ? savedDraft.data
      : {
          name: '', category: 'FRC', year: new Date().getFullYear(),
          season_name: '', description: '', image_url: '', game_objective: '',
          is_current: false, cad_url: ''
        }
  );

  useEffect(() => {
    if (editingRobot) {
      saveAdminDraft('robots', {
        isOpen: true,
        mode: 'edit',
        recordId: editingRobot.id,
        data: editingRobot
      });
    } else if (showForm) {
      saveAdminDraft('robots', {
        isOpen: true,
        mode: 'create',
        recordId: null,
        data: form
      });
    } else {
      clearAdminDraft('robots');
    }
  }, [showForm, editingRobot, form]);

  const { data: robots = [], isLoading } = useQuery({
    queryKey: ['admin-robots'],
    queryFn: () => base44.entities.Robot.list('-created_at'),
  });

  const createRobot = useMutation({
    mutationFn: (data) => base44.entities.Robot.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-robots'] });
      clearAdminDraft('robots');
      setShowForm(false);
      resetForm();
      toast.success('Robô criado!');
    },
    onError: (err) => {
      console.error('Erro ao criar robô:', err);
      toast.error('Erro ao criar robô: ' + (err.message || 'Verifique as permissões.'));
    }
  });

  const updateRobot = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Robot.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-robots'] });
      clearAdminDraft('robots');
      setEditingRobot(null);
      toast.success('Robô atualizado!');
    },
    onError: (err) => {
      console.error('Erro ao atualizar robô:', err);
      toast.error('Erro ao atualizar robô: ' + (err.message || 'Verifique as permissões.'));
    }
  });

  const deleteRobot = useMutation({
    mutationFn: (id) => base44.entities.Robot.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-robots'] });
      toast.success('Robô removido!');
    },
    onError: (err) => {
      console.error('Erro ao remover robô:', err);
      toast.error('Erro ao remover robô: ' + (err.message || 'Verifique as permissões.'));
    }
  });

  const resetForm = () => {
    setForm({
      name: '', category: 'FRC', year: new Date().getFullYear(),
      season_name: '', description: '', image_url: '', game_objective: '',
      is_current: false, cad_url: ''
    });
  };

  const handleUpload = async (e, field, setter) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Apenas imagens PNG, JPG e WebP são permitidas.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB.');
      return;
    }

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setter(prev => ({ ...prev, [field]: file_url }));
      toast.success('Imagem carregada!');
    } catch (err) {
      toast.error('Erro ao carregar imagem.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Gerenciar Robôs</h2>
        <Button onClick={() => setShowForm(true)} className="bg-[#E10600] hover:bg-[#E10600]/90">
          <Plus className="w-4 h-4 mr-2" />
          Novo Robô
        </Button>
      </div>

      {/* Robots List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {robots.map((robot) => (
          <div key={robot.id} className="bg-[#111217] border border-[#1F222B] rounded-xl overflow-hidden flex flex-col justify-between">
            <div className="relative w-full h-40 bg-[#0B0B0D]">
              <SafeImage 
                src={robot.image_url} 
                alt={robot.name} 
                fit="cover" 
                position="center"
                allowEnlarge={true}
                enlargeTitle="Abrir foto do robô em nova guia"
                containerClassName="w-full h-40"
                fallbackIcon={<Cpu className="w-12 h-12 text-[#1F222B]" />}
              />
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={robot.category.toLowerCase()}>{robot.category}</Badge>
                  {robot.is_current && <Badge variant="accent">Atual</Badge>}
                </div>
                <h3 className="font-bold text-white">{robot.name}</h3>
                <p className="text-sm text-[#B8BDC7]">Temporada {robot.year}</p>
              </div>
              <div className="flex gap-2 mt-4 pt-3 border-t border-[#1F222B]">
                <Button size="sm" variant="outline" onClick={() => setEditingRobot(robot)} className="border-[#1F222B] bg-white text-zinc-900 hover:bg-zinc-100 hover:text-black flex-1">
                  <Edit2 className="w-3 h-3 mr-1" />
                  Editar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteRobot.mutate(robot.id)} className="text-red-500 hover:text-red-400 hover:bg-red-500/10">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog 
        open={showForm || !!editingRobot} 
        onOpenChange={(open) => { 
          if (!open) {
            setShowForm(false); 
            setEditingRobot(null); 
            clearAdminDraft('robots');
          }
        }}
      >
        <DialogContent className="bg-[#111217] border-[#1F222B] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRobot ? 'Editar Robô' : 'Novo Robô'}</DialogTitle>
          </DialogHeader>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (editingRobot) {
                updateRobot.mutate({ id: editingRobot.id, data: editingRobot });
              } else {
                createRobot.mutate(form);
              }
            }}
            className="space-y-4"
          >
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Nome do Robô</Label>
                <Input
                  value={editingRobot ? editingRobot.name : form.name}
                  onChange={(e) => editingRobot 
                    ? setEditingRobot({ ...editingRobot, name: e.target.value })
                    : setForm({ ...form, name: e.target.value })
                  }
                  className="bg-[#0B0B0D] border-[#1F222B] text-white"
                  />
                  </div>
                  <div>
                  <Label>Categoria</Label>
                  <Select 
                  value={editingRobot ? editingRobot.category : form.category}
                  onValueChange={(v) => editingRobot 
                    ? setEditingRobot({ ...editingRobot, category: v })
                    : setForm({ ...form, category: v })
                  }
                >
                  <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111217] border-[#1F222B] text-white [&_*]:text-white">
                    <SelectItem value="FRC">FRC</SelectItem>
                    <SelectItem value="FTC">FTC</SelectItem>
                    <SelectItem value="FLL">FLL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ano</Label>
                <Input
                  type="number"
                  value={editingRobot ? editingRobot.year : form.year}
                  onChange={(e) => editingRobot 
                    ? setEditingRobot({ ...editingRobot, year: parseInt(e.target.value) })
                    : setForm({ ...form, year: parseInt(e.target.value) })
                  }
                  className="bg-[#0B0B0D] border-[#1F222B] text-white"
                />
              </div>
              <div>
                <Label>Nome da Temporada</Label>
                <Input
                  value={editingRobot ? editingRobot.season_name : form.season_name}
                  onChange={(e) => editingRobot 
                    ? setEditingRobot({ ...editingRobot, season_name: e.target.value })
                    : setForm({ ...form, season_name: e.target.value })
                  }
                  placeholder="Ex: REEFSCAPE"
                  className="bg-[#0B0B0D] border-[#1F222B] text-white"
                />
              </div>
            </div>
            <div>
              <Label>Objetivo no Jogo</Label>
              <Textarea
                value={editingRobot ? editingRobot.game_objective : form.game_objective}
                onChange={(e) => editingRobot 
                  ? setEditingRobot({ ...editingRobot, game_objective: e.target.value })
                  : setForm({ ...form, game_objective: e.target.value })
                }
                className="bg-[#0B0B0D] border-[#1F222B] text-white"
              />
            </div>
            <div>
              <Label>Descrição Técnica</Label>
              <Textarea
                value={editingRobot ? editingRobot.description : form.description}
                onChange={(e) => editingRobot 
                  ? setEditingRobot({ ...editingRobot, description: e.target.value })
                  : setForm({ ...form, description: e.target.value })
                }
                className="bg-[#0B0B0D] border-[#1F222B] min-h-24"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Imagem do Robô</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUpload(e, 'image_url', editingRobot ? setEditingRobot : setForm)}
                  className="bg-[#0B0B0D] border-[#1F222B] text-white"
                />
              </div>
              <div>
                <Label>Link do CAD</Label>
                <Input
                  value={editingRobot ? editingRobot.cad_url : form.cad_url}
                  onChange={(e) => editingRobot 
                    ? setEditingRobot({ ...editingRobot, cad_url: e.target.value })
                    : setForm({ ...form, cad_url: e.target.value })
                  }
                  placeholder="https://..."
                  className="bg-[#0B0B0D] border-[#1F222B] text-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_current"
                checked={editingRobot ? editingRobot.is_current : form.is_current}
                onChange={(e) => editingRobot 
                  ? setEditingRobot({ ...editingRobot, is_current: e.target.checked })
                  : setForm({ ...form, is_current: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="is_current">Robô da temporada atual</Label>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingRobot(null); }} className="border-[#1F222B]">
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#E10600] hover:bg-[#E10600]/90">
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SponsorsManagement() {
  const queryClient = useQueryClient();
  const savedDraft = loadAdminDraft('sponsors');
  const [showForm, setShowForm] = useState(Boolean(savedDraft?.isOpen && savedDraft?.mode === 'create'));
  const [editingSponsor, setEditingSponsor] = useState(
    savedDraft?.isOpen && savedDraft?.mode === 'edit' && savedDraft?.recordId
      ? { id: savedDraft.recordId, ...(savedDraft.data || {}) }
      : null
  );
  const emptyForm = { name: '', category: 'Apoio', logo_url: '', link: '', order: 0 };
  const [form, setForm] = useState(
    savedDraft?.mode === 'create' && savedDraft?.data ? savedDraft.data : emptyForm
  );
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (editingSponsor) {
      saveAdminDraft('sponsors', {
        isOpen: true,
        mode: 'edit',
        recordId: editingSponsor.id,
        data: editingSponsor
      });
    } else if (showForm) {
      saveAdminDraft('sponsors', {
        isOpen: true,
        mode: 'create',
        recordId: null,
        data: form
      });
    } else {
      clearAdminDraft('sponsors');
    }
  }, [showForm, editingSponsor, form]);

  const { data: sponsors = [], isLoading } = useQuery({
    queryKey: ['admin-sponsors'],
    queryFn: () => base44.entities.Sponsor.list('order'),
  });

  const createSponsor = useMutation({
    mutationFn: (data) => base44.entities.Sponsor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sponsors'] });
      clearAdminDraft('sponsors');
      setShowForm(false);
      setForm(emptyForm);
      toast.success('Patrocinador adicionado!');
    },
    onError: (err) => {
      console.error('Erro ao adicionar patrocinador:', err);
      toast.error('Erro ao adicionar patrocinador: ' + (err.message || 'Verifique as permissões.'));
    }
  });

  const updateSponsor = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Sponsor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sponsors'] });
      clearAdminDraft('sponsors');
      setEditingSponsor(null);
      toast.success('Patrocinador atualizado!');
    },
    onError: (err) => {
      console.error('Erro ao atualizar patrocinador:', err);
      toast.error('Erro ao atualizar patrocinador: ' + (err.message || 'Verifique as permissões.'));
    }
  });

  const deleteSponsor = useMutation({
    mutationFn: (id) => base44.entities.Sponsor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sponsors'] });
      toast.success('Patrocinador removido!');
    },
    onError: (err) => {
      console.error('Erro ao remover patrocinador:', err);
      toast.error('Erro ao remover patrocinador: ' + (err.message || 'Verifique as permissões.'));
    }
  });

  const moveOrder = async (sponsor, direction) => {
    const sorted = [...sponsors].sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx = sorted.findIndex(s => s.id === sponsor.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swapTarget = sorted[swapIdx];
    await Promise.all([
      base44.entities.Sponsor.update(sponsor.id, { order: swapTarget.order ?? swapIdx }),
      base44.entities.Sponsor.update(swapTarget.id, { order: sponsor.order ?? idx }),
    ]);
    queryClient.invalidateQueries({ queryKey: ['admin-sponsors'] });
  };

  const handleUpload = async (e, setter) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setter(prev => ({ ...prev, logo_url: file_url }));
      toast.success('Logo carregada!');
    } catch (err) {
      toast.error('Erro ao carregar logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const CATEGORIES = ['Master', 'Gold', 'Silver', 'Apoio'];
  const CATEGORY_LABELS = { Master: 'Master (Institucional)', Gold: 'Gold (Ouro)', Silver: 'Silver (Prata)', Apoio: 'Apoio (Bronze)' };

  const SponsorForm = ({ data, setData, onSubmit, submitLabel }) => (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
      <div>
        <Label>Nome *</Label>
        <Input required value={data.name} onChange={(e) => setData(p => ({ ...p, name: e.target.value }))} className="bg-[#0B0B0D] border-[#1F222B] text-white" />
      </div>
      <div>
        <Label>Categoria</Label>
        <Select value={data.category} onValueChange={(v) => setData(p => ({ ...p, category: v }))}>
          <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B] text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#111217] border-[#1F222B] text-white [&_*]:text-white">
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Logo</Label>
        <Input type="file" accept="image/*" onChange={(e) => handleUpload(e, setData)} disabled={uploadingLogo} className="bg-[#0B0B0D] border-[#1F222B] text-white" />
        {uploadingLogo && <p className="text-xs text-yellow-400 mt-1">⏳ Carregando logo...</p>}
        {!uploadingLogo && data.logo_url && (
          <div className="mt-2 bg-[#0B0B0D] rounded p-2 inline-block border border-[#1F222B]">
            <SafeImage 
              src={data.logo_url} 
              alt="Preview" 
              fit="contain" 
              allowEnlarge={true} 
              enlargeTitle="Abrir logo em nova guia"
              containerClassName="h-14 w-28" 
            />
          </div>
        )}
      </div>
      <div>
        <Label>Site (opcional)</Label>
        <Input value={data.link || ''} onChange={(e) => setData(p => ({ ...p, link: e.target.value }))} placeholder="https://..." className="bg-[#0B0B0D] border-[#1F222B] text-white" />
      </div>
      <div>
        <Label>Ordem</Label>
        <Input type="number" value={data.order || 0} onChange={(e) => setData(p => ({ ...p, order: parseInt(e.target.value) || 0 }))} className="bg-[#0B0B0D] border-[#1F222B] text-white w-24" />
      </div>
      <Button type="submit" disabled={uploadingLogo} className="w-full bg-[#E10600] hover:bg-[#E10600]/90">
        {uploadingLogo ? 'Aguardando upload...' : submitLabel}
      </Button>
    </form>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Gerenciar Patrocinadores</h2>
        <Button onClick={() => setShowForm(true)} className="bg-[#E10600] hover:bg-[#E10600]/90">
          <Plus className="w-4 h-4 mr-2" />
          Novo Patrocinador
        </Button>
      </div>

      {isLoading && <LoadingSpinner />}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...sponsors].sort((a, b) => (a.order || 0) - (b.order || 0)).map((sponsor) => (
          <div key={sponsor.id} className="bg-[#111217] border border-[#1F222B] rounded-xl p-4 flex flex-col gap-3">
            <div className="w-full h-20 bg-[#0B0B0D] rounded-lg flex items-center justify-center p-2 border border-[#1F222B]">
              <SafeImage 
                src={sponsor.logo_url} 
                alt={sponsor.name} 
                fit="contain" 
                allowEnlarge={true} 
                enlargeTitle="Abrir logo em nova guia"
                containerClassName="w-full h-full"
                fallbackIcon={<span className="text-gray-600 text-xs text-center">{sponsor.name}</span>}
              />
            </div>
            <div>
              <p className="text-xs text-[#E10600] font-bold uppercase mb-0.5">{sponsor.category}</p>
              <h3 className="font-medium text-white text-sm">{sponsor.name}</h3>
              {sponsor.link && <p className="text-xs text-gray-500 truncate">{sponsor.link}</p>}
              <p className="text-xs text-gray-600">Ordem: {sponsor.order ?? 0}</p>
            </div>
            <div className="flex gap-1 mt-auto flex-wrap">
              <Button size="sm" variant="outline" onClick={() => setEditingSponsor({ ...sponsor })} className="border-[#1F222B] bg-white text-zinc-900 hover:bg-zinc-100 hover:text-black text-xs h-7 px-2">
                <Edit2 className="w-3 h-3 mr-1" /> Editar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => moveOrder(sponsor, 'up')} className="text-gray-400 h-7 px-2 text-xs">↑</Button>
              <Button size="sm" variant="ghost" onClick={() => moveOrder(sponsor, 'down')} className="text-gray-400 h-7 px-2 text-xs">↓</Button>
              <Button size="sm" variant="ghost" onClick={() => deleteSponsor.mutate(sponsor.id)} className="text-red-500 h-7 px-2">
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog 
        open={showForm} 
        onOpenChange={(o) => { 
          setShowForm(o); 
          if (!o) {
            setForm(emptyForm); 
            clearAdminDraft('sponsors');
          }
        }}
      >
        <DialogContent className="bg-[#111217] border-[#1F222B]">
          <DialogHeader><DialogTitle>Novo Patrocinador</DialogTitle></DialogHeader>
          <SponsorForm data={form} setData={setForm} onSubmit={() => createSponsor.mutate(form)} submitLabel="Adicionar Patrocinador" />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog 
        open={!!editingSponsor} 
        onOpenChange={(o) => { 
          if (!o) {
            setEditingSponsor(null); 
            clearAdminDraft('sponsors');
          }
        }}
      >
        <DialogContent className="bg-[#111217] border-[#1F222B]">
          <DialogHeader><DialogTitle>Editar Patrocinador</DialogTitle></DialogHeader>
          {editingSponsor && (
            <SponsorForm
              data={editingSponsor}
              setData={setEditingSponsor}
              onSubmit={() => updateSponsor.mutate({ id: editingSponsor.id, data: editingSponsor })}
              submitLabel="Salvar Alterações"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectsManagement() {
  const queryClient = useQueryClient();
  const savedDraft = loadAdminDraft('projects');
  const [showForm, setShowForm] = useState(Boolean(savedDraft?.isOpen && savedDraft?.mode === 'create'));
  const [editingProject, setEditingProject] = useState(
    savedDraft?.isOpen && savedDraft?.mode === 'edit' && savedDraft?.recordId
      ? { id: savedDraft.recordId, ...(savedDraft.data || {}) }
      : null
  );
  const [form, setForm] = useState(
    savedDraft?.mode === 'create' && savedDraft?.data
      ? savedDraft.data
      : { title: '', description: '', date_period: '', tags: [], link: '', status: 'active' }
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [images, setImages] = useState(
    savedDraft?.mode === 'create' && savedDraft?.images ? savedDraft.images : []
  );

  useEffect(() => {
    if (editingProject) {
      saveAdminDraft('projects', {
        isOpen: true,
        mode: 'edit',
        recordId: editingProject.id,
        data: editingProject,
        images: editingProject.images || []
      });
    } else if (showForm) {
      saveAdminDraft('projects', {
        isOpen: true,
        mode: 'create',
        recordId: null,
        data: form,
        images
      });
    } else {
      clearAdminDraft('projects');
    }
  }, [showForm, editingProject, form, images]);

  const TAG_OPTIONS = ['Educação', 'Engenharia', 'Impacto Social', 'Tecnologia'];

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });

  const createProject = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      clearAdminDraft('projects');
      setShowForm(false);
      setForm({ title: '', description: '', date_period: '', tags: [], link: '', status: 'active' });
      setImages([]);
      toast.success('Projeto criado!');
    },
    onError: (err) => {
      console.error('Erro ao criar projeto:', err);
      toast.error('Erro ao criar projeto: ' + (err.message || 'Verifique as permissões.'));
    }
  });

  const updateProject = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      clearAdminDraft('projects');
      setEditingProject(null);
      setImages([]);
      toast.success('Projeto atualizado!');
    },
    onError: (err) => {
      console.error('Erro ao atualizar projeto:', err);
      toast.error('Erro ao atualizar projeto: ' + (err.message || 'Verifique as permissões.'));
    }
  });

  const deleteProject = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      toast.success('Projeto removido!');
    },
    onError: (err) => {
      console.error('Erro ao remover projeto:', err);
      toast.error('Erro ao remover projeto: ' + (err.message || 'Verifique as permissões.'));
    }
  });

  const handleUploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImages(prev => [...prev, file_url]);
      if (editingProject) {
        setEditingProject(prev => ({ ...prev, images: [...(prev.images || []), file_url] }));
      }
      toast.success('Imagem carregada!');
    } catch (err) {
      toast.error('Erro ao carregar imagem.');
    } finally {
      setUploadingImage(false);
    }
  };

  const toggleTag = (tag) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Gerenciar Projetos</h2>
          <p className="text-[#B8BDC7] text-sm mt-1">Apenas admins podem criar e excluir projetos.</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-[#E10600] hover:bg-[#E10600]/90 w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      {projects.length === 0 && !isLoading && (
        <div className="text-center py-16 bg-[#111217] border border-[#1F222B] rounded-2xl">
          <FolderOpen className="w-12 h-12 text-[#1F222B] mx-auto mb-4" />
          <p className="text-[#B8BDC7]">Nenhum projeto cadastrado ainda.</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <div key={project.id} className="bg-[#111217] border border-[#1F222B] rounded-xl overflow-hidden flex flex-col group hover:border-[#E10600]/50 transition-all">
            <div className="relative pt-8 pb-6 px-4 flex items-center justify-center bg-[#0B0B0D]/50 border-b border-[#1F222B]/60">
              <div className="w-40 h-40 sm:w-44 sm:h-44 rounded-full overflow-hidden bg-[#111217] border-2 border-[#1F222B] group-hover:border-[#E10600] transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_25px_rgba(225,6,0,0.25)] flex items-center justify-center flex-shrink-0">
                <SafeImage 
                  src={project.images?.[0]} 
                  alt={project.title} 
                  fit="cover"
                  position="center"
                  allowEnlarge={true}
                  enlargeTitle="Abrir imagem do projeto em nova guia"
                  containerClassName="w-full h-full"
                  rounded="rounded-full"
                  fallbackIcon={<FolderOpen className="w-12 h-12 text-[#1F222B]" />}
                />
              </div>
              {project.images?.length > 1 && (
                <div className="absolute top-3 right-3 px-2.5 py-1 bg-[#111217]/90 border border-[#1F222B] rounded-full text-xs text-[#B8BDC7] backdrop-blur-sm">
                  +{project.images.length - 1} fotos
                </div>
              )}
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-bold mb-1">{project.title}</h3>
              {project.date_period && <p className="text-xs text-[#B8BDC7] mb-2">{project.date_period}</p>}
              <p className="text-sm text-[#B8BDC7] line-clamp-2 mb-3">{project.description}</p>
              <div className="flex flex-wrap gap-1 mb-3 mt-auto">
                {project.tags?.map((tag) => (
                  <Badge key={tag} className="text-xs">{tag}</Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => { setEditingProject(project); setImages(project.images || []); }} 
                  className="border-[#1F222B] bg-white text-zinc-900 hover:bg-zinc-100 hover:text-black focus-visible:text-black active:text-black disabled:text-zinc-400 font-medium"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  Editar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteProject.mutate(project.id)} className="text-red-500">
                  <Trash2 className="w-3 h-3 mr-1" />
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog 
        open={!!editingProject} 
        onOpenChange={(open) => { 
          if (!open) { 
            setEditingProject(null); 
            setImages([]); 
            clearAdminDraft('projects');
          } 
        }}
      >
        <DialogContent className="bg-[#111217] border-[#1F222B] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Projeto</DialogTitle>
          </DialogHeader>
          {editingProject && (
            <form onSubmit={(e) => { e.preventDefault(); updateProject.mutate({ id: editingProject.id, data: { ...editingProject, images: editingProject.images || [] } }); }} className="space-y-4">
              <div>
                <Label>Título *</Label>
                <Input required value={editingProject.title} onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })} className="bg-[#0B0B0D] border-[#1F222B] text-white" />
              </div>
              <div>
                <Label>Descrição *</Label>
                <Textarea required value={editingProject.description} onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })} className="bg-[#0B0B0D] border-[#1F222B] text-white min-h-24" />
              </div>
              <div>
                <Label>Período</Label>
                <Input value={editingProject.date_period || ''} onChange={(e) => setEditingProject({ ...editingProject, date_period: e.target.value })} className="bg-[#0B0B0D] border-[#1F222B] text-white" placeholder="Ex: Jan 2025 – Mar 2025" />
              </div>
              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['Educação', 'Engenharia', 'Impacto Social', 'Tecnologia'].map(tag => (
                    <button key={tag} type="button"
                      onClick={() => setEditingProject(prev => ({ ...prev, tags: prev.tags?.includes(tag) ? prev.tags.filter(t => t !== tag) : [...(prev.tags || []), tag] }))}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${editingProject.tags?.includes(tag) ? 'bg-[#E10600] border-[#E10600] text-white' : 'bg-transparent border-[#1F222B] text-[#B8BDC7] hover:border-[#E10600]'}`}
                    >{tag}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Adicionar Imagens</Label>
                <Input type="file" accept="image/*" onChange={handleUploadImage} disabled={uploadingImage} className="bg-[#0B0B0D] border-[#1F222B] text-white" />
                {uploadingImage && <p className="text-xs text-[#B8BDC7] mt-1">Carregando...</p>}
                {(editingProject.images || []).length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {(editingProject.images || []).map((url, i) => (
                      <div key={i} className="relative group">
                        <SafeImage src={url} alt="" fit="cover" containerClassName="w-16 h-16 rounded-lg" allowEnlarge={true} />
                        <button type="button" onClick={() => setEditingProject(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }))}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center z-20">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label>Link externo (opcional)</Label>
                <Input value={editingProject.link || ''} onChange={(e) => setEditingProject({ ...editingProject, link: e.target.value })} placeholder="https://..." className="bg-[#0B0B0D] border-[#1F222B] text-white" />
              </div>
              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => { 
                    setEditingProject(null); 
                    setImages([]); 
                    clearAdminDraft('projects');
                  }} 
                  className="flex-1 border-[#1F222B]"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 bg-[#E10600] hover:bg-[#E10600]/90" disabled={updateProject.isPending}>
                  {updateProject.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog 
        open={showForm} 
        onOpenChange={(o) => {
          setShowForm(o);
          if (!o) {
            setForm({ title: '', description: '', date_period: '', tags: [], link: '', status: 'active' });
            setImages([]);
            clearAdminDraft('projects');
          }
        }}
      >
        <DialogContent className="bg-[#111217] border-[#1F222B] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Projeto</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createProject.mutate({ ...form, images }); }} className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-[#0B0B0D] border-[#1F222B] text-white" placeholder="Nome do projeto" />
            </div>
            <div>
              <Label>Descrição *</Label>
              <Textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-[#0B0B0D] border-[#1F222B] text-white min-h-24" placeholder="Descreva o projeto..." />
            </div>
            <div>
              <Label>Período</Label>
              <Input value={form.date_period} onChange={(e) => setForm({ ...form, date_period: e.target.value })} className="bg-[#0B0B0D] border-[#1F222B] text-white" placeholder="Ex: Jan 2025 – Mar 2025" />
            </div>
            <div>
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {TAG_OPTIONS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      form.tags.includes(tag)
                        ? 'bg-[#E10600] border-[#E10600] text-white'
                        : 'bg-transparent border-[#1F222B] text-[#B8BDC7] hover:border-[#E10600]'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Imagens</Label>
              <Input type="file" accept="image/*" onChange={handleUploadImage} disabled={uploadingImage} className="bg-[#0B0B0D] border-[#1F222B] text-white" />
              {uploadingImage && <p className="text-xs text-[#B8BDC7] mt-1">Carregando...</p>}
              {images.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {images.map((url, i) => (
                    <SafeImage key={i} src={url} alt="" fit="cover" containerClassName="w-16 h-16 rounded-lg" allowEnlarge={true} />
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>Link externo (opcional)</Label>
              <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." className="bg-[#0B0B0D] border-[#1F222B] text-white" />
            </div>
            <Button type="submit" className="w-full bg-[#E10600] hover:bg-[#E10600]/90" disabled={createProject.isPending}>
              {createProject.isPending ? 'Criando...' : 'Criar Projeto'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SeasonCloseManagement() {
  const queryClient = useQueryClient();
  const [seasonTag, setSeasonTag] = useState('');
  const [programs, setPrograms] = useState({ FRC: true, FTC: true, FLL: false });
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const handleArchive = async () => {
    if (!seasonTag.trim()) { toast.error('Defina um nome para a temporada antes de arquivar.'); return; }
    setLoading(true);
    try {
      const selectedPrograms = Object.entries(programs).filter(([, v]) => v).map(([k]) => k);

      // Buscar todos os registros ativos (sem season_tag) dos programas selecionados
      const [allLogs, allPriorities, allPrototypes, allMeetings] = await Promise.all([
        base44.entities.DailyLog.list('-date', 1000),
        base44.entities.Priority.list('-created_date', 1000),
        base44.entities.PrototypeTest.list('-date', 1000),
        base44.entities.MeetingNote.list('-date', 1000),
      ]);

      const toTag = (items) => items.filter(r => !r.season_tag && selectedPrograms.includes(r.program));

      const logsToTag = toTag(allLogs);
      const prioritiesToTag = toTag(allPriorities);
      const prototypesToTag = toTag(allPrototypes);
      const meetingsToTag = toTag(allMeetings);

      // 1. Criar cópias arquivadas (nova entidade de arquivo)
      // Já temos os IDs em logsToTag, prioritiesToTag, etc — usar direto

      // 2. Marcar registros ativos com a tag da temporada
      await Promise.all([
        ...logsToTag.map(r => base44.entities.DailyLog.update(r.id, { season_tag: seasonTag })),
        ...prioritiesToTag.map(r => base44.entities.Priority.update(r.id, { season_tag: seasonTag })),
        ...prototypesToTag.map(r => base44.entities.PrototypeTest.update(r.id, { season_tag: seasonTag })),
        ...meetingsToTag.map(r => base44.entities.MeetingNote.update(r.id, { season_tag: seasonTag })),
      ]);

      queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
      queryClient.invalidateQueries({ queryKey: ['priorities'] });
      queryClient.invalidateQueries({ queryKey: ['prototype-tests'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-notes'] });
      queryClient.invalidateQueries({ queryKey: ['archive-logs'] });
      queryClient.invalidateQueries({ queryKey: ['archive-priorities'] });
      queryClient.invalidateQueries({ queryKey: ['archive-prototypes'] });
      queryClient.invalidateQueries({ queryKey: ['archive-meetings'] });

      const total = logsToTag.length + prioritiesToTag.length + prototypesToTag.length + meetingsToTag.length;
      toast.success(`✅ ${total} registros arquivados com sucesso na temporada "${seasonTag}"!`);
      setConfirm(false);
      setSeasonTag('');
    } catch (e) {
      console.error('Erro ao arquivar temporada:', e);
      toast.error('Erro ao arquivar: ' + (e.message || 'Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <Archive className="w-6 h-6 text-[#E10600]" />
          <h2 className="text-xl font-bold">Encerrar Temporada</h2>
        </div>
        <p className="text-[#B8BDC7] text-sm mb-6">
          Todos os Logs Diários, Prioridades, Protótipos e Reuniões dos programas selecionados serão <strong className="text-white">arquivados</strong> com a tag da temporada. Nenhum dado será deletado — ficam acessíveis no "Arquivo de Temporadas".
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">Nome da Temporada a Arquivar</label>
            <input
              value={seasonTag}
              onChange={e => setSeasonTag(e.target.value)}
              placeholder="Ex: FTC-DECODE-2025 ou FRC-REEFSCAPE-2026"
              className="w-full bg-[#0B0B0D] border border-[#1F222B] text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#E10600]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Programas a arquivar</label>
            <div className="flex gap-3">
              {['FRC', 'FTC', 'FLL'].map(p => (
                <button
                  key={p}
                  onClick={() => setPrograms(prev => ({ ...prev, [p]: !prev[p] }))}
                  className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${
                    programs[p] ? 'bg-[#E10600] border-[#E10600] text-white' : 'bg-transparent border-[#1F222B] text-[#B8BDC7]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {!confirm ? (
            <button
              onClick={() => { if (!seasonTag.trim()) { toast.error('Defina o nome da temporada.'); return; } setConfirm(true); }}
              className="w-full bg-[#E10600] hover:bg-[#E10600]/90 text-white font-bold py-3 rounded-lg transition-colors"
            >
              Arquivar e Limpar Temporada
            </button>
          ) : (
            <div className="bg-[#1a0a00] border border-[#E10600]/40 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-[#E10600] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-white">
                  Confirma o arquivamento dos dados de <strong>{Object.entries(programs).filter(([,v])=>v).map(([k])=>k).join(', ')}</strong> como <strong>"{seasonTag}"</strong>?
                  <br /><span className="text-[#B8BDC7]">Os dados da temporada atual ficam preservados no arquivo. A área de trabalho começa limpa.</span>
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setConfirm(false)} className="flex-1 border border-[#1F222B] text-[#B8BDC7] py-2 rounded-lg text-sm">Cancelar</button>
                <button onClick={handleArchive} disabled={loading} className="flex-1 bg-[#E10600] text-white font-bold py-2 rounded-lg text-sm disabled:opacity-50">
                  {loading ? 'Arquivando...' : 'Sim, Arquivar Agora'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductsManagement() {
  const queryClient = useQueryClient();

  // Recupera rascunho salvo no sessionStorage se a página for recarregada ou aba alternada
  const savedDraft = loadAdminDraft('products');
  const [showForm, setShowForm] = useState(Boolean(savedDraft?.isOpen));
  const [editingProduct, setEditingProduct] = useState(
    savedDraft?.mode === 'edit' && savedDraft?.recordId
      ? { id: savedDraft.recordId, ...(savedDraft.data || {}) }
      : null
  );
  const [form, setForm] = useState(
    savedDraft?.data || { 
      name: '', 
      description: '', 
      price: 0, 
      category: 'Camisetas', 
      image_url: '', 
      available: true 
    }
  );

  const [uploadingImage, setUploadingImage] = useState(false);

  // Sincroniza rascunho da sessão sempre que os dados do formulário mudarem
  useEffect(() => {
    if (showForm) {
      saveAdminDraft('products', {
        isOpen: true,
        mode: editingProduct ? 'edit' : 'create',
        recordId: editingProduct?.id || null,
        data: form
      });
    } else {
      clearAdminDraft('products');
    }
  }, [showForm, editingProduct, form]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const resetForm = () => {
    setForm({ 
      name: '', 
      description: '', 
      price: 0, 
      category: 'Camisetas', 
      image_url: '', 
      available: true 
    });
    setEditingProduct(null);
    setUploadingImage(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (product) => {
    const editData = {
      name: product.name || '',
      description: product.description || '',
      price: product.price !== undefined ? product.price : 0,
      category: product.category || 'Camisetas',
      image_url: product.image_url || '',
      available: product.available !== undefined ? Boolean(product.available) : (product.in_stock !== undefined ? Boolean(product.in_stock) : true)
    };
    setEditingProduct(product);
    setForm(editData);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
    clearAdminDraft('products');
  };

  const createProduct = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      clearAdminDraft('products');
      closeForm();
      toast.success('Produto adicionado com sucesso!');
    },
    onError: (err) => {
      console.error('Erro ao criar produto:', err);
      toast.error('Erro ao adicionar produto: ' + (err.message || 'Verifique as permissões de administrador.'));
    }
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      clearAdminDraft('products');
      closeForm();
      toast.success('Produto atualizado com sucesso!');
    },
    onError: (err) => {
      console.error('Erro ao atualizar produto:', err);
      toast.error('Erro ao atualizar produto: ' + (err.message || 'Verifique as permissões de administrador.'));
    }
  });

  const deleteProduct = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Produto removido com sucesso!');
    },
    onError: (err) => {
      console.error('Erro ao remover produto:', err);
      toast.error('Erro ao remover produto: ' + (err.message || 'Verifique as permissões de administrador.'));
    }
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedMimeTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não suportado. Envie uma imagem JPG, PNG, WebP, GIF ou SVG.');
      return;
    }

    const maxSizeBytes = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSizeBytes) {
      toast.error('A imagem excede o tamanho máximo de 15MB permitido.');
      return;
    }

    setUploadingImage(true);
    const toastId = toast.loading('Enviando imagem para o Google Drive institucional (02. Produtos)...');
    try {
      const uploadResult = await uploadToGoogleDrive({
        file,
        context: 'products'
      });

      if (!uploadResult || !uploadResult.directUrl) {
        throw new Error('Servidor não retornou o identificador direto da mídia.');
      }

      setForm(prev => ({
        ...prev,
        image_url: uploadResult.directUrl
      }));

      toast.success('Imagem salva no Google Drive com sucesso!', { id: toastId });
    } catch (err) {
      console.error('[ProductsManagement] Erro no upload para Google Drive:', err);
      toast.error(`Falha no upload da imagem: ${err.message || 'Erro de conexão com o Google Drive.'}`, { id: toastId });
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    setForm(prev => ({ ...prev, image_url: '' }));
    toast.info('Imagem removida do formulário. Salve o produto para confirmar a alteração.');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('Informe o nome do produto.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description?.trim() || '',
      price: parseFloat(form.price) || 0,
      category: form.category || 'Camisetas',
      image_url: form.image_url || '',
      available: Boolean(form.available)
    };

    if (editingProduct) {
      updateProduct.mutate({ id: editingProduct.id, data: payload });
    } else {
      createProduct.mutate(payload);
    }
  };

  const isDriveImage = (url) => url && typeof url === 'string' && url.startsWith('/api/media/');

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold">Gerenciar Produtos</h2>
          <p className="text-sm text-[#B8BDC7]">Cadastre, edite e gerencie o estoque dos produtos oficiais da TeraShop.</p>
        </div>
        <Button onClick={openCreate} className="bg-[#E10600] hover:bg-[#E10600]/90 text-white font-medium">
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center">
          <LoadingSpinner />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-[#111217] border border-[#1F222B] rounded-2xl p-8">
          <Package className="w-12 h-12 text-[#1F222B] mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">Nenhum produto cadastrado</h3>
          <p className="text-sm text-[#B8BDC7] mb-4">Adicione o primeiro produto para começar a exibir itens na TeraShop.</p>
          <Button onClick={openCreate} className="bg-[#E10600] hover:bg-[#E10600]/90 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Cadastrar Produto
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => {
            const hasDriveImg = isDriveImage(product.image_url);
            const isAvailable = product.available !== false && product.in_stock !== false;

            return (
              <div key={product.id} className="bg-[#111217] border border-[#1F222B] rounded-xl overflow-hidden flex flex-col justify-between hover:border-[#1F222B]/80 transition-all">
                <div className="relative w-full h-40 bg-[#0B0B0D]">
                  <SafeImage 
                    src={product.image_url} 
                    alt={product.name} 
                    fit="contain"
                    allowEnlarge={true}
                    enlargeTitle="Clique para abrir a imagem do produto em nova guia"
                    containerClassName="w-full h-40 p-2"
                    fallbackIcon={<Package className="w-10 h-10 text-[#1F222B]" />}
                  />
                  <div className="absolute top-2 left-2 flex gap-1 pointer-events-none">
                    <Badge className="bg-[#111217]/90 backdrop-blur-sm border-[#1F222B] text-xs">
                      {product.category}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1 pointer-events-none">
                    {hasDriveImg && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm" title="Imagem armazenada no Google Drive institucional">
                        <HardDrive className="w-3 h-3" />
                        Drive
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h3 className="font-semibold text-white line-clamp-1">{product.name}</h3>
                      <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium shrink-0 ${isAvailable ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
                        {isAvailable ? 'Em estoque' : 'Esgotado'}
                      </span>
                    </div>
                    {product.description && (
                      <p className="text-xs text-[#B8BDC7] line-clamp-2 mb-2">{product.description}</p>
                    )}
                    <p className="text-[#E10600] font-bold text-base">
                      R$ {Number(product.price || 0).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#1F222B]">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => openEdit(product)} 
                      className="border-[#1F222B] bg-white text-zinc-900 hover:bg-zinc-100 hover:text-black flex-1 font-medium"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => {
                        if (window.confirm(`Tem certeza que deseja remover o produto "${product.name}"?`)) {
                          deleteProduct.mutate(product.id);
                        }
                      }} 
                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10 px-2.5"
                      title="Excluir produto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog Unificado: Criar / Editar Produto */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="bg-[#111217] border-[#1F222B] max-w-xl max-h-[90vh] overflow-y-auto text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              {editingProduct ? (
                <>
                  <Edit2 className="w-5 h-5 text-[#E10600]" />
                  Editar Produto
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-[#E10600]" />
                  Novo Produto
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">Nome do Produto *</Label>
              <Input 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                placeholder="Ex: Camiseta Oficial Temporada 2025"
                className="bg-[#0B0B0D] border-[#1F222B] text-white placeholder:text-zinc-500" 
                required
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">Descrição</Label>
              <Textarea 
                value={form.description} 
                onChange={(e) => setForm({ ...form, description: e.target.value })} 
                placeholder="Detalhes sobre o produto, material, tamanhos disponíveis..."
                rows={3}
                className="bg-[#0B0B0D] border-[#1F222B] text-white placeholder:text-zinc-500 resize-none" 
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-white mb-1.5 block">Preço (R$) *</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  value={form.price} 
                  onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} 
                  className="bg-[#0B0B0D] border-[#1F222B] text-white" 
                  required
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-white mb-1.5 block">Categoria *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111217] border-[#1F222B] text-white [&_*]:text-white">
                    <SelectItem value="Camisetas">Camisetas</SelectItem>
                    <SelectItem value="Canecas">Canecas</SelectItem>
                    <SelectItem value="Bottons">Bottons</SelectItem>
                    <SelectItem value="Chaveiros">Chaveiros</SelectItem>
                    <SelectItem value="Acessórios">Acessórios</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Disponibilidade / Em estoque */}
            <div className="flex items-center justify-between p-3 bg-[#0B0B0D] border border-[#1F222B] rounded-lg">
              <div>
                <Label className="text-sm font-medium text-white block cursor-pointer">Disponível para venda</Label>
                <p className="text-xs text-[#B8BDC7]">Define se o produto é exibido como disponível para pedidos na TeraShop.</p>
              </div>
              <Switch 
                checked={form.available} 
                onCheckedChange={(checked) => setForm({ ...form, available: checked })}
              />
            </div>

            {/* Imagem do Produto com Google Drive */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium text-white">Imagem do Produto</Label>
                <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-emerald-400" />
                  Google Drive institucional (02. Produtos)
                </span>
              </div>

              {form.image_url ? (
                <div className="p-3 bg-[#0B0B0D] border border-[#1F222B] rounded-lg space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 shrink-0 relative rounded-md overflow-hidden border border-[#1F222B] bg-[#111217]">
                      <SafeImage 
                        src={form.image_url} 
                        alt="Pré-visualização" 
                        fit="contain"
                        allowEnlarge={true}
                        enlargeTitle="Abrir imagem em nova guia"
                        containerClassName="w-full h-full p-1"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {isDriveImage(form.image_url) ? (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <HardDrive className="w-3 h-3" />
                            Google Drive (Ativo)
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            URL Externa / Legada
                          </span>
                        )}
                      </div>
                      <a 
                        href={form.image_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-[#E10600] hover:underline flex items-center gap-1 truncate"
                        title="Abrir imagem original em nova guia"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{form.image_url}</span>
                      </a>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleRemoveImage}
                      disabled={uploadingImage}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2"
                      title="Remover imagem"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Opção de substituir imagem */}
                  <div className="pt-2 border-t border-[#1F222B]/60 flex items-center gap-2">
                    <Label htmlFor="product-img-replace" className="cursor-pointer text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 py-1 px-2.5 rounded bg-[#111217] border border-[#1F222B] hover:border-zinc-500 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      Substituir imagem no Google Drive
                    </Label>
                    <input 
                      id="product-img-replace" 
                      type="file" 
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" 
                      onChange={handleImageUpload} 
                      disabled={uploadingImage}
                      className="hidden" 
                    />
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-[#1F222B] rounded-lg p-6 text-center bg-[#0B0B0D] hover:border-zinc-500 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-[#111217] border border-[#1F222B] flex items-center justify-center mx-auto mb-3">
                    <ImageIcon className="w-6 h-6 text-zinc-400" />
                  </div>
                  <p className="text-sm font-medium text-white mb-1">Upload para Google Drive institucional</p>
                  <p className="text-xs text-[#B8BDC7] mb-3">Selecione uma imagem (PNG, JPG, WebP, GIF, SVG - até 15MB)</p>
                  
                  <Label 
                    htmlFor="product-img-upload" 
                    className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#111217] border border-[#1F222B] text-white hover:bg-zinc-800 text-sm font-medium transition-colors ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#E10600]" />
                        Enviando ao Drive...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-[#E10600]" />
                        Selecionar Imagem do Computador
                      </>
                    )}
                  </Label>
                  <input 
                    id="product-img-upload" 
                    type="file" 
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" 
                    onChange={handleImageUpload} 
                    disabled={uploadingImage}
                    className="hidden" 
                  />
                </div>
              )}
            </div>

            {/* Botões do Formulário */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[#1F222B]">
              <Button 
                type="button" 
                variant="outline" 
                onClick={closeForm}
                disabled={uploadingImage || createProduct.isPending || updateProduct.isPending}
                className="border-[#1F222B] text-[#B8BDC7] hover:text-white"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={uploadingImage || createProduct.isPending || updateProduct.isPending}
                className="bg-[#E10600] hover:bg-[#E10600]/90 text-white font-medium min-w-[120px]"
              >
                {(createProduct.isPending || updateProduct.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : editingProduct ? (
                  'Salvar Alterações'
                ) : (
                  'Cadastrar Produto'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}