import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import {
  Users, Image, BookOpen, Plus, Trash2, Edit2,
  Save, X, Upload, ArrowLeft, Zap, Check, Lock
} from 'lucide-react';
import { Link } from 'react-router-dom';

const TABS = [
  { id: 'equipes', label: 'Equipes', icon: Users },
  { id: 'regras', label: 'Regras', icon: BookOpen },
  { id: 'galeria', label: 'Galeria', icon: Image },
];

export default function TIRAdmin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('equipes');

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        const me = await base44.auth.me();
        setUser(me);
      }
      setLoading(false);
    });
  }, []);

  const isAdmin = user && (user.role === 'admin' || user.member_role === 'admin' || user.member_role === 'member');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B14] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#070B14] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-[#0D1526] border border-green-500/20 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-green-400" />
          </div>
          <h1 className="text-xl font-black text-white mb-2">Acesso Restrito</h1>
          <p className="text-gray-500 text-sm mb-6">Faça login para acessar o painel administrativo do TIR 2026.</p>
          <button
            onClick={() => base44.auth.redirectToLogin(window.location.pathname)}
            className="w-full py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-xl transition-colors text-sm">
            Fazer Login
          </button>
          <div className="mt-4">
            <Link to="/TIR2026" className="text-xs text-gray-600 hover:text-green-500 flex items-center justify-center gap-1 transition-colors">
              <ArrowLeft className="w-3 h-3" /> Voltar ao TIR 2026
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#070B14] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-[#0D1526] border border-red-500/20 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-xl font-black text-white mb-2">Sem Permissão</h1>
          <p className="text-gray-500 text-sm mb-6">Você não tem permissão para acessar este painel. Apenas membros com acesso à área interna podem gerenciar o TIR.</p>
          <Link to="/TIR2026"
            className="inline-flex items-center gap-2 text-green-400 text-sm hover:text-green-300 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar ao TIR 2026
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B14] text-white">
      {/* Header */}
      <header className="border-b border-green-500/10 bg-[#0D1526]/80 sticky top-0 z-40 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-green-400" />
            <span className="font-black text-white">TIR 2026 <span className="text-green-400">Admin</span></span>
            <span className="text-xs text-gray-500">— {user.full_name}</span>
          </div>
          <Link to="/TIR2026" className="text-xs text-gray-400 hover:text-green-400 flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Ver site
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 flex">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${tab === t.id ? 'border-green-400 text-green-400' : 'border-transparent text-gray-500 hover:text-white'}`}>
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {tab === 'equipes' && <EquipesAdmin />}
        {tab === 'regras' && <RegrasAdmin />}
        {tab === 'galeria' && <GaleriaAdmin />}
      </div>
    </div>
  );
}

