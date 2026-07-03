import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

const MISSION_IMAGES = {
  M01: 'https://media.base44.com/images/public/698a86446abc83aece20025a/c69a9ffca_misso1.jpeg',
  M02: 'https://media.base44.com/images/public/698a86446abc83aece20025a/981a386fb_misso2.jpeg',
  M03: 'https://media.base44.com/images/public/698a86446abc83aece20025a/b523318a3_misso3.jpeg',
  M04: 'https://media.base44.com/images/public/698a86446abc83aece20025a/795f9fe96_misso4.jpeg',
  M05: 'https://media.base44.com/images/public/698a86446abc83aece20025a/bc6efb607_misso5.jpeg',
  M06: 'https://media.base44.com/images/public/698a86446abc83aece20025a/49553fe78_misso6.jpeg',
  M07: 'https://media.base44.com/images/public/698a86446abc83aece20025a/64624c664_misso7.jpeg',
  M08: 'https://media.base44.com/images/public/698a86446abc83aece20025a/8286b3908_misso8.jpeg',
  M09: 'https://media.base44.com/images/public/698a86446abc83aece20025a/e4b841b7b_misso9.jpeg',
  M10: 'https://media.base44.com/images/public/698a86446abc83aece20025a/9d2faa2b1_misso10.jpeg',
  M11: 'https://media.base44.com/images/public/698a86446abc83aece20025a/576e89003_misso11.jpeg',
  M12: 'https://media.base44.com/images/public/698a86446abc83aece20025a/37cb52bf9_misso12.jpeg',
  M13: 'https://media.base44.com/images/public/698a86446abc83aece20025a/56d8b39dd_misso13.jpeg',
};

// Definição de todas as missões com suas partes e pontuações
export const MISSIONS_DEF = [
  { id: 'M01', title: 'Central de Suprimentos', icon: '🏭', maxScore: 50, parts: [10, 10, 10, 20] },
  { id: 'M02', title: 'Doca de Descarga Inteligente', icon: '🚢', maxScore: 30, parts: [20, 10] },
  { id: 'M03', title: 'Carregamento e Expedição', icon: '📦', maxScore: 50, parts: [10, 10, 10, 10, 10] },
  { id: 'M04', title: 'Reparo de Unidade Operacional', icon: '🔧', maxScore: 30, parts: [30] },
  { id: 'M05', title: 'Torre de Abastecimento', icon: '🗼', maxScore: 30, parts: [20, 10] },
  { id: 'M06', title: 'Hub de Armazenamento de Insumos', icon: '🗃️', maxScore: 40, parts: [10, 10, 10, 10] },
  { id: 'M07', title: 'Turbina de Geração Industrial', icon: '⚡', maxScore: 60, parts: [20, 20, 20] },
  { id: 'M08', title: 'Segurança no Trabalho', icon: '🦺', maxScore: 30, parts: [20, 10] },
  { id: 'M09', title: 'Linha de Produção', icon: '🏗️', maxScore: 50, parts: [10, 10, 10, 20] },
  { id: 'M10', title: 'Movimentação Operacional', icon: '🚜', maxScore: 40, parts: [20, 20] },
  { id: 'M11', title: 'Fluxo Logístico Interno', icon: '🔄', maxScore: 20, parts: [10, 10] },
  { id: 'M12', title: 'Fluxo Logístico Interno II', icon: '🔁', maxScore: 20, parts: [10, 10] },
  { id: 'M13', title: 'Estoque', icon: '📊', maxScore: 100, parts: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10] },
];

// Gera o estado inicial das missões (todas as partes desmarcadas)
export const getInitialMissions = () => {
  const state = {};
  MISSIONS_DEF.forEach(m => {
    m.parts.forEach((_, i) => {
      state[`${m.id}_p${i + 1}`] = false;
    });
  });
  return state;
};

// Calcula o score total das missões
export const calcMissionsScore = (missions) => {
  let total = 0;
  MISSIONS_DEF.forEach(m => {
    m.parts.forEach((pts, i) => {
      if (missions[`${m.id}_p${i + 1}`]) total += pts;
    });
  });
  return total;
};

