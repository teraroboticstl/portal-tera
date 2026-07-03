import React from 'react';
import { ClipboardList, BarChart2, Target, Shield, Zap, Users } from 'lucide-react';

const steps = [
  {
    icon: ClipboardList,
    title: 'Coleta em Arena',
    desc: 'Scouts posicionados na arquibancada registram dados em tempo real durante cada partida, via formulário rápido no site da equipe.'
  },
  {
    icon: Zap,
    title: 'Análise Automática',
    desc: 'O sistema calcula automaticamente o Índice de Eficiência FTC (IEF) de cada equipe com base em autônomo, teleop, endgame e penalidades.'
  },
  {
    icon: Target,
    title: 'Estratégia de Alianças',
    desc: 'Os dados filtrados por equipe permitem decisões rápidas e fundamentadas na escolha de parceiros e estratégia de jogo.'
  },
  {
    icon: BarChart2,
    title: 'Dashboard Visual',
    desc: 'Gráficos e indicadores apresentam padrões de jogo, pontos fortes e fracos de cada equipe de forma clara e objetiva.'
  },
  {
    icon: Users,
    title: 'Aprendizado Coletivo',
    desc: 'Cada membro da equipe aprende sobre análise de desempenho, tomada de decisão sob pressão e trabalho em equipe.'
  },
  {
    icon: Shield,
    title: 'Alinhado à FIRST',
    desc: 'Scout focado em robô, não em pessoas. Sem rankings ofensivos. Uso educacional, estratégico e transparente.'
  }
];

export default function ScoutProcessTab() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#E10600]/10 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-[#E10600]" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">Scout FTC – Processo & Estratégia</h2>
            <p className="text-[#B8BDC7] text-xs">DECODE 2026 · TeraRobotics</p>
          </div>
        </div>
        <p className="text-[#B8BDC7] text-sm leading-relaxed">
          O sistema de scout da TeraRobotics foi desenvolvido para coletar dados relevantes de forma rápida e objetiva durante as partidas.
          Cada registro leva menos de 60 segundos e gera insights diretos para a estratégia da equipe.
        </p>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {steps.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-[#111217] border border-[#1F222B] rounded-2xl p-5">
            <div className="w-9 h-9 bg-[#E10600]/10 rounded-xl flex items-center justify-center mb-3">
              <Icon className="w-4 h-4 text-[#E10600]" />
            </div>
            <h3 className="text-white font-bold text-sm mb-2">{title}</h3>
            <p className="text-[#B8BDC7] text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* IEF Explicação */}
      <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          Índice de Eficiência FTC (IEF)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {[
            { label: 'Autônomo – artefatos', points: '+2 a +8' },
            { label: 'Saiu da zona', points: '+1' },
            { label: 'Patterns seguidos', points: '+1 a +3' },
            { label: 'Overflow teleop', points: '+1 a +3' },
            { label: 'Artefatos teleop', points: '+1 a +5' },
            { label: 'Velocidade de ciclo', points: '+1 a +3' },
            { label: 'Classif. padrões', points: '+1 a +3' },
            { label: 'Endgame total', points: '+4' },
            { label: 'Endgame parcial', points: '+2' },
            { label: 'Penalidades', points: '−1 a −2 cada' },
            { label: 'Cartão amarelo', points: '−2' },
            { label: 'Cartão vermelho', points: '−5' },
            { label: 'Falhas mecânicas/elétricas', points: '−2 cada' },
          ].map(({ label, points }) => (
            <div key={label} className="flex justify-between text-xs text-[#B8BDC7] bg-[#1F222B] px-3 py-2 rounded-lg">
              <span>{label}</span>
              <span className={`font-bold ${points.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{points}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3 flex-wrap">
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-green-900/40 text-green-400">IEF ≥ 15 → Alta Eficiência</span>
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-yellow-900/40 text-yellow-400">IEF 7–14 → Média Eficiência</span>
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-red-900/40 text-red-400">IEF &lt; 7 → Baixa Eficiência</span>
        </div>
      </div>

      {/* Boas práticas */}
      <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6">
        <h3 className="text-white font-bold mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#E10600]" />
          Boas Práticas – Normas FIRST
        </h3>
        <ul className="space-y-2">
          {[
            'Scout focado no desempenho do robô, não em pessoas',
            'Sem ranking público ofensivo ou comparativo prejudicial',
            'Uso exclusivamente educacional e estratégico',
            'Transparência total do processo para juízes e árbitros',
            'Aprendizado técnico documentado e valorizado no PDI',
          ].map(item => (
            <li key={item} className="flex items-start gap-2 text-sm text-[#B8BDC7]">
              <span className="text-green-400 mt-0.5">✔</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}