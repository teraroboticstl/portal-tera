import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import { Search, TrendingUp, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

// Alliance score (0-100) baseado em: pontuação, auto, endgame, ciclos
function calcAllianceScore(team, maxValues) {
  if (team.count === 0) return 0;
  const scorePart = maxValues.avgScore > 0 ? (team.avgScore / maxValues.avgScore) * 40 : 0;
  const endgamePart = (team.endgameRate / 100) * 25;
  const autoPart = maxValues.avgAuto > 0 ? (team.avgAuto / maxValues.avgAuto) * 20 : 0;
  const cyclesPart = maxValues.avgCycles > 0 ? (team.avgCycles / maxValues.avgCycles) * 15 : 0;
  return Math.round(scorePart + endgamePart + autoPart + cyclesPart);
}

function getAllianceLabel(score) {
  if (score >= 80) return { label: 'Excelente', color: 'text-green-400', bg: 'bg-green-600', border: 'border-green-500/30' };
  if (score >= 60) return { label: 'Boa', color: 'text-yellow-400', bg: 'bg-yellow-500', border: 'border-yellow-500/30' };
  if (score >= 40) return { label: 'Regular', color: 'text-orange-400', bg: 'bg-orange-500', border: 'border-orange-500/30' };
  return { label: 'Fraca', color: 'text-red-400', bg: 'bg-red-600', border: 'border-red-500/30' };
}

function TeamStatsContent({ user }) {
  const [search, setSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);

  const { data: scouts = [] } = useQuery({
    queryKey: ['frc-scouts'],
    queryFn: () => base44.entities.FRCScout.list('-created_date', 200),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['frc-teams'],
    queryFn: () => base44.entities.Team.list('-created_date', 100),
  });

  const teamNames = teams.reduce((acc, t) => { acc[t.team_number] = t.team_name; return acc; }, {});

  const teamStats = scouts.reduce((acc, scout) => {
    const key = scout.team_number;
    if (!acc[key]) {
      acc[key] = { teamNumber: key, matches: [], totalScore: 0, totalAuto: 0, totalTeleop: 0, totalEndgame: 0, totalCycles: 0, endgameSuccess: 0, count: 0 };
    }
    acc[key].matches.push(scout);
    acc[key].totalScore += scout.total_score || 0;
    acc[key].totalAuto += scout.auto_score || 0;
    acc[key].totalTeleop += scout.teleop_score || 0;
    acc[key].totalEndgame += scout.endgame_score || 0;
    acc[key].totalCycles += scout.teleop_cycles || 0;
    if (['park', 'climb_low', 'climb_mid', 'climb_high'].includes(scout.endgame_action)) acc[key].endgameSuccess += 1;
    acc[key].count += 1;
    return acc;
  }, {});

  const oprRanking = Object.values(teamStats).map(t => ({
    ...t,
    avgScore: t.count > 0 ? t.totalScore / t.count : 0,
    avgAuto: t.count > 0 ? t.totalAuto / t.count : 0,
    avgTeleop: t.count > 0 ? t.totalTeleop / t.count : 0,
    avgEndgame: t.count > 0 ? t.totalEndgame / t.count : 0,
    avgCycles: t.count > 0 ? t.totalCycles / t.count : 0,
    endgameRate: t.count > 0 ? (t.endgameSuccess / t.count * 100) : 0,
  })).sort((a, b) => b.avgScore - a.avgScore);

  const maxValues = {
    avgScore: Math.max(...oprRanking.map(t => t.avgScore), 1),
    avgAuto: Math.max(...oprRanking.map(t => t.avgAuto), 1),
    avgCycles: Math.max(...oprRanking.map(t => t.avgCycles), 1),
  };

  const rankedWithScore = oprRanking.map(t => ({
    ...t,
    allianceScore: calcAllianceScore(t, maxValues),
  }));

  const filteredTeams = rankedWithScore.filter(t =>
    t.teamNumber.includes(search) ||
    (teamNames[t.teamNumber] || '').toLowerCase().includes(search.toLowerCase())
  );

  const selected = selectedTeam ? rankedWithScore.find(t => t.teamNumber === selectedTeam) : null;
  const allianceInfo = selected ? getAllianceLabel(selected.allianceScore) : null;

  const endgameLabel = (action) => ({
    none: '—', park: '✅ Park', climb_low: '✅ Baixo', climb_mid: '✅ Médio', climb_high: '✅ Alto', failed: '❌ Falhou'
  }[action] || action);

  return (
    <InternalPageLayout user={user} currentPage="InternalFRCTeams" title="Times FRC">
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/30 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-black text-white mb-2">📊 TIMES & ESTATÍSTICAS</h1>
              <p className="text-[#B8BDC7]">{scouts.length} scouts • {rankedWithScore.length} times scouted</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                📂 Week 1 BRBA importado
              </span>
              <span className="text-[10px] text-[#555]">16 equipes com dados reais</span>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Ranking List */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 bg-[#111217] border border-[#1F222B] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-orange-400" />
              <h2 className="text-sm font-black text-white uppercase">Ranking</h2>
            </div>
            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar time..." className="pl-9 bg-[#1F222B] border-[#1F222B] text-white h-9" />
            </div>
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {filteredTeams.map((team) => {
                const label = getAllianceLabel(team.allianceScore);
                const isSelected = selected?.teamNumber === team.teamNumber;
                return (
                  <button key={team.teamNumber} onClick={() => setSelectedTeam(team.teamNumber)}
                    className={`w-full text-left p-3 rounded-lg transition-all border ${
                      isSelected ? 'bg-orange-600 border-orange-500 text-white' : 'bg-[#1F222B] border-[#2F3340] text-[#B8BDC7] hover:bg-[#2F3340]'
                    }`}>
                    {/* Team name row */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm">#{team.teamNumber}</span>
                        {teamNames[team.teamNumber] && (
                          <span className="text-xs opacity-60 truncate max-w-[80px]">{teamNames[team.teamNumber]}</span>
                        )}
                      </div>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : `${label.bg} text-white`
                      }`}>{team.allianceScore}%</span>
                    </div>
                    {/* Stats mini row */}
                    <div className="flex items-center gap-2 text-[11px] opacity-75 mb-2">
                      <span>⚡ <b>{team.avgScore.toFixed(0)}</b>pts</span>
                      <span>🤸 <b>{team.endgameRate.toFixed(0)}</b>%</span>
                      <span>🔄 <b>{team.avgCycles.toFixed(1)}</b>c</span>
                      <span className="opacity-50">{team.count}M</span>
                    </div>
                    {/* Alliance score bar */}
                    <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${isSelected ? 'bg-white/60' : label.bg}`}
                        style={{ width: `${team.allianceScore}%` }} />
                    </div>
                  </button>
                );
              })}
              {filteredTeams.length === 0 && (
                <p className="text-center text-[#555] text-sm py-8">Nenhum time scouted ainda</p>
              )}
            </div>
          </motion.div>

          {/* Team Detail */}
          {selected ? (
            <motion.div key={selected.teamNumber} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-2 space-y-4">
              <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h2 className="text-2xl font-black text-white">Time #{selected.teamNumber}</h2>
                    {teamNames[selected.teamNumber] && <p className="text-[#B8BDC7]">{teamNames[selected.teamNumber]}</p>}
                    <p className="text-[#555] text-xs mt-1">{selected.count} match{selected.count !== 1 ? 'es' : ''} scouted</p>
                  </div>
                  {/* Alliance Score Badge */}
                  <div className={`text-center border ${allianceInfo.border} rounded-2xl px-5 py-3`}>
                    <p className="text-xs text-[#555] uppercase tracking-wide mb-1">Score de Aliança</p>
                    <p className={`text-5xl font-black ${allianceInfo.color}`}>{selected.allianceScore}%</p>
                    <p className={`text-sm font-bold mt-1 ${allianceInfo.color}`}>{allianceInfo.label}</p>
                  </div>
                </div>

                {/* Alliance score bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-xs text-[#444] mb-1">
                    <span>0 — Fraca</span><span>40</span><span>60</span><span>80</span><span>100 — Excelente</span>
                  </div>
                  <div className="h-5 bg-[#1F222B] rounded-full overflow-hidden relative">
                    <div className={`h-full rounded-full transition-all duration-700 ${allianceInfo.bg}`}
                      style={{ width: `${selected.allianceScore}%` }} />
                    {[40, 60, 80].map(mark => (
                      <div key={mark} className="absolute top-0 bottom-0 w-px bg-[#2F3340]"
                        style={{ left: `${mark}%` }} />
                    ))}
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { label: 'Média Geral', value: `${selected.avgScore.toFixed(0)} pts`, emoji: '⚡' },
                    { label: 'Média Auto', value: `${selected.avgAuto.toFixed(0)} pts`, emoji: '🤖' },
                    { label: 'Média Teleop', value: `${selected.avgTeleop.toFixed(0)} pts`, emoji: '🎮' },
                    { label: 'Média Endgame', value: `${selected.avgEndgame.toFixed(0)} pts`, emoji: '🏁' },
                    { label: 'Climb Rate', value: `${selected.endgameRate.toFixed(0)}%`, emoji: '🤸' },
                    { label: 'Ciclos/Match', value: selected.avgCycles.toFixed(1), emoji: '🔄' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-[#1F222B] rounded-xl p-3 border border-[#2F3340]">
                      <p className="text-xs text-[#555] mb-1">{stat.emoji} {stat.label}</p>
                      <p className="text-white font-black text-xl">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Match History */}
                <h3 className="text-sm font-black text-white uppercase mb-3 border-t border-[#2F3340] pt-4">
                  Histórico de Matches
                </h3>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {selected.matches.map((match, i) => (
                    <div key={i} className="bg-[#1F222B] rounded-lg px-3 py-2 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${match.alliance_color === 'red' ? 'bg-red-500' : 'bg-blue-500'}`} />
                        <span className="font-bold text-white">Match {match.match_number}</span>
                        {match.event_key === '2026brba' && (
                          <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-bold">W1</span>
                        )}
                      </div>
                      <div className="flex gap-3 text-[#B8BDC7]">
                        <span>Auto: <span className="font-bold text-blue-400">{match.auto_score}</span></span>
                        <span>Teleop: <span className="font-bold text-purple-400">{match.teleop_score}</span></span>
                        <span>EG: <span className="font-bold text-yellow-400">{endgameLabel(match.endgame_action)}</span></span>
                        <span>Total: <span className="font-bold text-green-400">{match.total_score}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="lg:col-span-2 flex items-center justify-center bg-[#111217] border border-[#1F222B] rounded-xl">
              <div className="text-center text-[#555] py-16">
                <Star className="w-14 h-14 mx-auto mb-4 opacity-20" />
                <p className="font-bold">Selecione um time para ver os detalhes</p>
                <p className="text-xs mt-2 opacity-60">Score de Aliança e estatísticas completas</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </InternalPageLayout>
  );
}

export default function InternalFRCTeams() {
  return (
    <ProtectedRoute requireApproved={true}>
      <TeamStatsContent />
    </ProtectedRoute>
  );
}