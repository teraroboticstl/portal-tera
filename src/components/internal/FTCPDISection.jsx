import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, BookOpen, Target, BarChart2, Wrench, RotateCcw, CheckCircle } from 'lucide-react';

const steps = [
  {
    number: 1,
    icon: Target,
    title: 'Definição dos Objetivos',
    color: '#E10600',
    description: 'O que queremos alcançar nesta temporada? Liste os objetivos técnicos e de processo do time FTC.',
    examples: [
      'Atingir consistência no subsistema de intake',
      'Melhorar tempo de ciclo no teleop',
      'Documentar 100% das decisões de engenharia',
    ],
  },
  {
    number: 2,
    icon: BarChart2,
    title: 'Estabelecimento de Metas Realistas',
    color: '#3b82f6',
    description: 'Transforme os objetivos em metas mensuráveis com prazo definido.',
    examples: [
      'Pontuar ≥ 3 amostras por ciclo até a semana 4',
      'Reduzir falhas mecânicas para < 1 por treino',
      'Registrar log diário em 90% dos dias de build',
    ],
  },
  {
    number: 3,
    icon: Wrench,
    title: 'Elaboração do Plano de Ação',
    color: '#a855f7',
    description: 'Como vamos atingir as metas? Defina tarefas, responsáveis e prazos.',
    examples: [
      'Dividir subsistemas entre subequipes (Build, CAD, Prog)',
      'Reunião semanal de alinhamento toda segunda',
      'Prototipar 2 soluções por subsistema antes de construir',
    ],
  },
  {
    number: 4,
    icon: BarChart2,
    title: 'Monitoramento e Acompanhamento',
    color: '#22c55e',
    description: 'Acompanhe os indicadores continuamente. Use logs e protótipos para medir progresso.',
    examples: [
      'Revisar métricas de KPI todo treino',
      'Comparar resultados com a meta semanal',
      'Usar o dashboard para visualizar evolução',
    ],
  },
  {
    number: 5,
    icon: RotateCcw,
    title: 'Ajustes',
    color: '#f59e0b',
    description: 'Identifique o que não está funcionando e itere rapidamente. O processo de melhoria contínua é o coração do FTC.',
    examples: [
      'Se meta não foi atingida: redesenhar subsistema',
      'Registrar lições aprendidas em cada protótipo',
      'Reavaliar prioridades com base em dados reais',
    ],
  },
];

function StepCard({ step, index }) {
  const [open, setOpen] = useState(false);
  const Icon = step.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="border border-[#1F222B] rounded-xl overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-5 py-4 bg-[#111217] hover:bg-[#16181f] transition-colors text-left"
      >
        {/* Step number bubble */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
          style={{ background: `${step.color}22`, color: step.color, border: `1.5px solid ${step.color}55` }}
        >
          {step.number}
        </div>
        <Icon className="w-4 h-4 flex-shrink-0" style={{ color: step.color }} />
        <span className="font-bold text-white text-sm flex-1">{step.title}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-[#B8BDC7]" />
          : <ChevronDown className="w-4 h-4 text-[#B8BDC7]" />
        }
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4 bg-[#0B0B0D] border-t border-[#1F222B]">
              <p className="text-sm text-[#B8BDC7] mb-3 leading-relaxed">{step.description}</p>
              <div className="space-y-2">
                {step.examples.map((ex, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: step.color }} />
                    <span className="text-xs text-[#B8BDC7]">{ex}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FTCPDISection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-[#0B0B0D] border border-[#1F222B] rounded-2xl p-6"
    >
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-[#E10600]" />
          <h3 className="text-lg font-black text-white">PDI — Plano de Desenvolvimento FTC</h3>
        </div>
        <p className="text-xs text-[#B8BDC7] leading-relaxed max-w-2xl">
          O PDI serve para apoiar o time a se desenvolver e se tornar ainda melhor, tanto em <span className="text-[#E10600] font-semibold">hard skills</span> (engenharia, programação, CAD) quanto em <span className="text-[#3b82f6] font-semibold">soft skills</span> (comunicação, trabalho em equipe, documentação).
        </p>
        <p className="text-xs text-[#B8BDC7] mt-2 leading-relaxed max-w-2xl">
          Para garantir que o PDI seja efetivo, é essencial seguir um processo estruturado. O <strong className="text-white">plano de desenvolvimento FTC consiste em</strong>:
        </p>
        <ol className="mt-2 space-y-1 ml-4">
          {['Definição dos objetivos', 'Estabelecimento de metas realistas', 'Elaboração do plano de ação', 'Monitoramento e acompanhamento', 'Ajustes'].map((s, i) => (
            <li key={i} className="text-xs text-[#B8BDC7]">
              <span className="text-[#E10600] font-bold">{i + 1}.</span> {s}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-5 space-y-2">
        {steps.map((step, i) => (
          <StepCard key={step.number} step={step} index={i} />
        ))}
      </div>
    </motion.div>
  );
}