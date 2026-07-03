import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Printer } from 'lucide-react';

export default function FLLLeaderboard({ ranked, rounds, getBestScore }) {
  const handlePrint = () => {
    const content = ranked.map((team, i) => {
      const scores = [1, 2, 3].map(r => {
        const key = `${team.id}_r${r}`;
        return rounds[key] ? rounds[key].score : '—';
      });
      return `${i + 1}. ${team.name} ${team.number ? '#' + team.number : ''} | R1: ${scores[0]} | R2: ${scores[1]} | R3: ${scores[2]} | Melhor: ${getBestScore(team.id)}`;
    }).join('\n');

    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Ranking FLL - Tera Robótica</title>
      <style>body{font-family:monospace;padding:20px;}h1{font-size:18px;margin-bottom:20px;}pre{font-size:14px;line-height:2;}</style>
      </head><body><h1>🏆 Ranking — Torneio Interclasse FLL — Tera Robótica</h1><pre>${content}</pre></body></html>
    `);
    win.print();
  };

  const medalColors = ['text-yellow-400', 'text-gray-300', 'text-orange-400'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-black text-white">🏆 Ranking Geral</h2>
        <button onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a237e]/60 hover:bg-[#1a237e] border border-[#283593] rounded-lg text-sm text-blue-300 font-bold transition-colors">
          <Printer className="w-4 h-4" /> Imprimir
        </button>
      </div>

      {ranked.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Nenhuma equipe cadastrada ainda.</p>
          <p className="text-sm mt-1">Adicione equipes na aba "Equipes".</p>
        </div>
      )}

      <div className="space-y-3">
        {ranked.map((team, i) => {
          const best = getBestScore(team.id);
          const isTop3 = i < 3;
          return (
            <motion.div key={team.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className={`bg-[#111827] border rounded-xl p-4 flex items-center gap-4 ${isTop3 ? 'border-[#283593]' : 'border-[#1e3a5f]'}`}>
              {/* Position */}
              <div className={`text-2xl font-black w-10 text-center flex-shrink-0 ${medalColors[i] || 'text-gray-500'}`}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
              </div>

              {/* Team info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{team.name} {team.number && <span className="text-blue-300">#{team.number}</span>}</p>
                <div className="flex gap-3 mt-1">
                  {[1, 2, 3].map(r => {
                    const key = `${team.id}_r${r}`;
                    const round = rounds[key];
                    return (
                      <span key={r} className={`text-xs ${round ? 'text-gray-300' : 'text-gray-600'}`}>
                        R{r}: <span className="font-bold">{round ? round.score : '—'}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Best score */}
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-500 font-bold uppercase">Melhor</p>
                <p className={`text-2xl font-black ${best > 0 ? 'text-yellow-400' : 'text-gray-600'}`}>{best}</p>
                {best > 0 && <p className="text-xs text-gray-500">de 545</p>}
              </div>
            </motion.div>
          );
        })}
      </div>

      {ranked.length > 0 && (
        <div className="mt-6 bg-[#111827] border border-[#1e3a5f] rounded-xl p-4 text-xs text-gray-500">
          <p className="font-bold text-gray-400 mb-1">ℹ️ Regra de Classificação</p>
          <p>O ranking usa a <strong className="text-white">maior pontuação</strong> entre os 3 rounds de cada equipe, conforme as regras oficiais da FIRST LEGO League.</p>
        </div>
      )}
    </div>
  );
}