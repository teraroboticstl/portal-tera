import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import { motion } from 'framer-motion';
import { Save } from 'lucide-react';
import { Input } from '@/components/ui/input';

// ── helpers ──────────────────────────────────────────────────────────────────
const GATE_COLS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// ── sub-components ────────────────────────────────────────────────────────────

// Each gate slot cycles: none → green → purple → none
function GateSlotButton({ value, onClick, shape = 'circle' }) {
  const base = shape === 'circle'
    ? 'w-7 h-7 rounded-full border-2 font-black text-[10px] transition-all flex items-center justify-center mx-auto'
    : 'w-7 h-7 rounded border-2 font-black text-[10px] transition-all flex items-center justify-center mx-auto';
  if (value === 'green')  return <button onClick={onClick} className={`${base} bg-green-600 border-green-400 text-white`}>G</button>;
  if (value === 'purple') return <button onClick={onClick} className={`${base} bg-purple-600 border-purple-400 text-white`}>P</button>;
  return <button onClick={onClick} className={`${base} bg-[#1A1D24] border-[#333] text-[#555]`}>—</button>;
}

function cycleColor(current) {
  if (current === 'none') return 'green';
  if (current === 'green') return 'purple';
  return 'none';
}

function GateGrid({ gate, onChange }) {
  // gate: { 1: 'green'|'purple'|'none', ..., 9: ..., square: ... }
  return (
    <div>
      <div className="flex items-center gap-1 flex-wrap justify-center">
        {GATE_COLS.map((c) => (
          <div key={c} className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] text-[#555]">{c}</span>
            <GateSlotButton
              value={gate[c] ?? 'none'}
              onClick={() => onChange(c, cycleColor(gate[c] ?? 'none'))}
            />
          </div>
        ))}
        <div className="flex flex-col items-center gap-0.5 ml-2">
          <span className="text-[9px] text-[#555]">□</span>
          <GateSlotButton
            shape="square"
            value={gate.square ?? 'none'}
            onClick={() => onChange('square', cycleColor(gate.square ?? 'none'))}
          />
        </div>
      </div>
      <p className="text-[9px] text-[#444] text-center mt-1">Clique para ciclar: — → G → P → —</p>
    </div>
  );
}

