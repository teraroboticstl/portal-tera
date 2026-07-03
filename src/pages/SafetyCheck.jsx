import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698a86446abc83aece20025a/71928ec1c_WhatsAppImage2026-02-05at171715.jpg";

const questions = [
  "Todos os membros da equipe estão usando óculos de proteção nas áreas de pit ou robótica?",
  "Todos os membros estão usando calçados fechados apropriados?",
  "Cabelos longos estão presos ao trabalhar perto do robô ou ferramentas?",
  "A equipe utiliza protetor auricular em testes barulhentos quando necessário?",
  "O robô é desligado antes de qualquer manutenção?",
  "A equipe avisa claramente antes de ligar o robô?",
  "As pessoas mantêm distância de partes móveis do robô durante testes?",
  "As baterias utilizadas pela equipe estão em boas condições e não danificadas?",
  "Cabos e extensões elétricas são verificados regularmente?",
  "A equipe evita ligar várias extensões ou adaptadores em sequência?",
  "A equipe utiliza a ferramenta correta para cada tarefa?",
  "Ferramentas são guardadas corretamente após o uso?",
  "A equipe evita usar ferramentas quebradas ou danificadas?",
  "O pit da equipe está organizado e livre de objetos no chão?",
  "Cabos e equipamentos estão organizados para evitar tropeços?",
  "O robô é transportado com duas pessoas ou com carrinho apropriado?",
  "A equipe possui um responsável ou capitão de segurança?",
  "Os membros da equipe incentivam práticas seguras entre si?",
  "A equipe planeja atividades antes de começar a trabalhar no robô?"
];

const safetyLevels = [
  {
    level: "Safety Excellence",
    range: [80, 100],
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500",
    icon: CheckCircle2,
    text: "Parabéns! Sua equipe demonstra uma forte cultura de segurança e segue a maioria das boas práticas recomendadas para ambientes de robótica. Isso indica que o pit está organizado, o uso de EPI é consistente e a equipe trabalha de forma responsável ao operar e manter o robô. Para manter esse nível, continue incentivando todos os membros da equipe a seguir as regras de segurança, realizar verificações frequentes no pit e orientar novos integrantes sobre as práticas seguras da equipe."
  },
  {
    level: "Safety Developing",
    range: [50, 79],
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500",
    icon: AlertTriangle,
    text: "Sua equipe já aplica algumas práticas importantes de segurança, mas ainda existem pontos que podem ser melhorados para reduzir riscos durante o trabalho no pit. Resultados nessa faixa normalmente indicam que algumas medidas de segurança estão sendo seguidas, porém nem sempre de forma consistente. Reforçar o uso de equipamentos de proteção, manter o pit organizado e revisar cabos, ferramentas e equipamentos pode aumentar significativamente a segurança da equipe."
  },
  {
    level: "Safety Attention",
    range: [0, 49],
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500",
    icon: XCircle,
    text: "Esse resultado indica que sua equipe pode estar enfrentando riscos de segurança que precisam de atenção. Trabalhar com robôs envolve ferramentas, energia elétrica e partes mecânicas que podem causar acidentes quando as práticas de segurança não são seguidas corretamente. Para melhorar sua pontuação, é importante garantir o uso de óculos de proteção, manter o pit organizado, desligar o robô antes de manutenção e incentivar todos os membros da equipe a adotar comportamentos seguros."
  }
];

