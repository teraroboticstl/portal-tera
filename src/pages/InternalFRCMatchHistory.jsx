import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import { ChevronDown, ChevronUp, Users, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function MatchHistoryContent({ user }) {
  const [openMatch, setOpenMatch] = useState(null);

  const { data: scouts = [] } = useQuery({
    queryKey: ['frc-scouts'],
    queryFn: () => base44.entities.FRCScout.list('-created_date', 500),
  });

  const [eventFilter, setEventFilter] = useState('all');

  // Eventos únicos
  const allEvents = [...new Set(scouts.map(s => s.event_key))].sort();

  // Agrupar scouts por event_key + match_number (evita colisão W1-Q1 vs Q1 da W2)
  const filtered = eventFilter === 'all' ? scouts : scouts.filter(s => s.event_key === eventFilter);

  const matchGroups = filtered.reduce((acc, scout) => {
    const key = `${scout.event_key}||${scout.match_number}`;
    if (!acc[key]) acc[key] = { event_key: scout.event_key, match_number: scout.match_number, red: [], blue: [] };
    if (scout.alliance_color === 'red') acc[key].red.push(scout);
    else acc[key].blue.push(scout);
    return acc;
  }, {});

  // Ordenar: W2 primeiro, W1 depois; dentro de cada evento ordenar numericamente desc
  const sortedMatches = Object.entries(matchGroups).sort((a, b) => {
    const evA = a[1].event_key; const evB = b[1].event_key;
    if (evA !== evB) return evA > evB ? -1 : 1; // frc2026 vem antes de 2026brba
    const numA = parseInt(a[1].match_number.replace(/\D/g, '')) || 0;
    const numB = parseInt(b[1].match_number.replace(/\D/g, '')) || 0;
    return numB - numA;
  });

  const endgameLabel = (action) => ({
    none: '—', park: 'Park', climb_low: '🟡 Baixo', climb_mid: '🔵 Médio', climb_high: '🟢 Alto', failed: '❌ Falhou'
  }[action] || action);

  const endgamePoints = { none: 0, park: 3, climb_low: 6, climb_mid: 12, climb_high: 18, failed: 0 };

  function AllianceBlock({ robots, color }) {
    const total = robots.reduce((s, r) => s + (r.total_score || 0), 0);
    const autoTotal = robots.reduce((s, r) => s + (r.auto_score || 0), 0);
    const teleopTotal = robots.reduce((s, r) => s + (r.teleop_score || 0), 0);
    const endgameTotal = robots.reduce((s, r) => s + (endgamePoints[r.endgame_action] || 0), 0);
    const isRed = color === 'red';

    return (
      <div className={`rounded-xl border p-4 flex-1 ${isRed ? 'border-red-500/30 bg-red-900/10' : 'border-blue-500/30 bg-blue-900/10'}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`font-black text-sm uppercase ${isRed ? 'text-red-400' : 'text-blue-400'}`}>
            {isRed ? '🔴 ALIANÇA VERMELHA' : '🔵 ALIANÇA AZUL'}
          </h3>
          <span className={`text-2xl font-black ${isRed ? 'text-red-300' : 'text-blue-300'}`}>{total}</span>
        </div>

        {/* Sub-totais */}
        <div className="flex gap-3 text-xs mb-4">
          <div className={`flex-1 text-center py-1.5 rounded-lg ${isRed ? 'bg-red-900/30' : 'bg-blue-900/30'}`}>
            <p className="opacity-60 mb-0.5">Auto</p>
            <p className="font-black text-white">{autoTotal}</p>
          </div>
          <div className={`flex-1 text-center py-1.5 rounded-lg ${isRed ? 'bg-red-900/30' : 'bg-blue-900/30'}`}>
            <p className="opacity-60 mb-0.5">Teleop</p>
            <p className="font-black text-white">{teleopTotal}</p>
          </div>
          <div className={`flex-1 text-center py-1.5 rounded-lg ${isRed ? 'bg-red-900/30' : 'bg-blue-900/30'}`}>
            <p className="opacity-60 mb-0.5">Endgame</p>
            <p className="font-black text-white">{endgameTotal}</p>
          </div>
        </div>

        {/* Robôs individuais */}
        <div className="space-y-2">
          {robots.length === 0 && (
            <p className="text-[#555] text-xs text-center py-2">Nenhum scout registrado</p>
          )}
          {robots.map((robot, i) => (
            <div key={i} className="bg-[#111217] rounded-lg p-3 border border-[#2F3340]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-[#555]" />
                  <span className="font-black text-white text-sm">#{robot.team_number}</span>
                  {robot.scout_name && <span className="text-[10px] text-[#555]">sc:{robot.scout_name}</span>}
                </div>
                <span className="font-black text-lg text-green-400">{robot.total_score}</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-[10px]">
                <div className="bg-[#1F222B] rounded p-1 text-center">
                  <div className="text-[#555]">Auto</div>
                  <div className="font-bold text-blue-300">{robot.auto_score}</div>
                </div>
                <div className="bg-[#1F222B] rounded p-1 text-center">
                  <div className="text-[#555]">Teleop</div>
                  <div className="font-bold text-purple-300">{robot.teleop_score}</div>
                </div>
                <div className="bg-[#1F222B] rounded p-1 text-center">
                  <div className="text-[#555]">Ciclos</div>
                  <div className="font-bold text-yellow-300">{robot.teleop_cycles}</div>
                </div>
                <div className="bg-[#1F222B] rounded p-1 text-center">
                  <div className="text-[#555]">End.</div>
                  <div className="font-bold text-orange-300 leading-tight">{endgameLabel(robot.endgame_action)}</div>
                </div>
              </div>
              {/* Defense */}
              {robot.defense_played && (
                <div className="mt-1 text-[10px] bg-blue-900/20 rounded px-2 py-1 text-blue-300 font-bold">
                  🛡️ Defesa {robot.defense_effectiveness}
                </div>
              )}
              {/* Notes */}
              {robot.notes && (
                <div className="mt-1 text-[10px] text-[#666] italic truncate">📝 {robot.notes}</div>
              )}
              {robot.auto_mobility && (
                <div className="mt-1 text-[10px] text-green-400">✅ Saiu da zona auto</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <InternalPageLayout user={user} currentPage="InternalFRCMatchHistory" title="Histórico de Partidas FRC">
      <div className="space-y-4 max-w-5xl mx-auto">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/30 rounded-2xl p-6">
          <h1 className="text-3xl font-black text-white mb-2">🏟️ HISTÓRICO DE PARTIDAS</h1>
          <p className="text-[#B8BDC7] mb-4">{sortedMatches.length} partidas • {scouts.length} scouts individuais</p>
          {/* Filtro de evento */}
          <div className="flex gap-2 flex-wrap">
            {['all', ...allEvents].map(ev => (
              <button key={ev} onClick={() => setEventFilter(ev)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  eventFilter === ev
                    ? 'bg-red-600 border-red-500 text-white'
                    : 'bg-[#1F222B] border-[#2F3340] text-[#B8BDC7] hover:border-red-500/50'
                }`}>
                {ev === 'all' ? 'Todos' : ev === '2026brba' ? '📂 Week 1 BRBA' : `🏆 ${ev}`}
              </button>
            ))}
          </div>
        </motion.div>

        {sortedMatches.length === 0 && (
          <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-12 text-center">
            <Users className="w-14 h-14 mx-auto mb-4 text-[#333]" />
            <p className="text-[#555] font-bold">Nenhuma partida scouted ainda</p>
            <p className="text-[#444] text-sm mt-2">Registre scouts via "Scout Rápido"</p>
          </div>
        )}

        {sortedMatches.map(([key, { event_key, match_number, red, blue }]) => {
          const redTotal = red.reduce((s, r) => s + (r.total_score || 0), 0);
          const blueTotal = blue.reduce((s, r) => s + (r.total_score || 0), 0);
          const totalRobots = red.length + blue.length;
          const isOpen = openMatch === key;
          const isW1 = event_key === '2026brba';

          return (
            <motion.div key={key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`border rounded-xl overflow-hidden ${isW1 ? 'bg-yellow-900/5 border-yellow-500/20' : 'bg-[#111217] border-[#1F222B]'}`}>
              
              {/* Header clicável */}
              <button onClick={() => setOpenMatch(isOpen ? null : key)}
                className="w-full flex items-center justify-between p-4 hover:bg-[#1F222B] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-white text-lg">Partida {match_number}</p>
                      {isW1 && <span className="text-[9px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded font-bold">W1 BRBA</span>}
                    </div>
                    <p className="text-xs text-[#555]">{totalRobots} robôs scouted ({red.length}🔴 {blue.length}🔵)</p>
                  </div>
                  {/* Score preview */}
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-black text-red-400">{redTotal}</span>
                    <span className="text-[#444]">x</span>
                    <span className="font-black text-blue-400">{blueTotal}</span>
                    {redTotal !== blueTotal && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        redTotal > blueTotal ? 'bg-red-900/40 text-red-300' : 'bg-blue-900/40 text-blue-300'
                      }`}>
                        {redTotal > blueTotal ? '🔴' : '🔵'} +{Math.abs(redTotal - blueTotal)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#555]">{isOpen ? 'Fechar' : 'Ver detalhes'}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-[#555]" /> : <ChevronDown className="w-4 h-4 text-[#555]" />}
                </div>
              </button>

              {/* Conteúdo expandido */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    <div className="p-4 pt-0 border-t border-[#1F222B]">
                      <div className="flex gap-4 flex-col lg:flex-row">
                        <AllianceBlock robots={red} color="red" />
                        <AllianceBlock robots={blue} color="blue" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </InternalPageLayout>
  );
}

export default function InternalFRCMatchHistory() {
  return (
    <ProtectedRoute requireApproved={true}>
      <MatchHistoryContent />
    </ProtectedRoute>
  );
}