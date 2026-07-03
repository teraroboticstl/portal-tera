import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import {
  BookOpen, Calendar, FlaskConical, Target, Cpu, Rocket,
  ArrowRight, Clock, User, UserCog, Shield, AlertCircle,
  FileText, Star, Trophy, CheckCircle2, Users, BarChart2, Lightbulb
} from 'lucide-react';
import ProtectedRoute, { getUserRole, getRoleLabel, canEdit } from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import CountdownTimer from '@/components/CountdownTimer';
const LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698a86446abc83aece20025a/1062ccfa5_WhatsAppImage2026-02-05at171715.jpg";

function StatCard({ value, label, icon: Icon, color = '#E10600' }) {
  return (
    <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-5 flex items-center justify-between">
      <div>
        <div className="text-3xl font-black text-white mb-1">{value}</div>
        <div className="text-sm text-[#B8BDC7]">{label}</div>
      </div>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}22` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
    </div>
  );
}

function NavCard({ icon: Icon, title, subtitle, path, color = '#E10600' }) {
  return (
    <Link to={createPageUrl(path)}>
      <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-4 flex items-center gap-4 hover:border-[#E10600]/50 transition-all group cursor-pointer">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}22` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white text-sm">{title}</div>
          <div className="text-xs text-[#B8BDC7] truncate">{subtitle}</div>
        </div>
        <ArrowRight className="w-4 h-4 text-[#B8BDC7] group-hover:text-[#E10600] transition-colors flex-shrink-0" />
      </div>
    </Link>
  );
}

