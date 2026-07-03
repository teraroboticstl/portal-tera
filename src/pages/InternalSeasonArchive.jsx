import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Archive, BookOpen, FlaskConical, Calendar, Target, ChevronDown, ChevronUp } from 'lucide-react';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import { Badge } from '@/components/ui/badge';

const PROGRAM_COLORS = {
  FRC: 'bg-red-500/20 text-red-400 border-red-500/30',
  FTC: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  FLL: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

function SeasonBlock({ tag, logs, priorities, prototypes, meetings }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('logs');

  const total = logs.length + priorities.length + prototypes.length + meetings.length;

  return (
    <div className="bg-[#111217] border border-[#1F222B] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 hover:bg-[#1F222B]/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#E10600]/20 rounded-xl flex items-center justify-center">
            <Archive className="w-5 h-5 text-[#E10600]" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-white">{tag}</h3>
            <p className="text-sm text-[#B8BDC7]">
              {logs.length} logs · {priorities.length} prioridades · {prototypes.length} protótipos · {meetings.length} reuniões
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-[#1F222B] text-[#B8BDC7] px-3 py-1 rounded-full">{total} registros</span>
          {open ? <ChevronUp className="w-5 h-5 text-[#B8BDC7]" /> : <ChevronDown className="w-5 h-5 text-[#B8BDC7]" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-[#1F222B]">
          {/* Tabs */}
          <div className="flex gap-1 p-4 pb-0">
            {[
              { id: 'logs', label: 'Logs', icon: BookOpen, count: logs.length },
              { id: 'priorities', label: 'Prioridades', icon: Target, count: priorities.length },
              { id: 'prototypes', label: 'Protótipos', icon: FlaskConical, count: prototypes.length },
              { id: 'meetings', label: 'Reuniões', icon: Calendar, count: meetings.length },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  tab === t.id ? 'bg-[#E10600] text-white' : 'text-[#B8BDC7] hover:bg-[#1F222B]'
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label} ({t.count})
              </button>
            ))}
          </div>

          <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
            {tab === 'logs' && (
              logs.length === 0 ? <p className="text-[#B8BDC7] text-sm">Nenhum log nesta temporada.</p> :
              logs.map(l => (
                <div key={l.id} className="bg-[#0B0B0D] rounded-lg px-4 py-3 flex items-start gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded border ${PROGRAM_COLORS[l.program] || 'bg-gray-500/20 text-gray-400'}`}>{l.program}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{l.what_was_done?.substring(0, 80) || '—'}</p>
                    <p className="text-xs text-[#B8BDC7]">{l.date} · {l.log_type}</p>
                  </div>
                </div>
              ))
            )}
            {tab === 'priorities' && (
              priorities.length === 0 ? <p className="text-[#B8BDC7] text-sm">Nenhuma prioridade nesta temporada.</p> :
              priorities.map(p => (
                <div key={p.id} className="bg-[#0B0B0D] rounded-lg px-4 py-3 flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded border ${PROGRAM_COLORS[p.program] || 'bg-gray-500/20 text-gray-400'}`}>{p.program}</span>
                  <span className="text-xs bg-[#1F222B] text-[#B8BDC7] px-2 py-0.5 rounded">{p.category}</span>
                  <p className="text-sm text-white flex-1 truncate">{p.title}</p>
                </div>
              ))
            )}
            {tab === 'prototypes' && (
              prototypes.length === 0 ? <p className="text-[#B8BDC7] text-sm">Nenhum protótipo nesta temporada.</p> :
              prototypes.map(p => (
                <div key={p.id} className="bg-[#0B0B0D] rounded-lg px-4 py-3 flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded border ${PROGRAM_COLORS[p.program] || 'bg-gray-500/20 text-gray-400'}`}>{p.program}</span>
                  <p className="text-sm text-white flex-1 truncate">{p.subsystem}</p>
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                    p.conclusion === 'Aprovado' ? 'bg-green-500/20 text-green-400' :
                    p.conclusion === 'Refazer' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>{p.conclusion}</span>
                </div>
              ))
            )}
            {tab === 'meetings' && (
              meetings.length === 0 ? <p className="text-[#B8BDC7] text-sm">Nenhuma reunião nesta temporada.</p> :
              meetings.map(m => (
                <div key={m.id} className="bg-[#0B0B0D] rounded-lg px-4 py-3 flex items-start gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded border ${PROGRAM_COLORS[m.program] || 'bg-gray-500/20 text-gray-400'}`}>{m.program}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{m.agenda?.substring(0, 80) || '—'}</p>
                    <p className="text-xs text-[#B8BDC7]">{m.date}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ArchiveContent({ user }) {
  const { data: logs = [] } = useQuery({
    queryKey: ['archive-logs'],
    queryFn: () => base44.entities.DailyLog.list('-date', 500),
  });
  const { data: priorities = [] } = useQuery({
    queryKey: ['archive-priorities'],
    queryFn: () => base44.entities.Priority.list('-created_date', 500),
  });
  const { data: prototypes = [] } = useQuery({
    queryKey: ['archive-prototypes'],
    queryFn: () => base44.entities.PrototypeTest.list('-date', 500),
  });
  const { data: meetings = [] } = useQuery({
    queryKey: ['archive-meetings'],
    queryFn: () => base44.entities.MeetingNote.list('-date', 500),
  });

  // Coletar todas as tags únicas (excluindo vazias = temporada ativa)
  const allTagged = [
    ...logs.filter(r => r.season_tag),
    ...priorities.filter(r => r.season_tag),
    ...prototypes.filter(r => r.season_tag),
    ...meetings.filter(r => r.season_tag),
  ];
  const tags = [...new Set(allTagged.map(r => r.season_tag))].sort().reverse();

  return (
    <InternalPageLayout user={user} currentPage="InternalSeasonArchive" title="Arquivo de Temporadas">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Archive className="w-6 h-6 text-[#E10600]" />
          <h2 className="text-xl font-bold text-white">Temporadas Arquivadas</h2>
        </div>
        <p className="text-[#B8BDC7] text-sm">
          Todos os dados das temporadas encerradas estão preservados aqui. Nada foi deletado.
        </p>
      </div>

      {tags.length === 0 ? (
        <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-12 text-center">
          <Archive className="w-12 h-12 text-[#1F222B] mx-auto mb-4" />
          <p className="text-[#B8BDC7]">Nenhuma temporada arquivada ainda.</p>
          <p className="text-xs text-[#B8BDC7] mt-2">Use "Encerrar Temporada" no Painel Admin para arquivar os dados atuais.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tags.map(tag => (
            <motion.div key={tag} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <SeasonBlock
                tag={tag}
                logs={logs.filter(r => r.season_tag === tag)}
                priorities={priorities.filter(r => r.season_tag === tag)}
                prototypes={prototypes.filter(r => r.season_tag === tag)}
                meetings={meetings.filter(r => r.season_tag === tag)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </InternalPageLayout>
  );
}

export default function InternalSeasonArchive() {
  return (
    <ProtectedRoute requireApproved={true}>
      <ArchiveContent />
    </ProtectedRoute>
  );
}