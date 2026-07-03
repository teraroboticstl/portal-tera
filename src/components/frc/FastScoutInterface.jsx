import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FastScoutInterface({ onSave, isSaving }) {
  const [matchNum, setMatchNum] = useState('');
  const [teamNum, setTeamNum] = useState('');
  const [allianceColor, setAllianceColor] = useState('red');
  const [scoutName, setScoutName] = useState('');
  const [autoMobility, setAutoMobility] = useState(false);
  const [autoScore, setAutoScore] = useState(0);
  const [teleopScore, setTeleopScore] = useState(0);
  const [teleopCycles, setTeleopCycles] = useState(0);
  const [endgameAction, setEndgameAction] = useState('none');
  const [defensePlayed, setDefensePlayed] = useState(false);
  const [defenseEffect, setDefenseEffect] = useState('none');
  const [notes, setNotes] = useState('');

  const endgameScores = {
    'none': 0,
    'park': 3,
    'climb_low': 6,
    'climb_mid': 12,
    'climb_high': 18,
    'failed': 0
  };

  const totalScore = autoScore + teleopScore + endgameScores[endgameAction];

  const handleSave = async () => {
    if (!matchNum || !teamNum || !scoutName) {
      alert('Preencha match, time e nome do scout');
      return;
    }

    await onSave({
      event_key: 'frc2026',
      match_number: matchNum,
      team_number: teamNum,
      alliance_color: allianceColor,
      scout_name: scoutName,
      auto_mobility: autoMobility,
      auto_score: autoScore,
      teleop_score: teleopScore,
      teleop_cycles: teleopCycles,
      endgame_action: endgameAction,
      endgame_score: endgameScores[endgameAction],
      defense_played: defensePlayed,
      defense_effectiveness: defenseEffect,
      total_score: totalScore,
      notes,
    });

    setMatchNum('');
    setTeamNum('');
    setAutoScore(0);
    setTeleopScore(0);
    setTeleopCycles(0);
    setEndgameAction('none');
    setDefensePlayed(false);
    setDefenseEffect('none');
    setNotes('');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="space-y-4 max-w-2xl mx-auto">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/30 rounded-2xl p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-xs font-bold text-[#B8BDC7] uppercase mb-1 block">Match</label>
            <Input value={matchNum} onChange={e => setMatchNum(e.target.value)}
              placeholder="Q1" className="bg-[#1F222B] border-[#2F3340] text-white text-center font-bold" />
          </div>
          <div>
            <label className="text-xs font-bold text-[#B8BDC7] uppercase mb-1 block">Time</label>
            <Input value={teamNum} onChange={e => setTeamNum(e.target.value)}
              placeholder="1234" className="bg-[#1F222B] border-[#2F3340] text-white text-center font-bold" />
          </div>
          <div>
            <label className="text-xs font-bold text-[#B8BDC7] uppercase mb-1 block">Scout</label>
            <Input value={scoutName} onChange={e => setScoutName(e.target.value)}
              placeholder="Nome" className="bg-[#1F222B] border-[#2F3340] text-white text-center font-bold" />
          </div>
          <div>
            <label className="text-xs font-bold text-[#B8BDC7] uppercase mb-1 block">Aliança</label>
            <div className="flex gap-1">
              <button onClick={() => setAllianceColor('red')}
                className={`flex-1 py-2 rounded font-bold text-xs ${allianceColor === 'red' ? 'bg-red-600 text-white' : 'bg-[#1F222B] text-[#555]'}`}>
                🔴 Red
              </button>
              <button onClick={() => setAllianceColor('blue')}
                className={`flex-1 py-2 rounded font-bold text-xs ${allianceColor === 'blue' ? 'bg-blue-600 text-white' : 'bg-[#1F222B] text-[#555]'}`}>
                🔵 Blue
              </button>
            </div>
          </div>
        </div>
        <div className="text-center pt-4 border-t border-orange-500/20">
          <p className="text-[#B8BDC7] text-xs mb-2">PONTUAÇÃO TOTAL</p>
          <p className="text-white font-black text-5xl">{totalScore}</p>
        </div>
      </div>

      {/* AUTONOMOUS */}
      <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-4">
        <h3 className="text-white font-black uppercase tracking-widest text-sm mb-4 border-b border-[#2F3340] pb-2">
          ⚡ AUTÔNOMO
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[#B8BDC7] font-bold">Saiu da zona?</span>
            <div className="flex gap-2">
              {[true, false].map(val => (
                <button key={val} onClick={() => setAutoMobility(val)}
                  className={`px-4 py-2 rounded font-bold text-sm ${
                    autoMobility === val ? 'bg-green-600 text-white' : 'bg-[#1F222B] text-[#555]'
                  }`}>
                  {val ? 'SIM' : 'NÃO'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#B8BDC7] font-bold">Pontos Auto</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setAutoScore(Math.max(0, autoScore - 5))}
                className="w-10 h-10 bg-red-600 text-white rounded-lg font-black text-lg hover:bg-red-700">−</button>
              <span className="w-12 text-center text-white font-black text-lg">{autoScore}</span>
              <button onClick={() => setAutoScore(autoScore + 5)}
                className="w-10 h-10 bg-green-600 text-white rounded-lg font-black text-lg hover:bg-green-700">+</button>
            </div>
          </div>
        </div>
      </div>

      {/* TELEOP */}
      <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-4">
        <h3 className="text-white font-black uppercase tracking-widest text-sm mb-4 border-b border-[#2F3340] pb-2">
          🎮 TELEOP
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[#B8BDC7] font-bold">Pontos Teleop</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setTeleopScore(Math.max(0, teleopScore - 5))}
                className="w-10 h-10 bg-red-600 text-white rounded-lg font-black text-lg hover:bg-red-700">−</button>
              <span className="w-12 text-center text-white font-black text-lg">{teleopScore}</span>
              <button onClick={() => setTeleopScore(teleopScore + 5)}
                className="w-10 h-10 bg-green-600 text-white rounded-lg font-black text-lg hover:bg-green-700">+</button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#B8BDC7] font-bold">Ciclos</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setTeleopCycles(Math.max(0, teleopCycles - 1))}
                className="w-10 h-10 bg-red-600 text-white rounded-lg font-black text-lg hover:bg-red-700">−</button>
              <span className="w-12 text-center text-white font-black text-lg">{teleopCycles}</span>
              <button onClick={() => setTeleopCycles(teleopCycles + 1)}
                className="w-10 h-10 bg-green-600 text-white rounded-lg font-black text-lg hover:bg-green-700">+</button>
            </div>
          </div>
        </div>
      </div>

      {/* ENDGAME */}
      <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-4">
        <h3 className="text-white font-black uppercase tracking-widest text-sm mb-4 border-b border-[#2F3340] pb-2">
          🏁 ENDGAME
        </h3>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { val: 'park', label: 'Park', pts: 3 },
            { val: 'climb_low', label: 'Climb Baixo', pts: 6 },
            { val: 'climb_mid', label: 'Climb Médio', pts: 12 },
            { val: 'climb_high', label: 'Climb Alto', pts: 18 },
            { val: 'failed', label: 'Falhou', pts: 0 },
            { val: 'none', label: 'Nenhum', pts: 0 },
          ].map(opt => (
            <button key={opt.val} onClick={() => setEndgameAction(opt.val)}
              className={`py-3 rounded-lg font-bold text-xs transition-all ${
                endgameAction === opt.val 
                  ? 'bg-orange-600 text-white scale-105' 
                  : 'bg-[#1F222B] text-[#B8BDC7] hover:bg-[#2F3340]'
              }`}>
              {opt.label}<br/><span className="text-[10px]">{opt.pts}pts</span>
            </button>
          ))}
        </div>
      </div>

      {/* DEFENSE */}
      <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-4">
        <h3 className="text-white font-black uppercase tracking-widest text-sm mb-4 border-b border-[#2F3340] pb-2">
          🛡️ DEFESA
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[#B8BDC7] font-bold">Jogou Defesa?</span>
            <div className="flex gap-2">
              {[true, false].map(val => (
                <button key={val} onClick={() => setDefensePlayed(val)}
                  className={`px-4 py-2 rounded font-bold text-sm ${
                    defensePlayed === val ? 'bg-blue-600 text-white' : 'bg-[#1F222B] text-[#555]'
                  }`}>
                  {val ? 'SIM' : 'NÃO'}
                </button>
              ))}
            </div>
          </div>
          {defensePlayed && (
            <div className="flex items-center justify-between">
              <span className="text-[#B8BDC7] font-bold">Efetividade</span>
              <div className="flex gap-2">
                {['weak', 'moderate', 'strong'].map(val => (
                  <button key={val} onClick={() => setDefenseEffect(val)}
                    className={`px-3 py-2 rounded font-bold text-xs ${
                      defenseEffect === val ? 'bg-blue-600 text-white' : 'bg-[#1F222B] text-[#555]'
                    }`}>
                    {val === 'weak' ? 'Fraca' : val === 'moderate' ? 'Moderada' : 'Forte'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* NOTES */}
      <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-4">
        <label className="text-xs font-bold text-white uppercase tracking-wide mb-2 block">📝 Anotações</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Observações gerais sobre o robô..."
          className="w-full bg-[#1F222B] text-white rounded-lg px-3 py-2 border border-[#2F3340] text-sm resize-none"
          rows={3}
        />
      </div>

      {/* SAVE BUTTON */}
      <button onClick={handleSave} disabled={isSaving}
        className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-black uppercase tracking-widest rounded-xl text-lg flex items-center justify-center gap-3 transition-colors">
        <Save className="w-5 h-5" />
        {isSaving ? 'SALVANDO...' : 'SALVAR SCOUT'}
      </button>
    </motion.div>
  );
}