function AreaInternaContent({ user }) {
  const { data: allLogs = [] } = useQuery({
    queryKey: ['daily-logs-all'],
    queryFn: () => base44.entities.DailyLog.list('-created_date', 50),
  });

  const { data: recentMeetings = [] } = useQuery({
    queryKey: ['meetings-all'],
    queryFn: () => base44.entities.MeetingNote.list('-created_date', 20),
  });

  const { data: allPrototypes = [] } = useQuery({
    queryKey: ['prototypes-all'],
    queryFn: () => base44.entities.PrototypeTest.list('-created_date', 50),
  });

  const { data: teamLogs = [] } = useQuery({
    queryKey: ['teamlogs-all'],
    queryFn: () => base44.entities.TeamLog.list('-created_date', 50),
  });

  const { data: seasons = [] } = useQuery({
    queryKey: ['seasons-active'],
    queryFn: () => base44.entities.Season.filter({ is_active: true }, '-created_date', 1),
  });
  const activeSeason = seasons[0];

  // FLL stats
  const fllMissions = teamLogs.filter(l => l.program === 'FLL' && l.section === 'robot_game');
  const fllCoreValues = teamLogs.filter(l => l.program === 'FLL' && l.section === 'core_values');
  const fllMeetings = recentMeetings.filter(m => m.program === 'FLL');
  const fllPrototypes = allPrototypes.filter(p => p.program === 'FLL');

  // FTC stats
  const ftcLogs = allLogs.filter(l => l.program === 'FTC');
  const ftcPrototypes = allPrototypes.filter(p => p.program === 'FTC');
  const ftcApproved = ftcPrototypes.filter(p => p.conclusion === 'Aprovado').length;
  const ftcConsistency = ftcPrototypes.length > 0 ? Math.round((ftcApproved / ftcPrototypes.length) * 100) : 0;
  const ftcMeetings = recentMeetings.filter(m => m.program === 'FTC');

  // FRC stats
  const frcLogs = allLogs.filter(l => l.program === 'FRC');
  const frcPrototypes = allPrototypes.filter(p => p.program === 'FRC');
  const frcMeetings = recentMeetings.filter(m => m.program === 'FRC');

  const programData = [
    {
      key: 'FTC',
      label: 'FTC #17730',
      subtitle: 'DECODE — Prioridades, testes e engenharia do robô',
      alert: 'Lembre-se: documente CADA decisão de engenharia. Por que escolhemos essa solução? Quais alternativas testamos? Quais métricas atingimos?',
      stats: [
        { value: ftcLogs.length, label: 'Logs de Build', icon: BookOpen, color: '#E10600' },
        { value: `${ftcConsistency}%`, label: 'Taxa de Aprovação', icon: CheckCircle2, color: '#22c55e' },
        { value: ftcPrototypes.length, label: 'Protótipos Testados', icon: FlaskConical, color: '#3b82f6' },
        { value: ftcMeetings.length, label: 'Reuniões', icon: Calendar, color: '#f59e0b' },
      ],
      navCards: [
        { icon: Target, title: 'Prioridades', subtitle: 'Necessidades e metas', path: 'InternalFTC', color: '#E10600' },
        { icon: FlaskConical, title: 'Protótipos', subtitle: `${ftcPrototypes.length} testes`, path: 'InternalPrototypes', color: '#3b82f6' },
        { icon: BookOpen, title: 'Logs Diários', subtitle: `${ftcLogs.length} registros`, path: 'InternalLogs', color: '#22c55e' },
        { icon: Calendar, title: 'Reuniões', subtitle: `${ftcMeetings.length} registradas`, path: 'InternalMeetings', color: '#f59e0b' },
        { icon: BarChart2, title: 'Estatísticas', subtitle: 'Análise do robô', path: 'InternalFTC', color: '#a855f7' },
        { icon: Cpu, title: 'Engenharia', subtitle: 'CAD e sistemas', path: 'InternalFTC', color: '#06b6d4' },
      ],
      recentMeetings: ftcMeetings.slice(0, 4),
      progressItems: ftcPrototypes.slice(0, 4),
      program: 'FTC',
    },
    {
      key: 'FRC',
      label: 'FRC #10343',
      subtitle: 'REEFSCAPE — Scouting, análise e estratégia de competição',
      alert: 'Lembre-se: registre todas as análises de scouting. Dados precisos garantem melhores alianças e estratégias vencedoras.',
      stats: [
        { value: frcLogs.length, label: 'Logs de Build', icon: BookOpen, color: '#E10600' },
        { value: frcPrototypes.length, label: 'Testes Realizados', icon: FlaskConical, color: '#22c55e' },
        { value: frcMeetings.length, label: 'Reuniões', icon: Calendar, color: '#3b82f6' },
        { value: teamLogs.filter(l => l.program === 'FRC').length, label: 'Documentos', icon: FileText, color: '#f59e0b' },
      ],
      navCards: [
        { icon: Target, title: 'Plano Operacional', subtitle: 'Metas e objetivos', path: 'InternalFRC', color: '#E10600' },
        { icon: BarChart2, title: 'Scouting', subtitle: 'Análise de times', path: 'InternalFRC', color: '#3b82f6' },
        { icon: BookOpen, title: 'Logs Diários', subtitle: `${frcLogs.length} registros`, path: 'InternalLogs', color: '#22c55e' },
        { icon: Calendar, title: 'Reuniões', subtitle: `${frcMeetings.length} registradas`, path: 'InternalMeetings', color: '#f59e0b' },
        { icon: FlaskConical, title: 'Protótipos', subtitle: `${frcPrototypes.length} testes`, path: 'InternalPrototypes', color: '#a855f7' },
        { icon: Trophy, title: 'Estratégia', subtitle: 'Competição', path: 'InternalFRC', color: '#06b6d4' },
      ],
      recentMeetings: frcMeetings.slice(0, 4),
      progressItems: frcPrototypes.slice(0, 4),
      program: 'FRC',
    },
  ];

  return (
    <InternalPageLayout user={user} currentPage="AreaInterna" title="Dashboard">
      <div className="mb-8 grid md:grid-cols-3 gap-4">
        <div className="bg-[#111217] border border-yellow-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-xs font-bold text-yellow-400 uppercase tracking-widest">FLL</span>
          </div>
          <CountdownTimer
            targetDate="2026-08-04T09:00:00"
            label="Lançamento da Temporada FLL — 04/08/2026"
          />
        </div>
        <div className="bg-[#111217] border border-orange-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-xs font-bold text-orange-400 uppercase tracking-widest">FTC</span>
          </div>
          <CountdownTimer
            targetDate="2026-09-12T09:00:00"
            label="Lançamento da Temporada FTC — 12/09/2026"
          />
        </div>
        <div className="bg-[#111217] border border-red-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs font-bold text-red-500 uppercase tracking-widest">FRC</span>
          </div>
          <CountdownTimer
            targetDate="2027-01-09T09:00:00"
            label="Kickoff FRC — 09/01/2027"
          />
        </div>
      </div>
      <div className="space-y-10">
        {programData.map((prog, idx) => (
          <motion.div
            key={prog.key}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-[#0B0B0D] border border-[#1F222B] rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-4 px-6 pt-6 pb-2">
              <div>
                <h2 className="text-xl font-black text-white">{prog.label}</h2>
                <p className="text-xs text-[#B8BDC7]">{prog.subtitle}</p>
              </div>
            </div>

            {/* Alert bar */}
            <div className="mx-6 mt-3 mb-5 flex items-start gap-3 bg-[#1a0a00] border border-[#E10600]/30 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 text-[#E10600] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#B8BDC7] leading-relaxed">
                <span className="text-[#E10600] font-bold">Lembre-se: </span>{prog.alert.replace('Lembre-se: ', '')}
              </p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 mb-5">
              {prog.stats.map((s, i) => (
                <StatCard key={i} {...s} />
              ))}
            </div>

            {/* Nav cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 px-6 mb-6">
              {prog.navCards.map((c, i) => (
                <NavCard key={i} {...c} />
              ))}
            </div>

            {/* Bottom: Últimas Reuniões + Progresso */}
            <div className="grid md:grid-cols-2 gap-0 border-t border-[#1F222B]">
              {/* Últimas Reuniões */}
              <div className="p-6 border-r border-[#1F222B]">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-white">Últimas Reuniões</h4>
                  <Link to={createPageUrl('InternalMeetings')} className="text-xs text-[#E10600] hover:underline">Ver todas →</Link>
                </div>
                {prog.recentMeetings.length === 0 ? (
                  <p className="text-xs text-[#B8BDC7]">Nenhuma reunião registrada.</p>
                ) : (
                  <div className="space-y-2">
                    {prog.recentMeetings.map(m => (
                      <div key={m.id} className="flex items-center gap-3 bg-[#111217] rounded-lg px-3 py-2">
                        <Calendar className="w-4 h-4 text-[#E10600] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">{m.agenda?.substring(0, 40) || 'Sem pauta'}</p>
                          <p className="text-[10px] text-[#B8BDC7]">{m.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Progresso dos registros */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-white">
                    {prog.key === 'FLL' ? 'Progresso das Missões' : prog.key === 'FTC' ? 'Protótipos Recentes' : 'Testes e Protótipos'}
                  </h4>
                  <Link to={createPageUrl('InternalPrototypes')} className="text-xs text-[#E10600] hover:underline">Ver todas →</Link>
                </div>
                {prog.progressItems.length === 0 ? (
                  <p className="text-xs text-[#B8BDC7]">Nenhum registro ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {prog.progressItems.map((item, i) => (
                      <div key={item.id || i} className="flex items-center gap-3 bg-[#111217] rounded-lg px-3 py-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          item.conclusion === 'Aprovado' ? 'bg-green-500' :
                          item.conclusion === 'Refazer' ? 'bg-yellow-500' :
                          item.conclusion === 'Cancelado' ? 'bg-red-500' : 'bg-[#E10600]'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">{item.subsystem || item.title || 'Registro'}</p>
                          <p className="text-[10px] text-[#B8BDC7]">{item.date || item.created_date?.substring(0, 10)}</p>
                        </div>
                        {item.conclusion && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            item.conclusion === 'Aprovado' ? 'bg-green-500/20 text-green-400' :
                            item.conclusion === 'Refazer' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                          }`}>{item.conclusion}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {/* Dica de processo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-[#1a0a00] border border-[#E10600]/30 rounded-xl p-4 flex items-start gap-3"
        >
          <div className="w-8 h-8 bg-[#E10600]/20 rounded-full flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-[#E10600]" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#E10600] mb-1">Dica</p>
            <p className="text-xs text-[#B8BDC7]">Documente o <strong className="text-white">PROCESSO</strong>, não apenas os resultados. Os juízes querem ver como a equipe pensa, aprende e evolui.</p>
          </div>
        </motion.div>
      </div>
    </InternalPageLayout>
  );
}

export default function AreaInterna() {
  return (
    <ProtectedRoute requireApproved={true}>
      <AreaInternaContent />
    </ProtectedRoute>
  );
}