import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Shield, Users, BookOpen, Zap, Plus, Trash2, Save,
  MessageCircle, Mail, Star
} from 'lucide-react';
import ChatMentor from '@/components/tir/ChatMentor';

const TABS = [
  { id: 'regras', label: 'Manual TIR 2026', icon: BookOpen },
  { id: 'equipes', label: 'Equipes', icon: Users },
  { id: 'mentoria', label: 'Mentoria', icon: Star },
];

// Mentores fixos da TeraRobotics
const MENTORES = [
  { id: 'isabela', nome: 'Isabela Bertolota', funcao: 'Estratégia de Mesa e Programação', whatsapp: '5567992978356', foto: 'https://media.base44.com/images/public/698a86446abc83aece20025a/561d4c9da_WhatsAppImage2026-04-23at150546.jpg' },
  { id: 'izadora', nome: 'Izadora', funcao: 'Projetos', whatsapp: '5567998567985', foto: 'https://media.base44.com/images/public/698a86446abc83aece20025a/a5ad85976_cb78ddfa-0a94-4a70-96a7-81fc289dd9c3.jpg' },
  { id: 'tawany', nome: 'Tawany', funcao: 'Marketing', whatsapp: '5567996632894', foto: 'https://media.base44.com/images/public/698a86446abc83aece20025a/aefb57fec_46a6a0d2-0f87-4b02-8769-e6fa0b8577d9.jpg' },
  { id: 'nathan', nome: 'Nathan Ribeiro', funcao: 'Mentor Geral', whatsapp: '5567991729292', foto: 'https://media.base44.com/images/public/698a86446abc83aece20025a/fbd47d371_a0e15079-809e-4297-b044-3dffcac7f491.jpg' },
];

