import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Bot, Users, Shirt, ChevronDown, ChevronLeft, ChevronRight,
  X, Trophy, MapPin, Calendar, Award, Play, Star
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

// ── TIMELINE estática da história da Tera ──────────────────────────────────
// Cada entrada representa uma temporada de uma categoria.
// Múltiplas entradas no mesmo ano indicam categorias que coexistem.
const TIMELINE = [
  // ── 2016 ──
  {
    year: '2016',
    program: 'FLL',
    color: '#22c55e',
    title: 'Primeira Participação — FLL',
    theme: 'ANIMAL ALLIES',
    desc: 'A TeraRobotics dá seus primeiros passos no universo FIRST, participando do Regional de Goiânia com o tema Animal Allies. O início de uma jornada que mudaria vidas.',
    location: 'Regional de Goiânia, GO',
    highlight: true,
    isNew: true,
  },
  // ── 2017 ──
  {
    year: '2017',
    program: 'FLL',
    color: '#22c55e',
    title: 'FLL — HYDRODYNAMICS',
    theme: 'HYDRODYNAMICS',
    desc: 'Segunda temporada na FLL. O time aprofunda seus conhecimentos em robótica, programação e trabalho em equipe.',
    location: 'Brasil',
  },
  // ── 2018 ──
  {
    year: '2018',
    program: 'FLL',
    color: '#22c55e',
    title: 'FLL — INTO ORBIT',
    theme: 'INTO ORBIT',
    desc: 'A equipe FLL cresce em número de membros e maturidade técnica, explorando o tema de exploração espacial.',
    location: 'Brasil',
  },
  // ── 2019 ──
  {
    year: '2019',
    program: 'FLL',
    color: '#22c55e',
    title: 'FLL — CITY SHAPER',
    theme: 'CITY SHAPER',
    desc: 'A subdivisão FLL continua ativa, enfrentando desafios de planejamento urbano e infraestrutura.',
    location: 'Brasil',
  },
  {
    year: '2019',
    program: 'FTC',
    color: '#f97316',
    title: 'Estreia no FTC — SKYSTONE',
    theme: 'SKYSTONE',
    desc: 'Grande expansão: a TeraRobotics cria sua subdivisão FTC (#17730), construindo seu primeiro robô de médio porte. A FLL segue ativa em paralelo — a Tera agora compete em duas frentes.',
    location: 'Brasil',
    highlight: true,
    isNew: true,
  },
  // ── 2020 ──
  {
    year: '2020',
    program: 'FLL',
    color: '#22c55e',
    title: 'FLL — REPLAY',
    theme: 'REPLAY',
    desc: 'Temporada adaptada ao formato híbrido/remoto pela pandemia. A equipe FLL mantém o espírito e a resiliência.',
    location: 'Brasil',
  },
  {
    year: '2020',
    program: 'FTC',
    color: '#f97316',
    title: 'FTC — ULTIMATE GOAL',
    theme: 'ULTIMATE GOAL',
    desc: 'Segunda temporada FTC em formato adaptado. A equipe se reinventa e mantém o desenvolvimento técnico mesmo à distância.',
    location: 'Brasil',
  },
  // ── 2021 ──
  {
    year: '2021',
    program: 'FLL',
    color: '#22c55e',
    title: 'FLL — CARGO CONNECT',
    theme: 'CARGO CONNECT',
    desc: 'Retorno às competições presenciais para a equipe FLL, com foco em logística e transporte no desafio do ano.',
    location: 'Brasil',
  },
  {
    year: '2021',
    program: 'FTC',
    color: '#f97316',
    title: 'FTC — FREIGHT FRENZY',
    theme: 'FREIGHT FRENZY',
    desc: 'Retorno presencial para o FTC. A equipe demonstra resiliência e evolução técnica significativa.',
    location: 'Brasil',
  },
  // ── 2022 ──
  {
    year: '2022',
    program: 'FLL',
    color: '#22c55e',
    title: 'FLL — SUPERPOWERED',
    theme: 'SUPERPOWERED',
    desc: 'A subdivisão FLL explora o tema de energia e sustentabilidade, consolidando a base formadora do time.',
    location: 'Brasil',
  },
  {
    year: '2022',
    program: 'FTC',
    color: '#f97316',
    title: 'FTC — POWER PLAY',
    theme: 'POWER PLAY',
    desc: 'Temporada de consolidação no FTC com foco em engenharia de precisão, estratégia de jogo e novos subsistemas.',
    location: 'Brasil',
  },
  // ── 2023 ──
  {
    year: '2023',
    program: 'FLL',
    color: '#22c55e',
    title: 'FLL — MASTERPIECE',
    theme: 'MASTERPIECE',
    desc: 'A equipe FLL celebra criatividade e arte no desafio do ano, com projetos de inovação de destaque.',
    location: 'Brasil',
  },
  {
    year: '2023',
    program: 'FTC',
    color: '#f97316',
    title: 'FTC — CENTERSTAGE',
    theme: 'CENTERSTAGE',
    desc: 'Evolução técnica expressiva no FTC, com novos membros e conquistas em competições regionais.',
    location: 'Brasil',
  },
  // ── 2024 ──
  {
    year: '2024',
    program: 'FLL',
    color: '#22c55e',
    title: 'FLL — SUBMERGED',
    theme: 'SUBMERGED',
    desc: 'A subdivisão FLL segue formando jovens talentos enquanto o time vive seu maior momento histórico.',
    location: 'Brasil',
  },
  {
    year: '2024',
    program: 'FTC',
    color: '#f97316',
    title: 'FTC — INTO THE DEEP',
    theme: 'INTO THE DEEP',
    desc: 'O FTC #17730 disputa mais uma temporada com robótica de alto nível, enquanto o time se prepara para o salto ao FRC.',
    location: 'Brasil',
  },
  {
    year: '2024',
    program: 'FRC',
    color: '#E10600',
    title: 'Estreia no FRC — CRESCENDO',
    theme: 'CRESCENDO',
    desc: 'Marco histórico: a TeraRobotics estreia na FIRST Robotics Competition como time #10343, construindo um robô de grande porte em 6 semanas. FLL e FTC seguem ativos — agora somos três subdivisões competindo simultaneamente.',
    location: 'Brasil',
    highlight: true,
    isNew: true,
  },
  // ── 2025 ──
  {
    year: '2025',
    program: 'FLL',
    color: '#22c55e',
    title: 'FLL — 2025',
    theme: '—',
    desc: 'A base formadora da Tera continua sólida, revelando novos talentos que seguirão para FTC e FRC.',
    location: 'Brasil',
  },
  {
    year: '2025',
    program: 'FTC',
    color: '#f97316',
    title: 'FTC — DECODE',
    theme: 'DECODE',
    desc: 'O FTC #17730 disputa o DECODE em alto nível, consolidando o time como referência no programa.',
    location: 'Brasil',
    highlight: true,
  },
  {
    year: '2025',
    program: 'FRC',
    color: '#E10600',
    title: 'FRC — REEFSCAPE',
    theme: 'REEFSCAPE',
    desc: 'Segunda temporada no FRC #10343. Três subdivisões ativas simultaneamente: FLL, FTC e FRC — o momento mais completo da história da Tera.',
    location: 'Brasil',
    highlight: true,
  },
];

