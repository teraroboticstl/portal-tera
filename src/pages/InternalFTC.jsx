import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Cpu, BookOpen, FlaskConical, Settings, FileText, ArrowRight, Calendar, NotebookPen } from 'lucide-react';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import Badge from '@/components/common/Badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PrioritiesBoard from '@/components/internal/PrioritiesBoard';
import FTCPDISection from '@/components/internal/FTCPDISection';

function InternalFTCContent({ user }) {
  const { data: logs = [] } = useQuery({
    queryKey: ['daily-logs', 'ftc'],
    queryFn: () => base44.entities.DailyLog.filter({ program: 'FTC' }, '-date', 5),
  });

  const { data: prototypes = [] } = useQuery({
    queryKey: ['prototypes', 'ftc'],
    queryFn: () => base44.entities.PrototypeTest.filter({ program: 'FTC' }, '-date', 5),
  });

  return (
    <InternalPageLayout user={user} currentPage="InternalFTC" title="FTC - DECODE">
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/30 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Cpu className="w-8 h-8 text-orange-500" />
            <div>
              <h2 className="text-2xl font-bold text-orange-500">FIRST Tech Challenge - DECODE</h2>
              <p className="text-[#B8BDC7]">Área interna do programa FTC</p>
            </div>
          </div>
          <p className="text-[#B8BDC7]">
            Documentação de estratégias, testes e engenharia do FTC.
            Temporada INTO THE DEEP.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { name: 'Logs FTC', icon: BookOpen, path: 'InternalLogs', description: 'Registros diários' },
            { name: 'Protótipos', icon: FlaskConical, path: 'InternalPrototypes', description: 'Testes e iterações' },
            { name: 'Reuniões', icon: Calendar, path: 'InternalMeetings', description: 'Atas e decisões' },
            { name: 'PDI Membros', icon: Settings, path: 'InternalFTCPDI', description: 'Plano de desenvolvimento' },
            { name: 'Diário de Bordo', icon: FileText, path: 'InternalBoardDiary', description: 'Engenharia, Programação e Marketing' },
          ].map((item, index) => (
            <motion.div key={item.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Link to={createPageUrl(item.path)}>
                <div className="bg-[#111217] border border-orange-500/20 rounded-xl p-6 hover:border-orange-500/50 transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <item.icon className="w-6 h-6 text-orange-500" />
                    <ArrowRight className="w-5 h-5 text-[#B8BDC7] group-hover:text-orange-500 transition-colors" />
                  </div>
                  <h3 className="font-bold mb-1">{item.name}</h3>
                  <p className="text-[#B8BDC7] text-sm">{item.description}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* PDI FTC */}
        <FTCPDISection />

        {/* Prioridades Estratégicas */}
        <PrioritiesBoard program="FTC" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-[#111217] border border-[#1F222B] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-orange-500" />
              Logs Recentes do FTC
            </h3>
            <Link to={createPageUrl('InternalLogs')} className="text-sm text-orange-500 hover:underline">Ver todos</Link>
          </div>
          {logs.length === 0 ? (
            <p className="text-[#B8BDC7] text-sm">Nenhum log do FTC ainda.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 p-3 bg-[#0B0B0D] rounded-lg">
                  <Badge>{log.log_type}</Badge>
                  <p className="text-sm flex-1 truncate">{log.what_was_done?.substring(0, 60)}...</p>
                  <span className="text-xs text-[#B8BDC7]">{format(new Date(log.date + 'T12:00:00'), "d MMM", { locale: ptBR })}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </InternalPageLayout>
  );
}

export default function InternalFTC() {
  return (
    <ProtectedRoute requireApproved={true}>
      <InternalFTCContent />
    </ProtectedRoute>
  );
}