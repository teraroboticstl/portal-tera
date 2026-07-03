import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { Menu, X, ChevronDown, LogOut, Settings, LayoutDashboard, Calendar } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698a86446abc83aece20025a/71928ec1c_WhatsAppImage2026-02-05at171715.jpg";

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          const userData = await base44.auth.me();
          setUser(userData);
        }
      } catch (e) {}
      finally { setLoading(false); }
    };
    checkAuth();
  }, []);

  const handleLogout = async () => { await base44.auth.logout(); };

  const navLinks = [
    { name: 'Início', path: 'Home' },
    { name: 'TIR 2026', path: 'TIR2026' },
    { name: 'Quem Somos', path: 'About' },
    { name: 'Programas', path: 'Competitions' },
    { name: 'Impacto Social', path: 'Projects' },
    { name: 'Engenharia', path: 'CurrentRobot' },
    { name: 'Progresso', path: 'Engineering' },
    { name: 'Memória', path: 'Memoria' },
    { name: 'Galeria', path: 'EventGalleryPublic' },
    { name: 'CAD', path: 'CADs' },
    { name: 'Equipe', path: 'Team' },
    { name: 'Patrocinadores', path: 'Sponsors' },
    { name: 'Safety Check', path: 'SafetyCheck' },
    { name: 'Contato', path: 'Contact' },
  ];

  // Links exibidos diretamente na navbar desktop
  const primaryLinks = [
    { name: 'Início', path: 'Home' },
    { name: 'TIR 2026', path: 'TIR2026' },
    { name: 'Quem Somos', path: 'About' },
    { name: 'Programas', path: 'Competitions' },
    { name: 'Impacto Social', path: 'Projects' },
    { name: 'Engenharia', path: 'CurrentRobot' },
    { name: 'Progresso', path: 'Engineering' },
    { name: 'Memória', path: 'Memoria' },
    { name: 'Galeria', path: 'EventGalleryPublic' },
  ];

  // Links agrupados no dropdown "Mais"
  const secondaryLinks = [
    { name: 'CAD', path: 'CADs' },
    { name: 'Equipe', path: 'Team' },
    { name: 'Patrocinadores', path: 'Sponsors' },
    { name: 'Safety Check', path: 'SafetyCheck' },
    { name: 'Contato', path: 'Contact' },
  ];

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
              <img src={LOGO} alt="TeraRobotics" className="w-9 h-9 rounded-full" />
              <span className="font-black text-lg tracking-tight hidden sm:block">
                TERA<span className="text-[#E10600]">ROBOTICS</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-0 flex-1 justify-center">
              {primaryLinks.map((page) => (
                <Link
                  key={page.name}
                  to={createPageUrl(page.path)}
                  className={`px-2 py-2 text-[11px] font-medium uppercase tracking-wide transition-colors whitespace-nowrap ${
                    currentPageName === page.path ? 'text-[#E10600]' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {page.name}
                </Link>
              ))}
              {/* Dropdown "Mais" para links secundários */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 px-2 py-2 text-[11px] font-medium text-gray-300 hover:text-white uppercase tracking-wide transition-colors whitespace-nowrap">
                    Mais <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-black border-white/10">
                  {secondaryLinks.map((page) => (
                    <DropdownMenuItem key={page.name} asChild>
                      <Link
                        to={createPageUrl(page.path)}
                        className={`text-xs uppercase ${currentPageName === page.path ? 'text-[#E10600]' : 'text-gray-300 hover:text-white'}`}
                      >
                        {page.name}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Right side: badges + auth */}
            <div className="flex items-center gap-2">
              {!loading && user && (
                <Link
                  to={createPageUrl('AreaInterna')}
                  className="hidden lg:flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wide border border-white/20 text-gray-300 hover:border-[#E10600] hover:text-[#E10600] transition-colors"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" /> Área Interna
                </Link>
              )}


              {!loading && (
                user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex items-center gap-1 text-gray-300 hover:text-white hover:bg-white/10 px-2">
                        <img src={LOGO} alt="" className="w-6 h-6 rounded-full" />
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-black border-white/10 w-48">
                      <div className="px-3 py-2 border-b border-white/10">
                        <p className="text-sm font-medium text-white">{user.full_name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('AreaInterna')} className="flex items-center gap-2 text-gray-300 hover:text-white text-sm">
                          <LayoutDashboard className="w-4 h-4" /> Área Interna
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
                    onClick={() => base44.auth.redirectToLogin(window.location.pathname)}
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
                  <img src={LOGO} alt="TeraRobotics" className="w-10 h-10 rounded-full" />
                  <span className="font-black text-lg tracking-tight text-white">TERA<span className="text-[#E10600]">ROBOTICS</span></span>
                </Link>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-gray-300 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              {/* Nav links */}
              <div style={{ flex: 1, overflowY: 'auto', paddingTop: 16, paddingBottom: 16 }}>
                {navLinks.map((page) => (
                  <Link key={page.name} to={createPageUrl(page.path)} onClick={() => setMobileMenuOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', fontSize: 16, fontWeight: 500, borderLeft: `4px solid ${currentPageName === page.path ? '#E10600' : 'transparent'}`, color: currentPageName === page.path ? '#fff' : '#d1d5db', textDecoration: 'none' }}>
                    {page.name}
                  </Link>
                ))}

                {/* Auth links no mobile */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 16, paddingTop: 16, paddingLeft: 24, paddingRight: 24 }}>
                  {!loading && (
                    user ? (
                      <div>
                        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>{user.full_name}</p>
                        <Link to={createPageUrl('AreaInterna')} onClick={() => setMobileMenuOpen(false)}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: '#d1d5db', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
                          <LayoutDashboard size={16} /> Área Interna
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
                        onClick={() => { setMobileMenuOpen(false); base44.auth.redirectToLogin(window.location.pathname); }}
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
                  <img src={LOGO} alt="TeraRobotics" className="w-12 h-12 rounded-full border-2 border-[#E10600]" />
                  <div>
                    <p className="font-black text-xl tracking-tight">TERA<span className="text-[#E10600]">ROBOTICS</span></p>
                    <p className="text-gray-500 text-xs">#10343 • #17730 • FLL</p>
                  </div>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed mb-5">
                  Organização educacional de robótica do SESI Três Lagoas, participante dos programas FIRST LEGO League, FIRST Tech Challenge (#17730) e FIRST Robotics Competition (#10343).
                </p>
                <p className="text-gray-600 text-xs">Três Lagoas, Mato Grosso do Sul, Brasil</p>
              </div>

              {/* Col 2 */}
              <div>
                <h4 className="font-bold text-white text-xs uppercase tracking-widest mb-5">Navegação</h4>
                <div className="space-y-2">
                  {[
                    { label: 'Início', path: 'Home' },
                    { label: 'Quem Somos', path: 'About' },
                    { label: 'Programas', path: 'Competitions' },
                    { label: 'Impacto Social', path: 'Projects' },
                    { label: 'Engenharia', path: 'CurrentRobot' },
                    { label: 'Memória', path: 'Memoria' },
                    { label: 'Galeria', path: 'EventGalleryPublic' },

                    { label: 'CAD', path: 'CADs' },
                    { label: 'Patrocinadores', path: 'Sponsors' },
                    { label: 'Safety Check', path: 'SafetyCheck' },
                    { label: 'Contato', path: 'Contact' },
                  ].map(l => (
                    <Link key={l.path} to={createPageUrl(l.path)} className="block text-sm text-gray-500 hover:text-[#E10600] transition-colors">{l.label}</Link>
                  ))}
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