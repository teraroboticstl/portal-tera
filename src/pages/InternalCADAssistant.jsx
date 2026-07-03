import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, RotateCcw, Link as LinkIcon, CheckCircle, XCircle, Loader, Settings } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';

const SYSTEM_PROMPT = `Você é o assistente oficial da equipe 10343 Tera Robotics de FRC (FIRST Robotics Competition). Você é especialista em todos os aspectos de um time de FRC e responde sempre em português brasileiro de forma direta e prática.

SUAS ESPECIALIDADES:

CAD E DESIGN MECÂNICO:
- Onshape: Part Studios, Assemblies, FeatureScript, variáveis, configurações, MKCAD
- Mecanismos FRC: intake, shooter, climber, drivetrain, elevator, arm, turret, indexer
- Fabricação: corte a laser, impressão 3D, usinagem CNC, dobragem de chapa
- Materiais: alumínio 6061, policarbonato, Delrin, HDPE, aço
- API REST do Onshape: criação de peças via código

PROGRAMAÇÃO:
- Java com WPILib (padrão FRC)
- Python com RobotPy
- Command-based programming
- PID, feedforward, controle de subsistemas
- Vision: Limelight, PhotonVision, OpenCV
- PathPlanner e auto routines
- CAN bus, SPARK MAX, TalonFX, NavX
- Shuffleboard e SmartDashboard

ELETRÔNICA E ELÉTRICA:
- Cabeamento e organização do painel elétrico
- PDP, PDH, VRM, PCM
- Fusíveis, breakers e proteção de circuito
- CAN bus e configuração de IDs
- Roborio, radio e configuração de rede

PNEUMÁTICA:
- Compressores, solenoides, cilindros
- Regulagem de pressão e segurança
- Integração com código WPILib

ESTRATÉGIA E JOGO:
- Análise do manual e regras FRC do ano atual
- Estratégia de scouting e análise de dados
- Escolha de aliança e pick list
- Auto routines e estratégia de teleop

PIT E MANUTENÇÃO:
- Checklist pré-jogo
- Diagnóstico de problemas mecânicos e elétricos
- Substituição rápida de peças
- Organização do pit

GESTÃO DE EQUIPE:
- Documentação técnica
- Cronograma de build season
- Dicas para apresentações e Chairman's Award

Quando o usuário descrever uma peça para criar no Onshape, explique o que vai criar e gere o código JavaScript para criar via API REST do Onshape usando fetch com autenticação Basic (btoa(accessKey + ':' + secretKey)). Use o endpoint POST https://cad.onshape.com/api/v6/partstudios/d/{did}/w/{wid}/e/{eid}/features. Retorne o código em bloco \`\`\`javascript\`\`\`.

Seja direto, prático e use exemplos reais de FRC sempre que possível. Quando não souber algo com certeza, diga claramente.`;

const QUICK_PROMPTS = [
  { icon: '🔄', label: 'Intake de rolos', prompt: 'Crie um intake de rolos simples: dois rolos paralelos de 2 polegadas de diâmetro, separados por 4 polegadas, com 12 polegadas de comprimento.' },
  { icon: '⚙️', label: 'Suporte de motor', prompt: 'Crie um suporte de motor NEO/Falcon padrão FRC em chapa de alumínio 1/8 polegada com furos de montagem.' },
  { icon: '⬛', label: 'Chapa com furos', prompt: 'Crie uma chapa retangular de alumínio 6061 de 4x6 polegadas com 1/8 polegada de espessura e padrão de furos 0.196 a cada 0.5 polegada.' },
  { icon: '📏', label: 'Perfil tubular', prompt: 'Crie um perfil tubular quadrado de 1x1 polegada, parede de 1/16 polegada, comprimento de 18 polegadas, com furos de 0.196 a cada 0.5 polegada.' },
  { icon: '⭕', label: 'Polia GT2', prompt: 'Crie uma polia de correia GT2 com 36 dentes, para eixo de 1/2 polegada hexagonal, em Delrin.' },
  { icon: '🚀', label: 'Elevator cascata', prompt: 'Me explica como projetar um elevator de dois estágios em cascata para FRC, com boas práticas de CAD no Onshape.' },
  { icon: '🎯', label: 'PID no WPILib', prompt: 'Como implementar um controlador PID para um shooter flywheel usando WPILib em Java?' },
  { icon: '🔍', label: 'Limelight', prompt: 'Como configurar o Limelight para alinhamento automático com AprilTags em Java WPILib?' },
];

