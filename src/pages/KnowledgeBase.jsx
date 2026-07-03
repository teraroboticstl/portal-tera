import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Plus, Trash2, Save, ChevronDown, ChevronUp, Users, Trophy, Handshake, History } from 'lucide-react';

function KnowledgeBaseContent({ user }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    team_name: '', team_number_frc: '', team_number_ftc: '',
    founded_date: '', school_org: '', city_state: '',
    modalities: [], website: '', social_media: '',
    competition_history: [], current_members: [],
    sponsors: [], achievements: [], extra_info: ''
  });
  const [recordId, setRecordId] = useState(null);
  const [expandedSections, setExpandedSections] = useState({ geral: true, history: false, members: false, sponsors: false, achievements: false });

  useEffect(() => {
    base44.entities.TeamKnowledgeBase.list().then(data => {
      if (data && data.length > 0) {
        const r = data[0];
        setRecordId(r.id);
        setForm({
          team_name: r.team_name || '',
          team_number_frc: r.team_number_frc || '',
          team_number_ftc: r.team_number_ftc || '',
          founded_date: r.founded_date || '',
          school_org: r.school_org || '',
          city_state: r.city_state || '',
          modalities: r.modalities || [],
          website: r.website || '',
          social_media: r.social_media || '',
          competition_history: r.competition_history || [],
          current_members: r.current_members || [],
          sponsors: r.sponsors || [],
          achievements: r.achievements || [],
          extra_info: r.extra_info || ''
        });
      }
      setLoading(false);
    });
  }, []);

  const toggleSection = (s) => setExpandedSections(p => ({ ...p, [s]: !p[s] }));

  const toggleModality = (m) => {
    setForm(f => ({
      ...f,
      modalities: f.modalities.includes(m) ? f.modalities.filter(x => x !== m) : [...f.modalities, m]
    }));
  };

  const save = async () => {
    setSaving(true);
    if (recordId) {
      await base44.entities.TeamKnowledgeBase.update(recordId, form);
    } else {
      const r = await base44.entities.TeamKnowledgeBase.create(form);
      setRecordId(r.id);
    }
    setSaving(false);
  };

  // Generic list helpers
  const addItem = (field, template) => setForm(f => ({ ...f, [field]: [...f[field], template] }));
  const removeItem = (field, i) => setForm(f => ({ ...f, [field]: f[field].filter((_, idx) => idx !== i) }));
  const updateItem = (field, i, key, val) => setForm(f => {
    const arr = [...f[field]];
    arr[i] = { ...arr[i], [key]: val };
    return { ...f, [field]: arr };
  });

  const SectionHeader = ({ label, icon: Icon, sectionKey }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className="w-full flex items-center justify-between px-4 py-3 bg-[#1F222B] rounded-xl text-white font-semibold text-sm hover:bg-[#272a33] transition-colors"
    >
      <div className="flex items-center gap-2"><Icon className="w-4 h-4 text-[#E10600]" />{label}</div>
      {expandedSections[sectionKey] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
    </button>
  );

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-[#E10600]" />
          <h1 className="text-2xl font-bold text-white">Base de Conhecimento</h1>
        </div>
        <Button onClick={save} disabled={saving} className="bg-[#E10600] hover:bg-[#E10600]/80 text-white flex items-center gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
      <p className="text-gray-400 text-sm">Informações da equipe usadas pelo TerAI como contexto.</p>

      {/* Seção Geral */}
      <div className="space-y-3">
        <SectionHeader label="Informações Gerais" icon={BookOpen} sectionKey="geral" />
        {expandedSections.geral && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-1">
            {[
              { label: 'Nome da Equipe', key: 'team_name' },
              { label: 'Número FRC', key: 'team_number_frc' },
              { label: 'Número FTC', key: 'team_number_ftc' },
              { label: 'Escola/Organização', key: 'school_org' },
              { label: 'Cidade/Estado', key: 'city_state' },
              { label: 'Data de Fundação', key: 'founded_date', type: 'date' },
              { label: 'Site', key: 'website' },
              { label: 'Redes Sociais', key: 'social_media' },
            ].map(({ label, key, type }) => (
              <div key={key} className="space-y-1">
                <label className="text-xs text-gray-400">{label}</label>
                <Input
                  type={type || 'text'}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="bg-[#1F222B] border-[#2a2d36] text-white"
                />
              </div>
            ))}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs text-gray-400">Modalidades</label>
              <div className="flex gap-2">
                {['FRC', 'FTC', 'FLL'].map(m => (
                  <button
                    key={m}
                    onClick={() => toggleModality(m)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${form.modalities.includes(m) ? 'bg-[#E10600] border-[#E10600] text-white' : 'bg-[#1F222B] border-[#2a2d36] text-gray-400 hover:text-white'}`}
                  >{m}</button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs text-gray-400">Informações Extras</label>
              <Textarea value={form.extra_info} onChange={e => setForm(f => ({ ...f, extra_info: e.target.value }))} rows={3} className="bg-[#1F222B] border-[#2a2d36] text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Histórico de Competições */}
      <div className="space-y-3">
        <SectionHeader label="Histórico de Competições" icon={History} sectionKey="history" />
        {expandedSections.history && (
          <div className="space-y-3 px-1">
            {form.competition_history.map((c, i) => (
              <div key={i} className="bg-[#1F222B] rounded-xl p-3 grid grid-cols-2 gap-2 relative">
                <button onClick={() => removeItem('competition_history', i)} className="absolute top-2 right-2 text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                {[['Ano', 'year'], ['Jogo', 'game'], ['Resultados', 'results'], ['Prêmios', 'awards']].map(([label, key]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[10px] text-gray-500">{label}</label>
                    <Input value={c[key] || ''} onChange={e => updateItem('competition_history', i, key, e.target.value)} className="bg-[#111217] border-[#2a2d36] text-white text-xs h-8" />
                  </div>
                ))}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addItem('competition_history', { year: '', game: '', results: '', awards: '' })} className="border-dashed border-[#2a2d36] text-gray-400 hover:text-white w-full">
              <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Temporada
            </Button>
          </div>
        )}
      </div>

      {/* Membros */}
      <div className="space-y-3">
        <SectionHeader label="Membros Atuais" icon={Users} sectionKey="members" />
        {expandedSections.members && (
          <div className="space-y-3 px-1">
            {form.current_members.map((m, i) => (
              <div key={i} className="bg-[#1F222B] rounded-xl p-3 grid grid-cols-3 gap-2 relative">
                <button onClick={() => removeItem('current_members', i)} className="absolute top-2 right-2 text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                {[['Nome', 'name'], ['Função', 'role'], ['Subequipe', 'subteam']].map(([label, key]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[10px] text-gray-500">{label}</label>
                    <Input value={m[key] || ''} onChange={e => updateItem('current_members', i, key, e.target.value)} className="bg-[#111217] border-[#2a2d36] text-white text-xs h-8" />
                  </div>
                ))}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addItem('current_members', { name: '', role: '', subteam: '' })} className="border-dashed border-[#2a2d36] text-gray-400 hover:text-white w-full">
              <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Membro
            </Button>
          </div>
        )}
      </div>

      {/* Patrocinadores */}
      <div className="space-y-3">
        <SectionHeader label="Patrocinadores" icon={Handshake} sectionKey="sponsors" />
        {expandedSections.sponsors && (
          <div className="space-y-3 px-1">
            {form.sponsors.map((s, i) => (
              <div key={i} className="bg-[#1F222B] rounded-xl p-3 grid grid-cols-2 gap-2 relative">
                <button onClick={() => removeItem('sponsors', i)} className="absolute top-2 right-2 text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500">Nome</label>
                  <Input value={s.name || ''} onChange={e => updateItem('sponsors', i, 'name', e.target.value)} className="bg-[#111217] border-[#2a2d36] text-white text-xs h-8" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500">Nível</label>
                  <select value={s.level || 'bronze'} onChange={e => updateItem('sponsors', i, 'level', e.target.value)}
                    className="w-full h-8 bg-[#111217] border border-[#2a2d36] text-white text-xs rounded-md px-2">
                    <option value="ouro">Ouro</option>
                    <option value="prata">Prata</option>
                    <option value="bronze">Bronze</option>
                  </select>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addItem('sponsors', { name: '', level: 'bronze' })} className="border-dashed border-[#2a2d36] text-gray-400 hover:text-white w-full">
              <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Patrocinador
            </Button>
          </div>
        )}
      </div>

      {/* Conquistas */}
      <div className="space-y-3">
        <SectionHeader label="Conquistas e Prêmios" icon={Trophy} sectionKey="achievements" />
        {expandedSections.achievements && (
          <div className="space-y-3 px-1">
            {form.achievements.map((a, i) => (
              <div key={i} className="bg-[#1F222B] rounded-xl p-3 grid grid-cols-3 gap-2 relative">
                <button onClick={() => removeItem('achievements', i)} className="absolute top-2 right-2 text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                {[['Prêmio', 'award'], ['Ano', 'year'], ['Competição', 'competition']].map(([label, key]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[10px] text-gray-500">{label}</label>
                    <Input value={a[key] || ''} onChange={e => updateItem('achievements', i, key, e.target.value)} className="bg-[#111217] border-[#2a2d36] text-white text-xs h-8" />
                  </div>
                ))}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addItem('achievements', { award: '', year: '', competition: '' })} className="border-dashed border-[#2a2d36] text-gray-400 hover:text-white w-full">
              <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Conquista
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function KnowledgeBase() {
  return (
    <ProtectedRoute requireAdmin>
      <InternalPageLayout currentPageName="KnowledgeBase">
        <KnowledgeBaseContent />
      </InternalPageLayout>
    </ProtectedRoute>
  );
}