import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Menu, LogOut, Settings, Home, User, ChevronDown } from 'lucide-react';
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

  const handleLogout = async () => {
    await base44.auth.logout(createPageUrl('Home'));
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0B0B0D]/95 backdrop-blur-md border-b border-[#1F222B]">
      <div className="flex items-center justify-between px-4 lg:px-8 py-4">
        <div className="flex items-center gap-4">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 text-[#B8BDC7] hover:text-[#F5F7FA] hover:bg-[#1F222B] rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}
          <h1 className="text-xl font-bold text-[#F5F7FA]">{title || 'Área Interna'}</h1>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 text-[#B8BDC7] hover:text-[#F5F7FA] hover:bg-[#1F222B]">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698a86446abc83aece20025a/553877171_LogoTera.png"
                alt="TeraRobotics Logo"
                className="w-8 h-8 rounded-full"
              />
              <div className="hidden sm:block text-left">
                <span className="block text-sm font-medium">{user?.full_name || 'Usuário'}</span>
                <span className="block text-xs text-[#B8BDC7]">{user?.program || 'Membro'}</span>
              </div>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#111217] border-[#1F222B] w-56">
            <div className="px-3 py-2 border-b border-[#1F222B]">
              <p className="text-sm font-medium text-[#F5F7FA]">{user?.full_name}</p>
              <p className="text-xs text-[#B8BDC7]">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={user?.program?.toLowerCase() || 'default'}>
                  {user?.program || 'Membro'}
                </Badge>
                {user?.role === 'admin' && (
                  <Badge variant="accent">Admin</Badge>
                )}
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
            
            <DropdownMenuSeparator className="bg-[#1F222B]" />
            
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