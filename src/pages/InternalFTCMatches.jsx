import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Trash2, Plus, Trophy } from 'lucide-react';

const GATE_COLS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function countGatePoints(gate, multiplier) {
  if (!gate) return 0;
  let pts = 0;
  ['green', 'purple', 'none'].forEach((r) => {
    if (!gate[r]) return;
    GATE_COLS.forEach((c) => { if (gate[r][c]) pts += multiplier; });
    if (gate[r].square) pts += multiplier;
  });
  return pts;
}

function SimpleMatchCard({ match, onDelete, canDelete }) {
  const [expanded, setExpanded] = useState(false);

  const winnerColor =
    match.winner === 'RED' ? 'text-red-400' :
    match.winner === 'BLUE' ? 'text-blue-400' :
    'text-yellow-400';

  // Breakdown detalhado por time
  function teamBreakdown(prefix, isAuto) {
    const classified = match[`${prefix}_auto_classified`] ?? 0;
    const overflow = match[`${prefix}_auto_overflow`] ?? 0;
    const gate = match[`${prefix}_auto_gate`];
    const tClassified = match[`${prefix}_teleop_classified`] ?? 0;
    const tOverflow = match[`${prefix}_teleop_overflow`] ?? 0;
    const tGate = match[`${prefix}_teleop_gate`];
    const penalties = match[`${prefix}_penalties`] ?? 0;
    const total = match[`${prefix}_total`] ?? 0;

    const autoScore = classified * 3 + overflow * 2 + countGatePoints(gate, 2);
    const teleopScore = tClassified + tOverflow + countGatePoints(tGate, 1);

    return {
      autoScore,
      teleopScore,
      penalties,
      total,
      classified,
      overflow,
      tClassified,
      tOverflow,
    };
  }

  const r1 = teamBreakdown('red_team1');
  const r2 = teamBreakdown('red_team2');
  const b1 = teamBreakdown('blue_team1');
  const b2 = teamBreakdown('blue_team2');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#111217] border border-[#1F222B] rounded-xl overflow-hidden"
    >
      {/* Simple view */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-orange-400" />
            <span className="text-white font-bold text-sm">{match.match_title || 'Partida sem título'}</span>
          </div>
          <div className="flex items-center gap-2">
            {canDelete && (
              <button
                onClick={() => onDelete(match.id)}
                className="p-1.5 text-[#B8BDC7] hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 text-[#B8BDC7] hover:text-white transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Placar simplificado */}
        <div className="grid grid-cols-3 rounded-lg overflow-hidden border border-[#1F222B]">
          <div className="bg-red-700/30 border-r border-[#1F222B] py-3 text-center">
            <div className="text-red-400 text-xs font-bold uppercase tracking-wide">Vermelha</div>
            <div className="text-white font-black text-3xl">{match.red_total ?? 0}</div>
            <div className="text-red-300/60 text-xs">
              {match.red_team1_number || '?'} + {match.red_team2_number || '?'}
            </div>
          </div>
          <div className="bg-[#0B0B0D] flex items-center justify-center flex-col gap-0.5 py-2">
            <div className="text-[#B8BDC7] text-xs uppercase tracking-widest">VS</div>
            <div className={`font-black text-sm ${winnerColor}`}>
              {match.winner === 'RED' ? '🔴 Vermelha' : match.winner === 'BLUE' ? '🔵 Azul' : '🤝 Empate'}
            </div>
          </div>
          <div className="bg-blue-700/30 border-l border-[#1F222B] py-3 text-center">
            <div className="text-blue-400 text-xs font-bold uppercase tracking-wide">Azul</div>
            <div className="text-white font-black text-3xl">{match.blue_total ?? 0}</div>
            <div className="text-blue-300/60 text-xs">
              {match.blue_team1_number || '?'} + {match.blue_team2_number || '?'}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed view */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-[#1F222B]"
          >
            <div className="p-4 space-y-4">
              <h4 className="text-[#B8BDC7] text-xs font-bold uppercase tracking-widest text-center">Detalhamento por Time</h4>

              {/* Table detalhada */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-center">
                  <thead>
                    <tr className="border-b border-[#1F222B]">
                      <th className="text-[#B8BDC7] text-left py-2 px-2">Time</th>
                      <th className="text-[#B8BDC7] py-2">Auto Pts</th>
                      <th className="text-[#B8BDC7] py-2">Teleop Pts</th>
                      <th className="text-[#B8BDC7] py-2">Penalidades</th>
                      <th className="text-[#B8BDC7] py-2 font-black">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: match.red_team1_number || 'VM Time 1', data: r1, color: 'text-red-400' },
                      { label: match.red_team2_number || 'VM Time 2', data: r2, color: 'text-red-400' },
                      { label: match.blue_team1_number || 'AZ Time 1', data: b1, color: 'text-blue-400' },
                      { label: match.blue_team2_number || 'AZ Time 2', data: b2, color: 'text-blue-400' },
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-[#1F222B]/50">
                        <td className={`text-left py-2 px-2 font-bold ${row.color}`}>{row.label}</td>
                        <td className="py-2 text-white">{row.data.autoScore}</td>
                        <td className="py-2 text-white">{row.data.teleopScore}</td>
                        <td className="py-2 text-red-400">-{row.data.penalties}</td>
                        <td className="py-2 font-black text-white text-sm">{row.data.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Breakdown AUTO/TELEOP por aliança */}
              <div className="grid grid-cols-2 gap-3">
                {/* Vermelha */}
                <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-3 space-y-1">
                  <div className="text-red-400 text-xs font-black uppercase tracking-wider mb-2">🔴 Aliança Vermelha</div>
                  <div className="flex justify-between text-xs"><span className="text-[#B8BDC7]">Auto Total</span><span className="text-white font-bold">{r1.autoScore + r2.autoScore}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-[#B8BDC7]">Teleop Total</span><span className="text-white font-bold">{r1.teleopScore + r2.teleopScore}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-[#B8BDC7]">Penalidades</span><span className="text-red-400 font-bold">-{r1.penalties + r2.penalties}</span></div>
                  <div className="flex justify-between text-xs border-t border-red-500/20 pt-1 mt-1"><span className="text-white font-black">TOTAL</span><span className="text-white font-black">{match.red_total ?? 0}</span></div>
                </div>
                {/* Azul */}
                <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-3 space-y-1">
                  <div className="text-blue-400 text-xs font-black uppercase tracking-wider mb-2">🔵 Aliança Azul</div>
                  <div className="flex justify-between text-xs"><span className="text-[#B8BDC7]">Auto Total</span><span className="text-white font-bold">{b1.autoScore + b2.autoScore}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-[#B8BDC7]">Teleop Total</span><span className="text-white font-bold">{b1.teleopScore + b2.teleopScore}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-[#B8BDC7]">Penalidades</span><span className="text-red-400 font-bold">-{b1.penalties + b2.penalties}</span></div>
                  <div className="flex justify-between text-xs border-t border-blue-500/20 pt-1 mt-1"><span className="text-white font-black">TOTAL</span><span className="text-white font-black">{match.blue_total ?? 0}</span></div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function InternalFTCMatchesContent({ user }) {
  const queryClient = useQueryClient();
  const canDelete = user?.role === 'admin' || user?.member_role === 'admin' || user?.member_role === 'member';

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['ftc-matches'],
    queryFn: () => base44.entities.Match.list('-created_date'),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Match.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ftc-matches'] }),
  });

  const totalRed = matches.filter(m => m.winner === 'RED').length;
  const totalBlue = matches.filter(m => m.winner === 'BLUE').length;
  const totalEmpate = matches.filter(m => m.winner === 'EMPATE').length;

  return (
    <InternalPageLayout user={user} currentPage="InternalFTCMatches" title="FTC - Partidas">
      <div className="space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/30 rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-orange-500 uppercase tracking-widest">PARTIDAS SALVAS</h2>
              <p className="text-[#B8BDC7] text-sm">Histórico de partidas — FTC DECODE #17730</p>
            </div>
            <Link
              to={createPageUrl('InternalFTCScorer')}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold transition-colors"
            >
              <Plus className="w-4 h-4" /> Nova Partida
            </Link>
          </div>

          {/* Stats rápidas */}
          {matches.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mt-4">
              <div className="bg-[#0B0B0D] rounded-lg p-3 text-center">
                <div className="text-white font-black text-2xl">{matches.length}</div>
                <div className="text-[#B8BDC7] text-xs">Total</div>
              </div>
              <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-3 text-center">
                <div className="text-red-400 font-black text-2xl">{totalRed}</div>
                <div className="text-[#B8BDC7] text-xs">🔴 Vermelho</div>
              </div>
              <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-3 text-center">
                <div className="text-blue-400 font-black text-2xl">{totalBlue}</div>
                <div className="text-[#B8BDC7] text-xs">🔵 Azul</div>
              </div>
              <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-3 text-center">
                <div className="text-yellow-400 font-black text-2xl">{totalEmpate}</div>
                <div className="text-[#B8BDC7] text-xs">🤝 Empates</div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Lista de partidas */}
        {isLoading ? (
          <div className="text-center text-[#B8BDC7] py-12">Carregando partidas...</div>
        ) : matches.length === 0 ? (
          <div className="text-center py-16 bg-[#111217] border border-[#1F222B] rounded-xl">
            <Trophy className="w-12 h-12 text-[#1F222B] mx-auto mb-4" />
            <p className="text-[#B8BDC7] font-bold">Nenhuma partida salva ainda</p>
            <p className="text-[#B8BDC7]/50 text-sm mt-1 mb-4">Use o Calculador de Pontos para registrar partidas</p>
            <Link
              to={createPageUrl('InternalFTCScorer')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold transition-colors"
            >
              <Plus className="w-4 h-4" /> Abrir Calculador
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <SimpleMatchCard
                key={match.id}
                match={match}
                onDelete={(id) => deleteMutation.mutate(id)}
                canDelete={canDelete}
              />
            ))}
          </div>
        )}

      </div>
    </InternalPageLayout>
  );
}

export default function InternalFTCMatches() {
  return (
    <ProtectedRoute requireApproved={true}>
      <InternalFTCMatchesContent />
    </ProtectedRoute>
  );
}