import React,{useState} from 'react';
import DemandNotifications from './DemandNotifications';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import UserAvatar from '@/components/common/UserAvatar';
import { Menu, LogOut, Settings, Home, ChevronDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Badge from '@/components/common/Badge';

export default function InternalHeader({ user, title, onMenuClick }) {
  const navigate = useNavigate();
  const [notificationsOpen,setNotificationsOpen]=useState(false);

  const handleLogout = async () => {
    await base44.auth.logout('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0B0B0D]/95 backdrop-blur-md border-b border-[#1F222B]">
      <div className="flex min-w-0 items-center justify-between gap-2 px-4 lg:px-8 py-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              aria-label="Abrir menu interno" className="lg:hidden min-h-11 min-w-11 shrink-0 p-2 text-[#B8BDC7] hover:text-[#F5F7FA] hover:bg-[#1F222B] rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}
          <h1 title={title||'Área Interna'} className="min-w-0 truncate text-base sm:text-xl font-bold text-[#F5F7FA]">{title || 'Área Interna'}</h1>
        </div>

        <div className="shrink-0"><DemandNotifications key={user?.id} actor={user?.id} open={notificationsOpen} onOpenChange={setNotificationsOpen}/></div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-label="Abrir meu perfil" variant="ghost" className="flex min-h-11 shrink-0 items-center gap-2 px-2 sm:px-3 text-[#B8BDC7] hover:text-[#F5F7FA] hover:bg-[#1F222B]">
              <UserAvatar user={user} className="w-8 h-8 text-xs" />
              <div className="hidden sm:block text-left">
                <span className="block text-sm font-medium">{user?.full_name || 'Usuário'}</span>
                <span className="block text-xs text-[#B8BDC7]">{user?.program || 'Membro'}</span>
              </div>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#111217] border-[#1F222B] w-60">
            <div className="px-3 py-2.5 border-b border-[#1F222B] flex items-center gap-2.5">
              <UserAvatar user={user} className="w-9 h-9 text-xs" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#F5F7FA] truncate">{user?.full_name}</p>
                <p className="text-xs text-[#B8BDC7] truncate">{user?.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant={user?.program?.toLowerCase() || 'default'}>
                    {user?.program || 'Membro'}
                  </Badge>
                  {user?.role === 'admin' && (
                    <Badge variant="accent">Admin</Badge>
                  )}
                </div>
              </div>
            </div>
            
            <DropdownMenuItem asChild>
              <Link to={createPageUrl('Home')} className="flex items-center gap-2 text-[#B8BDC7] hover:text-[#F5F7FA]">
                <Home className="w-4 h-4" />
                Voltar ao Site
              </Link>
            </DropdownMenuItem>
            
            {user?.role === 'admin' && (
              <DropdownMenuItem asChild>
                <Link to={createPageUrl('AdminPanel')} className="flex items-center gap-2 text-[#B8BDC7] hover:text-[#F5F7FA]">
                  <Settings className="w-4 h-4" />
                  Painel Admin
                </Link>
              </DropdownMenuItem>
            )}
            
            <DropdownMenuItem asChild>
              <Link to="/MyPDI" className="text-[#B8BDC7]">Meu PDI</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/InternalDemands?board=personal" className="text-[#B8BDC7]">Minhas demandas</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#1F222B]" />
            <DropdownMenuItem onSelect={()=>setNotificationsOpen(true)} className="text-[#B8BDC7]">Minhas notificações e contato</DropdownMenuItem>
            
            <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-[#E10600]">
              <LogOut className="w-4 h-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
