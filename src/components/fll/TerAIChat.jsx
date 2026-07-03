import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, Loader2, Globe } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const SYSTEM_PROMPT = `Você é o TerAI, assistente oficial da equipe 10343 Tera Robotics. Você é especialista em TUDO relacionado à FIRST Robotics — FRC, FTC e FLL — e também em marketing e comunicação de equipes. Responda sempre em português brasileiro de forma direta e animada.

SOBRE A EQUIPE:
- Nome: Tera Robotics
- Número FRC: 10343
- Modalidades: FRC (FIRST Robotics Competition), FTC (FIRST Tech Challenge) e FLL (FIRST LEGO League)
- País: Brasil

FRC — FIRST ROBOTICS COMPETITION
CAD E DESIGN MECÂNICO: Onshape, Part Studios, Assemblies, FeatureScript, variáveis, MKCAD. Mecanismos: intake, shooter, climber, drivetrain, elevator, arm, turret, indexer. Fabricação: corte a laser, impressão 3D, CNC. Materiais: alumínio 6061, policarbonato, Delrin, HDPE.
PROGRAMAÇÃO FRC: Java com WPILib e Command-based. PID, feedforward, motion profiling. Vision: Limelight, PhotonVision, OpenCV. PathPlanner, Choreo. CAN bus, SPARK MAX, TalonFX, Kraken X60, NavX, Pigeon 2. Shuffleboard, SmartDashboard, AdvantageScope.
ELETRÔNICA FRC: PDP, PDH, VRM, PCM, REV PH. RoboRIO 1 e 2, radio OpenMesh e Vivid-Hosting. CAN bus, fusíveis, cabeamento.
PNEUMÁTICA FRC: Compressores, solenoides, cilindros, regulagem de pressão, integração WPILib.

FTC — FIRST TECH CHALLENGE
Programação: Java e Blocks no SDK FTC, OnBot Java, Android Studio. Hardware: REV Control Hub, Expansion Hub. Motores e servos REV, goBILDA, Tetrix. CAD: Onshape com bibliotecas goBILDA e REV. Autonomous: RoadRunner, Pedro Pathing, EasyOpenCV. Regras, manual e temporadas FTC. Estratégia: scouting, alliance selection, inspection.

FLL — FIRST LEGO League
FLL Challenge, FLL Explorer, FLL Discover. Programação: SPIKE Prime, MINDSTORMS, Scratch, Python. Robot Game: estratégia de missões, design de attachments. Innovation Project: pesquisa, apresentação, solução. Core Values: trabalho em equipe, gracious professionalism. Regras e temporadas FLL. Dicas para juízes e apresentações.

MARKETING E COMUNICAÇÃO
Captação de patrocinadores, proposta comercial, níveis de patrocínio. Identidade visual da equipe: logo, cores, uniforme, pit display. Redes sociais: Instagram, TikTok, YouTube. Chairman's Award (FRC) e Impact Award. Inspire Award (FTC). Site da equipe, outreach, documentação técnica, engineering notebook, portfolio, TDP. Fundraising.

ESTRATÉGIA E COMPETIÇÃO
Análise do manual de regras. Scouting: coleta de dados, análise, pick list. Estratégia de auto, teleop e endgame. Alliance selection. Inspeção técnica. Pit management.

GESTÃO DE EQUIPE
Cronograma de build season e off-season. Organização de subequipes. Recrutamento e treinamento. Relacionamento com mentores e escola. Prestação de contas para patrocinadores.

Quando não tiver certeza sobre regras de uma temporada específica recente, avise e recomende verificar em firstinspires.org. Seja animado, use emojis com moderação e sempre torça pela Tera! Respostas curtas e diretas ao ponto.`;

const SUGGESTIONS = [
  'Como funciona a pontuação FLL?',
  'Dicas para apresentação aos juízes',
  'Como melhorar o Robot Game?',
  'O que são Core Values?',
];