/* ────────────────────────────── EQUIPES ────────────────────────────── */
function EquipesAdmin() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ nome: '', ano: '', sala: '', logo_url: '' });
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data: equipes = [] } = useQuery({
    queryKey: ['tir-equipes'],
    queryFn: () => base44.entities.TIREquipe.list('ordem'),
    initialData: [],
  });

  const criar = useMutation({
    mutationFn: d => base44.entities.TIREquipe.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tir-equipes'] }); resetForm(); },
  });
  const atualizar = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TIREquipe.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tir-equipes'] }); setEditing(null); },
  });
  const deletar = useMutation({
    mutationFn: id => base44.entities.TIREquipe.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tir-equipes'] }),
  });

  const resetForm = () => setForm({ nome: '', ano: '', sala: '', logo_url: '' });

  const handleUpload = async (e, setter) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setter(prev => ({ ...prev, logo_url: file_url }));
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) atualizar.mutate({ id: editing.id, data: editing });
    else criar.mutate(form);
  };

  const currentForm = editing || form;
  const setCurrentForm = editing ? setEditing : setForm;

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="bg-[#0D1526] border border-green-500/10 rounded-2xl p-6">
        <h2 className="font-black text-white mb-5 flex items-center gap-2">
          {editing ? <><Edit2 className="w-4 h-4 text-green-400" /> Editar Equipe</> : <><Plus className="w-4 h-4 text-green-400" /> Nova Equipe</>}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nome da Equipe *" value={currentForm.nome} onChange={v => setCurrentForm(p => ({ ...p, nome: v }))} placeholder="Ex: Iron Tech" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ano Escolar *" value={currentForm.ano} onChange={v => setCurrentForm(p => ({ ...p, ano: v }))} placeholder="Ex: 6º Ano" />
            <Field label="Sala *" value={currentForm.sala} onChange={v => setCurrentForm(p => ({ ...p, sala: v }))} placeholder="Ex: A" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Logo da Equipe</label>
            <input type="file" accept="image/*" onChange={e => handleUpload(e, setCurrentForm)}
              className="w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:border-0 file:bg-green-500/10 file:text-green-400 file:rounded-lg file:text-xs file:font-bold cursor-pointer" />
            {uploading && <p className="text-xs text-green-400 mt-1">Enviando...</p>}
            {currentForm.logo_url && <img src={currentForm.logo_url} alt="preview" className="w-12 h-12 rounded-full object-cover mt-2 border border-green-500/30" />}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={!currentForm.nome || !currentForm.ano || !currentForm.sala}
              className="flex-1 py-2.5 bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> {editing ? 'Salvar' : 'Criar Equipe'}
            </button>
            {editing && (
              <button type="button" onClick={() => setEditing(null)}
                className="px-4 py-2.5 border border-white/10 text-gray-400 hover:text-white rounded-xl text-sm transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="space-y-3">
        <h2 className="font-black text-sm uppercase tracking-wider text-gray-400">{equipes.length} Equipe(s)</h2>
        {equipes.map(eq => (
          <div key={eq.id} className="bg-[#0D1526] border border-green-500/10 rounded-xl p-4 flex items-center gap-4">
            {eq.logo_url
              ? <img src={eq.logo_url} alt={eq.nome} className="w-10 h-10 rounded-full object-cover border border-green-500/30 flex-shrink-0" />
              : <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0"><Users className="w-4 h-4 text-green-500/50" /></div>
            }
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm">{eq.nome}</p>
              <p className="text-xs text-green-400">{eq.ano} — Sala {eq.sala}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => setEditing({ ...eq })} className="p-2 text-gray-400 hover:text-green-400 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => deletar.mutate(eq.id)} className="p-2 text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
        {equipes.length === 0 && <p className="text-gray-600 text-sm text-center py-8">Nenhuma equipe ainda.</p>}
      </div>
    </div>
  );
}

/* ────────────────────────────── REGRAS ────────────────────────────── */
function RegrasAdmin() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ titulo: '', conteudo: '', ordem: 0 });
  const [editing, setEditing] = useState(null);

  const { data: regras = [] } = useQuery({
    queryKey: ['tir-regras'],
    queryFn: () => base44.entities.TIRRegra.list('ordem'),
    initialData: [],
  });

  const criar = useMutation({
    mutationFn: d => base44.entities.TIRRegra.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tir-regras'] }); setForm({ titulo: '', conteudo: '', ordem: 0 }); },
  });
  const atualizar = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TIRRegra.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tir-regras'] }); setEditing(null); },
  });
  const deletar = useMutation({
    mutationFn: id => base44.entities.TIRRegra.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tir-regras'] }),
  });

  const current = editing || form;
  const setCurrent = editing ? setEditing : setForm;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) atualizar.mutate({ id: editing.id, data: editing });
    else criar.mutate(form);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="bg-[#0D1526] border border-green-500/10 rounded-2xl p-6">
        <h2 className="font-black text-white mb-5 flex items-center gap-2">
          {editing ? <><Edit2 className="w-4 h-4 text-green-400" /> Editar Seção</> : <><Plus className="w-4 h-4 text-green-400" /> Nova Seção de Regras</>}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Título da seção *" value={current.titulo} onChange={v => setCurrent(p => ({ ...p, titulo: v }))} placeholder="Ex: Regulamento Geral" />
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Conteúdo *</label>
            <textarea value={current.conteudo} onChange={e => setCurrent(p => ({ ...p, conteudo: e.target.value }))}
              rows={8} placeholder="Escreva o conteúdo aqui. Você pode usar HTML básico como <b>, <ul>, <li>..."
              className="w-full px-4 py-3 bg-[#070B14] border border-green-500/20 focus:border-green-500/50 rounded-xl text-white placeholder-gray-600 focus:outline-none text-sm resize-y font-mono" />
            <p className="text-xs text-gray-600 mt-1">Suporta HTML: &lt;b&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;p&gt;, &lt;h3&gt;, etc.</p>
          </div>
          <Field label="Ordem de exibição" value={String(current.ordem)} onChange={v => setCurrent(p => ({ ...p, ordem: Number(v) }))} placeholder="0" type="number" />
          <div className="flex gap-2">
            <button type="submit" disabled={!current.titulo || !current.conteudo}
              className="flex-1 py-2.5 bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> {editing ? 'Salvar' : 'Publicar'}
            </button>
            {editing && (
              <button type="button" onClick={() => setEditing(null)}
                className="px-4 py-2.5 border border-white/10 text-gray-400 hover:text-white rounded-xl text-sm transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="space-y-3">
        <h2 className="font-black text-sm uppercase tracking-wider text-gray-400">{regras.length} Seção(ões)</h2>
        {regras.map(r => (
          <div key={r.id} className="bg-[#0D1526] border border-green-500/10 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm">{r.titulo}</p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: r.conteudo }} />
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => setEditing({ ...r })} className="p-2 text-gray-400 hover:text-green-400 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => deletar.mutate(r.id)} className="p-2 text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
        {regras.length === 0 && <p className="text-gray-600 text-sm text-center py-8">Nenhuma seção ainda.</p>}
      </div>
    </div>
  );
}