export default function TIR2026() {
  const [tab, setTab] = useState('regras');
  const [chatMentor, setChatMentor] = useState(null);
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        const me = await base44.auth.me();
        setUser(me);
      }
      setCheckingAuth(false);
    });
  }, []);

  const isAdmin = user && (user.role === 'admin' || user.member_role === 'admin' || user.member_role === 'member');

  const { data: equipes = [] } = useQuery({
    queryKey: ['tir-equipes'],
    queryFn: () => base44.entities.TIREquipe.list('ordem'),
    initialData: [],
  });

  const { data: regras = [] } = useQuery({
    queryKey: ['tir-regras'],
    queryFn: () => base44.entities.TIRRegra.list('ordem'),
    initialData: [],
  });

  return (
    <div className="min-h-screen bg-[#070B14] text-white font-sans">
      {/* ── HERO ── */}
      <header className="relative overflow-hidden border-b border-green-500/20">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'linear-gradient(rgba(0,200,80,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,80,0.4) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-green-500/10 blur-[100px] rounded-full" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 py-16 text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex justify-center mb-6">
              <img
                src="https://media.base44.com/images/public/698a86446abc83aece20025a/169250c2e_LogoTemporadav11.png"
                alt="TIR 2026"
                className="w-64 sm:w-80 object-contain"
              />
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-green-500/40 bg-green-500/10 rounded-full text-green-400 text-xs font-bold uppercase tracking-widest mb-5">
              <Zap className="w-3.5 h-3.5" /> TeraRobotics • SESI Três Lagoas
            </div>
            <h1 className="text-5xl sm:text-7xl font-black tracking-tighter mb-3">
              <span className="text-white">TIR </span>
              <span className="text-green-400" style={{ textShadow: '0 0 30px rgba(0,200,80,0.5)' }}>2026</span>
            </h1>
            <p className="text-lg sm:text-2xl text-gray-300 font-light mb-2">
              Torneio Interclasse de Robótica
            </p>
            <p className="text-gray-500 text-sm">
              Organizado pela TeraRobotics — SESI Três Lagoas, MS
            </p>


          </motion.div>
        </div>

        {/* Nav tabs */}
        <div className="relative z-10 border-t border-white/5">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex overflow-x-auto">
              {TABS.map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${
                      tab === t.id ? 'border-green-400 text-green-400' : 'border-transparent text-gray-400 hover:text-white hover:border-white/20'
                    }`}>
                    <Icon className="w-4 h-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* ── CONTENT ── */}
      <main className="max-w-5xl mx-auto px-4 py-10">
        <AnimatePresence mode="wait">

          {/* ── REGRAS ── */}
          {tab === 'regras' && (
            <motion.div key="regras" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {regras.length === 0 ? (
                <div className="text-center py-24">
                  <BookOpen className="w-12 h-12 text-green-500/30 mx-auto mb-4" />
                  <p className="text-gray-500">As regras serão publicadas em breve.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {regras.map((r, i) => (
                    <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="bg-[#0D1526] border border-green-500/10 rounded-2xl p-6 sm:p-8">
                      <h2 className="text-xl font-black text-green-400 mb-4 flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-sm">{i + 1}</span>
                        {r.titulo}
                      </h2>
                      <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: r.conteudo }} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── EQUIPES ── */}
          {tab === 'equipes' && (
            <motion.div key="equipes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-black text-white mb-1">Equipes Participantes</h2>
                <p className="text-gray-500 text-sm">{equipes.length} equipe{equipes.length !== 1 ? 's' : ''} cadastrada{equipes.length !== 1 ? 's' : ''}</p>
                {!checkingAuth && !user && (
                  <p className="text-xs text-gray-600 mt-2">
                    Sua sala ainda não cadastrou equipe?{' '}
                    <button onClick={() => base44.auth.redirectToLogin(window.location.pathname)} className="text-green-400 underline">
                      Faça login
                    </button>{' '}para registrar.
                  </p>
                )}
              </div>

              {!checkingAuth && user && <CadastroEquipe equipes={equipes} />}

              {equipes.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="w-12 h-12 text-green-500/30 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhuma equipe cadastrada ainda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {equipes.map((eq, i) => (
                    <motion.div key={eq.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                      className="group bg-[#0D1526] border border-green-500/10 hover:border-green-500/40 rounded-2xl p-5 flex flex-col items-center text-center transition-all duration-300 relative">
                      {isAdmin && <AdminDeleteEquipe equipeId={eq.id} />}
                      {eq.logo_url ? (
                        <img src={eq.logo_url} alt={eq.nome} className="w-16 h-16 object-cover rounded-full mb-3 border-2 border-green-500/30 group-hover:border-green-400 transition-colors" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/20 flex items-center justify-center mb-3">
                          <Shield className="w-7 h-7 text-green-500/50" />
                        </div>
                      )}
                      <p className="text-xs text-green-400 font-bold uppercase tracking-wider mb-1">{eq.ano} {eq.sala}</p>
                      <h3 className="font-black text-white text-sm leading-tight">{eq.nome}</h3>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── MENTORIA ── */}
          {tab === 'mentoria' && (
            <motion.div key="mentoria" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Intro */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-green-500/30 bg-green-500/10 rounded-full text-green-400 text-xs font-bold uppercase tracking-widest mb-4">
                  <Star className="w-3.5 h-3.5" /> Programa de Mentoria
                </div>
                <h2 className="text-3xl font-black text-white mb-3">Conte com a <span className="text-green-400">TeraRobotics</span></h2>
                <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
                  Os membros da TeraRobotics estão disponíveis para apoiar as equipes do TIR com dúvidas técnicas, estratégias de jogo e orientações gerais. Não hesite em entrar em contato!
                </p>
              </div>

              {/* Como funciona */}
              <div className="grid sm:grid-cols-3 gap-4 mb-10">
                {[
                  { icon: '🤔', titulo: '1. Tem uma dúvida?', desc: 'Seja sobre programação, construção, estratégia ou qualquer aspecto do torneio.' },
                  { icon: '📲', titulo: '2. Contate um mentor', desc: 'Escolha um dos mentores abaixo e envie uma mensagem pelo WhatsApp ou e-mail.' },
                  { icon: '🚀', titulo: '3. Avance no torneio', desc: 'Receba orientação e aplique o aprendizado para melhorar o desempenho da sua equipe.' },
                ].map((step) => (
                  <div key={step.titulo} className="bg-[#0D1526] border border-green-500/10 rounded-2xl p-5 text-center">
                    <div className="text-3xl mb-3">{step.icon}</div>
                    <h3 className="font-black text-white text-sm mb-2">{step.titulo}</h3>
                    <p className="text-gray-500 text-xs leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>

              {/* Mentores */}
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Mentores Disponíveis</h3>

              {!user && !checkingAuth && (
                <div className="mb-5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-yellow-400 text-sm text-center">
                  <button onClick={() => base44.auth.redirectToLogin(window.location.pathname)} className="underline font-bold">Faça login</button> para acessar o chat com os mentores.
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-5">
                {MENTORES.map((m) => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-[#0D1526] border border-green-500/10 hover:border-green-500/30 rounded-2xl p-6 transition-all">
                    <div className="flex items-center gap-4 mb-5">
                      {m.foto ? (
                        <img src={m.foto} alt={m.nome} className="w-14 h-14 rounded-full object-cover border-2 border-green-500/40 flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-green-500/10 border-2 border-green-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-2xl">🤖</span>
                        </div>
                      )}
                      <div>
                        <h4 className="font-black text-white text-lg">{m.nome}</h4>
                        <p className="text-green-400 text-xs font-bold uppercase tracking-wide">{m.funcao}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {m.whatsapp && (
                        <a
                          href={`https://wa.me/${m.whatsapp}?text=Ol%C3%A1%20${encodeURIComponent(m.nome)}%2C%20sou%20do%20TIR%202026%20e%20tenho%20uma%20d%C3%BAvida!`}
                          target="_blank" rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-xl text-green-400 text-sm font-bold transition-colors">
                          <MessageCircle className="w-4 h-4" />
                          Chamar no WhatsApp
                        </a>
                      )}
                      <button
                        onClick={() => user ? setChatMentor(m) : base44.auth.redirectToLogin(window.location.pathname)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 text-sm font-bold transition-colors">
                        <MessageCircle className="w-4 h-4" />
                        {user ? 'Chat no App' : 'Login para conversar'}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Aviso */}
              <div className="mt-8 bg-[#0D1526] border border-yellow-500/20 rounded-2xl p-5 flex gap-3">
                <span className="text-xl flex-shrink-0">⚠️</span>
                <p className="text-gray-400 text-sm leading-relaxed">
                  A mentoria é voluntária e os mentores respondem conforme disponibilidade. Respeite o tempo de cada um e seja objetivo ao descrever sua dúvida. Bom torneio! 🏆
                </p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* ── CHAT MODAL ── */}
      <AnimatePresence>
        {chatMentor && user && (
          <ChatMentor mentor={chatMentor} user={user} onClose={() => setChatMentor(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Cadastro de equipe (qualquer usuário logado) ── */
function CadastroEquipe({ equipes }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', ano: '', sala: '', logo_url: '' });
  const [uploading, setUploading] = useState(false);

  const criar = useMutation({
    mutationFn: d => base44.entities.TIREquipe.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tir-equipes'] }); setForm({ nome: '', ano: '', sala: '', logo_url: '' }); setOpen(false); },
  });

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, logo_url: file_url }));
    setUploading(false);
  };

  return (
    <div className="mb-8">
      {!open ? (
        <div className="text-center">
          <button onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm font-bold hover:bg-green-500/20 transition-colors">
            <Plus className="w-4 h-4" /> Cadastrar minha equipe
          </button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#0D1526] border border-green-500/20 rounded-2xl p-6 mb-6 max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-white flex items-center gap-2"><Plus className="w-4 h-4 text-green-400" /> Cadastrar Equipe</h3>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); criar.mutate(form); }} className="space-y-3">
            <input required value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
              placeholder="Nome da equipe *" className="w-full px-4 py-2.5 bg-[#070B14] border border-green-500/20 focus:border-green-500/50 rounded-xl text-white placeholder-gray-600 focus:outline-none text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input required value={form.ano} onChange={e => setForm(p => ({ ...p, ano: e.target.value }))}
                placeholder="Ano escolar *" className="w-full px-4 py-2.5 bg-[#070B14] border border-green-500/20 focus:border-green-500/50 rounded-xl text-white placeholder-gray-600 focus:outline-none text-sm" />
              <input required value={form.sala} onChange={e => setForm(p => ({ ...p, sala: e.target.value }))}
                placeholder="Sala *" className="w-full px-4 py-2.5 bg-[#070B14] border border-green-500/20 focus:border-green-500/50 rounded-xl text-white placeholder-gray-600 focus:outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Logo da equipe (opcional)</label>
              <input type="file" accept="image/*" onChange={handleUpload}
                className="w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:border-0 file:bg-green-500/10 file:text-green-400 file:rounded-lg file:text-xs file:font-bold cursor-pointer" />
              {uploading && <p className="text-xs text-green-400 mt-1">Enviando...</p>}
              {form.logo_url && <img src={form.logo_url} alt="preview" className="w-10 h-10 rounded-full object-cover mt-2 border border-green-500/30" />}
            </div>
            <button type="submit" disabled={!form.nome || !form.ano || !form.sala || uploading}
              className="w-full py-2.5 bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> Cadastrar
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
}

/* ── Botão de deletar equipe (só admins) ── */
function AdminDeleteEquipe({ equipeId }) {
  const qc = useQueryClient();
  const deletar = useMutation({
    mutationFn: id => base44.entities.TIREquipe.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tir-equipes'] }),
  });

  return (
    <button
      onClick={(e) => { e.stopPropagation(); if (confirm('Remover esta equipe?')) deletar.mutate(equipeId); }}
      className="absolute top-2 right-2 p-1 bg-red-500/20 hover:bg-red-500/60 rounded-lg text-red-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}