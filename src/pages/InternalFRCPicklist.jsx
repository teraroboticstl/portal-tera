import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import { Trophy, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';

function PicklistContent({ user }) {
  const { data: scouts = [] } = useQuery({
    queryKey: ['frc-scouts'],
    queryFn: () => base44.entities.FRCScout.list('-created_date', 100),
  });

  // Calcular scoring por time
  const teamScores = scouts.reduce((acc, scout) => {
    const key = scout.team_number;
    if (!acc[key]) {
      acc[key] = {
        teamNumber: key,
        totalScore: 0,
        count: 0,
        endgameSuccess: 0,
        scores: [],
      };
    }
    acc[key].totalScore += scout.total_score || 0;
    acc[key].count += 1;
    acc[key].scores.push(scout.total_score || 0);
    if (['park', 'climb_low', 'climb_mid', 'climb_high'].includes(scout.endgame_action)) {
      acc[key].endgameSuccess += 1;
    }
    return acc;
  }, {});

  // Gerar picklist com score
  const picklist = Object.values(teamScores)
    .map(team => {
      const avgScore = team.count > 0 ? team.totalScore / team.count : 0;
      const consistency = team.count > 1 
        ? 100 - (Math.sqrt(team.scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / team.count) / avgScore * 100)
        : 100;
      const endgameRate = team.count > 0 ? (team.endgameSuccess / team.count) * 100 : 0;
      
      const score = (avgScore * 0.5) + (consistency * 0.3) + (endgameRate * 0.2);
      
      return {
        ...team,
        avgScore,
        consistency: Math.max(0, consistency),
        endgameRate,
        pickScore: score,
      };
    })
    .sort((a, b) => b.pickScore - a.pickScore);

  const [order, setOrder] = useState(picklist);

  // Detectar "hidden gems" - times com alto score mas que não apareceriam normalmente
  const hiddenGems = order.filter(t => t.endgameRate > 50 && t.consistency > 70 && t.avgScore > 50);

  return (
    <InternalPageLayout user={user} currentPage="InternalFRCPicklist" title="Picklist Generator FRC">
      <div className="space-y-6">
        
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <div>
              <h1 className="text-3xl font-black text-white">Picklist Generator</h1>
              <p className="text-[#B8BDC7]">Ranking automático baseado em OPR, consistência e endgame</p>
            </div>
          </div>
        </motion.div>

        {/* Hidden Gems */}
        {hiddenGems.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-purple-900/20 border border-purple-500/30 rounded-2xl p-6">
            <h2 className="text-lg font-black text-purple-400 mb-4">⭐ Times Subestimados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {hiddenGems.map(team => (
                <div key={team.teamNumber} className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-white text-lg">#{team.teamNumber}</span>
                    <span className="text-purple-400 font-bold text-sm">Potencial Alto</span>
                  </div>
                  <div className="text-xs text-[#B8BDC7] mt-1">
                    <span>Média: <span className="font-bold text-green-400">{team.avgScore.toFixed(0)}</span> | </span>
                    <span>Endgame: <span className="font-bold text-blue-400">{team.endgameRate.toFixed(0)}%</span></span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Picklist */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6">
          <h2 className="text-lg font-black text-white mb-4">🏆 Picklist Ordenada</h2>
          <div className="space-y-2">
            {order.map((team, i) => (
              <motion.div key={team.teamNumber}
                layout
                className="bg-[#1F222B] rounded-lg p-4 cursor-move hover:bg-[#2F3340] transition-all">
                <div className="flex items-center gap-4">
                  <GripVertical className="w-5 h-5 text-[#555]" />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-black text-white text-xl min-w-8">{i + 1}.</span>
                      <span className="font-black text-white text-xl">#{team.teamNumber}</span>
                      <span className="text-orange-400 font-black">{team.pickScore.toFixed(1)} pts</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="text-[#555]">Média</p>
                        <p className="text-green-400 font-bold">{team.avgScore.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-[#555]">Consistência</p>
                        <p className="text-blue-400 font-bold">{team.consistency.toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-[#555]">Endgame</p>
                        <p className="text-purple-400 font-bold">{team.endgameRate.toFixed(0)}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <p className="text-xs text-[#555] text-center">
          Fórmula: (Média × 50%) + (Consistência × 30%) + (Endgame × 20%)
        </p>
      </div>
    </InternalPageLayout>
  );
}

export default function InternalFRCPicklist() {
  return (
    <ProtectedRoute requireApproved={true}>
      <PicklistContent />
    </ProtectedRoute>
  );
}