export default function SafetyCheck() {
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const handleAnswer = (index, value) => {
    setAnswers(prev => ({ ...prev, [index]: value }));
    setShowResult(false);
    setSubmitError(false);
  };

  const calculateScore = () => {
    const yesCount = Object.values(answers).filter(a => a === true).length;
    return Math.round((yesCount / questions.length) * 100);
  };

  const getSafetyLevel = (score) => {
    return safetyLevels.find(level => score >= level.range[0] && score <= level.range[1]);
  };

  const handleSubmit = () => {
    if (Object.keys(answers).length === questions.length) {
      setSubmitError(false);
      setShowResult(true);
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
    } else {
      setSubmitError(true);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setShowResult(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const score = calculateScore();
  const safetyLevel = getSafetyLevel(score);
  const allAnswered = Object.keys(answers).length === questions.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0B0B0D] to-black">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-[#E10600] to-[#7A0000] py-16 px-6">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.1) 75%), linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.1) 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 10px 10px' }} />
        
        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <img src={LOGO} alt="TeraRobotics" className="w-20 h-20 mx-auto mb-6 rounded-full border-4 border-white shadow-2xl" />
            <h1 className="text-4xl md:text-5xl font-black mb-4 text-white tracking-tight">
              TERA ROBOTICS
            </h1>
            <div className="flex items-center justify-center gap-3 mb-6">
              <Shield className="w-8 h-8 text-white" />
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                Pit Safety Self Inspection
              </h2>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Introdução */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111217] border border-[#1F222B] rounded-2xl p-8 mb-12"
        >
          <p className="text-gray-300 leading-relaxed mb-4">
            Este checklist foi criado pela equipe <span className="text-[#E10600] font-bold">TERA Robotics</span> para ajudar equipes de robótica a avaliar rapidamente suas práticas de segurança durante competições.
          </p>
          <p className="text-gray-300 leading-relaxed mb-4">
            Responda às perguntas abaixo e descubra o nível de segurança do seu pit.
          </p>
          <p className="text-gray-300 leading-relaxed">
            Ao final, você receberá um <span className="text-[#E10600] font-bold">Safety Score (%)</span> junto com orientações para melhorar ou manter suas práticas de segurança.
          </p>
        </motion.div>

        {/* Checklist */}
        <div className="space-y-4 mb-12">
          <h3 className="text-2xl font-bold text-white mb-6">Checklist de Segurança</h3>
          
          {questions.map((question, index) => {
            const isAnswered = answers.hasOwnProperty(index);
            const answer = answers[index];

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className={`bg-[#111217] border-[#1F222B] p-6 transition-all ${
                  isAnswered ? (answer ? 'border-green-500/50' : 'border-red-500/50') : 'hover:border-[#E10600]/50'
                }`}>
                  <div className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-[#E10600] rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-white font-medium mb-4 leading-relaxed">{question}</p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleAnswer(index, true)}
                          className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all ${
                            answer === true
                              ? 'bg-green-500 text-white shadow-lg shadow-green-500/50'
                              : 'bg-[#1F222B] text-gray-400 hover:bg-green-500/20 hover:text-green-400'
                          }`}
                        >
                          ✓ Sim
                        </button>
                        <button
                          onClick={() => handleAnswer(index, false)}
                          className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all ${
                            answer === false
                              ? 'bg-red-500 text-white shadow-lg shadow-red-500/50'
                              : 'bg-[#1F222B] text-gray-400 hover:bg-red-500/20 hover:text-red-400'
                          }`}
                        >
                          ✗ Não
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Progress */}
        <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm">Progresso</span>
            <span className="text-white font-bold">
              {Object.keys(answers).length} / {questions.length}
            </span>
          </div>
          <div className="w-full bg-[#1F222B] rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#E10600] to-orange-500"
              initial={{ width: 0 }}
              animate={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Erro de validação */}
        {submitError && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500 rounded-xl text-red-400 text-sm font-medium">
            ⚠️ Por favor, responda todas as {questions.length} perguntas antes de ver o resultado.
          </div>
        )}

        {/* Botões */}
        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-[#E10600] hover:bg-[#E10600]/90 text-white font-bold py-6 text-lg"
          >
            {allAnswered ? 'Ver Resultado' : `Responda todas as perguntas (${Object.keys(answers).length}/${questions.length})`}
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            className="sm:w-auto border-[#1F222B] text-gray-300 hover:bg-[#1F222B]"
          >
            Reiniciar
          </Button>
        </div>

        {/* Resultado */}
        <AnimatePresence>
          {showResult && safetyLevel && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="space-y-6"
            >
              {/* Score Card */}
              <Card className={`${safetyLevel.bgColor} border-2 ${safetyLevel.borderColor} p-8 text-center`}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  <safetyLevel.icon className={`w-20 h-20 mx-auto mb-4 ${safetyLevel.color}`} />
                  <h3 className="text-2xl font-bold text-white mb-2">Safety Score</h3>
                  <div className={`text-7xl font-black mb-4 ${safetyLevel.color}`}>
                    {score}%
                  </div>
                  <div className={`inline-block px-6 py-3 ${safetyLevel.bgColor} border ${safetyLevel.borderColor} rounded-full`}>
                    <span className={`text-xl font-bold ${safetyLevel.color}`}>
                      {safetyLevel.level}
                    </span>
                  </div>
                </motion.div>
              </Card>

              {/* Explicação */}
              <Card className="bg-[#111217] border-[#1F222B] p-8">
                <p className="text-gray-300 leading-relaxed text-lg">
                  {safetyLevel.text}
                </p>
              </Card>

              {/* Detalhamento */}
              <Card className="bg-[#111217] border-[#1F222B] p-8">
                <h4 className="text-xl font-bold text-white mb-4">Detalhamento</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-3xl font-black text-green-500 mb-1">
                      {Object.values(answers).filter(a => a === true).length}
                    </div>
                    <div className="text-sm text-gray-400">Respostas "Sim"</div>
                  </div>
                  <div>
                    <div className="text-3xl font-black text-red-500 mb-1">
                      {Object.values(answers).filter(a => a === false).length}
                    </div>
                    <div className="text-sm text-gray-400">Respostas "Não"</div>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <div className="text-3xl font-black text-[#E10600] mb-1">
                      {questions.length}
                    </div>
                    <div className="text-sm text-gray-400">Total de Perguntas</div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="border-t border-[#1F222B] py-8 mt-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} TeraRobotics. Ferramenta desenvolvida para apoiar equipes de robótica na melhoria contínua de suas práticas de segurança.
          </p>
        </div>
      </div>
    </div>
  );
}