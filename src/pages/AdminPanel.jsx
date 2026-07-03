import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { 
  Users, Settings, Clock, Check, X, Trash2, 
  Shield, Calendar, Upload, Plus, Edit2, Image,
  Package, Heart, Cpu, FolderOpen, Home, LogOut, LayoutDashboard, Archive, AlertTriangle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Badge from '@/components/common/Badge';
import CountdownTimer from '@/components/CountdownTimer';

// E-mail do admin seed (bootstrap admin) - sempre aprovado automaticamente
const SEED_ADMIN_EMAIL = 'teraroboticstl@gmail.com';

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          base44.auth.redirectToLogin(createPageUrl('AdminPanel'));
          return;
        }
        
        let userData = await base44.auth.me();
        
        // BOOTSTRAP ADMIN: Se for o e-mail seed, garantir que está approved
        if (userData.email === SEED_ADMIN_EMAIL) {
          if (userData.status !== 'approved') {
            await base44.auth.updateMe({ status: 'approved' });
            userData = await base44.auth.me();
          }
        }
        
        // Apenas admins podem acessar
        if (userData.role !== 'admin') {
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
              onClick={() => base44.auth.logout(createPageUrl('Home'))}
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

        <Tabs defaultValue="users">
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
    queryFn: () => base44.entities.Season.filter({ is_active: true }, '-created_date', 1),
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
  const [showForm, setShowForm] = useState(false);
  const [editingRobot, setEditingRobot] = useState(null);
  const [form, setForm] = useState({
    name: '', category: 'FRC', year: new Date().getFullYear(),
    season_name: '', description: '', image_url: '', game_objective: '',
    is_current: false, cad_url: ''
  });

  const { data: robots = [], isLoading } = useQuery({
    queryKey: ['admin-robots'],
    queryFn: () => base44.entities.Robot.list('-year'),
  });

  const createRobot = useMutation({
    mutationFn: (data) => base44.entities.Robot.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-robots'] });
      setShowForm(false);
      resetForm();
      toast.success('Robô criado!');
    }
  });

  const updateRobot = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Robot.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-robots'] });
      setEditingRobot(null);
      toast.success('Robô atualizado!');
    }
  });

  const deleteRobot = useMutation({
    mutationFn: (id) => base44.entities.Robot.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-robots'] });
      toast.success('Robô removido!');
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
          <div key={robot.id} className="bg-[#111217] border border-[#1F222B] rounded-xl overflow-hidden">
            {robot.image_url ? (
              <img src={robot.image_url} alt={robot.name} className="w-full h-40 object-cover" />
            ) : (
              <div className="w-full h-40 bg-[#0B0B0D] flex items-center justify-center">
                <Cpu className="w-12 h-12 text-[#1F222B]" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={robot.category.toLowerCase()}>{robot.category}</Badge>
                {robot.is_current && <Badge variant="accent">Atual</Badge>}
              </div>
              <h3 className="font-bold">{robot.name}</h3>
              <p className="text-sm text-[#B8BDC7]">Temporada {robot.year}</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => setEditingRobot(robot)} className="border-[#1F222B]">
                  <Edit2 className="w-3 h-3 mr-1" />
                  Editar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteRobot.mutate(robot.id)} className="text-red-500">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm || !!editingRobot} onOpenChange={() => { setShowForm(false); setEditingRobot(null); }}>
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
  const [showForm, setShowForm] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState(null);
  const emptyForm = { name: '', category: 'Apoio', logo_url: '', link: '', order: 0 };
  const [form, setForm] = useState(emptyForm);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const { data: sponsors = [], isLoading } = useQuery({
    queryKey: ['admin-sponsors'],
    queryFn: () => base44.entities.Sponsor.list('order'),
  });

  const createSponsor = useMutation({
    mutationFn: (data) => base44.entities.Sponsor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sponsors'] });
      setShowForm(false);
      setForm(emptyForm);
      toast.success('Patrocinador adicionado!');
    }
  });

  const updateSponsor = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Sponsor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sponsors'] });
      setEditingSponsor(null);
      toast.success('Patrocinador atualizado!');
    }
  });

  const deleteSponsor = useMutation({
    mutationFn: (id) => base44.entities.Sponsor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sponsors'] });
      toast.success('Patrocinador removido!');
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
            <img src={data.logo_url} alt="Preview" className="max-h-14 object-contain" />
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
              {sponsor.logo_url ? (
                <img src={sponsor.logo_url} alt={sponsor.name} className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-gray-600 text-xs text-center">{sponsor.name}</span>
              )}
            </div>
            <div>
              <p className="text-xs text-[#E10600] font-bold uppercase mb-0.5">{sponsor.category}</p>
              <h3 className="font-medium text-white text-sm">{sponsor.name}</h3>
              {sponsor.link && <p className="text-xs text-gray-500 truncate">{sponsor.link}</p>}
              <p className="text-xs text-gray-600">Ordem: {sponsor.order ?? 0}</p>
            </div>
            <div className="flex gap-1 mt-auto flex-wrap">
              <Button size="sm" variant="outline" onClick={() => setEditingSponsor({ ...sponsor })} className="border-[#1F222B] text-xs h-7 px-2">
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
      <Dialog open={showForm} onOpenChange={(o) => { setShowForm(o); if (!o) setForm(emptyForm); }}>
        <DialogContent className="bg-[#111217] border-[#1F222B]">
          <DialogHeader><DialogTitle>Novo Patrocinador</DialogTitle></DialogHeader>
          <SponsorForm data={form} setData={setForm} onSubmit={() => createSponsor.mutate(form)} submitLabel="Adicionar Patrocinador" />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingSponsor} onOpenChange={(o) => { if (!o) setEditingSponsor(null); }}>
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
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', date_period: '', tags: [], link: '', status: 'active' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [images, setImages] = useState([]);

  const TAG_OPTIONS = ['Educação', 'Engenharia', 'Impacto Social', 'Tecnologia'];

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });

  const createProject = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      setShowForm(false);
      setForm({ title: '', description: '', date_period: '', tags: [], link: '', status: 'active' });
      setImages([]);
      toast.success('Projeto criado!');
    }
  });

  const updateProject = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      setEditingProject(null);
      setImages([]);
      toast.success('Projeto atualizado!');
    }
  });

  const deleteProject = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      toast.success('Projeto removido!');
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
          <div key={project.id} className="bg-[#111217] border border-[#1F222B] rounded-xl overflow-hidden">
            {project.images?.[0] && (
              <img src={project.images[0]} alt={project.title} className="w-full h-36 object-cover" />
            )}
            <div className="p-4">
              <h3 className="font-bold mb-1">{project.title}</h3>
              {project.date_period && <p className="text-xs text-[#B8BDC7] mb-2">{project.date_period}</p>}
              <p className="text-sm text-[#B8BDC7] line-clamp-2 mb-3">{project.description}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {project.tags?.map((tag) => (
                  <Badge key={tag} className="text-xs">{tag}</Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setEditingProject(project); setImages(project.images || []); }} className="border-[#1F222B]">
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
      <Dialog open={!!editingProject} onOpenChange={(open) => { if (!open) { setEditingProject(null); setImages([]); } }}>
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
                        <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg" />
                        <button type="button" onClick={() => setEditingProject(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }))}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center">×</button>
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
                <Button type="button" variant="outline" onClick={() => { setEditingProject(null); setImages([]); }} className="flex-1 border-[#1F222B]">Cancelar</Button>
                <Button type="submit" className="flex-1 bg-[#E10600] hover:bg-[#E10600]/90" disabled={updateProject.isPending}>
                  {updateProject.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showForm} onOpenChange={setShowForm}>
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
                    <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded-lg" />
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

      // 2. Marcar com a tag e já guardar os IDs para deletar
      await Promise.all([
        ...logsToTag.map(r => base44.entities.DailyLog.update(r.id, { season_tag: seasonTag })),
        ...prioritiesToTag.map(r => base44.entities.Priority.update(r.id, { season_tag: seasonTag })),
        ...prototypesToTag.map(r => base44.entities.PrototypeTest.update(r.id, { season_tag: seasonTag })),
        ...meetingsToTag.map(r => base44.entities.MeetingNote.update(r.id, { season_tag: seasonTag })),
      ]);

      // 3. Deletar usando os IDs que já temos (sem precisar buscar de novo)
      await Promise.all([
        ...logsToTag.map(r => base44.entities.DailyLog.delete(r.id)),
        ...prioritiesToTag.map(r => base44.entities.Priority.delete(r.id)),
        ...prototypesToTag.map(r => base44.entities.PrototypeTest.delete(r.id)),
        ...meetingsToTag.map(r => base44.entities.MeetingNote.delete(r.id)),
      ]);

      const total = logsToTag.length + prioritiesToTag.length + prototypesToTag.length + meetingsToTag.length;
      toast.success(`✅ ${total} registros arquivados em "${seasonTag}" e removidos da área ativa!`);
      setConfirm(false);
      setSeasonTag('');
    } catch (e) {
      toast.error('Erro ao arquivar. Tente novamente.');
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
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', price: 0, category: 'Camisetas', image_url: '', available: true });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const createProduct = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setShowForm(false);
      setForm({ name: '', description: '', price: 0, category: 'Camisetas', image_url: '', available: true });
      toast.success('Produto adicionado!');
    }
  });

  const deleteProduct = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Produto removido!');
    }
  });

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, image_url: file_url }));
      toast.success('Imagem carregada!');
    } catch (err) {
      toast.error('Erro ao carregar imagem.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Gerenciar Produtos</h2>
        <Button onClick={() => setShowForm(true)} className="bg-[#E10600] hover:bg-[#E10600]/90">
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {products.map((product) => (
          <div key={product.id} className="bg-[#111217] border border-[#1F222B] rounded-xl overflow-hidden">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-32 object-cover" />
            ) : (
              <div className="w-full h-32 bg-[#0B0B0D] flex items-center justify-center">
                <Package className="w-8 h-8 text-[#1F222B]" />
              </div>
            )}
            <div className="p-4">
              <Badge className="mb-2">{product.category}</Badge>
              <h3 className="font-medium">{product.name}</h3>
              <p className="text-[#E10600] font-bold">R$ {product.price?.toFixed(2)}</p>
              <Button size="sm" variant="ghost" onClick={() => deleteProduct.mutate(product.id)} className="text-red-500 mt-2">
                <Trash2 className="w-3 h-3 mr-1" />
                Remover
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-[#111217] border-[#1F222B]">
          <DialogHeader>
            <DialogTitle>Novo Produto</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createProduct.mutate(form); }} className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-[#0B0B0D] border-[#1F222B] text-white" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-[#0B0B0D] border-[#1F222B] text-white" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Preço (R$)</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) })} className="bg-[#0B0B0D] border-[#1F222B] text-white" />
              </div>
              <div>
                <Label>Categoria</Label>
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
            <div>
              <Label>Imagem</Label>
              <Input type="file" accept="image/*" onChange={handleUpload} className="bg-[#0B0B0D] border-[#1F222B] text-white" />
            </div>
            <Button type="submit" className="w-full bg-[#E10600] hover:bg-[#E10600]/90">Adicionar Produto</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}