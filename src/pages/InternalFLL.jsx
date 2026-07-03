import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Rocket, BookOpen, FlaskConical, Trophy, ArrowRight, Calendar, Calculator } from 'lucide-react';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import Badge from '@/components/common/Badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PrioritiesBoard from '@/components/internal/PrioritiesBoard';
import TerAIChat from '@/components/fll/TerAIChat';

function InternalFLLContent({ user }) {
  const { data: logs = [] } = useQuery({
    queryKey: ['daily-logs', 'fll'],
    queryFn: () => base44.entities.DailyLog.filter({ program: 'FLL' }, '-date', 5),
  });

  const coreValues = [
    { emoji: '🤝', title: 'Descoberta', description: 'Exploramos novas habilidades' },
    { emoji: '💡', title: 'Inovação', description: 'Usamos criatividade' },
    { emoji: '🎯', title: 'Impacto', description: 'Melhoramos o mundo' },
    { emoji: '🤗', title: 'Inclusão', description: 'Respeitamos diferenças' },
    { emoji: '👥', title: 'Trabalho em Equipe', description: 'Somos mais fortes juntos' },
    { emoji: '🎉', title: 'Diversão', description: 'Celebramos conquistas' },
  ];

  return (
    <InternalPageLayout user={user} currentPage="InternalFLL" title="FLL">
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/30 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Rocket className="w-8 h-8 text-yellow-500" />
            <div>
              <h2 className="text-2xl font-bold text-yellow-500">FIRST LEGO League</h2>
              <p className="text-[#B8BDC7]">Área interna do programa FLL</p>
            </div>
          </div>
          <p className="text-[#B8BDC7]">
            Robot Game, Projeto de Inovação e Core Values.
            Documentação completa para a FLL Challenge.
          </p>
        </motion.div>

        {/* Scorer Button */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Link to={createPageUrl('FLLScorer')}>
            <div className="bg-gradient-to-r from-[#1a237e] to-[#283593] border border-[#3949ab] rounded-xl p-5 hover:border-yellow-400/50 transition-all group flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-400/20 rounded-xl flex items-center justify-center">
                  <Calculator className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-black text-yellow-400 text-lg">Sistema de Pontuação FLL</h3>
                  <p className="text-blue-200 text-sm">Árbitro interativo — Torneio Interclasse 2025</p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-yellow-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { name: 'Logs FLL', icon: BookOpen, path: 'InternalLogs', description: 'Registros diários' },
            { name: 'Protótipos', icon: FlaskConical, path: 'InternalPrototypes', description: 'Testes do robô' },
            { name: 'Reuniões', icon: Calendar, path: 'InternalMeetings', description: 'Atas e decisões' },
          ].map((item, index) => (
            <motion.div key={item.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Link to={createPageUrl(item.path)}>
                <div className="bg-[#111217] border border-yellow-500/20 rounded-xl p-6 hover:border-yellow-500/50 transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <item.icon className="w-6 h-6 text-yellow-500" />
                    <ArrowRight className="w-5 h-5 text-[#B8BDC7] group-hover:text-yellow-500 transition-colors" />
                  </div>
                  <h3 className="font-bold mb-1">{item.name}</h3>
                  <p className="text-[#B8BDC7] text-sm">{item.description}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Prioridades Estratégicas */}
        <PrioritiesBoard program="FLL" />

        {/* Core Values Grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="bg-[#111217] border border-[#1F222B] rounded-xl p-6">
          <h3 className="font-bold mb-4">Os 6 Core Values da FLL</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {coreValues.map((value, index) => (
              <div key={value.title} className="bg-[#0B0B0D] rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">{value.emoji}</div>
                <h4 className="font-medium text-sm">{value.title}</h4>
                <p className="text-xs text-[#B8BDC7] mt-1">{value.description}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="bg-[#111217] border border-[#1F222B] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-yellow-500" />
              Logs Recentes da FLL
            </h3>
            <Link to={createPageUrl('InternalLogs')} className="text-sm text-yellow-500 hover:underline">Ver todos</Link>
          </div>
          {logs.length === 0 ? (
            <p className="text-[#B8BDC7] text-sm">Nenhum log da FLL ainda.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 p-3 bg-[#0B0B0D] rounded-lg">
                  <Badge>{log.log_type}</Badge>
                  <p className="text-sm flex-1 truncate">{log.what_was_done?.substring(0, 60)}...</p>
                  <span className="text-xs text-[#B8BDC7]">{format(new Date(log.date), "d MMM", { locale: ptBR })}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </InternalPageLayout>
  );
}

export default function InternalFLL() {
  return (
    <ProtectedRoute requireApproved={true}>
      <InternalFLLContent />
    </ProtectedRoute>
  );
}