import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Trophy, Download } from 'lucide-react';

const TIR_TEAMS = [
  { sala: '6ºAM', name: 'ALDEIA TECH' },
  { sala: '6ºBM', name: 'TECH OWL' },
  { sala: '6ºCM', name: 'BOT INDUSTRY' },
  { sala: '6ºAV', name: 'FÚRIA BOTS' },
  { sala: '7ºAM', name: 'TECH BOOM' },
  { sala: '7ºBM', name: 'TECH BEAR' },
  { sala: '7ºAV', name: 'TECH IVY' },
  { sala: '7ºBV', name: 'TECH FÊNIX' },
  { sala: '8ºAM', name: 'DEX TECH' },
  { sala: '8ºBM', name: 'TECH INDUSTRY' },
  { sala: '8ºCM', name: 'INDUS TECH' },
  { sala: '8ºAV', name: 'TECH MILLS' },
  { sala: '9ºAM', name: 'IRONTECH' },
  { sala: '9ºBM', name: 'LOX TECH' },
  { sala: '9ºAV', name: 'SIGMA BOTS' },
  { sala: 'TERA', name: 'TERA ROBOTICS' },
  { sala: 'INOCE', name: 'INOBOTS' },
  { sala: 'CASS', name: 'H.A.R.P.I.A' },
];

export default function FLLTeamPanel({ teams, setTeams, rounds, getBestScore }) {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');

  const addTeam = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setTeams(prev => [...prev, { id: Date.now().toString(), name: name.trim(), number: number.trim() }]);
    setName('');
    setNumber('');
  };

  const removeTeam = (id) => {
    if (!confirm('Remover esta equipe e todas as suas pontuações?')) return;
    setTeams(prev => prev.filter(t => t.id !== id));
  };

  const loadTIRTeams = () => {
    if (!confirm('Carregar todas as equipes do TIR 2026? Equipes já cadastradas serão mantidas.')) return;
    setTeams(prev => {
      const existing = new Set(prev.map(t => t.name.toUpperCase()));
      const toAdd = TIR_TEAMS
        .filter(t => !existing.has(t.name.toUpperCase()))
        .map(t => ({ id: Date.now().toString() + Math.random(), name: t.name, number: t.sala }));
      return [...prev, ...toAdd];
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-black text-white">Gerenciar Equipes</h2>
        <button onClick={loadTIRTeams}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 font-bold rounded-lg text-xs transition-colors">
          <Download className="w-3.5 h-3.5" /> Carregar Equipes TIR 2026
        </button>
      </div>

      {/* Form */}
      <div className="bg-[#111827] border border-[#1e3a5f] rounded-xl p-5 mb-6">
        <h3 className="text-sm font-bold text-blue-300 uppercase tracking-widest mb-4">Cadastrar Nova Equipe</h3>
        <form onSubmit={addTeam} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-gray-400 font-bold uppercase block mb-1">Nome da Equipe *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Robô Warriors"
              className="bg-[#1a237e]/30 border border-[#283593] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 w-48" />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-bold uppercase block mb-1">Número</label>
            <input value={number} onChange={e => setNumber(e.target.value)} placeholder="Ex: 01"
              className="bg-[#1a237e]/30 border border-[#283593] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 w-24" />
          </div>
          <button type="submit" disabled={!name.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a237e] hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-lg text-sm transition-colors">
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </form>
      </div>

      {/* Team list */}
      <div className="space-y-3">
        {teams.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhuma equipe cadastrada ainda.</p>
          </div>
        )}
        {teams.map((team, i) => (
          <motion.div key={team.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-[#111827] border border-[#1e3a5f] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold">{team.name} {team.number && <span className="text-blue-300">#{team.number}</span>}</p>
                <p className="text-xs text-gray-500">Melhor pontuação: <span className="text-yellow-400 font-bold">{getBestScore(team.id)} pts</span></p>
              </div>
              <button onClick={() => removeTeam(team.id)} className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map(r => {
                const key = `${team.id}_r${r}`;
                const round = rounds[key];
                return (
                  <div key={r} className={`rounded-lg p-2 text-center border ${round ? 'bg-[#1a237e]/30 border-[#283593]' : 'bg-[#0a0e1a] border-[#1e3a5f]'}`}>
                    <p className="text-xs text-gray-500 font-bold">R{r}</p>
                    <p className={`text-lg font-black ${round ? 'text-yellow-400' : 'text-gray-600'}`}>
                      {round ? round.score : '—'}
                    </p>
                    {round && <p className="text-xs text-gray-500">{new Date(round.savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>}
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}