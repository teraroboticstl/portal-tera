import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { useAuth } from '@/lib/AuthContext';
import UserAvatar from '@/components/common/UserAvatar';
import { Menu, X, ChevronDown, ChevronRight, LogOut, Settings, LayoutDashboard, Calendar } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LOGO_MINIMALIST = "/logo-minimalist.png";
const LOGO_COMPLETE = "/logo-complete.png?v=2026";

// Estrutura hierárquica do menu público
const PUBLIC_NAV_ITEMS = [
  {
    type: 'link',
    label: 'INÍCIO',
    path: 'Home',
  },
  {
    type: 'group',
    label: 'QUEM SOMOS',
    children: [
      { label: 'Quem Somos', path: 'About' },
      { label: 'Nossa Equipe', path: 'Team' },
    ],
  },
  {
    type: 'group',
    label: 'PROGRAMAS',
    children: [
      { label: 'Visão Geral', path: 'Competitions' },
      { label: 'Olimpíada Brasileira de Robótica (OBR)', path: 'CompetitionsOBR', children: [
        { label: 'Visão Geral OBR', path: 'CompetitionsOBR' },
        { label: 'Resgate Nível 1', path: 'CompetitionsOBR#resgate-n1' },
        { label: 'Resgate Nível 2', path: 'CompetitionsOBR#resgate-n2' },
        { label: 'Artística Nível 1', path: 'CompetitionsOBR#artistica-n1' },
        { label: 'Artística Nível 2', path: 'CompetitionsOBR#artistica-n2' },
      ] },
      {
        label: 'FIRST LEGO League (FLL)',
        path: 'CompetitionsFLL',
        children: [
          { label: 'Visão Geral FLL', path: 'CompetitionsFLL' },
          { label: 'Simulador Bioglow', path: 'SimuladorFLL' },
        ],
      },
      { label: 'FIRST Tech Challenge (FTC)', path: 'CompetitionsFTC' },
      { label: 'FIRST Robotics Competition (FRC)', path: 'CompetitionsFRC' },
    ],
  },
  {
    type: 'group',
    label: 'SIMULADORES',
    children: [
      {label:'Todos os simuladores',path:'Simuladores'},
      {label:'FLL Bioglow',path:'SimuladorFLL'},
      {label:'Interclasse — Desafios da Indústria',path:'SimuladorIndustria'},
    ],
  },
  {
    type: 'link',
    label: 'PROJETOS',
    path: 'Projects',
  },
  {
    type: 'group',
    label: 'ENGENHARIA',
    children: [
      { label: 'Robô Atual', path: 'CurrentRobot' },
      { label: 'Desenvolvimento / Progresso', path: 'Engineering' },
      { label: 'CADs', path: 'CADs' },
    ],
  },
  {
    type: 'group',
    label: 'HISTÓRIA',
    children: [
      { label: 'Memória Tera', path: 'Memoria' },
      { label: 'Memorial', path: 'Memorial' },
      { label: 'Galeria', path: 'EventGalleryPublic' },
    ],
  },
  {
    type: 'group',
    label: 'MAIS',
    children: [
      { label: 'Cursos', path: 'AVA' },
      { label: 'TIR 2026', path: 'TIR2026' },
      { label: 'Patrocinadores', path: 'Sponsors' },
      { label: 'Contato', path: 'Contact' },
      { label: 'Safety Check', path: 'SafetyCheck' },
    ],
  },
];

