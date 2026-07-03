import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Target, BookOpen, FlaskConical, Trophy, FileText, ArrowRight, Calendar, Wrench } from 'lucide-react';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import Badge from '@/components/common/Badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PrioritiesBoard from '@/components/internal/PrioritiesBoard';

function InternalFRCContent({ user }) {
  const { data: logs = [] } = useQuery({
    queryKey: ['daily-logs', 'frc'],
    queryFn: () => base44.entities.DailyLog.filter({ program: 'FRC' }, '-date', 5),
  });

  const { data: prototypes = [] } = useQuery({
    queryKey: ['prototypes', 'frc'],
    queryFn: () => base44.entities.PrototypeTest.filter({ program: 'FRC' }, '-date', 5),
  });

  const quickLinks = [
    { name: 'Logs FRC', icon: BookOpen, path: 'InternalLogs', description: 'Registros diários do FRC' },
    { name: 'Protótipos FRC', icon: FlaskConical, path: 'InternalPrototypes', description: 'Testes e iterações' },
    { name: 'Reuniões', icon: Calendar, path: 'InternalMeetings', description: 'Atas e decisões' },
    { name: 'Assistente CAD', icon: Wrench, path: 'InternalCADAssistant', description: 'IA especializada em Onshape & FRC' },
    { name: 'Diário de Bordo', icon: BookOpen, path: 'InternalBoardDiary', description: 'Engenharia, Programação e Marketing' },
  ];

  return (
    <InternalPageLayout user={user} currentPage="InternalFRC" title="FRC">
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/30 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-8 h-8 text-red-500" />
            <div>
              <h2 className="text-2xl font-bold text-red-500">FIRST Robotics Competition</h2>
              <p className="text-[#B8BDC7]">Área interna do programa FRC</p>
            </div>
          </div>
          <p className="text-[#B8BDC7]">
            Aqui você encontra o plano operacional, prioridades, logs e testes do FRC.
            Mantenha tudo documentado seguindo o padrão Judge Ready.
          </p>
        </motion.div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-4">
          {quickLinks.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={createPageUrl(item.path) + '?program=FRC'}>
                <div className="bg-[#111217] border border-red-500/20 rounded-xl p-6 hover:border-red-500/50 transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <item.icon className="w-6 h-6 text-red-500" />
                    <ArrowRight className="w-5 h-5 text-[#B8BDC7] group-hover:text-red-500 transition-colors" />
                  </div>
                  <h3 className="font-bold mb-1">{item.name}</h3>
                  <p className="text-[#B8BDC7] text-sm">{item.description}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Prioridades Estratégicas */}
        <PrioritiesBoard program="FRC" />

        {/* Recent Logs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#111217] border border-[#1F222B] rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-red-500" />
              Logs Recentes do FRC
            </h3>
            <Link to={createPageUrl('InternalLogs')} className="text-sm text-red-500 hover:underline">
              Ver todos
            </Link>
          </div>
          {logs.length === 0 ? (
            <p className="text-[#B8BDC7] text-sm">Nenhum log do FRC ainda.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 p-3 bg-[#0B0B0D] rounded-lg">
                  <Badge>{log.log_type}</Badge>
                  <p className="text-sm flex-1 truncate">{log.what_was_done?.substring(0, 60)}...</p>
                  <span className="text-xs text-[#B8BDC7]">
                    {format(new Date(log.date), "d MMM", { locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent Prototypes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-[#111217] border border-[#1F222B] rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-red-500" />
              Protótipos Recentes do FRC
            </h3>
            <Link to={createPageUrl('InternalPrototypes')} className="text-sm text-red-500 hover:underline">
              Ver todos
            </Link>
          </div>
          {prototypes.length === 0 ? (
            <p className="text-[#B8BDC7] text-sm">Nenhum protótipo do FRC ainda.</p>
          ) : (
            <div className="space-y-3">
              {prototypes.map((proto) => (
                <div key={proto.id} className="flex items-center gap-3 p-3 bg-[#0B0B0D] rounded-lg">
                  <span className={`w-2 h-2 rounded-full ${
                    proto.conclusion === 'Aprovado' ? 'bg-green-500' :
                    proto.conclusion === 'Refazer' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <p className="text-sm font-medium">{proto.subsystem}</p>
                  <Badge className={
                    proto.conclusion === 'Aprovado' ? 'bg-green-500/20 text-green-400' :
                    proto.conclusion === 'Refazer' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }>{proto.conclusion}</Badge>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </InternalPageLayout>
  );
}

export default function InternalFRC() {
  return (
    <ProtectedRoute requireApproved={true}>
      <InternalFRCContent />
    </ProtectedRoute>
  );
}