import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import FLLTimer from '@/components/fll/FLLTimer';
import FLLMissions, { getInitialMissions, calcMissionsScore, MAX_MISSIONS_SCORE } from '@/components/fll/FLLMissions';
import FLLTeamPanel from '@/components/fll/FLLTeamPanel';
import FLLLeaderboard from '@/components/fll/FLLLeaderboard';
import { Trophy, ArrowLeft, RotateCcw, Users, List } from 'lucide-react';

const PRECISION_TABLE = { 6: 50, 5: 50, 4: 35, 3: 25, 2: 15, 1: 10, 0: 0 };
const MAX_SCORE = MAX_MISSIONS_SCORE + 50;

function calcScore(missions, jetons) {
  return calcMissionsScore(missions) + (PRECISION_TABLE[jetons] || 0);
}

function FLLScorerContent({ user }) {
  const [activeTab, setActiveTab] = useState('scorer');
  const [missions, setMissions] = useState(getInitialMissions);
  const [jetons, setJetons] = useState(6);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerDone, setTimerDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState(150);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedRound, setSelectedRound] = useState(1);
  const [teams, setTeams] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fll_teams') || '[]'); } catch { return []; }
  });
  const [rounds, setRounds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fll_rounds') || '{}'); } catch { return {}; }
  });

  const score = calcScore(missions, jetons);

  useEffect(() => {
    localStorage.setItem('fll_teams', JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    localStorage.setItem('fll_rounds', JSON.stringify(rounds));
  }, [rounds]);

  const resetAll = () => {
    setMissions(getInitialMissions());
    setJetons(6);
    setTimerRunning(false);
    setTimerDone(false);
    setTimeLeft(150);
  };

  const saveRound = () => {
    if (!selectedTeam) return;
    const key = `${selectedTeam.id}_r${selectedRound}`;
    setRounds(prev => ({ ...prev, [key]: { score, missions: { ...missions }, jetons, savedAt: new Date().toISOString() } }));
    alert(`✅ Pontuação de ${score} pts salva para ${selectedTeam.name} - Round ${selectedRound}!`);
  };

  const getBestScore = (teamId) => {
    let best = 0;
    for (let r = 1; r <= 3; r++) {
      const key = `${teamId}_r${r}`;
      if (rounds[key]) best = Math.max(best, rounds[key].score);
    }
    return best;
  };

  const ranked = [...teams].sort((a, b) => getBestScore(b.id) - getBestScore(a.id));

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Header */}
      <div className="bg-[#1a237e] border-b border-[#283593] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('InternalFLL')} className="text-blue-300 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <p className="text-xs text-blue-300 font-bold uppercase tracking-widest">Tera Robótica</p>
              <h1 className="text-lg font-black leading-tight">Torneio Interclasse FLL 🏆</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-blue-300">Placar Total</p>
              <p className="text-2xl font-black text-yellow-400">{score} <span className="text-sm text-blue-300">/ 555</span></p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 flex gap-0 border-t border-[#283593]">
          {[
            { id: 'scorer', label: 'Árbitro', icon: Trophy },
            { id: 'teams', label: 'Equipes', icon: Users },
            { id: 'ranking', label: 'Ranking', icon: List },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === t.id ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-blue-300 hover:text-white'}`}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {activeTab === 'scorer' && (
            <motion.div key="scorer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Score bar mobile */}
              <div className="sm:hidden mb-4 bg-[#1a237e] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-300">Placar</p>
                  <p className="text-3xl font-black text-yellow-400">{score} <span className="text-sm text-blue-300">/ {MAX_SCORE}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-300">Jetons</p>
                  <p className="text-2xl font-black">{jetons}</p>
                </div>
              </div>

              {/* Team selector + round */}
              <div className="bg-[#111827] border border-[#1e3a5f] rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center">
                  <div>
                    <label className="text-xs text-blue-300 font-bold uppercase block mb-1">Equipe</label>
                    <select value={selectedTeam?.id || ''} onChange={e => setSelectedTeam(teams.find(t => t.id === e.target.value) || null)}
                      className="bg-[#1a237e] border border-[#283593] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none">
                      <option value="">Selecionar...</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name} #{t.number}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-blue-300 font-bold uppercase block mb-1">Round</label>
                    <select value={selectedRound} onChange={e => setSelectedRound(Number(e.target.value))}
                      className="bg-[#1a237e] border border-[#283593] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none">
                      <option value={1}>Round 1</option>
                      <option value={2}>Round 2</option>
                      <option value={3}>Round 3</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveRound} disabled={!selectedTeam}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black font-bold rounded-lg text-sm transition-colors">
                    💾 Salvar Round
                  </button>
                  <button onClick={resetAll}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-600/30 text-red-400 font-bold rounded-lg text-sm transition-colors">
                    <RotateCcw className="w-3.5 h-3.5" /> Resetar
                  </button>
                </div>
              </div>

              {/* Timer + Jetons */}
              <FLLTimer
                timeLeft={timeLeft} setTimeLeft={setTimeLeft}
                timerRunning={timerRunning} setTimerRunning={setTimerRunning}
                timerDone={timerDone} setTimerDone={setTimerDone}
                jetons={jetons} setJetons={setJetons}
                precisionTable={PRECISION_TABLE}
                onReset={resetAll}
              />

              {/* Missions */}
              <FLLMissions
                missions={missions} setMissions={setMissions}
                disabled={timerDone}
                score={score}
              />
            </motion.div>
          )}

          {activeTab === 'teams' && (
            <motion.div key="teams" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <FLLTeamPanel teams={teams} setTeams={setTeams} rounds={rounds} getBestScore={getBestScore} />
            </motion.div>
          )}

          {activeTab === 'ranking' && (
            <motion.div key="ranking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <FLLLeaderboard ranked={ranked} rounds={rounds} getBestScore={getBestScore} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function FLLScorer() {
  return (
    <ProtectedRoute requireApproved={true}>
      <FLLScorerContent />
    </ProtectedRoute>
  );
}