// ── Dados estáticos da galeria de identidade visual ───────────────────────
const IDENTITY_ITEMS = [
  { type: 'Logo', year: '2016–2019', label: 'Logo Fundação', color: '#22c55e', emoji: '🟢' },
  { type: 'Logo', year: '2020–2022', label: 'Logo Atualizada', color: '#f97316', emoji: '🟠' },
  { type: 'Logo', year: '2023+', label: 'Logo Atual', color: '#E10600', emoji: '🔴' },
  { type: 'Camiseta', year: '2019', label: 'Camiseta FTC Estreia', color: '#f97316', emoji: '👕' },
  { type: 'Camiseta', year: '2022', label: 'Camiseta POWER PLAY', color: '#3b82f6', emoji: '👕' },
  { type: 'Camiseta', year: '2024', label: 'Camiseta FRC Estreia', color: '#E10600', emoji: '👕' },
  { type: 'Camiseta', year: '2025', label: 'Camiseta REEFSCAPE', color: '#E10600', emoji: '👕' },
  { type: 'Botton', year: '2022', label: 'Botton POWER PLAY', color: '#3b82f6', emoji: '🔵' },
  { type: 'Botton', year: '2024', label: 'Botton FRC #10343', color: '#E10600', emoji: '🔴' },
  { type: 'Botton', year: '2025', label: 'Botton REEFSCAPE', color: '#E10600', emoji: '🔴' },
];

