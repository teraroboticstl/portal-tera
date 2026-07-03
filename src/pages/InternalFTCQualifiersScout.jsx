import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import { motion } from 'framer-motion';
import { Save, ChevronLeft } from 'lucide-react';

// ── Constants ──
const GATE_COLS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const NUM_QUALIFIERS = 96;

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
    teleopClassified: 0,
    teleopOverflow: 0,
    teleopGate: emptyGate(),
    penalties: 0,
    endgameBase: 'Não',
    ballContactPoints: false,
    parkedRear: false,
    observations: [],
    observationText: '',
  };
}

// ── Reusable sub-components ──
function GateSlotButton({ value, onClick }) {
  const base = 'w-7 h-7 rounded-full border-2 font-black text-[10px] transition-all flex items-center justify-center mx-auto';
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

const PRESET_MOTIFS = [
  { label: 'PGP', pattern: ['purple', 'green', 'purple'] },
  { label: 'GPG', pattern: ['green', 'purple', 'green'] },
  { label: 'PPG', pattern: ['purple', 'purple', 'green'] },
  { label: 'GGP', pattern: ['green', 'green', 'purple'] },
  { label: 'GPP', pattern: ['green', 'purple', 'purple'] },
  { label: 'PGG', pattern: ['purple', 'green', 'green'] },
];

function getMotifForGate(gate, motif) {
  let match = 0;
  GATE_COLS.forEach((c, i) => {
    const expected = motif.pattern[i % motif.pattern.length];
    if ((gate[c] ?? 'none') === expected) match++;
  });
  return match;
}

function MotifChecker({ gate }) {
  return (
    <div className="mt-2 border-t border-[#1F222B] pt-2">
      <p className="text-[9px] text-[#555] uppercase tracking-wider mb-1 text-center">Padrão (Motif)</p>
      <div className="flex flex-wrap gap-1 justify-center">
        {PRESET_MOTIFS.map((m) => {
          const matched = getMotifForGate(gate, m);
          const full = matched === 9;
          const partial = matched >= 6;
          return (
            <div key={m.label}
              className={`flex flex-col items-center px-2 py-1 rounded border text-[10px] font-bold transition-all ${
                full ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300' :
                partial ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                'bg-[#1A1D24] border-[#2A2D38] text-[#555]'
              }`}>
              <span>{m.label}</span>
              <div className="flex gap-0.5 mt-0.5">
                {m.pattern.map((color, i) => (
                  <span key={i} className={`w-2 h-2 rounded-full inline-block ${color === 'green' ? 'bg-green-500' : 'bg-purple-500'}`} />
                ))}
              </div>
              <span className={`text-[9px] mt-0.5 ${full ? 'text-yellow-300' : 'text-[#555]'}`}>{matched}/9</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function gatePoints(gate, multiplier) {
  let pts = 0;
  [...GATE_COLS, 'square'].forEach((c) => {
    if (gate[c] && gate[c] !== 'none') pts += multiplier;
  });
  return pts;
}

function teamScore(t) {
  let auto = t.autoClassified * 3 + t.autoOverflow * 2 + gatePoints(t.autoGate, 2);
  let teleop = t.teleopClassified * 1 + t.teleopOverflow * 1 + gatePoints(t.teleopGate, 1);
  return { auto, teleop, total: auto + teleop - t.penalties };
}

// ── Main content ──
function InternalFTCQualifiersScoutContent({ user }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('selectQualifier'); // 'selectQualifier' | 'selectAlliance' | 'scout'
  const [selectedQualifier, setSelectedQualifier] = useState(null);
  const [selectedAlliance, setSelectedAlliance] = useState(null);
  const [team, setTeam] = useState(emptyTeam());
  const [saving, setSaving] = useState(false);

  const score = teamScore(team);

  const handleQualifierSelect = (qual) => {
    setSelectedQualifier(qual);
    setStep('selectAlliance');
  };

  const handleAllianceSelect = (alliance) => {
    setSelectedAlliance(alliance);
    setStep('scout');
  };

  const handleBack = () => {
    if (step === 'selectAlliance') {
      setStep('selectQualifier');
      setSelectedAlliance(null);
    } else if (step === 'scout') {
      setStep('selectAlliance');
    }
  };

  const handleSave = async () => {
    if (!team.number) {
      alert('Por favor, insira o número do time');
      return;
    }

    setSaving(true);
    try {
      const teamNumbers = [team.number].filter(Boolean);
      if (teamNumbers.length > 0) {
        const existingTeams = await base44.entities.Team.list('team_number');
        const existingNumbers = new Set(existingTeams.map(t => String(t.team_number).trim()));
        const toCreate = teamNumbers.filter(n => !existingNumbers.has(String(n).trim()));
        await Promise.all(toCreate.map(n => base44.entities.Team.create({ team_number: String(n), status: 'Ativa' })));
      }

      const scoutData = {
        event: `Qualifier ${selectedQualifier}`,
        match_number: `Q${selectedQualifier}`,
        team_number: team.number,
        alliance: selectedAlliance === 'red' ? 'Vermelha' : 'Azul',
        auto_artifacts: '0',
        auto_left_zone: false,
        auto_conflicts: false,
        auto_patterns: '0',
        teleop_overflow: '0',
        teleop_artifacts: '0-3',
        teleop_cycle_speed: 'Médio',
        teleop_pattern_ability: 'Média',
        endgame_base: team.endgameBase,
        penalty_5pts: 0,
        penalty_15pts: 0,
        card: 'Nenhum',
        reliability_issues: [],
        general_observations: [...(team.observations || []), ...(team.observationText ? [team.observationText] : [])],
        alliance_score_range: '0-50',
        efficiency_index: 0,
      };

      await base44.entities.ScoutFTC.create(scoutData);

      alert('Scout salvo com sucesso!');
      setTeam(emptyTeam());
      setSelectedQualifier(null);
      setSelectedAlliance(null);
      setStep('selectQualifier');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar scout');
    } finally {
      setSaving(false);
    }
  };

  const setField = (field, val) => setTeam({ ...team, [field]: val });
  const setAutoGate = (col, val) => setTeam({ ...team, autoGate: { ...team.autoGate, [col]: val } });
  const setTeleopGate = (col, val) => setTeam({ ...team, teleopGate: { ...team.teleopGate, [col]: val } });

  return (
    <InternalPageLayout user={user} currentPage="InternalFTCQualifiersScout" title="FTC - Scout por Qualificatória">
      <div className="space-y-6 max-w-4xl mx-auto">

        {/* Step 1: Select Qualifier */}
        {step === 'selectQualifier' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/30 rounded-2xl p-5">
              <h2 className="text-xl font-black text-orange-500 uppercase tracking-widest mb-6">SELECIONE A QUALIFICATÓRIA</h2>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                {Array.from({ length: NUM_QUALIFIERS }).map((_, i) => {
                  const qual = i + 1;
                  return (
                    <button
                      key={qual}
                      onClick={() => handleQualifierSelect(qual)}
                      className="h-10 bg-[#1F222B] hover:bg-orange-500 hover:border-orange-500 border border-[#2F3340] rounded text-white font-bold text-sm transition-all"
                    >
                      Q{qual}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Select Alliance */}
        {step === 'selectAlliance' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-4 py-2 bg-[#1F222B] hover:bg-[#2F3340] text-white rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
              <h2 className="text-lg font-black text-white">Qualificatória {selectedQualifier}</h2>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAllianceSelect('red')}
                className="py-12 bg-red-700 hover:bg-red-600 rounded-2xl text-center text-white font-black text-3xl transition-all border-2 border-red-600"
              >
                🔴 ALIANÇA VERMELHA
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAllianceSelect('blue')}
                className="py-12 bg-blue-700 hover:bg-blue-600 rounded-2xl text-center text-white font-black text-3xl transition-all border-2 border-blue-600"
              >
                🔵 ALIANÇA AZUL
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Scout Data */}
        {step === 'scout' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-4 py-2 bg-[#1F222B] hover:bg-[#2F3340] text-white rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
              <h2 className="text-lg font-black text-white">Q{selectedQualifier} • {selectedAlliance === 'red' ? '🔴 Vermelha' : '🔵 Azul'}</h2>
            </div>

            {/* Team number input */}
            <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-4">
              <label className="block text-xs font-bold text-white uppercase tracking-wider mb-2">Nº do Time</label>
              <input
                value={team.number}
                onChange={(e) => setField('number', e.target.value)}
                placeholder="Ex: 17730"
                className="w-full bg-[#1F222B] text-white rounded-lg px-4 py-2 border border-[#2F3340] focus:border-orange-500 outline-none"
              />
            </div>

            {/* Score header */}
            <div className="grid grid-cols-3 rounded-xl overflow-hidden border border-[#1F222B]">
              <div className={`py-4 text-center ${selectedAlliance === 'red' ? 'bg-red-700' : 'bg-blue-700'}`}>
                <div className="text-white/60 text-xs uppercase tracking-widest">AUTÔNOMO</div>
                <div className="text-white font-black text-3xl">{score.auto}</div>
              </div>
              <div className="bg-[#111217] flex items-center justify-center flex-col gap-1">
                <div className="text-white font-black text-lg">TOTAL</div>
                <div className="text-[#B8BDC7] text-xs">{score.total}</div>
              </div>
              <div className={`py-4 text-center ${selectedAlliance === 'red' ? 'bg-red-700' : 'bg-blue-700'}`}>
                <div className="text-white/60 text-xs uppercase tracking-widest">TELEOP</div>
                <div className="text-white font-black text-3xl">{score.teleop}</div>
              </div>
            </div>

            {/* Auto section */}
            <div className="rounded-lg bg-[#111217]/50 border border-white/10 p-4">
              <h4 className="text-center font-black text-white uppercase tracking-widest text-sm mb-4">AUTO</h4>
              <div className="space-y-3">
                <NumberInput label="CLASSIFIED" value={team.autoClassified} onChange={(v) => setField('autoClassified', v)} />
                <NumberInput label="OVERFLOW" value={team.autoOverflow} onChange={(v) => setField('autoOverflow', v)} />
              </div>
              <div className="mt-4">
                <GateGrid gate={team.autoGate} onChange={setAutoGate} />
                <MotifChecker gate={team.autoGate} />
              </div>
            </div>

            {/* Teleop section */}
            <div className="rounded-lg bg-[#111217]/50 border border-white/10 p-4">
              <h4 className="text-center font-black text-white uppercase tracking-widest text-sm mb-4">TELEOP</h4>
              <div className="space-y-3">
                <NumberInput label="CLASSIFIED" value={team.teleopClassified} onChange={(v) => setField('teleopClassified', v)} />
                <NumberInput label="OVERFLOW" value={team.teleopOverflow} onChange={(v) => setField('teleopOverflow', v)} />
              </div>
              <div className="mt-4">
                <GateGrid gate={team.teleopGate} onChange={setTeleopGate} />
                <MotifChecker gate={team.teleopGate} />
              </div>
            </div>

            {/* Penalties */}
            <div className="rounded-lg bg-red-900/20 border border-red-500/20 p-4">
              <NumberInput label="PENALIDADES" value={team.penalties} onChange={(v) => setField('penalties', v)} />
            </div>

            {/* Endgame section */}
            <div className="rounded-lg bg-[#111217]/50 border border-white/10 p-4">
              <h4 className="text-center font-black text-white uppercase tracking-widest text-sm mb-4">ENDGAME</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-white uppercase tracking-wider mb-2">Estacionou na Base</label>
                  <div className="flex gap-2">
                    {['Não', 'Parcial', 'Total'].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setField('endgameBase', opt)}
                        className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
                          team.endgameBase === opt
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-[#1F222B] text-[#B8BDC7] border-[#2F3340]'
                        } border`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white uppercase tracking-wider mb-2">Pontos Encostando Bola</label>
                  <div className="flex gap-2">
                    {['Não', 'Sim'].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setField('ballContactPoints', opt === 'Sim')}
                        className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
                          (opt === 'Sim' ? team.ballContactPoints : !team.ballContactPoints)
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-[#1F222B] text-[#B8BDC7] border-[#2F3340]'
                        } border`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white uppercase tracking-wider mb-2">Estacionou no Fundo</label>
                  <div className="flex gap-2">
                    {['Não', 'Sim'].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setField('parkedRear', opt === 'Sim')}
                        className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
                          (opt === 'Sim' ? team.parkedRear : !team.parkedRear)
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-[#1F222B] text-[#B8BDC7] border-[#2F3340]'
                        } border`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Observations section */}
            <div className="rounded-lg bg-[#111217]/50 border border-white/10 p-4">
              <h4 className="text-center font-black text-white uppercase tracking-widest text-sm mb-4">OBSERVAÇÕES GERAIS</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-white uppercase tracking-wider mb-2">Tipo de Equipe</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Ofensiva', 'Defensiva', 'Precisa', 'Pouco Precisa'].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          const obs = team.observations || [];
                          const filtered = obs.filter(o => !['Ofensiva', 'Defensiva', 'Precisa', 'Pouco Precisa'].includes(o));
                          setField('observations', [...filtered, opt]);
                        }}
                        className={`py-2 rounded-lg font-bold text-xs transition-all ${
                          (team.observations || []).includes(opt)
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-[#1F222B] text-[#B8BDC7] border-[#2F3340]'
                        } border`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white uppercase tracking-wider mb-2">Observações Adicionais</label>
                  <textarea
                    value={team.observationText || ''}
                    onChange={(e) => setField('observationText', e.target.value)}
                    placeholder="Ex: Equipe muito fraca, motor queimado, parou no meio, etc."
                    className="w-full bg-[#1F222B] text-white rounded-lg px-4 py-3 border border-[#2F3340] focus:border-orange-500 outline-none text-sm resize-none"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black uppercase tracking-widest rounded-xl text-lg flex items-center justify-center gap-3 transition-colors"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Salvando...' : 'Salvar Scout'}
            </button>
          </motion.div>
        )}

      </div>
    </InternalPageLayout>
  );
}

export default function InternalFTCQualifiersScout() {
  return (
    <ProtectedRoute requireApproved={true}>
      <InternalFTCQualifiersScoutContent />
    </ProtectedRoute>
  );
}