/* ────────────────────────────── GALERIA ────────────────────────────── */
function GaleriaAdmin() {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ foto_url: '', equipes_ids: [], equipes_nomes: [], legenda: '' });
  const [selectedEq, setSelectedEq] = useState([]);

  const { data: equipes = [] } = useQuery({
    queryKey: ['tir-equipes'],
    queryFn: () => base44.entities.TIREquipe.list('ordem'),
    initialData: [],
  });

  const { data: fotos = [] } = useQuery({
    queryKey: ['tir-fotos'],
    queryFn: () => base44.entities.TIRFoto.list('-created_date'),
    initialData: [],
  });

  const criar = useMutation({
    mutationFn: d => base44.entities.TIRFoto.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tir-fotos'] }); setForm({ foto_url: '', equipes_ids: [], equipes_nomes: [], legenda: '' }); setSelectedEq([]); },
  });

  const deletar = useMutation({
    mutationFn: id => base44.entities.TIRFoto.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tir-fotos'] }),
  });

  const handleUploadFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, foto_url: file_url }));
    setUploading(false);
  };

  const toggleEq = (eq) => {
    setSelectedEq(prev => {
      const exists = prev.find(e => e.id === eq.id);
      if (exists) return prev.filter(e => e.id !== eq.id);
      return [...prev, eq];
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.foto_url) return;
    criar.mutate({ ...form, equipes_ids: selectedEq.map(e => e.id), equipes_nomes: selectedEq.map(e => e.nome) });
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="bg-[#0D1526] border border-green-500/10 rounded-2xl p-6">
        <h2 className="font-black text-white mb-5 flex items-center gap-2">
          <Upload className="w-4 h-4 text-green-400" /> Upload de Foto
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Foto *</label>
            <input type="file" accept="image/*" onChange={handleUploadFoto}
              className="w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:border-0 file:bg-green-500/10 file:text-green-400 file:rounded-lg file:text-xs file:font-bold cursor-pointer" />
            {uploading && <p className="text-xs text-green-400 mt-1">Enviando...</p>}
            {form.foto_url && <img src={form.foto_url} alt="preview" className="mt-2 rounded-xl w-full max-h-40 object-cover border border-green-500/20" />}
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Vincular às equipes</label>
            <div className="flex flex-wrap gap-2">
              {equipes.map(eq => {
                const sel = selectedEq.find(e => e.id === eq.id);
                return (
                  <button key={eq.id} type="button" onClick={() => toggleEq(eq)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${sel ? 'bg-green-500 border-green-400 text-black' : 'bg-transparent border-white/10 text-gray-400 hover:border-green-500/40'}`}>
                    {sel && <Check className="w-3 h-3" />}
                    {eq.nome}
                  </button>
                );
              })}
              {equipes.length === 0 && <p className="text-xs text-gray-600">Nenhuma equipe cadastrada.</p>}
            </div>
          </div>
          <Field label="Legenda (opcional)" value={form.legenda} onChange={v => setForm(p => ({ ...p, legenda: v }))} placeholder="Opcional" />
          <button type="submit" disabled={!form.foto_url || uploading}
            className="w-full py-2.5 bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            <Upload className="w-4 h-4" /> Publicar Foto
          </button>
        </form>
      </div>

      <div>
        <h2 className="font-black text-sm uppercase tracking-wider text-gray-400 mb-3">{fotos.length} Foto(s)</h2>
        <div className="grid grid-cols-3 gap-2">
          {fotos.map(f => (
            <div key={f.id} className="relative group rounded-xl overflow-hidden aspect-square bg-[#0D1526]">
              <img src={f.foto_url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button onClick={() => deletar.mutate(f.id)} className="p-2 bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>
              {(f.equipes_nomes || []).length > 0 && (
                <div className="absolute bottom-1 left-1 right-1 flex flex-wrap gap-0.5">
                  {(f.equipes_nomes || []).slice(0, 2).map(n => (
                    <span key={n} className="bg-green-500 text-black text-[8px] font-bold px-1.5 py-0.5 rounded-full truncate max-w-full">{n}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        {fotos.length === 0 && <p className="text-gray-600 text-sm text-center py-8">Nenhuma foto ainda.</p>}
      </div>
    </div>
  );
}

/* ────────────────────────────── HELPERS ────────────────────────────── */
function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-2.5 bg-[#070B14] border border-green-500/20 focus:border-green-500/50 rounded-xl text-white placeholder-gray-600 focus:outline-none text-sm transition-colors" />
    </div>
  );
}