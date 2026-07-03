import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import ScoutForm from '@/components/scout/ScoutForm';
import TeamAnalysis from '@/components/scout/TeamAnalysis';
import ScoutProcessTab from '@/components/scout/ScoutProcessTab';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus, Search, BarChart2, ClipboardList, Trash2,
  Zap, ChevronDown, ChevronUp, BookOpen, Filter
} from 'lucide-react';

const TABS = [
  { id: 'register', label: 'Registrar', icon: Plus },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
  { id: 'matches', label: 'Partidas', icon: ClipboardList },
  { id: 'process', label: 'Processo & Estratégia', icon: BookOpen },
];

function iefClass(ief) {
  if (ief >= 15) return 'text-green-400';
  if (ief >= 7) return 'text-yellow-400';
  return 'text-red-400';
}

function ScoutRow({ scout, onDelete }) {
  const [open, setOpen] = useState(false);
  const ief = scout.efficiency_index || 0;

  return (
    <div className="bg-[#111217] border border-[#1F222B] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scout.alliance === 'Vermelha' ? 'bg-red-900/40 text-red-400' : 'bg-blue-900/40 text-blue-400'}`}>
            {scout.alliance}
          </span>
          <span className="text-white font-bold">#{scout.team_number}</span>
          <span className="text-[#B8BDC7] text-sm">{scout.match_number}</span>
          {scout.event && <span className="text-[#555] text-xs">{scout.event}</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1 text-xs font-bold ${iefClass(ief)}`}>
            <Zap className="w-3 h-3" />
            {ief > 0 ? '+' : ''}{ief}
          </span>
          <button onClick={(e) => { e.stopPropagation(); onDelete(scout.id); }}
            className="text-[#555] hover:text-red-400 transition-colors p-1">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {open ? <ChevronUp className="w-4 h-4 text-[#555]" /> : <ChevronDown className="w-4 h-4 text-[#555]" />}
        </div>
      </div>
      {open && (
        <div className="border-t border-[#1F222B] px-4 py-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="bg-[#1F222B] px-3 py-2 rounded-lg">
              <p className="text-[#555] mb-0.5">Auto artefatos</p>
              <p className="text-white font-bold">{scout.auto_artifacts || '0'}</p>
            </div>
            <div className="bg-[#1F222B] px-3 py-2 rounded-lg">
              <p className="text-[#555] mb-0.5">Saiu da zona</p>
              <p className={scout.auto_left_zone ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{scout.auto_left_zone ? '✔ Sim' : '✗ Não'}</p>
            </div>
            <div className="bg-[#1F222B] px-3 py-2 rounded-lg">
              <p className="text-[#555] mb-0.5">Conflito auto</p>
              <p className={scout.auto_conflicts ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>{scout.auto_conflicts ? '⚠ Sim' : '✔ Não'}</p>
            </div>
            <div className="bg-[#1F222B] px-3 py-2 rounded-lg">
              <p className="text-[#555] mb-0.5">Teleop artefatos</p>
              <p className="text-white font-bold">{scout.teleop_artifacts}{scout.teleop_artifacts_other ? ` (${scout.teleop_artifacts_other})` : ''}</p>
            </div>
            <div className="bg-[#1F222B] px-3 py-2 rounded-lg">
              <p className="text-[#555] mb-0.5">Ciclo / Padrão</p>
              <p className="text-white font-bold">{scout.teleop_cycle_speed} / {scout.teleop_pattern_ability}</p>
            </div>
            <div className="bg-[#1F222B] px-3 py-2 rounded-lg">
              <p className="text-[#555] mb-0.5">Shoot preferido</p>
              <p className="text-white font-bold text-[11px]">{scout.teleop_shoot_location || '—'}</p>
            </div>
            <div className="bg-[#1F222B] px-3 py-2 rounded-lg">
              <p className="text-[#555] mb-0.5">Endgame</p>
              <p className="text-white font-bold">{scout.endgame_base}</p>
            </div>
            <div className="bg-[#1F222B] px-3 py-2 rounded-lg">
              <p className="text-[#555] mb-0.5">Penalidades</p>
              <p className="text-white font-bold">+5×{scout.penalty_5pts || 0} / +15×{scout.penalty_15pts || 0}</p>
            </div>
            <div className="bg-[#1F222B] px-3 py-2 rounded-lg">
              <p className="text-[#555] mb-0.5">Cartão</p>
              <p className={`font-bold ${scout.card === 'Vermelho' ? 'text-red-400' : scout.card === 'Amarelo' ? 'text-yellow-400' : 'text-green-400'}`}>{scout.card || 'Nenhum'}</p>
            </div>
          </div>
          {scout.reliability_issues?.length > 0 && (
            <div className="text-xs text-red-400 bg-red-900/20 rounded-lg px-3 py-2">
              ⚠ {scout.reliability_issues.join(', ')}{scout.reliability_other ? ` — ${scout.reliability_other}` : ''}
            </div>
          )}
          {(scout.general_observations?.length > 0 || scout.observations_other) && (
            <div className="text-xs text-[#B8BDC7] bg-[#1F222B] rounded-lg px-3 py-2">
              {scout.general_observations?.join(' · ')}{scout.observations_other ? ` · ${scout.observations_other}` : ''}
            </div>
          )}
          {scout.scout_name && <p className="text-xs text-[#555]">Scout: {scout.scout_name}</p>}
        </div>
      )}
    </div>
  );
}

function FTCScoutContent({ user }) {
  const [tab, setTab] = useState('register');
  const [search, setSearch] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const qc = useQueryClient();

  const { data: scouts = [] } = useQuery({
    queryKey: ['scout_ftc'],
    queryFn: () => base44.entities.ScoutFTC.list('-created_date', 500),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['ftc-teams'],
    queryFn: () => base44.entities.Team.list('team_number'),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Auto-criar equipe se não existir
      if (data.team_number) {
        const exists = teams.some(t => String(t.team_number).trim() === String(data.team_number).trim());
        if (!exists) {
          await base44.entities.Team.create({
            team_number: String(data.team_number).trim(),
            team_name_source: 'Manual',
            status: 'Ativa',
          });
          qc.invalidateQueries({ queryKey: ['ftc-teams'] });
        }
      }
      return base44.entities.ScoutFTC.create(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scout_ftc'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ScoutFTC.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scout_ftc'] }),
  });

  // Group by team
  const teamMap = {};
  scouts.forEach(s => {
    if (!teamMap[s.team_number]) teamMap[s.team_number] = [];
    teamMap[s.team_number].push(s);
  });

  const teamsSorted = Object.entries(teamMap)
    .map(([team, data]) => ({
      team,
      data,
      avgIEF: Math.round(data.reduce((a, s) => a + (s.efficiency_index || 0), 0) / data.length)
    }))
    .sort((a, b) => b.avgIEF - a.avgIEF);

  const events = [...new Set(scouts.map(s => s.event).filter(Boolean))];

  const filteredScouts = scouts.filter(s => {
    const matchSearch = !search || s.team_number?.includes(search) || s.match_number?.toLowerCase().includes(search.toLowerCase());
    const matchEvent = !filterEvent || s.event === filterEvent;
    return matchSearch && matchEvent;
  });

  const filteredTeams = teamsSorted.filter(({ team, data }) => {
    const matchSearch = !search || team.includes(search);
    const matchEvent = !filterEvent || data.some(s => s.event === filterEvent);
    return matchSearch && matchEvent;
  });

  const totalScouts = scouts.length;
  const totalTeams = Object.keys(teamMap).length;
  const avgIEF = totalScouts > 0 ? Math.round(scouts.reduce((a, s) => a + (s.efficiency_index || 0), 0) / totalScouts) : 0;

  return (
    <InternalPageLayout user={user} currentPage="InternalFTCScout" title="Scout FTC – DECODE 2026" showCountdown={false}>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#111217] border border-[#1F222B] rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              tab === id ? 'bg-[#E10600] text-white' : 'text-[#B8BDC7] hover:text-white hover:bg-[#1F222B]'
            }`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Scouts', value: totalScouts },
          { label: 'Equipes', value: totalTeams },
          { label: 'IEF médio', value: `${avgIEF > 0 ? '+' : ''}${avgIEF}` },
        ].map(stat => (
          <div key={stat.label} className="bg-[#111217] border border-[#1F222B] rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-white">{stat.value}</p>
            <p className="text-[10px] text-[#B8BDC7] uppercase tracking-wide mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* REGISTRAR */}
      {tab === 'register' && (
        <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wide mb-6 flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#E10600]" />
            Novo Scout – DECODE 2026
          </h2>
          <ScoutForm onSave={(data) => createMutation.mutate(data)} />
        </div>
      )}

      {/* DASHBOARD */}
      {tab === 'dashboard' && (
        <div>
          {/* Filtros */}
          <div className="flex gap-3 mb-5 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar equipe..." className="pl-9 bg-[#111217] border-[#1F222B] text-white placeholder:text-[#555]" />
            </div>
            {events.length > 0 && (
              <select value={filterEvent} onChange={e => setFilterEvent(e.target.value)}
                className="bg-[#111217] border border-[#1F222B] text-[#B8BDC7] rounded-lg px-3 py-2 text-sm">
                <option value="">Todos os eventos</option>
                {events.map(ev => <option key={ev} value={ev}>{ev}</option>)}
              </select>
            )}
          </div>
          {filteredTeams.length === 0 ? (
            <div className="text-center text-[#B8BDC7] py-12">Nenhum scout registrado ainda.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredTeams.map(({ team, data }) => (
                <TeamAnalysis key={team} teamNumber={team} scouts={data} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* PARTIDAS */}
      {tab === 'matches' && (
        <div>
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar equipe ou partida..." className="pl-9 bg-[#111217] border-[#1F222B] text-white placeholder:text-[#555]" />
            </div>
            {events.length > 0 && (
              <select value={filterEvent} onChange={e => setFilterEvent(e.target.value)}
                className="bg-[#111217] border border-[#1F222B] text-[#B8BDC7] rounded-lg px-3 py-2 text-sm">
                <option value="">Todos os eventos</option>
                {events.map(ev => <option key={ev} value={ev}>{ev}</option>)}
              </select>
            )}
          </div>
          <div className="space-y-2">
            {filteredScouts.length === 0 ? (
              <div className="text-center text-[#B8BDC7] py-12">Nenhum scout encontrado.</div>
            ) : (
              filteredScouts.map(s => (
                <ScoutRow key={s.id} scout={s} onDelete={(id) => deleteMutation.mutate(id)} />
              ))
            )}
          </div>
        </div>
      )}

      {/* PROCESSO */}
      {tab === 'process' && <ScoutProcessTab />}

    </InternalPageLayout>
  );
}

export default function InternalFTCScout() {
  return (
    <ProtectedRoute>
      <FTCScoutContent />
    </ProtectedRoute>
  );
}