// Item do submenu desktop com suporte a flyout flutuante para filhos aninhados
function NavSubDropdownItem({ sub, currentPageName, onCloseParent }) {
  const [subOpen, setSubOpen] = useState(false);
  const timeoutRef = useRef(null);
  const containerRef = useRef(null);

  const hasChildren = sub.children && sub.children.length > 0;
  const isDirectActive = sub.path === currentPageName;
  const isSubActive = isDirectActive || (hasChildren && sub.children.some(c => c.path === currentPageName));

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setSubOpen(true);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setSubOpen(false);
    }, 180);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!hasChildren) {
    return (
      <Link
        key={sub.path}
        to={createPageUrl(sub.path)}
        role="menuitem"
        onClick={onCloseParent}
        className={`w-full px-3.5 py-2 text-xs transition-colors flex items-center justify-between rounded-md cursor-pointer ${
          isDirectActive
            ? 'text-white bg-black font-bold shadow-sm'
            : 'text-white hover:text-white hover:bg-black font-medium'
        }`}
      >
        <span>{sub.label}</span>
        {isDirectActive && (
          <span className="w-1.5 h-1.5 rounded-full bg-white ml-2 flex-shrink-0" />
        )}
      </Link>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`w-full flex items-center justify-between rounded-md transition-colors cursor-pointer ${
          isSubActive || subOpen
            ? 'text-white bg-black font-bold shadow-sm'
            : 'text-white hover:text-white hover:bg-black font-medium'
        }`}
      >
        <Link
          to={createPageUrl(sub.path)}
          role="menuitem"
          onClick={onCloseParent}
          className="flex-1 px-3.5 py-2 text-xs flex items-center justify-between"
        >
          <span>{sub.label}</span>
          {isDirectActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-white ml-2 flex-shrink-0" />
          )}
        </Link>
        <button
          type="button"
          aria-expanded={subOpen}
          aria-haspopup="true"
          onClick={(e) => {
            e.stopPropagation();
            setSubOpen((prev) => !prev);
          }}
          className="px-2 py-2 text-white/80 hover:text-white focus:outline-none"
          title="Ver submenu"
        >
          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-150 ${subOpen ? 'translate-x-0.5' : ''}`} />
        </button>
      </div>

      {subOpen && (
        <div
          className="absolute left-full top-0 pl-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-150"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div
            role="menu"
            aria-orientation="vertical"
            className="bg-[#E10600] border border-black/20 shadow-2xl rounded-lg py-1.5 px-1.5 min-w-[210px]"
          >
            {sub.children.map((child) => {
              const isChildActive = child.path === currentPageName;
              return (
                <Link
                  key={child.path}
                  to={createPageUrl(child.path)}
                  role="menuitem"
                  onClick={onCloseParent}
                  className={`w-full px-3.5 py-2 text-xs transition-colors flex items-center justify-between rounded-md cursor-pointer ${
                    isChildActive
                      ? 'text-white bg-black font-bold shadow-sm'
                      : 'text-white hover:text-white hover:bg-black font-medium'
                  }`}
                >
                  <span>{child.label}</span>
                  {isChildActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white ml-2 flex-shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Submenu dropdown para desktop com suporte contínuo a hover, clique e teclado
function NavDropdown({ item, currentPageName }) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef(null);
  const containerRef = useRef(null);

  const isGroupActive = item.children?.some(c =>
    c.path === currentPageName || (c.children && c.children.some(sub => sub.path === currentPageName))
  );

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setOpen(true);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 200);
  };

  const handleToggleClick = (e) => {
    e.stopPropagation();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setOpen((prev) => !prev);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
    }
  };

  // Fecha dropdown ao clicar fora ou pressionar Escape
  useEffect(() => {
    if (!open) return;
    const handleDocumentClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleDocumentKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleDocumentKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, [open]);

  // Limpa timer ao desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleToggleClick}
        onKeyDown={handleKeyDown}
        aria-haspopup="true"
        aria-expanded={open}
        className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] xl:text-xs font-semibold uppercase tracking-wider transition-colors rounded hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E10600] whitespace-nowrap ${
          isGroupActive || open
            ? 'text-[#E10600]'
            : 'text-gray-300 hover:text-white'
        }`}
      >
        <span>{item.label}</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${
            open ? 'rotate-180 text-[#E10600]' : 'text-gray-400'
          }`}
        />
      </button>

      {/* Região contínua do submenu sem gap ou zona morta */}
      {open && (
        <div
          className="absolute top-full left-0 pt-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-150"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div
            role="menu"
            aria-orientation="vertical"
            className="bg-[#E10600] border border-black/20 shadow-2xl rounded-lg py-1.5 px-1.5 min-w-[220px]"
          >
            {item.children.map((sub) => (
              <NavSubDropdownItem
                key={sub.label}
                sub={sub}
                currentPageName={currentPageName}
                onCloseParent={() => setOpen(false)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Submenu expansível no mobile
function MobileSubGroup({ child, currentPageName, onClose, initialExpanded = false }) {
  const [nestedExpanded, setNestedExpanded] = useState(initialExpanded);
  const isDirectActive = child.path === currentPageName;

  return (
    <div className="space-y-1">
      <div className={`flex items-center justify-between py-1.5 px-2.5 rounded transition-colors ${
        nestedExpanded ? 'bg-white/5' : ''
      }`}>
        <Link
          to={createPageUrl(child.path)}
          onClick={onClose}
          className={`flex-1 text-xs font-semibold ${
            isDirectActive ? 'text-[#E10600]' : 'text-gray-200 hover:text-white'
          }`}
        >
          {child.label}
        </Link>
        <button
          type="button"
          onClick={() => setNestedExpanded(!nestedExpanded)}
          className="p-1.5 text-gray-400 hover:text-white focus:outline-none"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              nestedExpanded ? 'rotate-180 text-[#E10600]' : ''
            }`}
          />
        </button>
      </div>

      {nestedExpanded && (
        <div className="pl-3 pr-1 py-1 space-y-1 border-l-2 border-[#E10600]/40 ml-2">
          {child.children.map((subChild) => {
            const isSelected = subChild.path === currentPageName;
            return (
              <Link
                key={subChild.path}
                to={createPageUrl(subChild.path)}
                onClick={onClose}
                className={`flex items-center justify-between py-2 px-3 text-xs rounded transition-colors ${
                  isSelected
                    ? 'text-white bg-[#E10600] font-bold shadow-[0_0_12px_rgba(225,6,0,0.3)]'
                    : 'text-gray-300 hover:text-white hover:bg-white/5 font-medium'
                }`}
              >
                <span>{subChild.label}</span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white ml-2 flex-shrink-0" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Seção expansível do menu mobile
function MobileNavGroup({ item, currentPageName, onClose }) {
  const isChildActive = item.children?.some(c =>
    c.path === currentPageName || (c.children && c.children.some(sub => sub.path === currentPageName))
  );
  const [expanded, setExpanded] = useState(isChildActive);

  return (
    <div className="border-b border-white/5">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between py-3.5 px-5 text-sm font-semibold tracking-wider uppercase text-left transition-colors hover:bg-white/[0.02]"
      >
        <span className={isChildActive ? 'text-[#E10600] font-bold' : 'text-gray-200'}>
          {item.label}
        </span>
        <div className="flex items-center gap-2">
          {isChildActive && (
            <span className="text-[10px] bg-[#E10600]/20 text-[#E10600] px-2 py-0.5 rounded font-mono">
              Ativo
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              expanded ? 'rotate-180 text-[#E10600]' : 'text-gray-400'
            }`}
          />
        </div>
      </button>

      {expanded && (
        <div className="bg-white/[0.02] py-1 pl-4 pr-3 border-l-2 border-[#E10600]/40 ml-5 mr-4 mb-2 space-y-1 rounded-r">
          {item.children.map((child) => {
            const hasNested = child.children && child.children.length > 0;
            if (hasNested) {
              const isNestedActive = child.path === currentPageName || child.children.some(c => c.path === currentPageName);
              return (
                <MobileSubGroup
                  key={child.label}
                  child={child}
                  currentPageName={currentPageName}
                  onClose={onClose}
                  initialExpanded={isNestedActive}
                />
              );
            }

            const isSelected = child.path === currentPageName;
            return (
              <Link
                key={child.path}
                to={createPageUrl(child.path)}
                onClick={onClose}
                className={`flex items-center justify-between py-2.5 px-3 text-xs rounded transition-colors ${
                  isSelected
                    ? 'text-white bg-[#E10600] font-bold shadow-[0_0_12px_rgba(225,6,0,0.3)]'
                    : 'text-gray-300 hover:text-white hover:bg-white/5 font-medium'
                }`}
              >
                <span>{child.label}</span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white ml-2 flex-shrink-0" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const { user, isLoadingAuth: loading, logout, navigateToLogin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => { 
    await logout(true); 
  };

  const isInternalPage = currentPageName?.startsWith('Internal') || currentPageName === 'AdminPanel' || currentPageName === 'SeasonConfig' || currentPageName === 'AreaInterna';
  const isPublicPage = !isInternalPage;

  return (
    <div className="min-h-screen bg-black text-white">
      <style>{`
        * { scrollbar-width: thin; scrollbar-color: #333 #000; }
        *::-webkit-scrollbar { width: 6px; }
        *::-webkit-scrollbar-track { background: #000; }
        *::-webkit-scrollbar-thumb { background-color: #333; border-radius: 3px; }
      `}</style>

      {/* NAVBAR */}
      {isPublicPage && (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">

            {/* Logo */}
            <Link to={createPageUrl('Home')} className="flex items-center gap-2 flex-shrink-0">
              <img src={LOGO_MINIMALIST} alt="TeraRobotics" className="w-9 h-9 object-contain" />
              <span className="font-black text-lg tracking-tight hidden sm:block">
                TERA<span className="text-[#E10600]">ROBOTICS</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-0.5 xl:gap-1.5 flex-1 justify-center">
              {PUBLIC_NAV_ITEMS.map((item) => {
                if (item.type === 'link') {
                  const isActive = currentPageName === item.path;
                  return (
                    <Link
                      key={item.label}
                      to={createPageUrl(item.path)}
                      className={`px-2.5 py-1.5 text-[11px] xl:text-xs font-semibold uppercase tracking-wider transition-colors rounded hover:bg-white/[0.05] whitespace-nowrap ${
                        isActive ? 'text-[#E10600]' : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                }
                return (
                  <NavDropdown
                    key={item.label}
                    item={item}
                    currentPageName={currentPageName}
                  />
                );
              })}
            </div>

            {/* Right side: badges + auth */}
            <div className="flex items-center gap-2">
              <Link
                to={createPageUrl(user && !user.portal_internal ? 'AVA' : 'AreaInterna')}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-[#E10600]/40 text-gray-200 bg-[#E10600]/10 hover:bg-[#E10600] hover:text-white hover:border-[#E10600] transition-all rounded"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-[#E10600]" />
                <span>{user && !user.portal_internal?'Trilhas de Aprendizagem':'Área Interna'}</span>
              </Link>

              {!loading && (
                user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex items-center gap-1.5 text-gray-300 hover:text-white hover:bg-white/10 px-2">
                        <UserAvatar user={user} className="w-6 h-6 text-[10px]" />
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-black border-white/10 w-52">
                      <div className="px-3 py-2.5 border-b border-white/10 flex items-center gap-2.5">
                        <UserAvatar user={user} className="w-8 h-8 text-xs" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                      </div>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl(user && !user.portal_internal ? 'AVA' : 'AreaInterna')} className="flex items-center gap-2 text-gray-300 hover:text-white text-sm">
                          <LayoutDashboard className="w-4 h-4" /> {user && !user.portal_internal?'Trilhas de Aprendizagem':'Área Interna'}
                        </Link>
                      </DropdownMenuItem>
                      {(user.role === 'admin' || user.member_role === 'admin') && (
                        <>
                          <DropdownMenuItem asChild>
                            <Link to={createPageUrl('AdminPanel')} className="flex items-center gap-2 text-gray-300 hover:text-white text-sm">
                              <Settings className="w-4 h-4" /> Painel Admin
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={createPageUrl('SeasonConfig')} className="flex items-center gap-2 text-gray-300 hover:text-white text-sm">
                              <Calendar className="w-4 h-4" /> Config. Temporada
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-[#E10600] text-sm">
                        <LogOut className="w-4 h-4" /> Sair
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => navigateToLogin(window.location.href)}
                    className="bg-[#E10600] hover:bg-[#7A0000] text-white font-bold text-xs uppercase"
                  >
                    Entrar
                  </Button>
                )
              )}

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-gray-300 hover:text-white"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile menu - rendered via portal to escape any stacking context */}
          {mobileMenuOpen && createPortal(
            <div style={{ position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: '#000', display: 'flex', flexDirection: 'column' }}>
              {/* Mobile header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <Link to={createPageUrl('Home')} className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                  <img src={LOGO_MINIMALIST} alt="TeraRobotics" className="w-10 h-10 object-contain" />
                  <span className="font-black text-lg tracking-tight text-white">TERA<span className="text-[#E10600]">ROBOTICS</span></span>
                </Link>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-gray-300 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              {/* Nav links */}
              <div style={{ flex: 1, overflowY: 'auto', paddingTop: 8, paddingBottom: 24 }}>
                {/* Destaque Área Interna no topo do menu mobile */}
                <div className="px-5 py-3 border-b border-white/10 mb-2">
                  <Link
                    to={createPageUrl(user && !user.portal_internal ? 'AVA' : 'AreaInterna')}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-[#E10600] hover:bg-[#7A0000] text-white font-bold text-xs uppercase tracking-wider rounded transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>{user && !user.portal_internal?'Trilhas de Aprendizagem':'Acessar Área Interna'}</span>
                  </Link>
                </div>

                {PUBLIC_NAV_ITEMS.map((item) => {
                  if (item.type === 'link') {
                    const isSelected = currentPageName === item.path;
                    return (
                      <Link
                        key={item.label}
                        to={createPageUrl(item.path)}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between py-3.5 px-5 text-sm font-semibold tracking-wider uppercase border-b border-white/5 transition-colors ${
                          isSelected
                            ? 'text-white bg-[#E10600] font-bold shadow-[0_0_12px_rgba(225,6,0,0.3)]'
                            : 'text-gray-300 hover:text-white hover:bg-white/[0.02]'
                        }`}
                      >
                        <span>{item.label}</span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white ml-2 flex-shrink-0" />
                        )}
                      </Link>
                    );
                  }
                  return (
                    <MobileNavGroup
                      key={item.label}
                      item={item}
                      currentPageName={currentPageName}
                      onClose={() => setMobileMenuOpen(false)}
                    />
                  );
                })}

                {/* Auth links no mobile */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 16, paddingTop: 16, paddingLeft: 24, paddingRight: 24 }}>
                  {!loading && (
                    user ? (
                      <div>
                        <div className="flex items-center gap-3 mb-3 pb-2 border-b border-white/5">
                          <UserAvatar user={user} className="w-9 h-9 text-xs" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate m-0">{user.full_name}</p>
                            <p className="text-xs text-gray-400 truncate m-0">{user.email}</p>
                          </div>
                        </div>
                        <Link to={createPageUrl(user && !user.portal_internal ? 'AVA' : 'AreaInterna')} onClick={() => setMobileMenuOpen(false)}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: '#d1d5db', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
                          <LayoutDashboard size={16} /> {user && !user.portal_internal?'Trilhas de Aprendizagem':'Área Interna'}
                        </Link>
                        {(user.role === 'admin' || user.member_role === 'admin') && (
                          <>
                            <Link to={createPageUrl('AdminPanel')} onClick={() => setMobileMenuOpen(false)}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: '#d1d5db', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
                              <Settings size={16} /> Painel Admin
                            </Link>
                            <Link to={createPageUrl('SeasonConfig')} onClick={() => setMobileMenuOpen(false)}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: '#d1d5db', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
                              <Calendar size={16} /> Config. Temporada
                            </Link>
                          </>
                        )}
                        <button onClick={handleLogout}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: '#E10600', fontSize: 14, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}>
                          <LogOut size={16} /> Sair
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setMobileMenuOpen(false); navigateToLogin(window.location.href); }}
                        style={{ width: '100%', padding: '12px 0', backgroundColor: '#E10600', color: '#fff', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                        Entrar
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>,
            document.body
          )}
        </nav>
      )}

      {/* CONTENT */}
      <main className={isPublicPage ? 'pt-14' : ''}>
        {children}
      </main>

      {/* FOOTER */}
      {isPublicPage && (
        <footer className="bg-black border-t border-white/10 mt-0">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">

              {/* Col 1 */}
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <img src={LOGO_COMPLETE} alt="TeraRobotics" className="w-14 h-14 object-contain" />
                  <div>
                    <p className="font-black text-xl tracking-tight">TERA<span className="text-[#E10600]">ROBOTICS</span></p>
                    <p className="text-gray-500 text-xs">#10343 • #17730 • FLL • OBR</p>
                  </div>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed mb-5">
                  Organização educacional de robótica do SESI Três Lagoas, atuante na OBR e nos programas FIRST LEGO League, FIRST Tech Challenge (#17730) e FIRST Robotics Competition (#10343).
                </p>
                <p className="text-gray-600 text-xs">Três Lagoas, Mato Grosso do Sul, Brasil</p>
              </div>

              {/* Col 2 */}
              <div>
                <h4 className="font-bold text-white text-xs uppercase tracking-widest mb-5">Navegação</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Institucional</p>
                    <div className="space-y-1 mb-3">
                      <Link to={createPageUrl('Home')} className="block text-gray-500 hover:text-[#E10600] transition-colors">Início</Link>
                      <Link to={createPageUrl('About')} className="block text-gray-500 hover:text-[#E10600] transition-colors">Quem Somos</Link>
                      <Link to={createPageUrl('Team')} className="block text-gray-500 hover:text-[#E10600] transition-colors">Nossa Equipe</Link>
                    </div>

                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Programas</p>
                    <div className="space-y-1 mb-3">
                      <Link to={createPageUrl('Competitions')} className="block text-gray-500 hover:text-[#E10600] transition-colors">Visão Geral</Link>
                      <Link to={createPageUrl('CompetitionsOBR')} className="block text-gray-500 hover:text-[#E10600] transition-colors">OBR</Link>
                      <Link to={createPageUrl('CompetitionsFLL')} className="block text-gray-500 hover:text-[#E10600] transition-colors">FLL</Link>
                      <Link to={createPageUrl('CompetitionsFTC')} className="block text-gray-500 hover:text-[#E10600] transition-colors">FTC</Link>
                      <Link to={createPageUrl('CompetitionsFRC')} className="block text-gray-500 hover:text-[#E10600] transition-colors">FRC</Link>
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Engenharia & Histórico</p>
                    <div className="space-y-1 mb-3">
                      <Link to={createPageUrl('Projects')} className="block text-gray-500 hover:text-[#E10600] transition-colors">Projetos</Link>
                      <Link to={createPageUrl('CurrentRobot')} className="block text-gray-500 hover:text-[#E10600] transition-colors">Robô Atual</Link>
                      <Link to={createPageUrl('Engineering')} className="block text-gray-500 hover:text-[#E10600] transition-colors">Desenvolvimento</Link>
                      <Link to={createPageUrl('CADs')} className="block text-gray-500 hover:text-[#E10600] transition-colors">CADs</Link>
                      <Link to={createPageUrl('Memoria')} className="block text-gray-500 hover:text-[#E10600] transition-colors">Memória Tera</Link>
                      <Link to={createPageUrl('Memorial')} className="block text-gray-500 hover:text-[#E10600] transition-colors">Memorial</Link>
                      <Link to={createPageUrl('EventGalleryPublic')} className="block text-gray-500 hover:text-[#E10600] transition-colors">Galeria</Link>
                    </div>

                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Mais</p>
                    <div className="space-y-1">
                      <Link to={createPageUrl('TIR2026')} className="block text-gray-500 hover:text-[#E10600] transition-colors">TIR 2026</Link>
                      <Link to={createPageUrl('Sponsors')} className="block text-gray-500 hover:text-[#E10600] transition-colors">Patrocinadores</Link>
                      <Link to={createPageUrl('Contact')} className="block text-gray-500 hover:text-[#E10600] transition-colors">Contato</Link>
                      <Link to={createPageUrl('SafetyCheck')} className="block text-gray-500 hover:text-[#E10600] transition-colors">Safety Check</Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Col 3 */}
              <div>
                <h4 className="font-bold text-white text-xs uppercase tracking-widest mb-5">Conecte-se</h4>
                <div className="flex items-center gap-3 mb-6">
                  {[
                    { href: 'https://www.instagram.com/terarobotics', svg: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> },
                    { href: 'https://www.youtube.com/@terarobotics', svg: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg> },

                  ].map((s, i) => (
                    <a key={i} href={s.href} target="_blank" rel="noopener noreferrer"
                      className="w-10 h-10 border border-white/10 flex items-center justify-center text-gray-400 hover:border-[#E10600] hover:text-[#E10600] transition-colors">
                      {s.svg}
                    </a>
                  ))}
                </div>
                <div className="space-y-2">
                  <a href="mailto:teraroboticstl@gmail.com"
                    className="flex items-center gap-2 text-[#E10600] hover:text-[#E10600]/80 transition-colors text-sm font-bold uppercase tracking-wide">
                    teraroboticstl@gmail.com
                  </a>
                  <p className="text-gray-400 text-sm">(67) 9243-5724 — Bertoloto</p>
                  <p className="text-gray-400 text-sm">(67) 9202-0288 — Anajara</p>
                </div>
              </div>

            </div>

            {/* Bottom */}
            <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
              <p>© {new Date().getFullYear()} TeraRobotics. Todos os direitos reservados.</p>
              <p className="text-center">Participante oficial dos programas FIRST® LEGO® League, FIRST® Tech Challenge e FIRST® Robotics Competition.</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}