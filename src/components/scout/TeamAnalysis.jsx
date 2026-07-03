import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Zap, ChevronDown, ChevronUp } from 'lucide-react';

function Bar({ value, max = 100, color = '#E10600' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="h-2 bg-[#1F222B] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function StatusIcon({ value }) {
  if (value >= 70) return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  if (value >= 40) return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
  return <XCircle className="w-4 h-4 text-red-400" />;
}

function iefClass(ief) {
  if (ief >= 15) return { label: 'Alta Eficiência', color: 'bg-green-900/40 text-green-400' };
  if (ief >= 7) return { label: 'Média Eficiência', color: 'bg-yellow-900/40 text-yellow-400' };
  return { label: 'Baixa Eficiência', color: 'bg-red-900/40 text-red-400' };
}

function rpColor(avg) {
  if (avg >= 3) return 'text-green-400';
  if (avg >= 1.5) return 'text-yellow-400';
  return 'text-red-400';
}

// Modo de uma opção mais frequente
function mostCommon(arr) {
  if (!arr || arr.length === 0) return '—';
  const freq = {};
  arr.forEach(v => { if (v) freq[v] = (freq[v] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
}

export default function TeamAnalysis({ teamNumber, scouts }) {
  const [expanded, setExpanded] = useState(false);
  if (!scouts || scouts.length === 0) return null;

  const total = scouts.length;
  const autoMovePct = Math.round((scouts.filter(s => s.auto_left_zone).length / total) * 100);
  const autoConflictPct = Math.round((scouts.filter(s => s.auto_conflicts).length / total) * 100);
  const endgameTotalPct = Math.round((scouts.filter(s => s.endgame_base === 'Total').length / total) * 100);
  const endgameAnyPct = Math.round((scouts.filter(s => s.endgame_base !== 'Não chegou').length / total) * 100);
  const reliabilityPct = Math.round((scouts.filter(s => !s.reliability_issues || s.reliability_issues.length === 0).length / total) * 100);
  const avgIEF = Math.round(scouts.reduce((a, s) => a + (s.efficiency_index || 0), 0) / total);
  const avgRP = Math.round((scouts.reduce((a, s) => a + (s.rp_count || 0), 0) / total) * 10) / 10;

  const cycleMap = { 'Rápido': 100, 'Médio': 60, 'Lento': 20 };
  const avgCyclePct = Math.round(scouts.reduce((a, s) => a + (cycleMap[s.teleop_cycle_speed] || 0), 0) / total);
  const patternMap = { 'Alta': 100, 'Média': 60, 'Baixa': 20 };
  const avgPatternPct = Math.round(scouts.reduce((a, s) => a + (patternMap[s.teleop_pattern_ability] || 0), 0) / total);

  const commonShoot = mostCommon(scouts.map(s => s.teleop_shoot_location));
  const commonPattern = mostCommon(scouts.map(s => s.auto_patterns));

  const cls = iefClass(avgIEF);

  return (
    <div className="bg-[#111217] border border-[#1F222B] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-[#B8BDC7]">Equipe</p>
            <h3 className="text-xl font-black text-white">#{teamNumber}</h3>
            <p className="text-xs text-[#555]">{total} partida{total !== 1 ? 's' : ''}</p>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <div className="flex items-center gap-1 bg-[#1F222B] px-3 py-2 rounded-xl">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="font-black text-white text-lg">{avgIEF > 0 ? '+' : ''}{avgIEF}</span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls.color}`}>{cls.label}</span>
          </div>
        </div>

        {/* Info rápida – linha */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div className="bg-[#1F222B] rounded-lg px-3 py-2">
            <p className="text-[#555] mb-0.5">Saiu da zona</p>
            <p className={`font-bold ${autoMovePct >= 70 ? 'text-green-400' : autoMovePct >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{autoMovePct}% das vezes</p>
          </div>
          <div className="bg-[#1F222B] rounded-lg px-3 py-2">
            <p className="text-[#555] mb-0.5">Atrapalha autônomo</p>
            <p className={`font-bold ${autoConflictPct === 0 ? 'text-green-400' : autoConflictPct <= 30 ? 'text-yellow-400' : 'text-red-400'}`}>{autoConflictPct}% das vezes</p>
          </div>
          <div className="bg-[#1F222B] rounded-lg px-3 py-2">
            <p className="text-[#555] mb-0.5">Shoot preferido</p>
            <p className="font-bold text-white text-[11px]">{commonShoot}</p>
          </div>
          <div className="bg-[#1F222B] rounded-lg px-3 py-2">
            <p className="text-[#555] mb-0.5">Pattern (mais comum)</p>
            <p className="font-bold text-white">{commonPattern}</p>
          </div>
          <div className="bg-[#1F222B] rounded-lg px-3 py-2">
            <p className="text-[#555] mb-0.5">Terminou na base</p>
            <p className={`font-bold ${endgameTotalPct >= 70 ? 'text-green-400' : endgameTotalPct >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{endgameTotalPct}% total / {endgameAnyPct}% qualquer</p>
          </div>
          <div className="bg-[#1F222B] rounded-lg px-3 py-2">
            <p className="text-[#555] mb-0.5">RPs médio</p>
            <p className={`font-bold text-lg ${rpColor(avgRP)}`}>{avgRP} RP</p>
          </div>
        </div>

        {/* Expand toggle */}
        <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-1 text-xs text-[#555] hover:text-[#B8BDC7] transition-colors">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Menos detalhes' : 'Ver barras de desempenho'}
        </button>
      </div>

      {/* Barras expandidas */}
      {expanded && (
        <div className="border-t border-[#1F222B] px-5 py-4 space-y-3">
          {[
            { label: 'Auto – saiu da zona', value: autoMovePct, color: '#3B82F6' },
            { label: 'Velocidade de ciclo', value: avgCyclePct, color: '#F59E0B' },
            { label: 'Classif. padrões', value: avgPatternPct, color: '#06B6D4' },
            { label: 'Endgame (total)', value: endgameTotalPct, color: '#22C55E' },
            { label: 'Confiabilidade', value: reliabilityPct, color: '#E10600' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#B8BDC7]">{label}</span>
                <div className="flex items-center gap-1">
                  <StatusIcon value={value} />
                  <span className="text-white font-medium">{value}%</span>
                </div>
              </div>
              <Bar value={value} color={color} />
            </div>
          ))}

          {/* Histórico de partidas */}
          <div className="mt-3 space-y-1">
            <p className="text-[10px] text-[#555] uppercase tracking-wider mb-2">Histórico por partida</p>
            {scouts.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-[#1A1D24] rounded-lg px-3 py-1.5">
                <span className="text-[#B8BDC7]">{s.match_number || `P${i+1}`}</span>
                <div className="flex items-center gap-3">
                  {s.auto_left_zone ? <span className="text-green-400">✔ zona</span> : <span className="text-[#555]">✗ zona</span>}
                  {s.auto_conflicts ? <span className="text-red-400">⚠ conflito</span> : null}
                  <span className="text-[#B8BDC7]">Shoot: {s.teleop_shoot_location ? s.teleop_shoot_location.replace('Esquerda','E').replace('Direita','D').replace('maior','▲').replace('menor','▼') : '—'}</span>
                  <span className="text-[#B8BDC7]">{s.endgame_base === 'Total' ? '🏁 base' : s.endgame_base === 'Parcial' ? '½ base' : '✗ base'}</span>
                  <span className={`font-bold ${rpColor(s.rp_count || 0)}`}>{s.rp_count || 0}RP</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Última observação */}
      {scouts.filter(s => s.general_observations?.length > 0 || s.observations_other).slice(-1).map((s, i) => (
        <div key={i} className="px-5 pb-4 text-xs text-[#B8BDC7] bg-[#111217]">
          <div className="bg-[#1F222B] rounded-lg px-3 py-2">
            {s.general_observations?.join(', ')}{s.observations_other ? ` — ${s.observations_other}` : ''}
            <span className="text-[#555] ml-1">/ {s.match_number}</span>
          </div>
        </div>
      ))}
    </div>
  );
}