const PROGRAM_COLORS = { FRC: '#E10600', FTC: '#f97316', FLL: '#22c55e' };

export default function Memoria() {
  const [section, setSection] = useState('timeline');
  const [programFilter, setProgramFilter] = useState('all');
  const [selectedRobot, setSelectedRobot] = useState(null);
  const [imgIndex, setImgIndex] = useState(0);
  const [identityFilter, setIdentityFilter] = useState('all');

  const { data: robots = [] } = useQuery({
    queryKey: ['memoria-robots'],
    queryFn: () => base44.entities.Robot.list('-year'),
  });

  const { data: moments = [] } = useQuery({
    queryKey: ['memoria-moments'],
    queryFn: () => base44.entities.TournamentMemorial.list('-date'),
  });

  const { data: pdiMembers = [] } = useQuery({
    queryKey: ['memoria-pdi'],
    queryFn: () => base44.entities.PDI.list('member_name'),
  });

  const openRobot = (robot) => { setSelectedRobot(robot); setImgIndex(0); };
  const allImages = selectedRobot
    ? [selectedRobot.image_url, ...(selectedRobot.extra_images || [])].filter(Boolean)
    : [];

  const robotsByCategory = {
    FRC: robots.filter(r => r.category === 'FRC').sort((a, b) => b.year - a.year),
    FTC: robots.filter(r => r.category === 'FTC').sort((a, b) => b.year - a.year),
    FLL: robots.filter(r => r.category === 'FLL').sort((a, b) => b.year - a.year),
  };

  const filteredTimeline = programFilter === 'all'
    ? TIMELINE
    : TIMELINE.filter(t => t.program === programFilter);

  const filteredIdentity = identityFilter === 'all'
    ? IDENTITY_ITEMS
    : IDENTITY_ITEMS.filter(i => i.type === identityFilter);

  const sections = [
    { id: 'timeline', label: 'Linha do Tempo', icon: Clock },
    { id: 'robots', label: 'Galeria de Robôs', icon: Bot },
    { id: 'members', label: 'Membros & Técnicos', icon: Users },
    { id: 'identity', label: 'Identidade Visual', icon: Shirt },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── HERO ── */}
      <div className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(rgba(225,6,0,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(225,6,0,0.4) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#E10600] to-transparent" />
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 border border-[#E10600]/40 bg-[#E10600]/10 mb-6">
              <Trophy className="w-4 h-4 text-[#E10600]" />
              <span className="text-[#E10600] text-xs font-bold tracking-widest uppercase">Desde 2016</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-5">
              MEMÓRIA <span className="text-[#E10600]">TERA</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              A história completa da TeraRobotics — da primeira competição FLL ao FRC, robots, membros e identidade visual.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ── NAVEGAÇÃO INTERNA ── */}
      <div className="sticky top-14 z-40 bg-black/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 flex overflow-x-auto gap-0 hide-scrollbar">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${
                section === id
                  ? 'border-[#E10600] text-[#E10600]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">

        {/* ══════════════════════════════════════════ LINHA DO TEMPO ══ */}
        {section === 'timeline' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
              <h2 className="text-3xl font-black">LINHA DO TEMPO</h2>
              <div className="flex gap-2 flex-wrap">
                {['all', 'FLL', 'FTC', 'FRC'].map(p => (
                  <button
                    key={p}
                    onClick={() => setProgramFilter(p)}
                    className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all ${
                      programFilter === p
                        ? 'bg-[#E10600] border-[#E10600] text-white'
                        : 'border-white/20 text-gray-400 hover:border-white/40 hover:text-white'
                    }`}
                  >
                    {p === 'all' ? 'Todos' : p}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#E10600] via-gray-700 to-transparent" />
              <div className="space-y-0">
                {filteredTimeline.map((item, i) => {
                  const prevItem = filteredTimeline[i - 1];
                  const isFirstOfYear = !prevItem || prevItem.year !== item.year;
                  return (
                    <React.Fragment key={`${item.year}-${item.program}-${i}`}>
                      {/* Separador de ano */}
                      {isFirstOfYear && (
                        <div className="relative pl-20 pt-10 pb-3">
                          <div className="absolute left-3 top-10 w-7 h-7 rounded-full bg-black border-2 border-gray-600 z-10 flex items-center justify-center">
                            <span className="text-[8px] font-black text-gray-400">{item.year}</span>
                          </div>
                          <span className="text-3xl font-black text-gray-700">{item.year}</span>
                        </div>
                      )}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.04 }}
                        className="relative pl-20 pb-4"
                      >
                        {/* Dot */}
                        <div
                          className="absolute left-3.5 top-1 w-5 h-5 rounded-full border-2 border-black z-10 flex items-center justify-center"
                          style={{ backgroundColor: item.color }}
                        >
                          {item.isNew && <Star className="w-2.5 h-2.5 text-white" />}
                        </div>

                        <div
                          className="border rounded-xl p-5 transition-all hover:border-white/25"
                          style={{
                            borderColor: item.highlight ? `${item.color}60` : 'rgba(255,255,255,0.08)',
                            backgroundColor: item.highlight ? `${item.color}08` : 'rgba(255,255,255,0.02)',
                          }}
                        >
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span
                              className="text-xs font-black px-3 py-1 rounded-full text-white"
                              style={{ backgroundColor: item.color }}
                            >
                              {item.program}
                            </span>
                            {item.theme !== '—' && (
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest border border-white/10 px-2 py-0.5">
                                {item.theme}
                              </span>
                            )}
                            {item.isNew && (
                              <span className="text-xs font-bold text-yellow-400 flex items-center gap-1">
                                <Star className="w-3 h-3" /> Nova categoria
                              </span>
                            )}
                            {item.highlight && !item.isNew && (
                              <span className="text-xs font-bold text-yellow-400 flex items-center gap-1">
                                <Star className="w-3 h-3" /> Destaque
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-black text-white mb-1">{item.title}</h3>
                          <p className="text-gray-400 text-sm leading-relaxed mb-3">{item.desc}</p>
                          {item.location && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {item.location}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Momentos do banco de dados */}
            {moments.length > 0 && (
              <div className="mt-20">
                <h3 className="text-xl font-black text-white mb-6 border-t border-white/10 pt-8">
                  MOMENTOS REGISTRADOS
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {moments.map((m, i) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className="border border-white/10 rounded-xl overflow-hidden hover:border-[#E10600]/40 transition-all"
                    >
                      {m.images?.[0] && (
                        <img src={m.images[0]} alt={m.title} className="w-full h-40 object-cover" />
                      )}
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded text-white"
                            style={{ backgroundColor: PROGRAM_COLORS[m.program] || '#E10600' }}
                          >
                            {m.program}
                          </span>
                          {m.highlight && <Trophy className="w-3.5 h-3.5 text-yellow-400" />}
                        </div>
                        <h4 className="font-bold text-white text-sm mb-1">{m.title}</h4>
                        <p className="text-xs text-gray-400 line-clamp-2">{m.description}</p>
                        {m.date && (
                          <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(m.date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ══════════════════════════════════════════ GALERIA DE ROBÔS ══ */}
        {section === 'robots' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-3xl font-black mb-10">GALERIA DE ROBÔS</h2>

            {(['FRC', 'FTC', 'FLL']).map(cat => {
              const list = robotsByCategory[cat];
              if (list.length === 0) return null;
              const color = PROGRAM_COLORS[cat];
              return (
                <div key={cat} className="mb-16">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="px-4 py-2 font-black text-white text-sm" style={{ backgroundColor: color }}>
                      {cat}
                    </div>
                    <p className="text-gray-500 text-sm">
                      {cat === 'FRC' ? 'FIRST Robotics Competition • #10343' : cat === 'FTC' ? 'FIRST Tech Challenge • #17730' : 'FIRST LEGO League'}
                    </p>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                    {list.map((robot, i) => (
                      <motion.div
                        key={robot.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.06 }}
                        onClick={() => openRobot(robot)}
                        className="cursor-pointer group"
                      >
                        <div className="border-2 border-white/10 hover:border-[#E10600] transition-all overflow-hidden">
                          <div className="aspect-square bg-gray-900 overflow-hidden">
                            {robot.image_url ? (
                              <img src={robot.image_url} alt={robot.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-400" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Bot className="w-10 h-10 text-gray-700" />
                              </div>
                            )}
                          </div>
                          <div className="p-3 bg-[#111]">
                            <p className="text-xs font-bold mb-0.5" style={{ color }}>{robot.year}</p>
                            <p className="text-sm font-black text-white truncate">{robot.name}</p>
                            {robot.season_name && <p className="text-xs text-gray-500 truncate">{robot.season_name}</p>}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })}

            {robots.length === 0 && (
              <div className="text-center py-24 text-gray-500">
                <Bot className="w-16 h-16 mx-auto mb-4 text-gray-800" />
                <p>Nenhum robô cadastrado ainda. Cadastre-os no Painel Admin.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ══════════════════════════════════════════ MEMBROS & TÉCNICOS ══ */}
        {section === 'members' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-3xl font-black mb-4">MEMBROS & TÉCNICOS</h2>
            <p className="text-gray-400 mb-10">Todos que fizeram e fazem parte da história da TeraRobotics.</p>

            {pdiMembers.length === 0 ? (
              <div className="text-center py-24 text-gray-500">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-800" />
                <p>Nenhum membro cadastrado ainda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                {pdiMembers.map((member, i) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 mb-3 bg-gray-900">
                      {member.photo_url ? (
                        <img src={member.photo_url} alt={member.member_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Users className="w-10 h-10 text-gray-700" />
                        </div>
                      )}
                    </div>
                    <p className="font-black text-white text-sm leading-tight">{member.member_name}</p>
                    {member.main_role && <p className="text-xs text-gray-500 mt-0.5">{member.main_role}</p>}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ══════════════════════════════════════════ IDENTIDADE VISUAL ══ */}
        {section === 'identity' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
              <div>
                <h2 className="text-3xl font-black">IDENTIDADE VISUAL</h2>
                <p className="text-gray-400 mt-1">Logos, camisetas e bottons ao longo da história.</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {['all', 'Logo', 'Camiseta', 'Botton'].map(f => (
                  <button
                    key={f}
                    onClick={() => setIdentityFilter(f)}
                    className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all ${
                      identityFilter === f
                        ? 'bg-[#E10600] border-[#E10600] text-white'
                        : 'border-white/20 text-gray-400 hover:border-white/40 hover:text-white'
                    }`}
                  >
                    {f === 'all' ? 'Todos' : f + 's'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {filteredIdentity.map((item, i) => (
                <motion.div
                  key={`${item.type}-${item.year}-${i}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="border border-white/10 hover:border-white/30 transition-all overflow-hidden"
                >
                  <div className="aspect-square flex items-center justify-center text-5xl" style={{ backgroundColor: `${item.color}15` }}>
                    {item.emoji}
                  </div>
                  <div className="p-3 bg-[#111]">
                    <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: item.color }}>{item.type}</p>
                    <p className="text-sm font-black text-white">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.year}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-12 border border-[#E10600]/20 bg-[#E10600]/5 rounded-xl p-6">
              <p className="text-sm text-gray-400 leading-relaxed">
                <span className="text-[#E10600] font-bold">📌 Nota:</span> A galeria de identidade visual está sendo construída. Para adicionar logos, camisetas e bottons reais, entre em contato com a coordenação ou acesse a Área Interna.
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── MODAL DE ROBÔ ── */}
      <Dialog open={!!selectedRobot} onOpenChange={() => setSelectedRobot(null)}>
        <DialogContent className="bg-[#111] border-white/10 max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedRobot && (
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span
                    className="inline-block px-3 py-1 text-xs font-black text-white mb-2"
                    style={{ backgroundColor: PROGRAM_COLORS[selectedRobot.category] || '#E10600' }}
                  >
                    {selectedRobot.category} — {selectedRobot.year}
                  </span>
                  <h2 className="text-2xl font-black text-white">{selectedRobot.name}</h2>
                  {selectedRobot.season_name && <p className="text-gray-400 text-sm">{selectedRobot.season_name}</p>}
                </div>
              </div>

              {allImages.length > 0 && (
                <div className="relative mb-6">
                  <div className="aspect-video bg-black overflow-hidden">
                    <img src={allImages[imgIndex]} alt={selectedRobot.name} className="w-full h-full object-contain" />
                  </div>
                  {allImages.length > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-3">
                      <button onClick={() => setImgIndex((imgIndex - 1 + allImages.length) % allImages.length)} className="p-2 text-gray-400 hover:text-white">
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-xs text-gray-500">{imgIndex + 1} / {allImages.length}</span>
                      <button onClick={() => setImgIndex((imgIndex + 1) % allImages.length)} className="p-2 text-gray-400 hover:text-white">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {(selectedRobot.robot_weight || selectedRobot.robot_width || selectedRobot.robot_height || selectedRobot.robot_length) && (
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {selectedRobot.robot_weight && <div className="bg-black border border-white/10 p-3 text-center"><p className="text-xs text-gray-500 uppercase">Peso</p><p className="font-black text-white text-sm">{selectedRobot.robot_weight}kg</p></div>}
                  {selectedRobot.robot_width && <div className="bg-black border border-white/10 p-3 text-center"><p className="text-xs text-gray-500 uppercase">Largura</p><p className="font-black text-white text-sm">{selectedRobot.robot_width}cm</p></div>}
                  {selectedRobot.robot_height && <div className="bg-black border border-white/10 p-3 text-center"><p className="text-xs text-gray-500 uppercase">Altura</p><p className="font-black text-white text-sm">{selectedRobot.robot_height}cm</p></div>}
                  {selectedRobot.robot_length && <div className="bg-black border border-white/10 p-3 text-center"><p className="text-xs text-gray-500 uppercase">Comprimento</p><p className="font-black text-white text-sm">{selectedRobot.robot_length}cm</p></div>}
                </div>
              )}

              {selectedRobot.description && (
                <div className="mb-4">
                  <h4 className="text-xs font-black text-white uppercase mb-2 tracking-wider">Descrição</h4>
                  <p className="text-gray-400 text-sm leading-relaxed">{selectedRobot.description}</p>
                </div>
              )}

              {selectedRobot.game_objective && (
                <div className="mb-4 bg-black border border-[#E10600]/20 p-4">
                  <h4 className="text-xs font-black text-[#E10600] uppercase mb-2 tracking-wider">Objetivo no Jogo</h4>
                  <p className="text-gray-400 text-sm">{selectedRobot.game_objective}</p>
                </div>
              )}

              {selectedRobot.video_urls?.length > 0 && (
                <div>
                  <h4 className="text-xs font-black text-white uppercase mb-2 tracking-wider">Vídeos</h4>
                  <div className="space-y-2">
                    {selectedRobot.video_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-[#E10600] hover:underline text-sm">
                        <Play className="w-4 h-4" /> Assistir vídeo {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}