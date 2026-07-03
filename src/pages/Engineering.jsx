import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BookOpen, FlaskConical, Calendar, Cog, CheckCircle, XCircle, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const LOG_TYPE_COLORS = {
  'Reunião': 'bg-blue-900/40 text-blue-400',
  'Build': 'bg-orange-900/40 text-orange-400',
  'CAD': 'bg-purple-900/40 text-purple-400',
  'Programação': 'bg-cyan-900/40 text-cyan-400',
  'Teste': 'bg-yellow-900/40 text-yellow-400',
  'Divulgação': 'bg-green-900/40 text-green-400',
};

const CONCLUSION_CONFIG = {
  'Aprovado': { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-900/40' },
  'Refazer': { icon: RotateCcw, color: 'text-yellow-400', bg: 'bg-yellow-900/40' },
  'Cancelado': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-900/40' },
};

function LogCard({ log }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-4 text-left">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${LOG_TYPE_COLORS[log.log_type] || 'bg-white/10 text-gray-400'}`}>
          {log.log_type}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{log.what_was_done?.substring(0, 80)}</p>
          <p className="text-gray-500 text-xs mt-0.5">
            {format(new Date(log.date + 'T12:00:00'), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            {log.participants?.length > 0 && ` · ${log.participants.length} participante${log.participants.length > 1 ? 's' : ''}`}
          </p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-2">
          {log.what_was_done && <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">O que foi feito</p><p className="text-sm text-gray-300">{log.what_was_done}</p></div>}
          {log.decisions_made && <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Decisões</p><p className="text-sm text-gray-300">{log.decisions_made}</p></div>}
          {log.next_steps && <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Próximos passos</p><p className="text-sm text-gray-300">{log.next_steps}</p></div>}
          {log.evidence_images?.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-2">
              {log.evidence_images.map((img, i) => (
                <img key={i} src={img} alt="" className="w-24 h-16 object-cover rounded-lg border border-white/10" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PrototypeCard({ proto }) {
  const [open, setOpen] = useState(false);
  const config = CONCLUSION_CONFIG[proto.conclusion] || CONCLUSION_CONFIG['Refazer'];
  const Icon = config.icon;
  return (
    <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-4 text-left">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1 ${config.bg} ${config.color}`}>
          <Icon className="w-3 h-3" /> {proto.conclusion}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium">{proto.subsystem}</p>
          <p className="text-gray-500 text-xs mt-0.5">{format(new Date(proto.date + 'T12:00:00'), "d MMM yyyy", { locale: ptBR })}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-2">
          {proto.hypothesis && <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Hipótese</p><p className="text-sm text-gray-300">{proto.hypothesis}</p></div>}
          {proto.result && <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Resultado</p><p className="text-sm text-gray-300">{proto.result}</p></div>}
          {proto.lessons_learned && <div><p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Aprendizado</p><p className="text-sm text-gray-300">{proto.lessons_learned}</p></div>}
          {proto.evidence_images?.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-2">
              {proto.evidence_images.map((img, i) => (
                <img key={i} src={img} alt="" className="w-24 h-16 object-cover rounded-lg border border-white/10" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProgramView({ program, color }) {
  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['public-logs', program],
    queryFn: () => base44.entities.DailyLog.filter({ program }, '-date', 20),
    initialData: [],
  });

  const { data: prototypes = [], isLoading: protosLoading } = useQuery({
    queryKey: ['public-protos', program],
    queryFn: () => base44.entities.PrototypeTest.filter({ program }, '-date', 20),
    initialData: [],
  });

  const { data: meetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ['public-meetings', program],
    queryFn: () => base44.entities.MeetingNote.filter({ program }, '-date', 10),
    initialData: [],
  });

  const [activeTab, setActiveTab] = useState('logs');

  const approved = prototypes.filter(p => p.conclusion === 'Aprovado').length;
  const redo = prototypes.filter(p => p.conclusion === 'Refazer').length;

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Logs Registrados', value: logs.length, icon: BookOpen },
          { label: 'Protótipos', value: prototypes.length, icon: FlaskConical },
          { label: 'Aprovados', value: approved, icon: CheckCircle },
          { label: 'Reuniões', value: meetings.length, icon: Calendar },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
            className="bg-[#111] border border-white/10 rounded-xl p-4 text-center">
            <s.icon className="w-5 h-5 mx-auto mb-2" style={{ color: color }} />
            <div className="text-2xl font-black text-white">{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5 uppercase tracking-wide">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'logs', label: 'Logs Diários', icon: BookOpen },
          { id: 'prototypes', label: 'Protótipos', icon: FlaskConical },
          { id: 'meetings', label: 'Reuniões', icon: Calendar },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wide border transition-all ${
              activeTab === tab.id ? 'text-white border-transparent' : 'border-white/20 text-gray-400 hover:border-white/40 hover:text-white'
            }`}
            style={activeTab === tab.id ? { backgroundColor: color, borderColor: color } : {}}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'logs' && (
        <div className="space-y-3">
          {logsLoading ? <p className="text-gray-500 text-sm">Carregando...</p> :
           logs.length === 0 ? <p className="text-gray-500 text-sm">Nenhum log registrado ainda.</p> :
           logs.map(log => <LogCard key={log.id} log={log} />)}
        </div>
      )}

      {activeTab === 'prototypes' && (
        <div className="space-y-3">
          {protosLoading ? <p className="text-gray-500 text-sm">Carregando...</p> :
           prototypes.length === 0 ? <p className="text-gray-500 text-sm">Nenhum protótipo registrado ainda.</p> :
           prototypes.map(proto => <PrototypeCard key={proto.id} proto={proto} />)}
        </div>
      )}

      {activeTab === 'meetings' && (
        <div className="space-y-3">
          {meetingsLoading ? <p className="text-gray-500 text-sm">Carregando...</p> :
           meetings.length === 0 ? <p className="text-gray-500 text-sm">Nenhuma reunião registrada ainda.</p> :
           meetings.map(m => (
            <div key={m.id} className="bg-[#111] border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white font-medium text-sm">{m.agenda?.substring(0, 80)}</p>
                <span className="text-xs text-gray-500 flex-shrink-0 ml-3">{format(new Date(m.date + 'T12:00:00'), "d MMM yyyy", { locale: ptBR })}</span>
              </div>
              {m.final_decisions && <p className="text-xs text-gray-400 line-clamp-2">{m.final_decisions}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Engineering() {
  const [program, setProgram] = useState('FRC');

  return (
    <div className="pt-14 bg-black min-h-screen">
      {/* Hero */}
      <section className="py-16 sm:py-20 px-6 relative overflow-hidden">
        <div className="absolute -right-32 top-0 opacity-5">
          <Cog className="w-[400px] h-[400px] text-[#E10600]" style={{ transform: 'rotate(7deg)' }} />
        </div>
        <div className="max-w-5xl mx-auto relative text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-[#E10600] font-bold text-sm tracking-widest uppercase">Documentação Técnica</span>
            <h1 className="text-5xl md:text-7xl font-black text-white mt-4 mb-6 tracking-tighter">
              ENGE<span className="text-[#E10600]">NHARIA</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Acompanhe o progresso técnico da equipe: logs diários, testes de protótipos e reuniões de engenharia.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Program Tabs */}
      <div className="sticky top-14 z-40 bg-black border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 flex gap-0">
          {[
            { id: 'FRC', label: 'FRC #10343', color: '#E10600' },
            { id: 'FTC', label: 'FTC #17730', color: '#f97316' },
          ].map(p => (
            <button key={p.id} onClick={() => setProgram(p.id)}
              className={`px-6 py-4 text-sm font-black uppercase tracking-wider border-b-2 transition-all ${
                program === p.id ? 'text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
              style={program === p.id ? { borderColor: p.color, color: p.color } : {}}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <section className="py-10 px-6">
        <div className="max-w-6xl mx-auto">
          {program === 'FRC' && <ProgramView program="FRC" color="#E10600" />}
          {program === 'FTC' && <ProgramView program="FTC" color="#f97316" />}
        </div>
      </section>
    </div>
  );
}