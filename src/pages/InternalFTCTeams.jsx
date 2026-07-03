import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import { motion } from 'framer-motion';
import {
  Plus, Trash2, Pencil, Check, X, Search,
  RefreshCw, Users, ChevronUp, ChevronDown
} from 'lucide-react';

// ─── FTC Teams Management ─────────────────────────────────────────────────────
const STATUS_OPTIONS = ['Ativa', 'Inativa', 'Reservada', 'Desqualificada', 'Ausente'];
const STATUS_COLORS = {
  Ativa: 'bg-green-500/20 text-green-400 border-green-500/30',
  Inativa: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  Reservada: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Desqualificada: 'bg-red-500/20 text-red-400 border-red-500/30',
  Ausente: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

function computeTeamStats(teamNumber, matches) {
  let classified = 0, overflow = 0, played = 0, wins = 0, totalPts = 0;
  if (!teamNumber) return { classified, overflow, played, wins, totalPts, avgPts: 0 };
  const n = String(teamNumber).trim();
  for (const m of matches) {
    const redSlots = [
      { num: m.red_team1_number, ac: m.red_team1_auto_classified, ao: m.red_team1_auto_overflow, tc: m.red_team1_teleop_classified, to: m.red_team1_teleop_overflow, total: m.red_team1_total },
      { num: m.red_team2_number, ac: m.red_team2_auto_classified, ao: m.red_team2_auto_overflow, tc: m.red_team2_teleop_classified, to: m.red_team2_teleop_overflow, total: m.red_team2_total },
    ];
    const blueSlots = [
      { num: m.blue_team1_number, ac: m.blue_team1_auto_classified, ao: m.blue_team1_auto_overflow, tc: m.blue_team1_teleop_classified, to: m.blue_team1_teleop_overflow, total: m.blue_team1_total },
      { num: m.blue_team2_number, ac: m.blue_team2_auto_classified, ao: m.blue_team2_auto_overflow, tc: m.blue_team2_teleop_classified, to: m.blue_team2_teleop_overflow, total: m.blue_team2_total },
    ];
    const isRed = redSlots.some(s => String(s.num || '').trim() === n);
    const isBlue = blueSlots.some(s => String(s.num || '').trim() === n);
    const slots = [...redSlots, ...blueSlots];
    for (const s of slots) {
      if (String(s.num || '').trim() === n) {
        classified += (s.ac || 0) + (s.tc || 0);
        overflow += (s.ao || 0) + (s.to || 0);
        totalPts += (s.total || 0);
        played++;
        if ((isRed && m.winner === 'RED') || (isBlue && m.winner === 'BLUE')) wins++;
      }
    }
  }
  const avgPts = played > 0 ? Math.round(totalPts / played) : 0;
  return { classified, overflow, played, wins, totalPts, avgPts };
}

// ─── Add Team Form ────────────────────────────────────────────────────────────
function AddTeamForm({ onAdd }) {
  const [num, setNum] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('Ativa');
  const [notes, setNotes] = useState('');

  const handleAdd = () => {
    if (!num) return;
    onAdd({ team_number: num, team_name: name, team_name_source: 'Manual', status, notes });
    setNum(''); setName(''); setStatus('Ativa'); setNotes('');
  };

  return (
    <div className="bg-[#0D0E13] border border-orange-500/20 rounded-2xl p-4">
      <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-3 flex items-center gap-2">
        <Plus className="w-4 h-4" /> Adicionar Nova Equipe
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-[#B8BDC7] mb-1">Nº da Equipe *</label>
          <input value={num} onChange={(e) => setNum(e.target.value.replace(/\D/g, ''))} placeholder="Ex: 17730" maxLength={6}
            className="w-full bg-[#1F222B] text-white rounded-lg px-3 py-2 text-sm border border-[#2F3340] focus:border-orange-500 outline-none" />
        </div>
        <div>
          <label className="block text-xs text-[#B8BDC7] mb-1">Nome da Equipe</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da equipe (opcional)"
            className="w-full bg-[#1F222B] text-white rounded-lg px-3 py-2 text-sm border border-[#2F3340] focus:border-orange-500 outline-none" />
        </div>
        <div>
          <label className="block text-xs text-[#B8BDC7] mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-[#1F222B] text-white rounded-lg px-3 py-2 text-sm border border-[#2F3340] focus:border-orange-500 outline-none">
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#B8BDC7] mb-1">Observações</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional"
            className="w-full bg-[#1F222B] text-white rounded-lg px-3 py-2 text-sm border border-[#2F3340] focus:border-orange-500 outline-none" />
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button onClick={handleAdd} disabled={!num}
          className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-lg text-sm font-bold transition-colors">
          <Plus className="w-4 h-4" /> Adicionar Equipe
        </button>
      </div>
    </div>
  );
}

// ─── TeamRow ──────────────────────────────────────────────────────────────────
function TeamRow({ team, matches, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState({ ...team });
  const stats = computeTeamStats(team.team_number, matches);

  const handleSave = () => { onSave(team.id, data); setEditing(false); };
  const handleCancel = () => { setData({ ...team }); setEditing(false); };

  return (
    <tr className="border-b border-[#1F222B] hover:bg-[#1F222B]/30 transition-colors group">
      {/* Nº */}
      <td className="py-3 px-3 font-black text-orange-400 text-sm whitespace-nowrap">
        {editing
          ? <input value={data.team_number} onChange={(e) => setData({ ...data, team_number: e.target.value.replace(/\D/g, '') })}
              className="w-20 bg-[#1F222B] text-white rounded px-2 py-1 text-sm border border-[#2F3340] focus:border-orange-500 outline-none" />
          : `#${team.team_number}`}
      </td>
      {/* Nome */}
      <td className="py-3 px-3 text-white text-sm">
        {editing ? (
          <input value={data.team_name || ''} onChange={(e) => setData({ ...data, team_name: e.target.value })}
            className="w-full bg-[#1F222B] text-white rounded px-2 py-1 text-sm border border-[#2F3340] focus:border-orange-500 outline-none min-w-0" />
        ) : (
          <span>{team.team_name || <span className="text-[#B8BDC7] italic text-xs">—</span>}</span>
        )}
      </td>
      {/* Status */}
      <td className="py-3 px-3">
        {editing
          ? <select value={data.status || 'Ativa'} onChange={(e) => setData({ ...data, status: e.target.value })}
              className="bg-[#1F222B] text-white rounded px-2 py-1 text-xs border border-[#2F3340] focus:border-orange-500 outline-none">
              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          : <span className={`text-xs font-bold px-2 py-0.5 rounded border ${STATUS_COLORS[team.status] || STATUS_COLORS.Ativa}`}>{team.status || 'Ativa'}</span>}
      </td>
      {/* Stats */}
      <td className="py-3 px-3 text-center">
        <span className="text-[#B8BDC7] font-black">{stats.played}</span>
      </td>
      <td className="py-3 px-3 text-center">
        <span className={`font-black ${stats.wins > 0 ? 'text-green-400' : 'text-[#B8BDC7]'}`}>{stats.wins}</span>
      </td>
      <td className="py-3 px-3 text-center">
        <span className="text-orange-400 font-black">{stats.totalPts}</span>
      </td>
      <td className="py-3 px-3 text-center">
        <span className="text-green-400 font-black">{stats.classified}</span>
      </td>
      <td className="py-3 px-3 text-center">
        <span className="text-yellow-400 font-black">{stats.overflow}</span>
      </td>
      <td className="py-3 px-3 text-center">
        <span className={`font-black text-sm ${stats.avgPts >= 60 ? 'text-green-400' : stats.avgPts >= 30 ? 'text-yellow-400' : stats.avgPts > 0 ? 'text-orange-400' : 'text-[#B8BDC7]'}`}>
          {stats.avgPts > 0 ? stats.avgPts : '—'}
        </span>
      </td>
      {/* Notes */}
      <td className="py-3 px-3 text-[#B8BDC7] text-xs max-w-[140px]">
        {editing
          ? <input value={data.notes || ''} onChange={(e) => setData({ ...data, notes: e.target.value })}
              className="w-full bg-[#1F222B] text-white rounded px-2 py-1 text-xs border border-[#2F3340] focus:border-orange-500 outline-none" />
          : <span className="truncate block">{team.notes || '—'}</span>}
      </td>
      {/* Actions */}
      <td className="py-3 px-3">
        <div className="flex items-center gap-1 justify-end">
          {editing ? (
            <>
              <button onClick={handleSave} className="p-1 text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
              <button onClick={handleCancel} className="p-1 text-[#B8BDC7] hover:text-white"><X className="w-4 h-4" /></button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="p-1 text-[#B8BDC7] hover:text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => onDelete(team.id)} className="p-1 text-[#B8BDC7] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
function InternalFTCTeamsContent({ user }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [sortKey, setSortKey] = useState('team_number');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['ftc-teams'],
    queryFn: () => base44.entities.Team.list('team_number'),
  });

  const { data: matches = [] } = useQuery({
    queryKey: ['ftc-matches'],
    queryFn: () => base44.entities.Match.list('-created_date'),
  });

  const createTeam = useMutation({
    mutationFn: (d) => base44.entities.Team.create(d),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ftc-teams'] }),
  });

  const updateTeam = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Team.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ftc-teams'] }),
  });

  const deleteTeam = useMutation({
    mutationFn: (id) => base44.entities.Team.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ftc-teams'] }),
  });

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const SortIcon = ({ k }) => sortKey === k
    ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />)
    : <span className="inline-block w-3 h-3 ml-1 opacity-0 group-hover:opacity-30">↕</span>;

  const filtered = teams.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !search || String(t.team_number).includes(q) || (t.team_name || '').toLowerCase().includes(q);
    const matchStatus = filterStatus === 'Todos' || (t.status || 'Ativa') === filterStatus;
    return matchSearch && matchStatus;
  }).sort((a, b) => {
    let va, vb;
    if (sortKey === 'classified' || sortKey === 'overflow') {
      const sa = computeTeamStats(a.team_number, matches);
      const sb = computeTeamStats(b.team_number, matches);
      va = sortKey === 'classified' ? sa.classified : sa.overflow;
      vb = sortKey === 'classified' ? sb.classified : sb.overflow;
    } else {
      va = a[sortKey] ?? '';
      vb = b[sortKey] ?? '';
      if (sortKey === 'team_number') { va = parseInt(va) || 0; vb = parseInt(vb) || 0; }
    }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const COLS = [
    { key: 'team_number', label: 'Nº Equipe' },
    { key: 'team_name', label: 'Nome' },
    { key: 'status', label: 'Status' },
    { key: 'played', label: '🎮 Partidas' },
    { key: 'wins', label: '🏆 Vitórias' },
    { key: 'totalPts', label: '📊 Pts Total' },
    { key: 'classified', label: '✅ Class.' },
    { key: 'overflow', label: '🔄 Overflow' },
    { key: 'avgPts', label: '📈 Média/Pts' },
    { key: 'notes', label: 'Obs.' },
    { key: null, label: '' },
  ];

  return (
    <InternalPageLayout user={user} currentPage="InternalFTCTeams" title="FTC - Equipes">
      <div className="space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/30 rounded-2xl p-5">
          <h2 className="text-xl font-black text-orange-500 uppercase tracking-widest">GERENCIAMENTO DE EQUIPES</h2>
          <p className="text-[#B8BDC7] text-sm mt-1">FTC DECODE #17730 — As estatísticas são preenchidas automaticamente pelos scouts salvos.</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: teams.length, color: 'text-orange-400' },
            { label: 'Ativas', value: teams.filter(t => (t.status || 'Ativa') === 'Ativa').length, color: 'text-green-400' },
            { label: 'Desqualificadas', value: teams.filter(t => t.status === 'Desqualificada').length, color: 'text-red-400' },
            { label: 'Ausentes', value: teams.filter(t => t.status === 'Ausente').length, color: 'text-yellow-400' },
          ].map(s => (
            <div key={s.label} className="bg-[#111217] border border-[#1F222B] rounded-xl p-4 text-center">
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-[#B8BDC7] text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Add form */}
        <AddTeamForm onAdd={(d) => createTeam.mutate(d)} />

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B8BDC7]" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por nº ou nome da equipe..."
              className="w-full pl-9 pr-4 py-2 bg-[#111217] border border-[#1F222B] text-white rounded-lg text-sm focus:border-orange-500 outline-none" />
          </div>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="bg-[#111217] border border-[#1F222B] text-white rounded-lg px-3 py-2 text-sm focus:border-orange-500 outline-none">
            <option value="Todos">Todos os Status</option>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-[#111217] border border-[#1F222B] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1F222B] bg-[#0D0E13]">
                  {COLS.map(col => (
                    <th key={col.label} onClick={() => col.key && handleSort(col.key)}
                      className={`group text-left text-xs font-bold text-[#B8BDC7] uppercase tracking-wider py-3 px-3 ${col.key ? 'cursor-pointer hover:text-white select-none' : ''}`}>
                      {col.label}<SortIcon k={col.key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={11} className="text-center text-[#B8BDC7] py-10">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 opacity-50" />Carregando...
                  </td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-14">
                    <Users className="w-10 h-10 mx-auto mb-2 text-[#B8BDC7] opacity-20" />
                    <p className="text-[#B8BDC7] text-sm">{search || filterStatus !== 'Todos' ? 'Nenhuma equipe encontrada com os filtros aplicados.' : 'Nenhuma equipe cadastrada ainda.'}</p>
                  </td></tr>
                ) : paginated.map(team => (
                  <TeamRow key={team.id} team={team} matches={matches}
                    onSave={(id, data) => updateTeam.mutate({ id, data })}
                    onDelete={(id) => deleteTeam.mutate(id)} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#1F222B]">
              <span className="text-xs text-[#B8BDC7]">{filtered.length} equipe(s)</span>
              <div className="flex items-center gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 text-xs bg-[#1F222B] text-[#B8BDC7] rounded disabled:opacity-40 hover:text-white">← Ant.</button>
                <span className="text-xs text-white font-bold">{page} / {totalPages}</span>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 text-xs bg-[#1F222B] text-[#B8BDC7] rounded disabled:opacity-40 hover:text-white">Próx. →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </InternalPageLayout>
  );
}

export default function InternalFTCTeams() {
  return (
    <ProtectedRoute requireApproved={true}>
      <InternalFTCTeamsContent />
    </ProtectedRoute>
  );
}