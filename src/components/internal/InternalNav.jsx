import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  LayoutDashboard, FileText, Target, BookOpen, Lightbulb,
  Cpu, Trophy, Rocket, Settings, ChevronRight, Home, X,
  Users, FlaskConical, Calendar, Zap, Image as ImageIcon, Shield, AlertTriangle, Leaf, Calculator, Wrench, Archive,
  Heart, ListTodo, HelpCircle, Paperclip
} from 'lucide-react';

const menuItems = [
  {
    category: 'Geral',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, path: 'AreaInterna' },
      { name: 'Logs Diários', icon: BookOpen, path: 'InternalLogs' },
      { name: 'Reuniões', icon: Calendar, path: 'InternalMeetings' },
      { name: 'Protótipos', icon: FlaskConical, path: 'InternalPrototypes' },
      { name: 'Memorial', icon: Trophy, path: 'InternalMemorial' },
      { name: 'Galeria Eventos', icon: ImageIcon, path: 'InternalEventGallery' },
      { name: 'Análise de Risco', icon: AlertTriangle, path: 'InternalRiskAnalysis' },
      { name: 'Projetos & ESG', icon: Leaf, path: 'InternalProjectsDashboard' },
      { name: 'Pontuação FLL', icon: Calculator, path: 'FLLScorer' },
    ]
  },
  {
    category: 'FRC',
    color: 'red',
    items: [
      { name: 'Visão Geral', icon: Target, path: 'InternalFRC' },
      { name: 'Scout Rápido', icon: Cpu, path: 'InternalFRCScout' },
      { name: 'PDI Membros', icon: FileText, path: 'InternalFRCPDI' },
      { name: 'Diário de Bordo', icon: BookOpen, path: 'InternalBoardDiary' },
      { name: 'Assistente Geral', icon: Wrench, path: 'InternalCADAssistant' },
    ]
  },
  {
    category: 'FTC - DECODE',
    color: 'orange',
    items: [
      { name: 'Visão Geral', icon: Cpu, path: 'InternalFTC' },
      { name: 'PDI Membros', icon: BookOpen, path: 'InternalFTCPDI' },
      { name: 'Diário de Bordo', icon: FileText, path: 'InternalBoardDiary' },
    ]
  },
  {
    category: 'FLL',
    color: 'yellow',
    items: [
      { name: 'Dashboard FLL', icon: Rocket, path: 'InternalFLLDashboard' },
      { name: 'Reuniões', icon: Calendar, path: 'InternalFLLMeetings' },
      { name: 'Missões', icon: Target, path: 'InternalFLLMissions' },
      { name: 'Proj. Inovação', icon: Lightbulb, path: 'InternalFLLInnovation' },
      { name: 'Core Values', icon: Heart, path: 'InternalFLLCoreValues' },
      { name: 'Equipe', icon: Users, path: 'InternalFLLTeam' },
      { name: 'Prioridades', icon: ListTodo, path: 'InternalFLLTasks' },
      { name: 'Prep. Juízes', icon: HelpCircle, path: 'InternalFLLJudgePrep' },
      { name: 'Anexos', icon: Paperclip, path: 'InternalFLLAttachments' },
    ]
  },
];

const archiveItem = { name: 'Arquivo de Temporadas', icon: Archive, path: 'InternalSeasonArchive' };

export default function InternalNav({ currentPage, onClose, isAdmin }) {
  const location = useLocation();

  return (
    <aside className="w-64 bg-[#111217] border-r border-[#1F222B] h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#1F222B] flex items-center justify-between flex-shrink-0">
        <Link to={createPageUrl('Home')} className="flex items-center gap-3 group">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698a86446abc83aece20025a/553877171_LogoTera.png"
            alt="TeraRobotics Logo"
            className="w-10 h-10 transition-transform group-hover:scale-105"
          />
          <div>
            <span className="font-bold text-[#F5F7FA]">Tera</span>
            <span className="text-[#E10600] font-bold">Robotics</span>
            <span className="text-[#B8BDC7] text-xs block">Área Interna</span>
          </div>
        </Link>
        {onClose && (
          <button 
            onClick={onClose}
            className="lg:hidden p-2 text-[#B8BDC7] hover:text-[#F5F7FA]"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <Link 
          to={createPageUrl('Home')}
          className="flex items-center gap-2 px-3 py-2 mb-4 text-sm text-[#B8BDC7] hover:text-[#F5F7FA] hover:bg-[#1F222B] rounded-lg transition-colors"
        >
          <Home className="w-4 h-4" />
          Voltar ao Site
        </Link>

        {menuItems.map((section) => (
          <div key={section.category} className="mb-6">
            <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 px-3 ${
              section.color === 'red' ? 'text-red-500' :
              section.color === 'orange' ? 'text-orange-500' :
              section.color === 'yellow' ? 'text-yellow-500' :
              'text-[#B8BDC7]'
            }`}>
              {section.category}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = currentPage === item.path;
                return (
                  <Link
                    key={item.name}
                    to={createPageUrl(item.path)}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                      isActive
                        ? 'bg-[#E10600] text-white'
                        : 'text-[#B8BDC7] hover:text-[#F5F7FA] hover:bg-[#1F222B]'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="flex-1">{item.name}</span>
                    {isActive && <ChevronRight className="w-4 h-4" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Arquivo de Temporadas - visível para todos */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 px-3 text-[#B8BDC7]">Histórico</h3>
          <Link
            to={createPageUrl(archiveItem.path)}
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
              currentPage === archiveItem.path ? 'bg-[#E10600] text-white' : 'text-[#B8BDC7] hover:text-[#F5F7FA] hover:bg-[#1F222B]'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span className="flex-1">Arquivo de Temporadas</span>
            {currentPage === archiveItem.path && <ChevronRight className="w-4 h-4" />}
          </Link>
        </div>

        {isAdmin && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 px-3 text-[#E10600]">
              Administração
            </h3>
            <div className="space-y-1">
              <Link
                to={createPageUrl('AdminPanel')}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  currentPage === 'AdminPanel' ? 'bg-[#E10600] text-white' : 'text-[#B8BDC7] hover:text-[#F5F7FA] hover:bg-[#1F222B]'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="flex-1">Painel Admin</span>
              </Link>
              <Link
                to={createPageUrl('SeasonConfig')}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  currentPage === 'SeasonConfig' ? 'bg-[#E10600] text-white' : 'text-[#B8BDC7] hover:text-[#F5F7FA] hover:bg-[#1F222B]'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span className="flex-1">Config. Temporada</span>
              </Link>
              <Link
                to={createPageUrl('InternalAuditLog')}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  currentPage === 'InternalAuditLog' ? 'bg-[#E10600] text-white' : 'text-[#B8BDC7] hover:text-[#F5F7FA] hover:bg-[#1F222B]'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span className="flex-1">Audit Log</span>
              </Link>
              <Link
                to={createPageUrl('KnowledgeBase')}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  currentPage === 'KnowledgeBase' ? 'bg-[#E10600] text-white' : 'text-[#B8BDC7] hover:text-[#F5F7FA] hover:bg-[#1F222B]'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span className="flex-1">Base de Conhecimento</span>
              </Link>
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}