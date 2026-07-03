import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Plus, Trash2, CheckCircle, Eye, AlertCircle,
  XCircle, ShieldCheck, Filter, Download, Save, Edit2, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import { jsPDF } from 'jspdf';

const DEFAULT_RISKS = [
  'Falta de kits de robótica',
  'Atraso nos treinos',
  'Ausência de professores ou monitores',
  'Falta de patrocínio',
  'Problemas com o local (escola ou shopping)',
  'Baixa adesão dos alunos',
  'Falta de autorização das famílias',
];

const LEVEL_MAP = {
  'Alto-Alto': { label: 'Crítico', color: 'bg-red-600', text: 'text-red-400', border: 'border-red-500' },
  'Alto-Médio': { label: 'Alto', color: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500' },
  'Médio-Alto': { label: 'Alto', color: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500' },
  'Médio-Médio': { label: 'Médio', color: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500' },
  'Alto-Baixo': { label: 'Médio', color: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500' },
  'Baixo-Alto': { label: 'Médio', color: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500' },
  'Médio-Baixo': { label: 'Baixo', color: 'bg-green-600', text: 'text-green-400', border: 'border-green-500' },
  'Baixo-Médio': { label: 'Baixo', color: 'bg-green-600', text: 'text-green-400', border: 'border-green-500' },
  'Baixo-Baixo': { label: 'Baixo', color: 'bg-green-600', text: 'text-green-400', border: 'border-green-500' },
};

const STATUS_CONFIG = {
  nao_ocorreu: { label: 'Não ocorreu', icon: CheckCircle, color: 'text-green-400' },
  em_atencao: { label: 'Em atenção', icon: AlertCircle, color: 'text-yellow-400' },
  ocorreu: { label: 'Ocorreu', icon: XCircle, color: 'text-red-400' },
  resolvido: { label: 'Resolvido', icon: ShieldCheck, color: 'text-blue-400' },
};

const getRiskLevel = (impact, probability) => {
  const key = `${impact}-${probability}`;
  return LEVEL_MAP[key] || { label: 'Baixo', color: 'bg-green-600', text: 'text-green-400', border: 'border-green-500' };
};

const MATRIX_CELLS = [
  // row = probability (top=Alto), col = impact (left=Baixo)
  // [prob, impact, matrixColor]
  ['Alto', 'Baixo', 'bg-yellow-500/30 border-yellow-500/30'],
  ['Alto', 'Médio', 'bg-orange-500/30 border-orange-500/30'],
  ['Alto', 'Alto', 'bg-red-600/40 border-red-600/40'],
  ['Médio', 'Baixo', 'bg-green-600/30 border-green-600/30'],
  ['Médio', 'Médio', 'bg-yellow-500/30 border-yellow-500/30'],
  ['Médio', 'Alto', 'bg-orange-500/30 border-orange-500/30'],
  ['Baixo', 'Baixo', 'bg-green-600/40 border-green-600/40'],
  ['Baixo', 'Médio', 'bg-green-600/30 border-green-600/30'],
  ['Baixo', 'Alto', 'bg-yellow-500/30 border-yellow-500/30'],
];

const EMPTY_FORM = {
  project: 'Interclasse 2026',
  title: '', cause: '', impact: 'Médio', probability: 'Médio',
  preventive_action: '', responsible: '',
  prevent_plan: '', mitigate_plan: '', plan_b: '',
  status: 'nao_ocorreu',
};

function RiskAnalysisContent({ user }) {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingRisk, setEditingRisk] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newRiskTitle, setNewRiskTitle] = useState('');
  const [showAddDefault, setShowAddDefault] = useState(false);

  const { data: risks = [], isLoading } = useQuery({
    queryKey: ['project-risks'],
    queryFn: () => base44.entities.ProjectRisk.filter({ project: 'Interclasse 2026' }, 'created_date'),
  });

  const createRisk = useMutation({
    mutationFn: (data) => base44.entities.ProjectRisk.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project-risks'] }); toast.success('Risco adicionado!'); },
  });

  const updateRisk = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectRisk.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project-risks'] }); toast.success('Risco atualizado!'); },
  });

  const deleteRisk = useMutation({
    mutationFn: (id) => base44.entities.ProjectRisk.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project-risks'] }); toast.success('Risco removido!'); },
  });

  const filteredRisks = useMemo(() =>
    statusFilter === 'all' ? risks : risks.filter(r => r.status === statusFilter),
    [risks, statusFilter]
  );

  const openEdit = (risk) => {
    setForm({ ...EMPTY_FORM, ...risk });
    setEditingRisk(risk);
    setShowForm(true);
  };

  const openNew = (title = '') => {
    setForm({ ...EMPTY_FORM, title });
    setEditingRisk(null);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) { toast.error('Informe o risco'); return; }
    if (editingRisk) {
      updateRisk.mutate({ id: editingRisk.id, data: form });
    } else {
      createRisk.mutate(form);
    }
    setShowForm(false);
    setEditingRisk(null);
  };

  const handleQuickStatus = (risk, status) => {
    updateRisk.mutate({ id: risk.id, data: { ...risk, status } });
  };

  const exportCSV = () => {
    const headers = ['Risco', 'Causa', 'Impacto', 'Probabilidade', 'Nível', 'Ação Preventiva', 'Responsável', 'Status'];
    const rows = risks.map(r => [
      r.title, r.cause || '', r.impact, r.probability,
      getRiskLevel(r.impact, r.probability).label,
      r.preventive_action || '', r.responsible || '',
      STATUS_CONFIG[r.status]?.label || r.status
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'riscos_interclasse_2026.csv'; a.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text('Análise de Risco — Interclasse 2026', 14, 20);
    doc.setFontSize(10);
    let y = 35;
    risks.forEach((r, i) => {
      if (y > 260) { doc.addPage(); y = 20; }
      const lvl = getRiskLevel(r.impact, r.probability).label;
      doc.setFont(undefined, 'bold');
      doc.text(`${i + 1}. ${r.title}`, 14, y); y += 6;
      doc.setFont(undefined, 'normal');
      doc.text(`Impacto: ${r.impact} | Probabilidade: ${r.probability} | Nível: ${lvl}`, 14, y); y += 6;
      if (r.responsible) { doc.text(`Responsável: ${r.responsible}`, 14, y); y += 6; }
      if (r.preventive_action) { doc.text(`Prevenção: ${r.preventive_action}`, 14, y); y += 6; }
      y += 4;
    });
    doc.save('riscos_interclasse_2026.pdf');
  };

  const f = (field, val) => setForm(p => ({ ...p, [field]: val }));

  return (
    <InternalPageLayout user={user} currentPage="InternalRiskAnalysis" title="Análise de Risco">
      <div className="space-y-8 max-w-6xl">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-[#E10600]" />
              Análise de Risco — Interclasse 2026
            </h2>
            <p className="text-[#B8BDC7] text-sm mt-1">Identifique, avalie e monitore os riscos do projeto</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={exportCSV} className="border-[#1F222B] text-[#B8BDC7] hover:text-white text-xs">
              <Download className="w-3.5 h-3.5 mr-1" /> Excel
            </Button>
            <Button variant="outline" onClick={exportPDF} className="border-[#1F222B] text-[#B8BDC7] hover:text-white text-xs">
              <Download className="w-3.5 h-3.5 mr-1" /> PDF
            </Button>
            <Button onClick={() => openNew()} className="bg-[#E10600] hover:bg-[#E10600]/90 text-sm">
              <Plus className="w-4 h-4 mr-1" /> Novo Risco
            </Button>
          </div>
        </div>

        {/* SEÇÃO 1 — Riscos Sugeridos */}
        <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-5">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Riscos Típicos — clique para adicionar
          </h3>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_RISKS.map(r => {
              const exists = risks.some(risk => risk.title === r);
              return (
                <button key={r} disabled={exists}
                  onClick={() => openNew(r)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-all ${exists
                    ? 'border-green-500/30 text-green-500/50 cursor-not-allowed bg-green-500/5'
                    : 'border-[#1F222B] text-[#B8BDC7] hover:border-[#E10600] hover:text-white cursor-pointer'}`}>
                  {exists ? '✓ ' : '+ '}{r}
                </button>
              );
            })}
          </div>
        </div>

        {/* SEÇÃO 2 — Tabela */}
        <div className="bg-[#111217] border border-[#1F222B] rounded-xl overflow-hidden">
          <div className="p-5 border-b border-[#1F222B] flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-bold text-white">Registro de Riscos ({risks.length})</h3>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#B8BDC7]" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-[#0B0B0D] border-[#1F222B] text-sm h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111217] border-[#1F222B]">
                  <SelectItem value="all">Todos os status</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-[#B8BDC7]">Carregando...</div>
          ) : filteredRisks.length === 0 ? (
            <div className="p-12 text-center text-[#B8BDC7]">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-[#1F222B]" />
              Nenhum risco cadastrado ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#0B0B0D]">
                  <tr>
                    {['Risco', 'Causa', 'Impacto', 'Probabilidade', 'Nível', 'Ação Preventiva', 'Responsável', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#B8BDC7] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F222B]">
                  {filteredRisks.map((risk) => {
                    const lvl = getRiskLevel(risk.impact, risk.probability);
                    const st = STATUS_CONFIG[risk.status] || STATUS_CONFIG.nao_ocorreu;
                    const StIcon = st.icon;
                    return (
                      <motion.tr key={risk.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="hover:bg-[#1F222B]/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-white max-w-[180px]">
                          <p className="line-clamp-2">{risk.title}</p>
                        </td>
                        <td className="px-4 py-3 text-[#B8BDC7] max-w-[140px]">
                          <p className="line-clamp-2">{risk.cause || '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            risk.impact === 'Alto' ? 'bg-red-500/20 text-red-400' :
                            risk.impact === 'Médio' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'}`}>
                            {risk.impact}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            risk.probability === 'Alto' ? 'bg-red-500/20 text-red-400' :
                            risk.probability === 'Médio' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'}`}>
                            {risk.probability}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold text-white ${lvl.color}`}>
                            {lvl.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#B8BDC7] max-w-[160px]">
                          <p className="line-clamp-2">{risk.preventive_action || '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-[#B8BDC7] whitespace-nowrap">{risk.responsible || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Select value={risk.status} onValueChange={(v) => handleQuickStatus(risk, v)}>
                            <SelectTrigger className="bg-transparent border-0 p-0 h-auto w-auto focus:ring-0">
                              <span className={`flex items-center gap-1 text-xs font-medium ${st.color}`}>
                                <StIcon className="w-3.5 h-3.5" /> {st.label}
                              </span>
                            </SelectTrigger>
                            <SelectContent className="bg-[#111217] border-[#1F222B]">
                              {Object.entries(STATUS_CONFIG).map(([k, v]) => {
                                const Ic = v.icon;
                                return (
                                  <SelectItem key={k} value={k}>
                                    <span className={`flex items-center gap-2 text-xs ${v.color}`}>
                                      <Ic className="w-3.5 h-3.5" /> {v.label}
                                    </span>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(risk)} className="h-7 w-7 text-[#B8BDC7] hover:text-white">
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteRisk.mutate(risk.id)} className="h-7 w-7 text-[#B8BDC7] hover:text-red-500">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SEÇÃO 3 — Matriz Visual */}
        <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-5">
          <h3 className="font-bold text-white mb-4">Matriz de Risco</h3>
          <div className="flex gap-4 items-start">
            {/* Y label */}
            <div className="flex flex-col justify-center items-center" style={{ height: 192 }}>
              <span className="text-[#B8BDC7] text-xs -rotate-90 whitespace-nowrap select-none">Probabilidade →</span>
            </div>
            <div className="flex-1">
              {/* Column headers */}
              <div className="grid grid-cols-3 gap-1 mb-1 ml-0">
                {['Baixo', 'Médio', 'Alto'].map(h => (
                  <div key={h} className="text-center text-xs text-[#B8BDC7] font-semibold">{h}</div>
                ))}
              </div>
              {/* X label */}
              <div className="text-center text-xs text-[#B8BDC7] mb-2 select-none">← Impacto →</div>
              {/* Matrix rows: Alto / Médio / Baixo probability */}
              {['Alto', 'Médio', 'Baixo'].map(prob => (
                <div key={prob} className="grid grid-cols-3 gap-1 mb-1">
                  {['Baixo', 'Médio', 'Alto'].map(imp => {
                    const cell = MATRIX_CELLS.find(c => c[0] === prob && c[1] === imp);
                    const cellRisks = risks.filter(r => r.probability === prob && r.impact === imp);
                    return (
                      <div key={imp} className={`border rounded-lg p-2 min-h-[60px] ${cell?.[2] || 'bg-[#0B0B0D] border-[#1F222B]'}`}>
                        <div className="flex flex-wrap gap-1">
                          {cellRisks.map(r => (
                            <span key={r.id} title={r.title}
                              className="bg-black/40 text-white text-[10px] px-1.5 py-0.5 rounded max-w-[80px] truncate block cursor-pointer"
                              onClick={() => openEdit(r)}>
                              {r.title.length > 12 ? r.title.slice(0, 12) + '…' : r.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              {/* Legend */}
              <div className="flex gap-3 mt-3 flex-wrap">
                {[
                  { color: 'bg-red-600', label: 'Crítico' },
                  { color: 'bg-orange-500', label: 'Alto' },
                  { color: 'bg-yellow-500', label: 'Moderado' },
                  { color: 'bg-green-600', label: 'Baixo' },
                ].map(l => (
                  <span key={l.label} className="flex items-center gap-1.5 text-xs text-[#B8BDC7]">
                    <span className={`w-3 h-3 rounded ${l.color}`} /> {l.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SEÇÃO 4 — Plano de Resposta */}
        {risks.length > 0 && (
          <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-5">
            <h3 className="font-bold text-white mb-4">Plano de Resposta</h3>
            <div className="space-y-4">
              {risks.map(risk => {
                const lvl = getRiskLevel(risk.impact, risk.probability);
                return (
                  <div key={risk.id} className={`border rounded-lg p-4 ${lvl.border} bg-[#0B0B0D]`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${lvl.color}`}>{lvl.label}</span>
                      <span className="font-semibold text-white">{risk.title}</span>
                    </div>
                    <div className="grid md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-green-400 font-medium mb-1 text-xs uppercase tracking-wide">🛡️ Prevenir</p>
                        <p className="text-[#B8BDC7]">{risk.prevent_plan || <span className="italic opacity-50">Não definido</span>}</p>
                      </div>
                      <div>
                        <p className="text-yellow-400 font-medium mb-1 text-xs uppercase tracking-wide">⚠️ Mitigar</p>
                        <p className="text-[#B8BDC7]">{risk.mitigate_plan || <span className="italic opacity-50">Não definido</span>}</p>
                      </div>
                      <div>
                        <p className="text-orange-400 font-medium mb-1 text-xs uppercase tracking-wide">🔄 Plano B</p>
                        <p className="text-[#B8BDC7]">{risk.plan_b || <span className="italic opacity-50">Não definido</span>}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SEÇÃO 5 — Monitoramento stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(STATUS_CONFIG).map(([k, v]) => {
            const count = risks.filter(r => r.status === k).length;
            const Icon = v.icon;
            return (
              <div key={k} className="bg-[#111217] border border-[#1F222B] rounded-xl p-4 flex items-center gap-3">
                <Icon className={`w-8 h-8 ${v.color}`} />
                <div>
                  <p className="text-2xl font-black text-white">{count}</p>
                  <p className="text-xs text-[#B8BDC7]">{v.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dialog — Criar/Editar */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditingRisk(null); } }}>
        <DialogContent className="bg-[#111217] border-[#1F222B] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRisk ? 'Editar Risco' : 'Novo Risco'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs text-[#B8BDC7] uppercase tracking-wider">Risco *</label>
              <Input value={form.title} onChange={e => f('title', e.target.value)}
                className="bg-[#0B0B0D] border-[#1F222B] text-white mt-1" placeholder="Descreva o risco" />
            </div>
            <div>
              <label className="text-xs text-[#B8BDC7] uppercase tracking-wider">Causa</label>
              <Input value={form.cause} onChange={e => f('cause', e.target.value)}
                className="bg-[#0B0B0D] border-[#1F222B] text-white mt-1" placeholder="O que pode causar este risco?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#B8BDC7] uppercase tracking-wider">Impacto</label>
                <Select value={form.impact} onValueChange={v => f('impact', v)}>
                  <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B] text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#111217] border-[#1F222B]">
                    {['Baixo', 'Médio', 'Alto'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-[#B8BDC7] uppercase tracking-wider">Probabilidade</label>
                <Select value={form.probability} onValueChange={v => f('probability', v)}>
                  <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B] text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#111217] border-[#1F222B]">
                    {['Baixo', 'Médio', 'Alto'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Nível calculado */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#0B0B0D] border border-[#1F222B]">
              <span className="text-xs text-[#B8BDC7]">Nível de Risco:</span>
              <span className={`px-3 py-1 rounded text-xs font-bold text-white ${getRiskLevel(form.impact, form.probability).color}`}>
                {getRiskLevel(form.impact, form.probability).label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#B8BDC7] uppercase tracking-wider">Ação Preventiva</label>
                <Input value={form.preventive_action} onChange={e => f('preventive_action', e.target.value)}
                  className="bg-[#0B0B0D] border-[#1F222B] text-white mt-1" placeholder="Ação para prevenir" />
              </div>
              <div>
                <label className="text-xs text-[#B8BDC7] uppercase tracking-wider">Responsável</label>
                <Input value={form.responsible} onChange={e => f('responsible', e.target.value)}
                  className="bg-[#0B0B0D] border-[#1F222B] text-white mt-1" placeholder="Nome do responsável" />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#B8BDC7] uppercase tracking-wider">🛡️ Como Prevenir</label>
              <Textarea value={form.prevent_plan} onChange={e => f('prevent_plan', e.target.value)}
                className="bg-[#0B0B0D] border-[#1F222B] text-white mt-1 min-h-[70px]" placeholder="Descreva como evitar que ocorra..." />
            </div>
            <div>
              <label className="text-xs text-[#B8BDC7] uppercase tracking-wider">⚠️ Como Mitigar</label>
              <Textarea value={form.mitigate_plan} onChange={e => f('mitigate_plan', e.target.value)}
                className="bg-[#0B0B0D] border-[#1F222B] text-white mt-1 min-h-[70px]" placeholder="Como reduzir o impacto se ocorrer..." />
            </div>
            <div>
              <label className="text-xs text-[#B8BDC7] uppercase tracking-wider">🔄 Plano B</label>
              <Textarea value={form.plan_b} onChange={e => f('plan_b', e.target.value)}
                className="bg-[#0B0B0D] border-[#1F222B] text-white mt-1 min-h-[70px]" placeholder="O que fazer se o risco ocorrer..." />
            </div>
            <div>
              <label className="text-xs text-[#B8BDC7] uppercase tracking-wider">Status</label>
              <Select value={form.status} onValueChange={v => f('status', v)}>
                <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B] text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#111217] border-[#1F222B]">
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingRisk(null); }} className="flex-1 border-[#1F222B]">
                Cancelar
              </Button>
              <Button onClick={handleSave} className="flex-1 bg-[#E10600] hover:bg-[#E10600]/90">
                <Save className="w-4 h-4 mr-2" /> Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </InternalPageLayout>
  );
}

export default function InternalRiskAnalysis() {
  return (
    <ProtectedRoute requireApproved={true}>
      <RiskAnalysisContent />
    </ProtectedRoute>
  );
}