import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import { Zap, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

function MatchPredictionContent({ user }) {
  const [redTeams, setRedTeams] = useState(['', '', '']);
  const [blueTeams, setBlueTeams] = useState(['', '', '']);

  const { data: scouts = [] } = useQuery({
    queryKey: ['frc-scouts'],
    queryFn: () => base44.entities.FRCScout.list('-created_date', 100),
  });

  // Calcular média por time
  const getTeamAvg = (teamNum) => {
    const matches = scouts.filter(s => s.team_number === teamNum);
    if (matches.length === 0) return 0;
    return matches.reduce((sum, m) => sum + (m.total_score || 0), 0) / matches.length;
  };

  const predictAllianceScore = (teams) => {
    return teams.reduce((sum, t) => sum + getTeamAvg(t), 0);
  };

  const redPredicted = predictAllianceScore(redTeams.filter(t => t));
  const bluePredicted = predictAllianceScore(blueTeams.filter(t => t));
  const winner = redPredicted > bluePredicted ? '🔴 RED' : bluePredicted > redPredicted ? '🔵 BLUE' : '⚖️ TIE';

  const allTeams = [...new Set(scouts.map(s => s.team_number))].sort();

  return (
    <InternalPageLayout user={user} currentPage="InternalFRCMatches" title="Predição de Matches FRC">
      <div className="space-y-6 max-w-4xl mx-auto">
        
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-orange-400" />
            <div>
              <h1 className="text-3xl font-black text-white">Preditor de Matches</h1>
              <p className="text-[#B8BDC7]">Selecione as alianças para prever o resultado</p>
            </div>
          </div>
        </motion.div>

        {/* Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* RED ALLIANCE */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="bg-red-900/20 border border-red-500/30 rounded-2xl p-6">
            <h2 className="text-lg font-black text-red-400 mb-4">🔴 ALIANÇA VERMELHA</h2>
            <div className="space-y-3 mb-4">
              {redTeams.map((team, i) => (
                <select key={i} value={team} onChange={e => {
                  const newTeams = [...redTeams];
                  newTeams[i] = e.target.value;
                  setRedTeams(newTeams);
                }}
                  className="w-full bg-[#1F222B] text-white rounded-lg px-3 py-2 border border-[#2F3340] font-bold">
                  <option value="">Selecionar time {i + 1}</option>
                  {allTeams.map(t => (
                    <option key={t} value={t}>#{t} ({getTeamAvg(t).toFixed(0)} pts médios)</option>
                  ))}
                </select>
              ))}
            </div>
            <div className="bg-[#111217] rounded-lg p-3 border border-red-500/20">
              <p className="text-red-400 text-xs uppercase font-bold mb-1">Pontuação Estimada</p>
              <p className="text-white font-black text-3xl">{redPredicted.toFixed(0)}</p>
            </div>
          </motion.div>

          {/* BLUE ALLIANCE */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-6">
            <h2 className="text-lg font-black text-blue-400 mb-4">🔵 ALIANÇA AZUL</h2>
            <div className="space-y-3 mb-4">
              {blueTeams.map((team, i) => (
                <select key={i} value={team} onChange={e => {
                  const newTeams = [...blueTeams];
                  newTeams[i] = e.target.value;
                  setBlueTeams(newTeams);
                }}
                  className="w-full bg-[#1F222B] text-white rounded-lg px-3 py-2 border border-[#2F3340] font-bold">
                  <option value="">Selecionar time {i + 1}</option>
                  {allTeams.map(t => (
                    <option key={t} value={t}>#{t} ({getTeamAvg(t).toFixed(0)} pts médios)</option>
                  ))}
                </select>
              ))}
            </div>
            <div className="bg-[#111217] rounded-lg p-3 border border-blue-500/20">
              <p className="text-blue-400 text-xs uppercase font-bold mb-1">Pontuação Estimada</p>
              <p className="text-white font-black text-3xl">{bluePredicted.toFixed(0)}</p>
            </div>
          </motion.div>
        </div>

        {/* Resultado */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#111217] border-2 border-orange-500/30 rounded-2xl p-8 text-center">
          <p className="text-[#B8BDC7] text-sm uppercase tracking-widest mb-3">Vencedor Estimado</p>
          <p className="text-white font-black text-5xl mb-4">{winner}</p>
          <div className="flex gap-4 justify-center text-sm">
            <div>
              <p className="text-red-400 font-bold">RED</p>
              <p className="text-white font-black text-2xl">{redPredicted.toFixed(0)}</p>
            </div>
            <div className="text-[#555]">vs</div>
            <div>
              <p className="text-blue-400 font-bold">BLUE</p>
              <p className="text-white font-black text-2xl">{bluePredicted.toFixed(0)}</p>
            </div>
          </div>
          {redPredicted !== bluePredicted && (
            <p className="text-[#B8BDC7] text-xs mt-4">
              Diferença: <span className="font-bold">{Math.abs(redPredicted - bluePredicted).toFixed(0)} pontos</span>
            </p>
          )}
        </motion.div>
      </div>
    </InternalPageLayout>
  );
}

export default function InternalFRCMatches() {
  return (
    <ProtectedRoute requireApproved={true}>
      <MatchPredictionContent />
    </ProtectedRoute>
  );
}