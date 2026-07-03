import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Cog, User, X, Target, BookOpen, Lightbulb, Heart, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const PDI_SECTIONS = [
  { key: 'learning_goal', label: 'O que quer aprender nesta temporada', icon: Target },
  { key: 'how_to_learn', label: 'Como está alcançando esse objetivo', icon: Lightbulb },
  { key: 'activities', label: 'Atividades em que mais participa', icon: BookOpen },
  { key: 'main_learning', label: 'Principal aprendizado', icon: Sparkles },
  { key: 'challenge_learning', label: 'Desafio que virou aprendizado', icon: Target },
  { key: 'teamwork', label: 'Contribuição para o trabalho em equipe', icon: Heart },
  { key: 'final_reflection', label: 'O que a experiência está ensinando além da robótica', icon: Sparkles },
];

function MemberModal({ member, onClose }) {
  const filledSections = PDI_SECTIONS.filter(s => member[s.key]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={e => e.stopPropagation()}
          className="bg-[#0d0d0d] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="relative p-6 border-b border-white/10">
            <button onClick={onClose} className="absolute top-4 right-4 p-1 text-gray-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              {member.photo_url ? (
                <img src={member.photo_url} alt={member.member_name} className="w-20 h-20 rounded-xl object-cover border-2 border-[#E10600]/40" />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-white/5 border-2 border-white/10 flex items-center justify-center">
                  <User className="w-10 h-10 text-gray-600" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-black text-white">{member.member_name}</h2>
                <p className="text-gray-400 text-sm mt-0.5">{member.main_role}</p>
                {member.other_roles && <p className="text-gray-500 text-xs mt-1">{member.other_roles}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    member.program === 'FRC' ? 'bg-red-900/40 text-red-400' : 'bg-orange-900/40 text-orange-400'
                  }`}>{member.program}</span>
                  {member.time_in_team && (
                    <span className="text-xs text-gray-500">{member.time_in_team} na equipe</span>
                  )}
                  {member.season && (
                    <span className="text-xs text-gray-500">· {member.season}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* PDI Content */}
          <div className="p-6 space-y-5">
            {filledSections.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">PDI ainda não preenchido.</p>
            ) : (
              filledSections.map(section => {
                const Icon = section.icon;
                return (
                  <div key={section.key} className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 text-[#E10600] flex-shrink-0" />
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{section.label}</p>
                    </div>
                    <p className="text-sm text-gray-200 leading-relaxed">{member[section.key]}</p>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Team() {
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const { data: ftcPDIs = [] } = useQuery({
    queryKey: ['pdis-ftc-public'],
    queryFn: () => base44.entities.PDI.list('member_name'),
    initialData: [],
  });

  const { data: frcPDIs = [] } = useQuery({
    queryKey: ['pdis-frc-public'],
    queryFn: () => base44.entities.PDIFRC.list('member_name'),
    initialData: [],
  });

  const allMembers = [
    ...frcPDIs.map(m => ({ ...m, program: 'FRC' })),
    ...ftcPDIs.map(m => ({ ...m, program: 'FTC' })),
  ];

  const filtered = filter === 'all' ? allMembers : allMembers.filter(m => m.program === filter);

  const stats = [
    { value: `${allMembers.length}+`, label: 'Membros' },
    { value: `${frcPDIs.length}`, label: 'FRC' },
    { value: `${ftcPDIs.length}`, label: 'FTC' },
  ];

  return (
    <div className="pt-14 bg-black">
      {/* Hero */}
      <section className="py-20 px-6 relative overflow-hidden">
        <div className="absolute -right-32 top-1/2 -translate-y-1/2 opacity-5">
          <Cog className="w-[400px] h-[400px] text-[#E10600]" style={{ transform: 'rotate(7deg)' }} />
        </div>
        <div className="max-w-5xl mx-auto relative text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-[#E10600] font-bold text-sm tracking-widest uppercase">Nossa Família</span>
            <h1 className="text-5xl md:text-7xl font-black text-white mt-4 mb-6 tracking-tighter">
              EQUIPE & <span className="text-[#E10600]">MEMBROS</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Conheça os estudantes que fazem a TeraRobotics acontecer todos os dias. Clique em um membro para ver seu PDI completo.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-8 px-6 bg-[#E10600]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-3 gap-8">
            {stats.map((s, i) => (
              <motion.div key={s.label} className="text-center" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <div className="text-3xl md:text-4xl font-black text-white">{s.value}</div>
                <p className="text-white/80 text-sm mt-1 uppercase tracking-wider">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Filter */}
      <section className="py-10 px-6 bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-3 mb-10 justify-center flex-wrap">
            {['all', 'FRC', 'FTC'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-5 py-2 text-sm font-bold uppercase tracking-wider border transition-all ${
                  filter === f
                    ? 'bg-[#E10600] border-[#E10600] text-white'
                    : 'border-white/20 text-gray-400 hover:border-white/40 hover:text-white'
                }`}
              >
                {f === 'all' ? 'Todos' : f}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 border border-white/10">
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-black text-white mb-2 uppercase">Membros em breve</h3>
              <p className="text-gray-500">Os membros da equipe serão adicionados em breve.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filtered.map((member, index) => (
                <motion.div
                  key={`${member.program}-${member.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.04 }}
                  onClick={() => setSelected(member)}
                  className="bg-[#111] border border-white/10 rounded-xl overflow-hidden hover:border-[#E10600]/60 transition-all duration-300 flex flex-col items-center p-5 text-center cursor-pointer group"
                >
                  {member.photo_url ? (
                    <img
                      src={member.photo_url}
                      alt={member.member_name}
                      className="w-20 h-20 rounded-xl object-cover border-2 border-[#E10600]/30 mb-3 group-hover:border-[#E10600]/70 transition-all"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-white/5 border-2 border-white/10 flex items-center justify-center mb-3">
                      <User className="w-9 h-9 text-gray-600" />
                    </div>
                  )}
                  <p className="font-bold text-white text-sm leading-tight mb-1">{member.member_name}</p>
                  <p className="text-xs text-gray-400 mb-2 line-clamp-2">{member.main_role}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    member.program === 'FRC' ? 'bg-red-900/40 text-red-400' : 'bg-orange-900/40 text-orange-400'
                  }`}>
                    {member.program}
                  </span>
                  <p className="text-[10px] text-gray-600 mt-2 group-hover:text-gray-400 transition-colors">Ver PDI →</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-[#E10600]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-4 uppercase">Quer Fazer Parte?</h2>
          <p className="text-white/80">Se você é estudante do SESI Três Lagoas ou profissional interessado em ser mentor voluntário, entre em contato conosco!</p>
        </div>
      </section>

      {/* Modal */}
      {selected && <MemberModal member={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}