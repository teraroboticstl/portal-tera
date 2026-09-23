import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Users, Clock, Heart, Cpu, FolderOpen, Home, 
  LogOut, LayoutDashboard, Archive, Shield, 
  Package, HardDrive 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Componentes Administrativos Modulares Reestruturados
import UsersManagement from '@/components/admin/UsersManagement';
import TournamentSettings from '@/components/admin/TournamentSettings';
import RobotsManagement from '@/components/admin/RobotsManagement';
import SponsorsManagement from '@/components/admin/SponsorsManagement';
import ProjectsManagement from '@/components/admin/ProjectsManagement';
import ProductsManagement from '@/components/admin/ProductsManagement';
import SeasonCloseManagement from '@/components/admin/SeasonCloseManagement';
import GoogleDriveTestManagement from '@/components/admin/GoogleDriveTestManagement';

// E-mail dos admins seed (bootstrap admin) - sempre autorizados
const SEED_ADMIN_EMAILS = ['teraroboticstl@gmail.com', 'nathannovaes16@gmail.com'];

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
        
        const isSeedAdmin = userData.email && SEED_ADMIN_EMAILS.includes(userData.email.toLowerCase());
        const userIsAdmin = userData.role === 'admin' || userData.member_role === 'admin' || isSeedAdmin;
        
        // Apenas administradores podem acessar
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
        <LoadingSpinner text="Verificando acesso administrativo..." />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white">
      {/* Admin Header */}
      <div className="bg-[#111217] border-b border-[#1F222B] px-4 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-[#E10600]" />
              Painel Admin
            </h1>
            <p className="text-[#B8BDC7] text-xs sm:text-sm mt-1">
              Gerencie usuários, vitrine, robôs, parceiros, projetos e infraestrutura
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Link to={createPageUrl('AreaInterna')}>
              <Button className="bg-[#1F222B] text-[#F5F7FA] hover:bg-[#2A2D38] border border-[#B8BDC7]/20 text-xs sm:text-sm h-8 sm:h-9">
                <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" />
                Área Interna
              </Button>
            </Link>
            <Link to={createPageUrl('Home')}>
              <Button className="bg-[#1F222B] text-[#F5F7FA] hover:bg-[#2A2D38] border border-[#B8BDC7]/20 text-xs sm:text-sm h-8 sm:h-9">
                <Home className="w-3.5 h-3.5 mr-1.5" />
                Site Público
              </Button>
            </Link>
            <Button 
              onClick={() => base44.auth.logout('/')}
              className="bg-[#E10600]/10 text-[#E10600] hover:bg-[#E10600]/20 border border-[#E10600]/30 text-xs sm:text-sm h-8 sm:h-9"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        {/* Tabs Principais */}
        <Tabs value={activeTab} onValueChange={handleTabChange} defaultValue={DEFAULT_ADMIN_TAB}>
          <div className="overflow-x-auto pb-2 mb-8">
            <TabsList className="bg-[#111217] border border-[#1F222B] inline-flex w-auto min-w-full sm:min-w-0 p-1">
              <TabsTrigger value="users" className="data-[state=active]:bg-[#E10600] text-xs sm:text-sm py-2">
                <Users className="w-4 h-4 mr-1.5" />
                Usuários
              </TabsTrigger>
              <TabsTrigger value="tournament" className="data-[state=active]:bg-[#E10600] text-xs sm:text-sm py-2">
                <Clock className="w-4 h-4 mr-1.5" />
                Torneio
              </TabsTrigger>
              <TabsTrigger value="robots" className="data-[state=active]:bg-[#E10600] text-xs sm:text-sm py-2">
                <Cpu className="w-4 h-4 mr-1.5" />
                Robôs
              </TabsTrigger>
              <TabsTrigger value="sponsors" className="data-[state=active]:bg-[#E10600] text-xs sm:text-sm py-2">
                <Heart className="w-4 h-4 mr-1.5" />
                Patrocinadores
              </TabsTrigger>
              <TabsTrigger value="projects" className="data-[state=active]:bg-[#E10600] text-xs sm:text-sm py-2">
                <FolderOpen className="w-4 h-4 mr-1.5" />
                Projetos
              </TabsTrigger>
              <TabsTrigger value="products" className="data-[state=active]:bg-[#E10600] text-xs sm:text-sm py-2">
                <Package className="w-4 h-4 mr-1.5" />
                Produtos
              </TabsTrigger>
              <TabsTrigger value="season_close" className="data-[state=active]:bg-[#E10600] text-xs sm:text-sm py-2">
                <Archive className="w-4 h-4 mr-1.5" />
                Encerrar Temporada
              </TabsTrigger>
              <TabsTrigger value="google_drive" className="data-[state=active]:bg-[#E10600] text-xs sm:text-sm py-2">
                <HardDrive className="w-4 h-4 mr-1.5" />
                Google Drive
              </TabsTrigger>
            </TabsList>
          </div>

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