function extractOnshapeIds(url) {
  const match = url.match(/documents\/([a-f0-9]+)\/[we]\/([a-f0-9]+)\/e\/([a-f0-9]+)/i);
  if (!match) return null;
  return { did: match[1], wid: match[2], eid: match[3] };
}

function extractJSCode(text) {
  const match = text.match(/```(?:javascript|js)?\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

function formatMessage(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code class="bg-white/10 px-1 rounded text-xs font-mono">$1</code>')
    .replace(/```(?:javascript|js|java|python)?\n([\s\S]*?)```/g, (_, code) =>
      `<pre class="mt-2 p-3 bg-black/40 border border-blue-500/20 rounded-lg text-xs font-mono overflow-x-auto text-green-300 whitespace-pre-wrap">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`)
    .replace(/\n/g, '<br/>');
}

function CADAssistantContent({ user }) {
  const [onshapeUrl, setOnshapeUrl] = useState('');
  const [ids, setIds] = useState(null);
  const [urlError, setUrlError] = useState('');
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: '👋 Olá! Sou o **Assistente Tera** para FRC — equipe **#10343 Tera Robotics**.\n\nPosso ajudar com **CAD no Onshape**, **programação WPILib**, **eletrônica**, **pneumática**, **estratégia** e muito mais.\n\nSe quiser criar peças diretamente no Onshape via API, cole o link do documento acima. Caso contrário, é só perguntar! 🔧'
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [execStatus, setExecStatus] = useState(null);
  const [execError, setExecError] = useState('');
  const [credentials, setCredentials] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    base44.entities.OnshapeConfig.list().then(configs => {
      if (configs && configs.length > 0) setCredentials(configs[0]);
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, execStatus]);

  const handleUrlChange = (val) => {
    setOnshapeUrl(val);
    setUrlError('');
    const extracted = extractOnshapeIds(val);
    if (val && !extracted) setUrlError('Link inválido. Use: https://cad.onshape.com/documents/.../w/.../e/...');
    else setIds(extracted);
  };

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput('');
    setExecStatus(null);
    setExecError('');

    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const history = newMessages.slice(-10).map(m =>
        `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`
      ).join('\n\n');

      const contextNote = ids
        ? `\nDocumento Onshape vinculado: did=${ids.did}, wid=${ids.wid}, eid=${ids.eid}. Use essas variáveis no código gerado (já estarão disponíveis como constantes).`
        : '';

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `${SYSTEM_PROMPT}${contextNote}\n\n---\nHistórico:\n${history}\n\nResponda à última mensagem do usuário.`,
        model: 'claude_sonnet_4_6',
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);

      // Auto-execute JS code if Onshape link + credentials are present
      const jsCode = extractJSCode(response);
      if (jsCode && ids && credentials) {
        await executeCode(jsCode, ids, credentials);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Erro ao contactar a IA. Tente novamente.' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const executeCode = async (code, { did, wid, eid }, creds) => {
    setExecStatus('running');
    setExecError('');
    try {
      const { access_key: accessKey, secret_key: secretKey } = creds;
      const fn = new Function('accessKey', 'secretKey', 'did', 'wid', 'eid', `return (async () => { ${code} })()`);
      await fn(accessKey, secretKey, did, wid, eid);
      setExecStatus('success');
    } catch (e) {
      setExecStatus('error');
      setExecError(e.message || String(e));
    }
  };

  const reset = () => {
    setMessages([{ role: 'assistant', content: '👋 Conversa reiniciada! O que você quer projetar ou perguntar hoje?' }]);
    setExecStatus(null);
    setExecError('');
  };

  const isAdmin = user?.role === 'admin' || user?.member_role === 'admin';

  return (
    <InternalPageLayout user={user} currentPage="InternalCADAssistant" title="Assistente CAD">
      <div className="flex flex-col h-[calc(100vh-110px)] max-w-4xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-900/40 to-red-900/20 border border-blue-500/30 rounded-2xl p-4 mb-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h2 className="font-black text-white text-lg flex items-center gap-2">
              <span>⚙️</span> Assistente Tera — FRC
              <span className="text-xs font-normal text-gray-500">#10343</span>
            </h2>
            <p className="text-xs text-gray-400">CAD · Programação · Eletrônica · Estratégia · Onshape API</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link to={createPageUrl('InternalCADConfig')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 hover:text-white text-xs font-bold transition-colors">
                <Settings className="w-3.5 h-3.5" /> Config. Onshape
              </Link>
            )}
            <button onClick={reset}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 hover:text-white text-xs font-bold transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Reiniciar
            </button>
          </div>
        </motion.div>

        {/* Onshape URL input (optional) */}
        <div className="bg-[#0d1525] border border-blue-500/20 rounded-xl px-4 py-3 mb-3">
          <label className="text-xs text-blue-300 font-bold uppercase tracking-widest block mb-1.5">
            <LinkIcon className="w-3 h-3 inline mr-1" /> Link do Documento Onshape <span className="text-gray-600 font-normal normal-case">(opcional — para criar peças via API)</span>
          </label>
          <input
            value={onshapeUrl}
            onChange={e => handleUrlChange(e.target.value)}
            placeholder="https://cad.onshape.com/documents/abc.../w/def.../e/ghi..."
            className="w-full bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
          />
          {urlError && <p className="text-xs text-red-400 mt-1">{urlError}</p>}
          {ids && (
            <p className="text-xs text-green-400 mt-1">
              ✅ <span className="font-mono">did: {ids.did.slice(0, 8)}…</span>
              {' · '}<span className="font-mono">wid: {ids.wid.slice(0, 8)}…</span>
              {' · '}<span className="font-mono">eid: {ids.eid.slice(0, 8)}…</span>
              {!credentials && <span className="text-yellow-400 ml-2">⚠️ Chaves não configuradas</span>}
            </p>
          )}
        </div>

        {/* Quick prompts */}
        {messages.length <= 1 && (
          <div className="mb-3">
            <p className="text-xs text-gray-600 font-bold uppercase tracking-widest mb-2">Atalhos rápidos</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((qp) => (
                <button key={qp.label} onClick={() => sendMessage(qp.prompt)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#0d1525] hover:bg-blue-900/40 border border-blue-500/20 hover:border-blue-400/50 rounded-xl text-xs font-medium text-gray-300 hover:text-white transition-all">
                  {qp.icon} {qp.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
                  {msg.role === 'user' ? <User className="w-4 h-4 text-red-400" /> : <Bot className="w-4 h-4 text-blue-400" />}
                </div>
                <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-red-500/10 border border-red-500/20 text-gray-200' : 'bg-[#0d1525] border border-blue-500/15 text-gray-200'}`}>
                  <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-blue-400" />
              </div>
              <div className="bg-[#0d1525] border border-blue-500/15 rounded-2xl px-4 py-3 flex gap-1 items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {execStatus && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border ${
                  execStatus === 'running' ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' :
                  execStatus === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                  'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                {execStatus === 'running' && <Loader className="w-4 h-4 animate-spin" />}
                {execStatus === 'success' && <CheckCircle className="w-4 h-4" />}
                {execStatus === 'error' && <XCircle className="w-4 h-4" />}
                {execStatus === 'running' && 'Criando peça no Onshape...'}
                {execStatus === 'success' && '✅ Peça criada com sucesso no Onshape!'}
                {execStatus === 'error' && `❌ Erro: ${execError}`}
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="bg-[#0d1525] border border-blue-500/20 rounded-2xl p-3 flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Pergunte sobre CAD, programação, eletrônica, estratégia FRC..."
            rows={2}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 resize-none focus:outline-none"
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            className="w-9 h-9 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-center text-xs text-gray-700 mt-1.5">Enter para enviar · Shift+Enter nova linha</p>
      </div>
    </InternalPageLayout>
  );
}

export default function InternalCADAssistant() {
  return (
    <ProtectedRoute requireApproved={true}>
      <CADAssistantContent />
    </ProtectedRoute>
  );
}