export default function TerAIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Oi! Sou o TerAI 🤖 Assistente oficial da Tera Robotics #10343. Como posso ajudar?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [knowledgeContext, setKnowledgeContext] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Load knowledge base context on mount
  useEffect(() => {
    base44.entities.TeamKnowledgeBase.list().then(records => {
      if (!records || records.length === 0) return;
      const kb = records[0];
      const parts = [];
      if (kb.team_name) parts.push(`Equipe: ${kb.team_name}`);
      if (kb.team_number_frc) parts.push(`Número FRC: #${kb.team_number_frc}`);
      if (kb.team_number_ftc) parts.push(`Número FTC: #${kb.team_number_ftc}`);
      if (kb.school_org) parts.push(`Escola/Org: ${kb.school_org}`);
      if (kb.city_state) parts.push(`Localização: ${kb.city_state}`);
      if (kb.modalities?.length) parts.push(`Modalidades: ${kb.modalities.join(', ')}`);
      if (kb.website) parts.push(`Site: ${kb.website}`);
      if (kb.social_media) parts.push(`Redes: ${kb.social_media}`);
      if (kb.founded_date) parts.push(`Fundação: ${kb.founded_date}`);
      if (kb.competition_history?.length) {
        parts.push('Histórico de Competições:\n' + kb.competition_history.map(c =>
          `  - ${c.year}: ${c.game} | ${c.results || ''}${c.awards ? ' | Prêmios: ' + c.awards : ''}`
        ).join('\n'));
      }
      if (kb.current_members?.length) {
        parts.push('Membros Atuais:\n' + kb.current_members.map(m =>
          `  - ${m.name} (${m.role}${m.subteam ? ', ' + m.subteam : ''})`
        ).join('\n'));
      }
      if (kb.sponsors?.length) {
        parts.push('Patrocinadores:\n' + kb.sponsors.map(s => `  - ${s.name} (${s.level})`).join('\n'));
      }
      if (kb.achievements?.length) {
        parts.push('Conquistas:\n' + kb.achievements.map(a =>
          `  - ${a.award} (${a.year}${a.competition ? ', ' + a.competition : ''})`
        ).join('\n'));
      }
      if (kb.extra_info) parts.push(`Informações Extras:\n${kb.extra_info}`);
      setKnowledgeContext(parts.join('\n'));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const content = text || input.trim();
    if (!content || loading) return;
    setInput('');

    const newMessages = [...messages, { role: 'user', content }];
    setMessages(newMessages);
    setLoading(true);

    const history = newMessages.slice(-10).map(m => `${m.role === 'user' ? 'Usuário' : 'TerAI'}: ${m.content}`).join('\n');

    const contextBlock = knowledgeContext
      ? `\n\nCONTEXTO DA EQUIPE (Base de Conhecimento):\n${knowledgeContext}`
      : '';

    const reply = await base44.integrations.Core.InvokeLLM({
      prompt: `${SYSTEM_PROMPT}${contextBlock}\n\nHistórico da conversa:\n${history}\n\nResponda a última mensagem do usuário de forma concisa.`,
      add_context_from_internet: webSearch,
      model: webSearch ? 'gemini_3_flash' : undefined,
    });

    setMessages(prev => [...prev, { role: 'assistant', content: typeof reply === 'string' ? reply : reply?.text || 'Ops, tive um problema. Tente de novo!' }]);
    setLoading(false);
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-[#1a237e] border-2 border-yellow-400 shadow-lg shadow-blue-900/50 flex items-center justify-center"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-6 h-6 text-yellow-400" />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Bot className="w-6 h-6 text-yellow-400" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-5 z-50 w-[340px] sm:w-[380px] max-h-[520px] flex flex-col bg-[#0d1117] border border-[#1e3a5f] rounded-2xl shadow-2xl shadow-blue-900/30 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#1a237e] border-b border-[#283593]">
              <div className="w-8 h-8 rounded-full bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center">
                <Bot className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-black text-white">TerAI</p>
                <p className="text-[10px] text-blue-300">Assistente Tera Robotics #10343</p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] text-green-400">Online</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#1a237e] text-white rounded-tr-sm'
                      : 'bg-[#111827] border border-[#1e3a5f] text-gray-200 rounded-tl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[#111827] border border-[#1e3a5f] rounded-2xl rounded-tl-sm px-3 py-2">
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  </div>
                </div>
              )}

              {/* Suggestions (only at start) */}
              {messages.length === 1 && !loading && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] text-gray-500 px-1">Sugestões:</p>
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => sendMessage(s)}
                      className="w-full text-left text-xs px-3 py-2 bg-[#111827] border border-[#1e3a5f] hover:border-blue-500/50 text-blue-300 rounded-xl transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-[#1e3a5f] space-y-2">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Pergunte ao TerAI..."
                  disabled={loading}
                  className="flex-1 bg-[#111827] border border-[#1e3a5f] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/60 disabled:opacity-50"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-xl bg-[#1a237e] hover:bg-[#283593] border border-[#283593] flex items-center justify-center disabled:opacity-40 transition-colors"
                >
                  <Send className="w-4 h-4 text-yellow-400" />
                </button>
              </div>
              <button
                onClick={() => setWebSearch(w => !w)}
                className={`flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-lg transition-colors ${
                  webSearch
                    ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                    : 'bg-[#111827] border border-[#1e3a5f] text-gray-500 hover:text-gray-300'
                }`}
              >
                <Globe className="w-3 h-3" />
                {webSearch ? 'Web Search ativado' : 'Ativar Web Search'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}