function NumberInput({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-bold text-white uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-7 h-7 bg-[#1F222B] rounded-full text-white font-bold hover:bg-[#E10600] transition-colors"
        >−</button>
        <span className="w-8 text-center font-black text-white text-lg">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className="w-7 h-7 bg-[#1F222B] rounded-full text-white font-bold hover:bg-orange-500 transition-colors"
        >+</button>
      </div>
    </div>
  );
}

// ── Motif pattern checker ─────────────────────────────────────────────────────
// In FTC DECODE, the gate has 9 slots. A motif is a repeating pattern of colors.
// Only 3 valid motifs: PGP, GPG, PPG
const PRESET_MOTIFS = [
  { label: 'PGP', pattern: ['purple', 'green', 'purple'] },
  { label: 'GPG', pattern: ['green', 'purple', 'green'] },
  { label: 'PPG', pattern: ['purple', 'purple', 'green'] },
];

function getMotifForGate(gate, motif) {
  // Returns how many slots match the motif pattern (cols 1-9)
  let match = 0;
  GATE_COLS.forEach((c, i) => {
    const expected = motif.pattern[i % motif.pattern.length];
    if ((gate[c] ?? 'none') === expected) match++;
  });
  return match;
}

function MotifChecker({ gate, selectedMotif, onSelectMotif }) {
  return (
    <div className="mt-2 border-t border-[#1F222B] pt-2">
      <p className="text-[9px] text-[#555] uppercase tracking-wider mb-2 text-center">Padrão (Motif) - Qual está presente?</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {PRESET_MOTIFS.map((m) => {
          const matched = getMotifForGate(gate, m);
          const isSelected = selectedMotif === m.label;
          return (
            <button key={m.label}
              onClick={() => onSelectMotif(isSelected ? null : m.label)}
              className={`flex flex-col items-center px-3 py-2 rounded border transition-all cursor-pointer ${
                isSelected 
                  ? 'bg-orange-500 border-orange-400 text-white' 
                  : 'bg-[#1A1D24] border-[#2A2D38] text-[#555] hover:border-[#444]'
              }`}>
              <span className="text-sm font-bold">{m.label}</span>
              <div className="flex gap-0.5 mt-1">
                {m.pattern.map((color, i) => (
                  <span key={i} className={`w-2 h-2 rounded-full inline-block ${color === 'green' ? 'bg-green-500' : 'bg-purple-500'}`} />
                ))}
              </div>
              <span className={`text-[9px] mt-1 ${isSelected ? 'text-white font-bold' : 'text-[#555]'}`}>{matched}/9</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── initial state factory ────────────────────────────────────────────────────
// gate is now: { [col]: 'green' | 'purple' | 'none', square: 'green' | 'purple' | 'none' }
function emptyGate() {
  const g = {};
  GATE_COLS.forEach((c) => (g[c] = 'none'));
  g.square = 'none';
  return g;
}

function emptyTeam() {
  return {
    number: '',
    autoClassified: 0,
    autoOverflow: 0,
    autoGate: emptyGate(),
    autoLeftZone: false,
    autoConflicts: false,
    teleopClassified: 0,
    teleopOverflow: 0,
    teleopGate: emptyGate(),
    teleopBase: 0,
    teleopDepot: 0,
    endgameBase: 'Não chegou',
    penalties: 0,
    robotNotes: '',
  };
}

// ── score calc ────────────────────────────────────────────────────────────────
function gatePoints(gate, multiplier) {
  let pts = 0;
  [...GATE_COLS, 'square'].forEach((c) => {
    if (gate[c] && gate[c] !== 'none') pts += multiplier;
  });
  return pts;
}

function teamScore(t) {
  let auto = t.autoClassified * 3 + t.autoOverflow * 2 + gatePoints(t.autoGate, 2);
  if (t.autoLeftZone) auto += 3;
  
  let teleop = t.teleopClassified * 1 + t.teleopOverflow * 1 + gatePoints(t.teleopGate, 1);
  teleop += (t.teleopBase || 0) * 2;
  teleop += (t.teleopDepot || 0) * 1;
  
  let endgame = 0;
  if (t.endgameBase === 'Total') endgame = 5;
  else if (t.endgameBase === 'Parcial') endgame = 2;
  
  return { auto, teleop, endgame, total: auto + teleop + endgame - t.penalties };
}

// ── TeamPanel ─────────────────────────────────────────────────────────────────
function TeamPanel({ team, onChange, color, label, selectedAutoMotif, onSelectAutoMotif, selectedTeleopMotif, onSelectTeleopMotif }) {
  const score = teamScore(team);

  const setField = (field, val) => onChange({ ...team, [field]: val });
  const setAutoGate = (col, val) => {
    onChange({ ...team, autoGate: { ...team.autoGate, [col]: val } });
  };
  const setTeleopGate = (col, val) => {
    onChange({ ...team, teleopGate: { ...team.teleopGate, [col]: val } });
  };

  const borderColor = color === 'red' ? 'border-red-600' : 'border-blue-600';
  const headerBg = color === 'red' ? 'bg-red-700' : 'bg-blue-700';
  const sectionBg = color === 'red' ? 'bg-red-900/20' : 'bg-blue-900/20';

  return (
    <div className={`rounded-xl border-2 ${borderColor} overflow-hidden`}>
      {/* Header */}
      <div className={`${headerBg} px-4 py-3 flex items-center justify-between`}>
        <div>
          <span className="text-white font-black text-lg">{label}</span>
          <input
            value={team.number}
            onChange={(e) => setField('number', e.target.value)}
            placeholder="Nº do time"
            className="ml-3 bg-white/20 text-white placeholder-white/50 rounded px-2 py-1 text-sm w-28 font-bold"
          />
        </div>
        <div className="text-right">
          <div className="text-white/70 text-xs">TOTAL</div>
          <div className="text-white font-black text-3xl">{score.total}</div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="grid grid-cols-4 text-center bg-[#111217] border-b border-[#1F222B]">
        <div className="py-2 border-r border-[#1F222B]">
          <div className="text-[#B8BDC7] text-xs">AUTÔNOMO</div>
          <div className="text-white font-black text-xl">{score.auto}</div>
        </div>
        <div className="py-2 border-r border-[#1F222B]">
          <div className="text-[#B8BDC7] text-xs">TELEOP</div>
          <div className="text-white font-black text-xl">{score.teleop}</div>
        </div>
        <div className="py-2 border-r border-[#1F222B]">
          <div className="text-[#B8BDC7] text-xs">ENDGAME</div>
          <div className="text-orange-400 font-black text-xl">{score.endgame}</div>
        </div>
        <div className="py-2">
          <div className="text-[#B8BDC7] text-xs">PENALIDADES</div>
          <div className="text-red-400 font-black text-xl">-{team.penalties}</div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* AUTO section */}
        <div className={`rounded-lg ${sectionBg} border border-white/10 p-3`}>
          <h4 className="text-center font-black text-white uppercase tracking-widest text-sm mb-3 border-b border-white/10 pb-2">
            AUTO
          </h4>
          <div className="space-y-2 mb-3">
            <div className="grid grid-cols-2 gap-2 text-xs text-[#B8BDC7] font-bold uppercase mb-1">
              <span>ARTIFACT</span><span className="text-right">ROBOT</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase">CLASSIFIED</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setField('autoClassified', Math.max(0, team.autoClassified - 1))} className="w-5 h-5 bg-[#1F222B] rounded text-white text-xs font-bold hover:bg-red-600">−</button>
                  <span className="w-6 text-center text-white font-black">{team.autoClassified}</span>
                  <button onClick={() => setField('autoClassified', team.autoClassified + 1)} className="w-5 h-5 bg-[#1F222B] rounded text-white text-xs font-bold hover:bg-green-600">+</button>
                </div>
              </div>
              <span className="text-xs text-[#B8BDC7]">Robot 1</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase">OVERFLOW</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setField('autoOverflow', Math.max(0, team.autoOverflow - 1))} className="w-5 h-5 bg-[#1F222B] rounded text-white text-xs font-bold hover:bg-red-600">−</button>
                  <span className="w-6 text-center text-white font-black">{team.autoOverflow}</span>
                  <button onClick={() => setField('autoOverflow', team.autoOverflow + 1)} className="w-5 h-5 bg-[#1F222B] rounded text-white text-xs font-bold hover:bg-green-600">+</button>
                </div>
              </div>
              <span className="text-xs text-[#B8BDC7]">Robot 2</span>
            </div>
          </div>
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Saiu da Launch Zone?</p>
              <div className="flex gap-1">
                <button onClick={() => setField('autoLeftZone', true)} className={`flex-1 py-1 rounded text-xs font-bold border ${team.autoLeftZone ? 'bg-green-600 border-green-600 text-white' : 'bg-[#1A1D24] border-[#2A2D38] text-[#B8BDC7]'}`}>Sim</button>
                <button onClick={() => setField('autoLeftZone', false)} className={`flex-1 py-1 rounded text-xs font-bold border ${!team.autoLeftZone ? 'bg-[#E10600] border-[#E10600] text-white' : 'bg-[#1A1D24] border-[#2A2D38] text-[#B8BDC7]'}`}>Não</button>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Atrapalha Autônomo?</p>
              <div className="flex gap-1">
                <button onClick={() => setField('autoConflicts', true)} className={`flex-1 py-1 rounded text-xs font-bold border ${team.autoConflicts ? 'bg-red-600 border-red-600 text-white' : 'bg-[#1A1D24] border-[#2A2D38] text-[#B8BDC7]'}`}>Sim</button>
                <button onClick={() => setField('autoConflicts', false)} className={`flex-1 py-1 rounded text-xs font-bold border ${!team.autoConflicts ? 'bg-green-600 border-green-600 text-white' : 'bg-[#1A1D24] border-[#2A2D38] text-[#B8BDC7]'}`}>Não</button>
              </div>
            </div>
          </div>
          <GateGrid gate={team.autoGate} onChange={setAutoGate} />
           <MotifChecker gate={team.autoGate} selectedMotif={selectedAutoMotif} onSelectMotif={onSelectAutoMotif} />
        </div>

        {/* TELEOP section */}
        <div className={`rounded-lg ${sectionBg} border border-white/10 p-3`}>
          <h4 className="text-center font-black text-white uppercase tracking-widest text-sm mb-3 border-b border-white/10 pb-2">
            TELEOP
          </h4>
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase">CLASSIFIED</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setField('teleopClassified', Math.max(0, team.teleopClassified - 1))} className="w-5 h-5 bg-[#1F222B] rounded text-white text-xs font-bold hover:bg-red-600">−</button>
                  <span className="w-6 text-center text-white font-black">{team.teleopClassified}</span>
                  <button onClick={() => setField('teleopClassified', team.teleopClassified + 1)} className="w-5 h-5 bg-[#1F222B] rounded text-white text-xs font-bold hover:bg-green-600">+</button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase">BASE</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setField('teleopBase', Math.max(0, (team.teleopBase || 0) - 1))} className="w-5 h-5 bg-[#1F222B] rounded text-white text-xs font-bold hover:bg-red-600">−</button>
                  <span className="w-6 text-center text-white font-black">{team.teleopBase || 0}</span>
                  <button onClick={() => setField('teleopBase', (team.teleopBase || 0) + 1)} className="w-5 h-5 bg-[#1F222B] rounded text-white text-xs font-bold hover:bg-green-600">+</button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase">OVERFLOW</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setField('teleopOverflow', Math.max(0, team.teleopOverflow - 1))} className="w-5 h-5 bg-[#1F222B] rounded text-white text-xs font-bold hover:bg-red-600">−</button>
                  <span className="w-6 text-center text-white font-black">{team.teleopOverflow}</span>
                  <button onClick={() => setField('teleopOverflow', team.teleopOverflow + 1)} className="w-5 h-5 bg-[#1F222B] rounded text-white text-xs font-bold hover:bg-green-600">+</button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase">DEPOT</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setField('teleopDepot', Math.max(0, (team.teleopDepot || 0) - 1))} className="w-5 h-5 bg-[#1F222B] rounded text-white text-xs font-bold hover:bg-red-600">−</button>
                  <span className="w-6 text-center text-white font-black">{team.teleopDepot || 0}</span>
                  <button onClick={() => setField('teleopDepot', (team.teleopDepot || 0) + 1)} className="w-5 h-5 bg-[#1F222B] rounded text-white text-xs font-bold hover:bg-green-600">+</button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between bg-orange-900/20 border border-orange-500/20 rounded-lg px-3 py-2">
              <span className="text-xs font-bold text-orange-400 uppercase">Terminou na Base?</span>
              <div className="flex gap-1">
                <button onClick={() => setField('endgameBase', 'Total')} className={`px-2 py-1 rounded text-xs font-bold border ${team.endgameBase === 'Total' ? 'bg-green-600 border-green-600 text-white' : 'bg-[#1A1D24] border-[#2A2D38] text-[#B8BDC7]'}`}>Total</button>
                <button onClick={() => setField('endgameBase', 'Parcial')} className={`px-2 py-1 rounded text-xs font-bold border ${team.endgameBase === 'Parcial' ? 'bg-yellow-600 border-yellow-600 text-white' : 'bg-[#1A1D24] border-[#2A2D38] text-[#B8BDC7]'}`}>Parcial</button>
                <button onClick={() => setField('endgameBase', 'Não chegou')} className={`px-2 py-1 rounded text-xs font-bold border ${team.endgameBase === 'Não chegou' ? 'bg-red-600 border-red-600 text-white' : 'bg-[#1A1D24] border-[#2A2D38] text-[#B8BDC7]'}`}>Não chegou</button>
              </div>
            </div>
          </div>
          <GateGrid gate={team.teleopGate} onChange={setTeleopGate} />
           <MotifChecker gate={team.teleopGate} selectedMotif={selectedTeleopMotif} onSelectMotif={onSelectTeleopMotif} />
        </div>

        {/* Penalties */}
        <div className="flex items-center justify-between bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2">
          <span className="text-xs font-bold text-red-400 uppercase">PENALIDADES</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setField('penalties', Math.max(0, team.penalties - 5))} className="w-5 h-5 bg-[#1F222B] rounded text-white text-xs font-bold hover:bg-red-600">−</button>
            <span className="w-8 text-center text-red-400 font-black">{team.penalties}</span>
            <button onClick={() => setField('penalties', team.penalties + 5)} className="w-5 h-5 bg-[#1F222B] rounded text-white text-xs font-bold hover:bg-red-600">+</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Scout helpers ─────────────────────────────────────────────────────────────
function emptyScout() {
  return {
    auto_left_zone: false,
    auto_conflicts: false,
    auto_patterns: '0',
    teleop_shoot_location: '',
    teleop_cycle_speed: 'Médio',
    teleop_pattern_ability: 'Média',
    endgame_base: 'Não chegou',
    rp_count: 0,
  };
}

function Chips({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onChange(opt)}
          className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
            value === opt ? 'bg-[#E10600] border-[#E10600] text-white' : 'bg-[#1A1D24] border-[#2A2D38] text-[#B8BDC7] hover:bg-[#2A2D38]'
          }`}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function YesNoSmall({ value, onChange }) {
  return (
    <div className="flex gap-1.5">
      <button type="button" onClick={() => onChange(true)}
        className={`flex-1 py-1 rounded text-xs font-bold border transition-all ${value ? 'bg-green-600 border-green-600 text-white' : 'bg-[#1A1D24] border-[#2A2D38] text-[#B8BDC7]'}`}>
        Sim
      </button>
      <button type="button" onClick={() => onChange(false)}
        className={`flex-1 py-1 rounded text-xs font-bold border transition-all ${!value ? 'bg-[#E10600] border-[#E10600] text-white' : 'bg-[#1A1D24] border-[#2A2D38] text-[#B8BDC7]'}`}>
        Não
      </button>
    </div>
  );
}

function RPSelect({ value, onChange }) {
  return (
    <div className="flex gap-1.5">
      {[0, 1, 2, 3, 4, 5, 6].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`w-8 h-8 rounded text-xs font-bold border transition-all ${
            value === n ? 'bg-[#E10600] border-[#E10600] text-white' : 'bg-[#1A1D24] border-[#2A2D38] text-[#B8BDC7]'
          }`}>
          {n}
        </button>
      ))}
    </div>
  );
}

function ScoutPanel({ teamLabel, teamNumber, scout, onChange, color }) {
  const set = (k, v) => onChange({ ...scout, [k]: v });
  const borderColor = color === 'red' ? 'border-red-600/30' : 'border-blue-600/30';
  const headerBg = color === 'red' ? 'bg-red-900/20' : 'bg-blue-900/20';

  return (
    <div className={`rounded-xl border ${borderColor} overflow-hidden`}>
      <div className={`${headerBg} px-3 py-2 border-b ${borderColor}`}>
        <p className="text-xs font-black text-white uppercase tracking-wider">{teamLabel} {teamNumber ? `— #${teamNumber}` : ''}</p>
      </div>
      <div className="p-3 space-y-3">
        <div>
          <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Saiu da zona de lançamento?</p>
          <YesNoSmall value={scout.auto_left_zone} onChange={v => set('auto_left_zone', v)} />
        </div>
        <div>
          <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Atrapalha nosso autônomo?</p>
          <YesNoSmall value={scout.auto_conflicts} onChange={v => set('auto_conflicts', v)} />
        </div>
        <div>
          <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Identifica Pattern?</p>
          <YesNoSmall value={scout.auto_patterns === 'Sim'} onChange={v => set('auto_patterns', v ? 'Sim' : 'Não')} />
        </div>
        <div>
          <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Local de shoot preferido</p>
          <Chips options={['E maior', 'E menor', 'D maior', 'D menor']} value={scout.teleop_shoot_location} onChange={v => set('teleop_shoot_location', v)} />
        </div>
        <div>
          <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Terminou na base?</p>
          <Chips options={['Total', 'Parcial', 'Não chegou']} value={scout.endgame_base} onChange={v => set('endgame_base', v)} />
        </div>
        <div>
          <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">RPs obtidos</p>
          <RPSelect value={scout.rp_count} onChange={v => set('rp_count', v)} />
        </div>
      </div>
    </div>
  );
}

function calcIEFFromScout(scout) {
  let score = 0;
  if (scout.auto_left_zone) score += 1;
  const patMap = { '0': 0, '1': 1, '2': 2, '3': 3, 'Outro': 1 };
  score += patMap[scout.auto_patterns] || 0;
  if (scout.teleop_cycle_speed === 'Rápido') score += 3;
  else if (scout.teleop_cycle_speed === 'Médio') score += 1;
  if (scout.teleop_pattern_ability === 'Alta') score += 3;
  else if (scout.teleop_pattern_ability === 'Média') score += 1;
  if (scout.endgame_base === 'Total') score += 4;
  else if (scout.endgame_base === 'Parcial') score += 2;
  return score;
}

// ── main page ─────────────────────────────────────────────────────────────────
const NUM_QUALIFIERS = 96;

function InternalFTCScorerContent({ user }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState('classic'); // 'classic' | 'qualifier'
  const [selectedQualifier, setSelectedQualifier] = useState(null);
  const [selectedAlliance, setSelectedAlliance] = useState(null);
  const [matchTitle, setMatchTitle] = useState('');
  const [matchNumber, setMatchNumber] = useState('');
  const [event, setEvent] = useState('');
  const [redTeam1, setRedTeam1] = useState(emptyTeam());
  const [redTeam2, setRedTeam2] = useState(emptyTeam());
  const [blueTeam1, setBlueTeam1] = useState(emptyTeam());
  const [blueTeam2, setBlueTeam2] = useState(emptyTeam());
  const [scoutRed1, setScoutRed1] = useState(emptyScout());
  const [scoutRed2, setScoutRed2] = useState(emptyScout());
  const [scoutBlue1, setScoutBlue1] = useState(emptyScout());
  const [scoutBlue2, setScoutBlue2] = useState(emptyScout());
  const [saving, setSaving] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [robotNotes, setRobotNotes] = useState('');
  const [selectedAutoMotif, setSelectedAutoMotif] = useState(null);
  const [selectedTeleopMotif, setSelectedTeleopMotif] = useState(null);

  const redScore = teamScore(redTeam1).total + teamScore(redTeam2).total;
  const blueScore = teamScore(blueTeam1).total + teamScore(blueTeam2).total;
  const winner = redScore > blueScore ? 'RED' : blueScore > redScore ? 'BLUE' : 'EMPATE';

  // Avaliar se team é adequado para aliança
  const evaluateTeam = (team) => {
    const score = teamScore(team).total;
    const auto = teamScore(team).auto;
    const teleop = teamScore(team).teleop;
    
    // Critérios: Vermelho (ruim) < 30pts, Amarelo (médio) 30-60pts, Verde (bom) > 60pts
    if (score >= 60) return { status: 'Bom', color: 'green', shade: 'bg-green-600' };
    if (score >= 30) return { status: 'Mais ou menos', color: 'yellow', shade: 'bg-yellow-600' };
    return { status: 'Ruim', color: 'red', shade: 'bg-red-600' };
  };

  const handleReset = () => {
    setRedTeam1(emptyTeam());
    setRedTeam2(emptyTeam());
    setBlueTeam1(emptyTeam());
    setBlueTeam2(emptyTeam());
    setScoutRed1(emptyScout());
    setScoutRed2(emptyScout());
    setScoutBlue1(emptyScout());
    setScoutBlue2(emptyScout());
    setMatchTitle('');
    setMatchNumber('');
    setShowSummary(false);
    setRobotNotes('');
    setSelectedQualifier(null);
    setSelectedAlliance(null);
    setSelectedAutoMotif(null);
    setSelectedTeleopMotif(null);
  };

  const handleSaveMatch = async () => {
    setSaving(true);
    const s1 = teamScore(redTeam1), s2 = teamScore(redTeam2);
    const s3 = teamScore(blueTeam1), s4 = teamScore(blueTeam2);

    // Auto-registrar equipes que ainda não existem
    const teamNumbers = [redTeam1.number, redTeam2.number, blueTeam1.number, blueTeam2.number].filter(Boolean);
    if (teamNumbers.length > 0) {
      const existingTeams = await base44.entities.Team.list('team_number');
      const existingNumbers = new Set(existingTeams.map(t => String(t.team_number).trim()));
      const toCreate = teamNumbers.filter(n => !existingNumbers.has(String(n).trim()));
      await Promise.all(toCreate.map(n => base44.entities.Team.create({ team_number: String(n), status: 'Ativa' })));
    }

    // Salvar scouts de cada equipe
    const saveScout = (s, teamNumber, alliance, cycleSpeed = 'Médio', patternAbility = 'Média') =>
      base44.entities.ScoutFTC.create({
        ...s,
        team_number: teamNumber,
        alliance,
        event,
        match_number: matchNumber || matchTitle,
        teleop_cycle_speed: cycleSpeed,
        teleop_pattern_ability: patternAbility,
        efficiency_index: calcIEFFromScout(s),
      });

    await Promise.all([
      redTeam1.number && saveScout(scoutRed1, redTeam1.number, 'Vermelha'),
      redTeam2.number && saveScout(scoutRed2, redTeam2.number, 'Vermelha'),
      blueTeam1.number && saveScout(scoutBlue1, blueTeam1.number, 'Azul'),
      blueTeam2.number && saveScout(scoutBlue2, blueTeam2.number, 'Azul'),
    ].filter(Boolean));

    await base44.entities.Match.create({
      match_title: matchTitle,
      red_team1_number: redTeam1.number,
      red_team1_auto_classified: redTeam1.autoClassified,
      red_team1_auto_overflow: redTeam1.autoOverflow,
      red_team1_auto_gate: redTeam1.autoGate,
      red_team1_teleop_classified: redTeam1.teleopClassified,
      red_team1_teleop_overflow: redTeam1.teleopOverflow,
      red_team1_teleop_gate: redTeam1.teleopGate,
      red_team1_penalties: redTeam1.penalties,
      red_team1_total: s1.total,
      red_team2_number: redTeam2.number,
      red_team2_auto_classified: redTeam2.autoClassified,
      red_team2_auto_overflow: redTeam2.autoOverflow,
      red_team2_auto_gate: redTeam2.autoGate,
      red_team2_teleop_classified: redTeam2.teleopClassified,
      red_team2_teleop_overflow: redTeam2.teleopOverflow,
      red_team2_teleop_gate: redTeam2.teleopGate,
      red_team2_penalties: redTeam2.penalties,
      red_team2_total: s2.total,
      blue_team1_number: blueTeam1.number,
      blue_team1_auto_classified: blueTeam1.autoClassified,
      blue_team1_auto_overflow: blueTeam1.autoOverflow,
      blue_team1_auto_gate: blueTeam1.autoGate,
      blue_team1_teleop_classified: blueTeam1.teleopClassified,
      blue_team1_teleop_overflow: blueTeam1.teleopOverflow,
      blue_team1_teleop_gate: blueTeam1.teleopGate,
      blue_team1_penalties: blueTeam1.penalties,
      blue_team1_total: s3.total,
      blue_team2_number: blueTeam2.number,
      blue_team2_auto_classified: blueTeam2.autoClassified,
      blue_team2_auto_overflow: blueTeam2.autoOverflow,
      blue_team2_auto_gate: blueTeam2.autoGate,
      blue_team2_teleop_classified: blueTeam2.teleopClassified,
      blue_team2_teleop_overflow: blueTeam2.teleopOverflow,
      blue_team2_teleop_gate: blueTeam2.teleopGate,
      blue_team2_penalties: blueTeam2.penalties,
      blue_team2_total: s4.total,
      red_total: redScore,
      blue_total: blueScore,
      winner,
    });
    queryClient.invalidateQueries({ queryKey: ['ftc-matches'] });
    handleReset();
    setSaving(false);
    navigate(createPageUrl('InternalFTCMatches'));
  };

  const handleFinishQualifier = () => {
    setShowSummary(true);
  };

  // Modo QUALIFIER - Passo 1: Selecionar Qualificatória
  if (mode === 'qualifier' && !selectedQualifier) {
    return (
      <InternalPageLayout user={user} currentPage="InternalFTCScorer" title="FTC - Calculador de Pontos">
        <div className="space-y-6 max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/30 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black text-orange-500 uppercase tracking-widest">MODO QUALIFICATÓRIA</h2>
              <button onClick={() => { setMode('classic'); handleReset(); }}
                className="px-4 py-2 bg-[#1F222B] hover:bg-[#E10600] text-white rounded-lg text-sm font-bold transition-colors">
                Voltar para Clássico
              </button>
            </div>
            <p className="text-[#B8BDC7] text-sm mb-4">Selecione uma qualificatória de 1 a {NUM_QUALIFIERS}</p>
            <div className="grid grid-cols-8 sm:grid-cols-12 gap-2">
              {Array.from({ length: NUM_QUALIFIERS }).map((_, i) => {
                const qual = i + 1;
                return (
                  <button
                    key={qual}
                    onClick={() => { setSelectedQualifier(qual); setMatchNumber(`Q${qual}`); }}
                    className="h-10 bg-[#1F222B] hover:bg-orange-500 hover:border-orange-500 border border-[#2F3340] rounded text-white font-bold text-sm transition-all"
                  >
                    Q{qual}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      </InternalPageLayout>
    );
  }

  // Modo QUALIFIER - Passo 2: Selecionar Aliança
  if (mode === 'qualifier' && selectedQualifier && !selectedAlliance) {
    return (
      <InternalPageLayout user={user} currentPage="InternalFTCScorer" title="FTC - Calculador de Pontos">
        <div className="space-y-6 max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={() => { setSelectedQualifier(null); }}
              className="mb-4 flex items-center gap-2 px-4 py-2 bg-[#1F222B] hover:bg-[#2F3340] text-white rounded-lg transition-colors">
              ← Voltar
            </button>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-white mb-2">Qualificatória {selectedQualifier}</h2>
              <p className="text-[#B8BDC7]">Escolha a aliança</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => { setSelectedAlliance('red'); setEvent(`Qualifier ${selectedQualifier} - Red`); }}
                className="py-16 bg-red-700 hover:bg-red-600 rounded-2xl text-white font-black text-4xl transition-all border-2 border-red-600"
              >
                🔴 VERMELHA
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => { setSelectedAlliance('blue'); setEvent(`Qualifier ${selectedQualifier} - Blue`); }}
                className="py-16 bg-blue-700 hover:bg-blue-600 rounded-2xl text-white font-black text-4xl transition-all border-2 border-blue-600"
              >
                🔵 AZUL
              </motion.button>
            </div>
          </motion.div>
        </div>
      </InternalPageLayout>
    );
  }

  // Modo QUALIFIER - Passo 3: Scout um time
  if (mode === 'qualifier' && selectedQualifier && selectedAlliance && !showSummary) {
    const currentTeam = selectedAlliance === 'red' ? redTeam1 : blueTeam1;
    const setCurrentTeam = selectedAlliance === 'red' ? setRedTeam1 : setBlueTeam1;
    const color = selectedAlliance === 'red' ? 'red' : 'blue';
    const score = teamScore(currentTeam);

    return (
      <InternalPageLayout user={user} currentPage="InternalFTCScorer" title="FTC - Scout Qualificatória">
        <div className="space-y-6 max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={() => { setSelectedAlliance(null); }}
              className="mb-4 flex items-center gap-2 px-4 py-2 bg-[#1F222B] hover:bg-[#2F3340] text-white rounded-lg transition-colors">
              ← Voltar
            </button>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-white">Q{selectedQualifier} • {selectedAlliance === 'red' ? '🔴 Vermelha' : '🔵 Azul'}</h2>
              <p className="text-[#B8BDC7]">Escauteando 1 time</p>
            </div>
          </motion.div>

          <TeamPanel team={currentTeam} onChange={setCurrentTeam} color={color} label="TIME" selectedAutoMotif={selectedAutoMotif} onSelectAutoMotif={setSelectedAutoMotif} selectedTeleopMotif={selectedTeleopMotif} onSelectTeleopMotif={setSelectedTeleopMotif} />

          {/* Scout Qualificatória */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-[#1F222B] bg-[#111217] p-4 space-y-4">
            <h3 className="text-center text-white font-black uppercase tracking-widest text-sm">📋 Dados de Scout</h3>

            {/* Saiu da zona */}
            <div>
              <p className="text-[10px] text-[#B8BDC7] uppercase tracking-wider mb-2">Saiu da zona de lançamento?</p>
              <YesNoSmall value={scoutRed1.auto_left_zone} onChange={v => {
                const scout = selectedAlliance === 'red' ? scoutRed1 : scoutBlue1;
                const setter = selectedAlliance === 'red' ? setScoutRed1 : setScoutBlue1;
                setter({ ...scout, auto_left_zone: v });
              }} />
            </div>

            {/* Atrapalha autônomo */}
            <div>
              <p className="text-[10px] text-[#B8BDC7] uppercase tracking-wider mb-2">Atrapalha nosso autônomo?</p>
              <YesNoSmall value={scoutRed1.auto_conflicts} onChange={v => {
                const scout = selectedAlliance === 'red' ? scoutRed1 : scoutBlue1;
                const setter = selectedAlliance === 'red' ? setScoutRed1 : setScoutBlue1;
                setter({ ...scout, auto_conflicts: v });
              }} />
            </div>

            {/* Identifica pattern */}
            <div>
              <p className="text-[10px] text-[#B8BDC7] uppercase tracking-wider mb-2">Identifica pattern?</p>
              <YesNoSmall value={scoutRed1.auto_patterns === 'Sim'} onChange={v => {
                const scout = selectedAlliance === 'red' ? scoutRed1 : scoutBlue1;
                const setter = selectedAlliance === 'red' ? setScoutRed1 : setScoutBlue1;
                setter({ ...scout, auto_patterns: v ? 'Sim' : 'Não' });
              }} />
            </div>

            {/* Local de shoot */}
            <div>
              <p className="text-[10px] text-[#B8BDC7] uppercase tracking-wider mb-2">Local de shoot preferido</p>
              <Chips options={['E maior', 'E menor', 'D maior', 'D menor']} 
                value={scoutRed1.teleop_shoot_location} 
                onChange={v => {
                  const scout = selectedAlliance === 'red' ? scoutRed1 : scoutBlue1;
                  const setter = selectedAlliance === 'red' ? setScoutRed1 : setScoutBlue1;
                  setter({ ...scout, teleop_shoot_location: v });
                }} 
              />
            </div>

            {/* Terminou na base */}
            <div>
              <p className="text-[10px] text-[#B8BDC7] uppercase tracking-wider mb-2">Terminou na base?</p>
              <Chips options={['Total', 'Parcial', 'Não chegou']} 
                value={scoutRed1.endgame_base} 
                onChange={v => {
                  const scout = selectedAlliance === 'red' ? scoutRed1 : scoutBlue1;
                  const setter = selectedAlliance === 'red' ? setScoutRed1 : setScoutBlue1;
                  setter({ ...scout, endgame_base: v });
                }} 
              />
            </div>

            {/* RPs obtidos */}
            <div>
              <p className="text-[10px] text-[#B8BDC7] uppercase tracking-wider mb-2">RPs obtidos</p>
              <RPSelect value={scoutRed1.rp_count} onChange={v => {
                const scout = selectedAlliance === 'red' ? scoutRed1 : scoutBlue1;
                const setter = selectedAlliance === 'red' ? setScoutRed1 : setScoutBlue1;
                setter({ ...scout, rp_count: v });
              }} />
            </div>
          </motion.div>

          {/* Notas do robô */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-[#1F222B] bg-[#111217] p-4">
            <label className="block text-xs font-bold text-white uppercase tracking-wider mb-2">Observações do Robô (Ex: Caiu, motor queimado, etc.)</label>
            <textarea
              value={currentTeam.robotNotes || ''}
              onChange={(e) => setCurrentTeam({ ...currentTeam, robotNotes: e.target.value })}
              placeholder="Descreva problemas, características, etc..."
              className="w-full bg-[#1F222B] text-white rounded-lg px-4 py-3 border border-[#2F3340] focus:border-orange-500 outline-none text-sm resize-none"
              rows={3}
            />
          </motion.div>

          <button
            onClick={handleFinishQualifier}
            disabled={!currentTeam.number}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black uppercase tracking-widest rounded-xl text-lg flex items-center justify-center gap-3 transition-colors"
          >
            <Save className="w-5 h-5" /> Terminar Scout
          </button>
        </div>
      </InternalPageLayout>
    );
  }

  // Modo QUALIFIER - Passo 4: Resumo e Avaliação
  if (mode === 'qualifier' && showSummary) {
    const currentTeam = selectedAlliance === 'red' ? redTeam1 : blueTeam1;
    const evaluation = evaluateTeam(currentTeam);
    const score = teamScore(currentTeam);

    return (
      <InternalPageLayout user={user} currentPage="InternalFTCScorer" title="FTC - Resultado Scout">
        <div className="space-y-6 max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className={`rounded-2xl border-2 p-8 text-center ${evaluation.shade.replace('bg-', 'border-').split('-')[0]}-600/20 ${evaluation.shade}`}>
              <h2 className="text-4xl font-black text-white mb-2">TIME #{currentTeam.number}</h2>
              <div className="text-6xl font-black text-white mb-4">{score.total} PTS</div>
              <div className={`text-3xl font-black mb-4 ${
                evaluation.color === 'green' ? 'text-green-400' :
                evaluation.color === 'yellow' ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {evaluation.status}
              </div>
              <p className="text-white/70 text-lg">
                {evaluation.color === 'green' ? '✓ ADEQUADO PARA A ALIANÇA' :
                 evaluation.color === 'yellow' ? '⚠ PODE AJUDAR, MAS COM RESSALVAS' :
                 '✗ NÃO ADEQUADO PARA A ALIANÇA'}
              </p>
              {currentTeam.robotNotes && (
                <div className="mt-4 bg-black/30 rounded-lg p-4 text-left">
                  <p className="text-xs font-bold text-white/60 uppercase">Observações:</p>
                  <p className="text-white text-sm">{currentTeam.robotNotes}</p>
                </div>
              )}
            </div>
          </motion.div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-[#111217] rounded-xl p-4 border border-[#1F222B]">
              <div className="text-[#B8BDC7] text-xs uppercase">AUTO</div>
              <div className="text-white font-black text-3xl">{score.auto}</div>
            </div>
            <div className="bg-[#111217] rounded-xl p-4 border border-[#1F222B]">
              <div className="text-[#B8BDC7] text-xs uppercase">TELEOP</div>
              <div className="text-white font-black text-3xl">{score.teleop}</div>
            </div>
            <div className="bg-[#111217] rounded-xl p-4 border border-[#1F222B]">
              <div className="text-[#B8BDC7] text-xs uppercase">PENALIDADES</div>
              <div className="text-red-400 font-black text-3xl">-{currentTeam.penalties}</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setShowSummary(false); handleReset(); setMode('qualifier'); }}
              className="flex-1 py-4 bg-[#1F222B] hover:bg-[#2F3340] text-white font-black uppercase tracking-widest rounded-xl transition-colors"
            >
              Scout Outro Time
            </button>
            <button
              onClick={() => { handleReset(); setMode('classic'); }}
              className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest rounded-xl transition-colors"
            >
              Voltar ao Menu
            </button>
          </div>
        </div>
      </InternalPageLayout>
    );
  }

  // Modo CLÁSSICO
  return (
    <InternalPageLayout user={user} currentPage="InternalFTCScorer" title="FTC - Calculador de Pontos">
      <div className="space-y-6">

        {/* Header com abas */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/30 rounded-2xl p-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-orange-500 uppercase tracking-widest">CALCULADOR DE PONTOS</h2>
                <p className="text-[#B8BDC7] text-sm">AGE — INTO THE DEEP | FTC DECODE #17730</p>
              </div>
            </div>
            {/* Abas de modo */}
            <div className="flex gap-2 flex-wrap">
              <button
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  mode === 'classic' 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-[#1F222B] text-[#B8BDC7] hover:bg-[#2F3340]'
                }`}
                onClick={() => { setMode('classic'); handleReset(); }}
              >
                ⚡ Clássico (4 Times)
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  mode === 'qualifier' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-[#1F222B] text-[#B8BDC7] hover:bg-[#2F3340]'
                }`}
                onClick={() => { setMode('qualifier'); handleReset(); }}
              >
                📊 Qualificatória (1 Time)
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              placeholder="Evento"
              className="bg-[#1F222B] text-white rounded-lg px-3 py-2 text-sm w-36 border border-[#2F3340] focus:border-orange-500 outline-none"
            />
            <input
              value={matchNumber}
              onChange={(e) => setMatchNumber(e.target.value)}
              placeholder="Partida (Ex: Q1)"
              className="bg-[#1F222B] text-white rounded-lg px-3 py-2 text-sm w-36 border border-[#2F3340] focus:border-orange-500 outline-none"
            />
            <input
              value={matchTitle}
              onChange={(e) => setMatchTitle(e.target.value)}
              placeholder="Título completo (opcional)"
              className="bg-[#1F222B] text-white rounded-lg px-3 py-2 text-sm w-52 border border-[#2F3340] focus:border-orange-500 outline-none"
            />
            <button onClick={handleReset}
              className="px-4 py-2 bg-[#1F222B] hover:bg-[#E10600] text-white rounded-lg text-sm font-bold transition-colors">
              Resetar
            </button>
          </div>
          {matchTitle && <p className="text-center text-white font-bold mt-3 text-lg">{matchTitle}</p>}
          <p className="text-[#B8BDC7] text-xs mt-4 text-center">💡 Use "Modo Qualificatória" para escautear times individuais de qualificatórias com avaliação de adequação à aliança</p>
        </motion.div>

        {/* Score banner */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-3 rounded-xl overflow-hidden border border-[#1F222B]">
          <div className="bg-red-700 py-4 text-center">
            <div className="text-white/60 text-xs uppercase tracking-widest">ALIANÇA VERMELHA</div>
            <div className="text-white font-black text-5xl">{redScore}</div>
          </div>
          <div className="bg-[#111217] flex items-center justify-center flex-col gap-1">
            {winner !== 'EMPATE' ? (
              <>
                <div className="text-yellow-400 font-black text-xs uppercase tracking-widest">Winner</div>
                <div className={`font-black text-lg ${winner === 'RED' ? 'text-red-400' : 'text-blue-400'}`}>
                  {winner === 'RED' ? 'VERMELHA' : 'AZUL'}
                </div>
              </>
            ) : (
              <div className="text-white font-black text-lg">EMPATE</div>
            )}
            <div className="text-[#B8BDC7] text-xs">Final Score</div>
          </div>
          <div className="bg-blue-700 py-4 text-center">
            <div className="text-white/60 text-xs uppercase tracking-widest">ALIANÇA AZUL</div>
            <div className="text-white font-black text-5xl">{blueScore}</div>
          </div>
        </motion.div>

        {/* Team panels */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Red alliance */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
            <h3 className="text-red-400 font-black uppercase tracking-widest text-sm text-center">🔴 ALIANÇA VERMELHA</h3>
            <TeamPanel team={redTeam1} onChange={setRedTeam1} color="red" label="TIME 1" selectedAutoMotif={selectedAutoMotif} onSelectAutoMotif={setSelectedAutoMotif} selectedTeleopMotif={selectedTeleopMotif} onSelectTeleopMotif={setSelectedTeleopMotif} />
            <TeamPanel team={redTeam2} onChange={setRedTeam2} color="red" label="TIME 2" selectedAutoMotif={selectedAutoMotif} onSelectAutoMotif={setSelectedAutoMotif} selectedTeleopMotif={selectedTeleopMotif} onSelectTeleopMotif={setSelectedTeleopMotif} />
          </motion.div>

          {/* Blue alliance */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="space-y-4">
            <h3 className="text-blue-400 font-black uppercase tracking-widest text-sm text-center">🔵 ALIANÇA AZUL</h3>
            <TeamPanel team={blueTeam1} onChange={setBlueTeam1} color="blue" label="TIME 1" selectedAutoMotif={selectedAutoMotif} onSelectAutoMotif={setSelectedAutoMotif} selectedTeleopMotif={selectedTeleopMotif} onSelectTeleopMotif={setSelectedTeleopMotif} />
            <TeamPanel team={blueTeam2} onChange={setBlueTeam2} color="blue" label="TIME 2" selectedAutoMotif={selectedAutoMotif} onSelectAutoMotif={setSelectedAutoMotif} selectedTeleopMotif={selectedTeleopMotif} onSelectTeleopMotif={setSelectedTeleopMotif} />
          </motion.div>
        </div>

        {/* Scout panels */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-[#111217] border border-[#1F222B] rounded-xl p-4">
          <h3 className="text-center text-white font-black uppercase tracking-widest text-sm mb-4">📋 Dados de Scout por Equipe</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <ScoutPanel teamLabel="🔴 Time 1" teamNumber={redTeam1.number} scout={scoutRed1} onChange={setScoutRed1} color="red" />
            <ScoutPanel teamLabel="🔴 Time 2" teamNumber={redTeam2.number} scout={scoutRed2} onChange={setScoutRed2} color="red" />
            <ScoutPanel teamLabel="🔵 Time 1" teamNumber={blueTeam1.number} scout={scoutBlue1} onChange={setScoutBlue1} color="blue" />
            <ScoutPanel teamLabel="🔵 Time 2" teamNumber={blueTeam2.number} scout={scoutBlue2} onChange={setScoutBlue2} color="blue" />
          </div>
        </motion.div>

        {/* Score comparison */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-[#111217] border border-[#1F222B] rounded-xl p-5">
          <h3 className="text-center text-white font-black uppercase tracking-widest text-sm mb-4">Score Comparison</h3>
          <div className="grid grid-cols-4 gap-2 text-center text-sm">
            <div className="font-black text-red-400 text-lg">{teamScore(redTeam1).auto + teamScore(redTeam2).auto}</div>
            <div className="text-[#B8BDC7] font-bold">AUTÔNOMO</div>
            <div className="font-black text-blue-400 text-lg">{teamScore(blueTeam1).auto + teamScore(blueTeam2).auto}</div>
            <div></div>
            <div className="font-black text-red-400 text-lg">{teamScore(redTeam1).teleop + teamScore(redTeam2).teleop}</div>
            <div className="text-[#B8BDC7] font-bold">TELEOP</div>
            <div className="font-black text-blue-400 text-lg">{teamScore(blueTeam1).teleop + teamScore(blueTeam2).teleop}</div>
            <div></div>
            <div className="font-black text-red-400 text-lg">{teamScore(redTeam1).endgame + teamScore(redTeam2).endgame}</div>
            <div className="text-[#B8BDC7] font-bold">ENDGAME</div>
            <div className="font-black text-blue-400 text-lg">{teamScore(blueTeam1).endgame + teamScore(blueTeam2).endgame}</div>
            <div></div>
            <div className="font-black text-red-400 text-lg">{redTeam1.penalties + redTeam2.penalties}</div>
            <div className="text-[#B8BDC7] font-bold">PENALIDADES</div>
            <div className="font-black text-blue-400 text-lg">{blueTeam1.penalties + blueTeam2.penalties}</div>
            <div></div>
          </div>
        </motion.div>

        {/* Save to Partidas */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <button
            onClick={handleSaveMatch}
            disabled={saving}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black uppercase tracking-widest rounded-xl text-lg flex items-center justify-center gap-3 transition-colors"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Salvando...' : 'Salvar Partida em Partidas'}
          </button>
          <p className="text-center text-[#B8BDC7] text-xs mt-2">Ao salvar, o calculador será resetado e você será redirecionado para Partidas</p>
        </motion.div>

      </div>
    </InternalPageLayout>
  );
}

export default function InternalFTCScorer() {
  return (
    <ProtectedRoute requireApproved={true}>
      <InternalFTCScorerContent />
    </ProtectedRoute>
  );
}