function PartCheckbox({ label, points, checked, onChange, disabled }) {
  return (
    <label className={`flex items-center gap-3 cursor-pointer group rounded-lg px-3 py-2 transition-colors ${checked ? 'bg-blue-900/20' : 'hover:bg-[#1a237e]/10'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div
        onClick={() => !disabled && onChange(!checked)}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${checked ? 'bg-[#1a237e] border-[#3949ab]' : 'border-gray-600 group-hover:border-blue-400'}`}
      >
        {checked && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
      </div>
      <span className="text-sm flex-1 text-gray-200">{label}</span>
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${checked ? 'bg-green-600/30 text-green-400' : 'bg-[#1a237e]/30 text-blue-300'}`}>
        {checked ? '+' : ''}{points} pts
      </span>
    </label>
  );
}

function MissionCard({ mission, missions, setMissions, disabled }) {
  const [open, setOpen] = useState(true);
  const imgSrc = MISSION_IMAGES[mission.id];

  const missionScore = mission.parts.reduce((sum, pts, i) => {
    return sum + (missions[`${mission.id}_p${i + 1}`] ? pts : 0);
  }, 0);

  const toggle = (partKey, val) => setMissions(prev => ({ ...prev, [partKey]: val }));

  return (
    <motion.div layout className={`bg-[#111827] border rounded-xl overflow-hidden mb-3 transition-colors ${missionScore > 0 ? 'border-blue-500/50' : 'border-[#1e3a5f]'}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#1a237e]/20 transition-colors">
        <div className="flex items-center gap-3">
          {imgSrc && (
            <div className="w-14 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-[#1e3a5f] bg-[#0a1628]">
              <img src={imgSrc} alt={mission.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap text-left">
            <span className="text-xs font-black bg-[#1a237e] px-2 py-1 rounded text-blue-300">{mission.id}</span>
            <span className="text-sm font-bold">{mission.icon} {mission.title}</span>
            {missionScore > 0 && (
              <motion.span key={missionScore} initial={{ scale: 1.2 }} animate={{ scale: 1 }}
                className="text-xs font-black bg-green-600/30 text-green-400 px-2 py-0.5 rounded-full">
                +{missionScore}
              </motion.span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-xs text-gray-600 hidden sm:block">máx {mission.maxScore}</span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 border-t border-[#1e3a5f] pt-2 space-y-1">
              {mission.parts.map((pts, i) => {
                const partKey = `${mission.id}_p${i + 1}`;
                return (
                  <PartCheckbox
                    key={partKey}
                    label={`Parte ${i + 1}`}
                    points={pts}
                    checked={!!missions[partKey]}
                    onChange={val => toggle(partKey, val)}
                    disabled={disabled}
                  />
                );
              })}
              {/* Progress bar for this mission */}
              <div className="mt-2 px-3">
                <div className="h-1.5 bg-[#283593] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-400 rounded-full"
                    animate={{ width: `${mission.maxScore > 0 ? Math.min(100, (missionScore / mission.maxScore) * 100) : 0}%` }}
                  />
                </div>
                <p className="text-right text-[10px] text-gray-500 mt-0.5">{missionScore} / {mission.maxScore} pts</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export const MAX_MISSIONS_SCORE = MISSIONS_DEF.reduce((s, m) => s + m.maxScore, 0);

export default function FLLMissions({ missions, setMissions, disabled, score }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-blue-300">Missões do Robot Game</h2>
        <span className="text-xs text-gray-500">Máx: {MAX_MISSIONS_SCORE} pts (+ jetons)</span>
      </div>

      {MISSIONS_DEF.map(mission => (
        <MissionCard
          key={mission.id}
          mission={mission}
          missions={missions}
          setMissions={setMissions}
          disabled={disabled}
        />
      ))}

      {/* Jetons info */}
      <div className="bg-[#1a237e]/20 border border-[#283593] rounded-xl px-4 py-3 mb-3">
        <p className="text-sm font-bold text-blue-300">🪙 Jetons de Precisão</p>
        <p className="text-xs text-gray-400 mt-1">Controlados no painel do cronômetro acima. Pontuação varia conforme quantidade restante.</p>
      </div>

      {/* Total Summary */}
      <div className="bg-[#1a237e] rounded-xl p-4 mt-6 text-center">
        <p className="text-xs text-blue-300 font-bold uppercase tracking-widest mb-1">Pontuação Total</p>
        <motion.p key={score} initial={{ scale: 1.2 }} animate={{ scale: 1 }}
          className="text-5xl font-black text-yellow-400">{score}</motion.p>
        <p className="text-blue-300 text-sm mt-1">de {MAX_MISSIONS_SCORE}+ pontos possíveis</p>
        <div className="mt-2 h-3 bg-[#283593] rounded-full overflow-hidden">
          <motion.div className="h-full bg-yellow-400 rounded-full" animate={{ width: `${Math.min(100, (score / (MAX_MISSIONS_SCORE + 50)) * 100)}%` }} />
        </div>
      </div>
    </div>
  );
}