import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList
} from 'recharts';
import { Plus, Search, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';

// ─── Config ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  no_prazo:  { label: 'No prazo',  color: '#4ade80', bg: 'bg-green-500/20',  text: 'text-green-400'  },
  atencao:   { label: 'Atenção',   color: '#fb923c', bg: 'bg-orange-500/20', text: 'text-orange-400' },
  atrasado:  { label: 'Atrasado',  color: '#f87171', bg: 'bg-red-500/20',    text: 'text-red-400'    },
  concluido: { label: 'Concluído', color: '#60a5fa', bg: 'bg-blue-500/20',   text: 'text-blue-400'   },
};

const ESG_THEME_CONFIG = {
  'Resíduos':   { emoji: '♻️', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  'Energia':    { emoji: '⚡', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  'Consumo':    { emoji: '🌊', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  'Pessoas':    { emoji: '👥', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  'Governança': { emoji: '🏛️', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
};

const EFFORT_CONFIG = {
  alto:  { label: 'Alto',  color: 'text-red-400' },
  médio: { label: 'Médio', color: 'text-yellow-400' },
  baixo: { label: 'Baixo', color: 'text-green-400' },
};

const EMPTY_PROJECT = { name: '', responsible: '', deadline: '', status: 'no_prazo', progress: 0 };
const EMPTY_ESG = { title: '', description: '', theme: 'Resíduos', effort: 'médio', horizon: 'médio prazo' };

// ─── Main ─────────────────────────────────────────────────────────────────────

function DashboardContent({ user }) {
  const [activeTab, setActiveTab] = useState('projects');
  const qc = useQueryClient();

  // ── Project state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [pForm, setPForm] = useState(EMPTY_PROJECT);

  // ── ESG state
  const [showESGForm, setShowESGForm] = useState(false);
  const [editingESG, setEditingESG] = useState(null);
  const [esgForm, setEsgForm] = useState(EMPTY_ESG);
  const [esgThemeFilter, setEsgThemeFilter] = useState('all');

  // ── Data
  const { data: projects = [] } = useQuery({
    queryKey: ['internal-projects'],
    queryFn: () => base44.entities.InternalProject.list('-created_date'),
  });
  const { data: esgItems = [] } = useQuery({
    queryKey: ['esg-initiatives'],
    queryFn: () => base44.entities.ESGInitiative.list('-created_date'),
  });

  // ── Mutations
  const createProject = useMutation({ mutationFn: d => base44.entities.InternalProject.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['internal-projects'] }); toast.success('Projeto criado!'); setShowInlineForm(false); } });
  const updateProject = useMutation({ mutationFn: ({ id, data }) => base44.entities.InternalProject.update(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['internal-projects'] }); toast.success('Atualizado!'); setShowInlineForm(false); setEditingProject(null); } });
  const createESG = useMutation({ mutationFn: d => base44.entities.ESGInitiative.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['esg-initiatives'] }); toast.success('Iniciativa criada!'); setShowESGForm(false); } });
  const updateESG = useMutation({ mutationFn: ({ id, data }) => base44.entities.ESGInitiative.update(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['esg-initiatives'] }); toast.success('Atualizado!'); setShowESGForm(false); setEditingESG(null); } });
  const deleteESG = useMutation({ mutationFn: id => base44.entities.ESGInitiative.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['esg-initiatives'] }); toast.success('Removido!'); } });

  // ── Derived
  const filteredProjects = useMemo(() =>
    projects.filter(p =>
      (statusFilter === 'all' || p.status === statusFilter) &&
      p.name?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [projects, statusFilter, searchTerm]);

  const avgProgress = projects.length ? Math.round(projects.reduce((a, p) => a + (p.progress || 0), 0) / projects.length) : 0;

  const statusChartData = Object.entries(STATUS_CONFIG).map(([k, v]) => ({
    name: v.label, total: projects.filter(p => p.status === k).length, color: v.color,
  }));

  const progressChartData = [...projects]
    .sort((a, b) => (a.progress || 0) - (b.progress || 0))
    .map(p => ({ name: p.name, progress: p.progress || 0, color: STATUS_CONFIG[p.status]?.color || '#6b7280' }));

  const filteredESG = esgThemeFilter === 'all' ? esgItems : esgItems.filter(e => e.theme === esgThemeFilter);
  const coveredThemes = new Set(esgItems.map(e => e.theme)).size;

  // ── Handlers
  const openNew = () => { setPForm(EMPTY_PROJECT); setEditingProject(null); setShowInlineForm(true); };
  const openEdit = (p) => { setPForm({ ...EMPTY_PROJECT, ...p }); setEditingProject(p); setShowInlineForm(true); };
  const cancelForm = () => { setShowInlineForm(false); setEditingProject(null); };
  const saveProject = () => {
    if (!pForm.name.trim()) { toast.error('Informe o nome'); return; }
    if (editingProject) updateProject.mutate({ id: editingProject.id, data: pForm });
    else createProject.mutate(pForm);
  };

  const openESGNew = () => { setEsgForm(EMPTY_ESG); setEditingESG(null); setShowESGForm(true); };
  const openESGEdit = (e) => { setEsgForm({ ...EMPTY_ESG, ...e }); setEditingESG(e); setShowESGForm(true); };
  const saveESG = () => {
    if (!esgForm.title.trim()) { toast.error('Informe o título'); return; }
    if (editingESG) updateESG.mutate({ id: editingESG.id, data: esgForm });
    else createESG.mutate(esgForm);
  };

  const fp = (f, v) => setPForm(p => ({ ...p, [f]: v }));
  const fe = (f, v) => setEsgForm(p => ({ ...p, [f]: v }));

  return (
    <InternalPageLayout user={user} currentPage="InternalProjectsDashboard" title="Projetos & ESG">
      <div className="max-w-4xl space-y-5">

        {/* Tab Nav */}
        <div className="flex gap-1 bg-[#0B0B0D] p-1 rounded-xl w-fit">
          {[{ key: 'projects', label: '📋 Gestão de Projetos' }, { key: 'esg', label: '🌱 Sustentabilidade (ESG)' }].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t.key ? 'bg-[#E10600] text-white' : 'text-[#B8BDC7] hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════ PROJECTS TAB ══════════════════════ */}
        {activeTab === 'projects' && (
          <div className="space-y-4">

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-[#B8BDC7]" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#111217] border border-[#1F222B] rounded-xl text-white text-sm placeholder:text-[#B8BDC7] focus:outline-none focus:border-[#E10600]"
                placeholder="Buscar projeto..." />
            </div>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-[#111217] border-[#1F222B] text-white rounded-xl h-11">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent className="bg-[#111217] border-[#1F222B] text-white [&_*]:text-white">
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* New button */}
            <button onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 border border-[#1F222B] rounded-lg text-sm text-white hover:border-[#E10600] transition-colors">
              <Plus className="w-4 h-4" /> Novo projeto
            </button>

            {/* Metric cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Projetos', value: projects.length },
                { label: 'Progresso médio', value: `${avgProgress}%` },
                { label: 'Concluídos', value: projects.filter(p => p.status === 'concluido').length },
                { label: 'Atrasados', value: projects.filter(p => p.status === 'atrasado').length },
              ].map(m => (
                <div key={m.label} className="bg-[#111217] border border-[#1F222B] rounded-xl p-5">
                  <p className="text-3xl font-black text-white">{m.value}</p>
                  <p className="text-sm text-[#B8BDC7] mt-1">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Project progress list */}
            <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-5 space-y-4">
              <p className="text-xs font-bold text-[#B8BDC7] uppercase tracking-widest">Andamento dos Projetos</p>

              {filteredProjects.length === 0 ? (
                <p className="text-[#B8BDC7] text-sm py-4 text-center">Nenhum projeto encontrado.</p>
              ) : filteredProjects.map(p => {
                const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.no_prazo;
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="text-white text-sm font-medium w-36 shrink-0 truncate">{p.name}</span>
                    <div className="flex-1 bg-[#1F222B] rounded-full h-2.5">
                      <div className="h-2.5 rounded-full transition-all" style={{ width: `${p.progress || 0}%`, backgroundColor: sc.color }} />
                    </div>
                    <span className="text-white text-sm font-semibold w-10 text-right shrink-0">{p.progress || 0}%</span>
                    <span className={`px-3 py-0.5 rounded-full text-xs font-semibold shrink-0 ${sc.bg} ${sc.text}`}>{sc.label}</span>
                    <button onClick={() => openEdit(p)}
                      className="px-3 py-1 text-xs font-medium border border-[#1F222B] rounded-lg text-[#B8BDC7] hover:text-white hover:border-white/30 transition-colors shrink-0">
                      Editar
                    </button>
                  </div>
                );
              })}

              {/* Inline form */}
              {showInlineForm && (
                <div className="mt-4 pt-4 border-t border-[#1F222B] space-y-3">
                  <input value={pForm.name} onChange={e => fp('name', e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0B0B0D] border border-[#1F222B] rounded-lg text-white text-sm placeholder:text-[#B8BDC7] focus:outline-none focus:border-[#E10600]"
                    placeholder="Nome do projeto" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" min={0} max={100} value={pForm.progress} onChange={e => fp('progress', Number(e.target.value))}
                      className="px-4 py-2.5 bg-[#0B0B0D] border border-[#1F222B] rounded-lg text-white text-sm placeholder:text-[#B8BDC7] focus:outline-none focus:border-[#E10600]"
                      placeholder="% concluído (0-100)" />
                    <Select value={pForm.status} onValueChange={v => fp('status', v)}>
                      <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B] text-white h-10 rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#111217] border-[#1F222B] text-white [&_*]:text-white">
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={pForm.responsible} onChange={e => fp('responsible', e.target.value)}
                      className="px-4 py-2.5 bg-[#0B0B0D] border border-[#1F222B] rounded-lg text-white text-sm placeholder:text-[#B8BDC7] focus:outline-none focus:border-[#E10600]"
                      placeholder="Responsável" />
                    <input value={pForm.deadline} onChange={e => fp('deadline', e.target.value)}
                      className="px-4 py-2.5 bg-[#0B0B0D] border border-[#1F222B] rounded-lg text-white text-sm placeholder:text-[#B8BDC7] focus:outline-none focus:border-[#E10600]"
                      placeholder="Prazo (ex: Jun/2025)" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={saveProject}
                      className="py-2.5 bg-[#1F222B] hover:bg-[#2a2d38] text-white text-sm font-medium rounded-lg transition-colors">
                      Salvar
                    </button>
                    <button onClick={cancelForm}
                      className="py-2.5 bg-[#1F222B] hover:bg-[#2a2d38] text-white text-sm font-medium rounded-lg transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Charts */}
            <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-5">
              <p className="text-xs font-bold text-[#B8BDC7] uppercase tracking-widest mb-2">Distribuição por Status</p>
              {/* Legend */}
              <div className="flex gap-4 mb-4 flex-wrap">
                {Object.values(STATUS_CONFIG).map(v => (
                  <span key={v.label} className="flex items-center gap-1.5 text-xs text-[#B8BDC7]">
                    <span className="w-3 h-3 rounded-sm inline-block" style={{ background: v.color }} />
                    {v.label}
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusChartData} barCategoryGap="30%">
                  <XAxis dataKey="name" tick={{ fill: '#B8BDC7', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#B8BDC7', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#111217', border: '1px solid #1F222B', color: '#fff', fontSize: 12 }} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={80}>
                    {statusChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-5">
              <p className="text-xs font-bold text-[#B8BDC7] uppercase tracking-widest mb-4">Progresso Médio por Projeto</p>
              <ResponsiveContainer width="100%" height={Math.max(180, progressChartData.length * 40)}>
                <BarChart data={progressChartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: '#B8BDC7', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#B8BDC7', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip contentStyle={{ background: '#111217', border: '1px solid #1F222B', color: '#fff', fontSize: 12 }} formatter={v => [`${v}%`, 'Progresso']} />
                  <Bar dataKey="progress" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {progressChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ══════════════════════ ESG TAB ══════════════════════ */}
        {activeTab === 'esg' && (
          <div className="space-y-5">

            {/* ESG metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Total de Iniciativas', value: esgItems.length },
                { label: 'Temas Cobertos', value: coveredThemes },
                { label: 'Curto Prazo', value: esgItems.filter(e => e.horizon === 'curto prazo').length },
              ].map(m => (
                <div key={m.label} className="bg-[#111217] border border-[#1F222B] rounded-xl p-5 flex items-center gap-3">
                  <Leaf className="w-7 h-7 text-green-400 shrink-0" />
                  <div>
                    <p className="text-2xl font-black text-white">{m.value}</p>
                    <p className="text-xs text-[#B8BDC7]">{m.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Theme filters + New */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setEsgThemeFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${esgThemeFilter === 'all' ? 'bg-[#E10600] text-white border-[#E10600]' : 'border-[#1F222B] text-[#B8BDC7] hover:text-white'}`}>
                  Todos
                </button>
                {Object.entries(ESG_THEME_CONFIG).map(([theme, cfg]) => (
                  <button key={theme} onClick={() => setEsgThemeFilter(theme)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${esgThemeFilter === theme ? 'bg-[#E10600] text-white border-[#E10600]' : 'border-[#1F222B] text-[#B8BDC7] hover:text-white'}`}>
                    {cfg.emoji} {theme}
                  </button>
                ))}
              </div>
              <button onClick={openESGNew}
                className="flex items-center gap-2 px-4 py-2 border border-[#1F222B] rounded-lg text-sm text-white hover:border-[#E10600] transition-colors">
                <Plus className="w-4 h-4" /> Nova Iniciativa
              </button>
            </div>

            {/* ESG inline form */}
            {showESGForm && (
              <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-5 space-y-3">
                <p className="text-sm font-semibold text-white">{editingESG ? 'Editar Iniciativa' : 'Nova Iniciativa ESG'}</p>
                <input value={esgForm.title} onChange={e => fe('title', e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0B0B0D] border border-[#1F222B] rounded-lg text-white text-sm placeholder:text-[#B8BDC7] focus:outline-none focus:border-[#E10600]"
                  placeholder="Título da iniciativa" />
                <textarea value={esgForm.description} onChange={e => fe('description', e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0B0B0D] border border-[#1F222B] rounded-lg text-white text-sm placeholder:text-[#B8BDC7] focus:outline-none focus:border-[#E10600] min-h-[70px] resize-none"
                  placeholder="Descrição (opcional)" />
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Tema', key: 'theme', options: Object.keys(ESG_THEME_CONFIG) },
                    { label: 'Esforço', key: 'effort', options: ['alto', 'médio', 'baixo'] },
                    { label: 'Prazo', key: 'horizon', options: ['curto prazo', 'médio prazo', 'longo prazo'] },
                  ].map(s => (
                    <Select key={s.key} value={esgForm[s.key]} onValueChange={v => fe(s.key, v)}>
                      <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B] text-white h-10 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#111217] border-[#1F222B] text-white [&_*]:text-white">
                        {s.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={saveESG} className="py-2.5 bg-[#1F222B] hover:bg-[#2a2d38] text-white text-sm font-medium rounded-lg transition-colors">Salvar</button>
                  <button onClick={() => { setShowESGForm(false); setEditingESG(null); }} className="py-2.5 bg-[#1F222B] hover:bg-[#2a2d38] text-white text-sm font-medium rounded-lg transition-colors">Cancelar</button>
                </div>
              </div>
            )}

            {/* ESG cards */}
            <div className="grid md:grid-cols-2 gap-4">
              {filteredESG.length === 0 ? (
                <div className="md:col-span-2 bg-[#111217] border border-[#1F222B] rounded-xl p-10 text-center text-[#B8BDC7]">Nenhuma iniciativa cadastrada.</div>
              ) : filteredESG.map(e => {
                const theme = ESG_THEME_CONFIG[e.theme] || { emoji: '🌱', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
                const effort = EFFORT_CONFIG[e.effort] || EFFORT_CONFIG.médio;
                return (
                  <div key={e.id} className="bg-[#111217] border border-[#1F222B] rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${theme.color}`}>{theme.emoji} {e.theme}</span>
                      <div className="flex gap-1">
                        <button onClick={() => openESGEdit(e)} className="text-xs text-[#B8BDC7] hover:text-white px-2 py-0.5 border border-[#1F222B] rounded-lg transition-colors">Editar</button>
                        <button onClick={() => deleteESG.mutate(e.id)} className="text-xs text-[#B8BDC7] hover:text-red-400 px-2 py-0.5 border border-[#1F222B] rounded-lg transition-colors">✕</button>
                      </div>
                    </div>
                    <h4 className="font-semibold text-white mb-1">{e.title}</h4>
                    {e.description && <p className="text-sm text-[#B8BDC7] mb-3 line-clamp-2">{e.description}</p>}
                    <div className="flex gap-3 text-xs flex-wrap">
                      <span className={effort.color}>⚡ Esforço {effort.label}</span>
                      <span className="text-[#B8BDC7]">🕐 {e.horizon}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </InternalPageLayout>
  );
}

export default function InternalProjectsDashboard() {
  return (
    <ProtectedRoute requireApproved={true}>
      <DashboardContent />
    </ProtectedRoute>
  );
}