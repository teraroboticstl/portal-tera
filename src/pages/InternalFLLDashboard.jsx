import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import {
  Rocket, Calendar, Target, Lightbulb, Heart, Users,
  ListTodo, HelpCircle, Paperclip, ArrowRight, Trophy, AlertCircle
} from 'lucide-react';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const FLL_COLOR = 'orange';
const FLL_HEX = '#f97316';

function StatCard({ icon: IconComp, label, value, sub, color = FLL_HEX }) {
  return (
    <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
        <IconComp className="w-6 h-6" style={{ color }} />
      </div>
      <div>
        <p className="text-[#B8BDC7] text-xs uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-white">{value}</p>
        {sub && <p className="text-xs text-[#B8BDC7] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const SECTIONS = [
  { name: 'Reuniões', icon: Calendar, path: 'InternalFLLMeetings', description: 'Atas e decisões' },
  { name: 'Missões', icon: Target, path: 'InternalFLLMissions', description: 'Robot Game' },
  { name: 'Projeto de Inovação', icon: Lightbulb, path: 'InternalFLLInnovation', description: 'Documentação do projeto' },
  { name: 'Core Values', icon: Heart, path: 'InternalFLLCoreValues', description: 'Valores e atividades' },
  { name: 'Equipe', icon: Users, path: 'InternalFLLTeam', description: 'Perfis dos membros' },
  { name: 'Prioridades', icon: ListTodo, path: 'InternalFLLTasks', description: 'Tarefas e prazos' },
  { name: 'Prep. Juízes', icon: HelpCircle, path: 'InternalFLLJudgePrep', description: 'Simulados e checklists' },
  { name: 'Anexos', icon: Paperclip, path: 'InternalFLLAttachments', description: 'Fotos, docs e planilhas' },
];

function InternalFLLDashboardContent({ user }) {
  const { data: meetings = [] } = useQuery({
    queryKey: ['fll-meetings'],
    queryFn: () => base44.entities.MeetingNote.filter({ program: 'FLL' }, '-date'),
  });
  const { data: missions = [] } = useQuery({
    queryKey: ['fll-missions'],
    queryFn: () => base44.entities.FLLMission.list(),
  });
  const { data: innovation = [] } = useQuery({
    queryKey: ['fll-innovation'],
    queryFn: () => base44.entities.FLLInnovationProject.list('-date', 1),
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ['fll-tasks'],
    queryFn: () => base44.entities.FLLTask.list(),
  });

  const totalMissionScore = missions.reduce((s, m) => s + (m.best_score || 0), 0);
  const completedMissions = missions.filter(m => m.status === 'concluida').length;
  const urgentTask = tasks.find(t => t.priority === 'urgente' && t.status !== 'concluida');
  const latestProject = innovation[0];

  const statusLabel = { rascunho: 'Rascunho', em_andamento: 'Em andamento', finalizado: 'Finalizado' };
  const statusColor = { rascunho: '#6b7280', em_andamento: FLL_HEX, finalizado: '#22c55e' };

  return (
    <InternalPageLayout user={user} currentPage="InternalFLLDashboard" title="FLL — Dashboard">
      <div className="space-y-8">
        {/* Hero banner */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Rocket className="w-8 h-8 text-orange-500" />
            <div>
              <h2 className="text-2xl font-bold text-orange-500">FIRST LEGO League</h2>
              <p className="text-[#B8BDC7] text-sm">Dashboard da equipe FLL</p>
            </div>
          </div>
          <p className="text-[#B8BDC7] text-sm">Robot Game · Projeto de Inovação · Core Values</p>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Calendar} label="Reuniões" value={meetings.length} sub="registradas" />
          <StatCard icon={Trophy} label="Pontuação Missões" value={totalMissionScore} sub={`${completedMissions}/${missions.length} concluídas`} />
          <StatCard icon={Lightbulb} label="Projeto Inovação"
            value={latestProject ? statusLabel[latestProject.status] : '—'}
            sub={latestProject?.title || 'Nenhum registrado'}
            color={latestProject ? statusColor[latestProject.status] : '#6b7280'} />
          <StatCard icon={AlertCircle} label="Próxima Urgente"
            value={urgentTask ? 'URGENTE' : 'OK'}
            sub={urgentTask?.title || 'Sem pendências urgentes'}
            color={urgentTask ? '#ef4444' : '#22c55e'} />
        </motion.div>

        {/* Sections grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#B8BDC7] mb-4">Seções da FLL</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SECTIONS.map((item, index) => (
              <motion.div key={item.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.05 }}>
                <Link to={createPageUrl(item.path)}>
                  <div className="bg-[#111217] border border-orange-500/20 rounded-xl p-5 hover:border-orange-500/50 transition-all group">
                    <div className="flex items-center justify-between mb-3">
                      <item.icon className="w-5 h-5 text-orange-500" />
                      <ArrowRight className="w-4 h-4 text-[#B8BDC7] group-hover:text-orange-500 transition-colors" />
                    </div>
                    <h3 className="font-bold text-sm mb-1">{item.name}</h3>
                    <p className="text-[#B8BDC7] text-xs">{item.description}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Missões resumo */}
        {missions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-[#111217] border border-[#1F222B] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-500" /> Missões — Visão Rápida
              </h3>
              <Link to={createPageUrl('InternalFLLMissions')} className="text-sm text-orange-500 hover:underline">Ver todas</Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {missions.slice(0, 6).map(m => (
                <div key={m.id} className="bg-[#0B0B0D] rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm font-medium truncate flex-1">{m.name}</span>
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    <span className="text-orange-400 font-bold text-sm">{m.best_score}</span>
                    <span className="text-[#B8BDC7] text-xs">/ {m.max_score}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </InternalPageLayout>
  );
}

export default function InternalFLLDashboard() {
  return (
    <ProtectedRoute requireApproved={true}>
      <InternalFLLDashboardContent />
    </ProtectedRoute>
  );
}