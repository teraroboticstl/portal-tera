import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Target, Wrench, BookOpen, Star, MessageSquare,
  Plus, ChevronDown, ChevronUp, Edit2, Trash2,
  CheckCircle, Save, X, Upload, Loader2, FileText, ExternalLink
} from 'lucide-react';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import PDIProgressBar from '@/components/internal/PDIProgressBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const SECTIONS = [
  {
    number: 1, id: 'identification', title: 'Membro da Equipe', icon: User, color: '#E10600',
    fields: [
      { key: 'member_name', label: 'Nome', type: 'input', required: true },
      { key: 'main_role', label: 'Função principal na equipe', type: 'input', required: true },
      { key: 'other_roles', label: 'Outras áreas em que atua (opcional)', type: 'input' },
      { key: 'time_in_team', label: 'Tempo na equipe', type: 'input' },
      { key: 'photo_url', label: 'Foto do membro', type: 'photo' },
    ],
  },
  {
    number: 2, id: 'objective', title: 'Objetivo de Aprendizado', icon: Target, color: '#3b82f6',
    fields: [
      { key: 'learning_goal', label: 'O que você quer aprender ou desenvolver nesta temporada na equipe FTC?', type: 'textarea' },
    ],
  },
  {
    number: 3, id: 'how', title: 'Como Você Trabalha para Aprender', icon: Wrench, color: '#a855f7',
    fields: [
      { key: 'how_to_learn', label: 'O que você faz na equipe para alcançar esse objetivo?', type: 'textarea' },
      { key: 'activities', label: 'Em quais atividades do time você mais participa?', type: 'textarea' },
    ],
  },
  {
    number: 4, id: 'learned', title: 'O Que Você Aprendeu Até Agora', icon: BookOpen, color: '#22c55e',
    fields: [
      { key: 'main_learning', label: 'Qual foi o principal aprendizado que você teve nesta temporada?', type: 'textarea' },
      { key: 'challenge_learning', label: 'Houve algum desafio que virou aprendizado? Qual?', type: 'textarea' },
    ],
  },
  {
    number: 5, id: 'teamwork', title: 'Trabalho em Equipe e Valores FIRST', icon: Star, color: '#f59e0b',
    fields: [
      { key: 'teamwork', label: 'Como você contribui para o trabalho em equipe e para o aprendizado coletivo?', type: 'textarea' },
    ],
  },
  {
    number: 6, id: 'reflection', title: 'Reflexão Final', icon: MessageSquare, color: '#ec4899',
    fields: [
      { key: 'final_reflection', label: 'O que essa experiência na FTC está te ensinando além da robótica?', type: 'textarea' },
    ],
  },
];

const EMPTY_FORM = {
  member_name: '', main_role: '', other_roles: '', time_in_team: '', photo_url: '',
  learning_goal: '', how_to_learn: '', activities: '',
  main_learning: '', challenge_learning: '', teamwork: '', final_reflection: '',
  season: 'DECODE 2025', status: 'rascunho', certificates: [],
};

function PhotoUpload({ value, onChange }) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onChange(file_url);
    setUploading(false);
  };

  return (
    <div className="flex items-center gap-3">
      {value && (
        <img src={value} alt="foto" className="w-14 h-14 rounded-full object-cover border-2 border-[#E10600]/50" />
      )}
      <label className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-[#111217] border border-[#1F222B] rounded-lg text-xs text-[#B8BDC7] hover:border-[#E10600]/50 hover:text-white transition-colors">
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {uploading ? 'Enviando...' : (value ? 'Trocar foto' : 'Carregar foto')}
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
      </label>
    </div>
  );
}

function CertificatesUpload({ value = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const name = nameInput.trim() || file.name.replace(/\.[^.]+$/, '');
    onChange([...value, { name, url: file_url }]);
    setNameInput('');
    setUploading(false);
    e.target.value = '';
  };

  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((cert, i) => (
            <div key={i} className="flex items-center gap-2 bg-[#111217] border border-[#1F222B] rounded-lg px-3 py-2">
              <FileText className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <span className="text-sm text-white flex-1 truncate">{cert.name}</span>
              <a href={cert.url} target="_blank" rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 p-1">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button onClick={() => remove(i)} className="text-red-400 hover:text-red-300 p-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          placeholder="Nome do certificado (opcional)"
          className="flex-1 bg-[#111217] border border-[#1F222B] text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500"
        />
        <label className={`cursor-pointer flex items-center gap-2 px-3 py-2 bg-[#111217] border border-[#1F222B] rounded-lg text-xs text-[#B8BDC7] hover:border-orange-500/50 hover:text-white transition-colors whitespace-nowrap ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Enviando...' : 'Adicionar PDF'}
          <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
      </div>
    </div>
  );
}

function PDIForm({ initial, onSave, onCancel, isAdmin }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [openSections, setOpenSections] = useState([0, 1, 2, 3, 4, 5]);

  const toggle = (i) => setOpenSections(prev =>
    prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
  );
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="space-y-2">
      {SECTIONS.map((sec, i) => {
        const Icon = sec.icon;
        const isOpen = openSections.includes(i);
        return (
          <div key={sec.id} className="border border-[#1F222B] rounded-xl overflow-hidden">
            <button onClick={() => toggle(i)}
              className="w-full flex items-center gap-3 px-5 py-3.5 bg-[#111217] hover:bg-[#16181f] transition-colors text-left">
              <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0"
                style={{ background: `${sec.color}22`, color: sec.color, border: `1.5px solid ${sec.color}55` }}>
                {sec.number}
              </div>
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color: sec.color }} />
              <span className="font-bold text-white text-sm flex-1">{sec.title}</span>
              {isOpen ? <ChevronUp className="w-4 h-4 text-[#B8BDC7]" /> : <ChevronDown className="w-4 h-4 text-[#B8BDC7]" />}
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                  <div className="px-5 py-4 bg-[#0B0B0D] border-t border-[#1F222B] space-y-4">
                    {sec.fields.map(field => (
                      <div key={field.key}>
                        <label className="text-xs font-semibold text-[#B8BDC7] mb-1.5 block">
                          {field.label} {field.required && <span className="text-[#E10600]">*</span>}
                        </label>
                        {field.type === 'input' && (
                          <Input value={form[field.key] || ''} onChange={e => set(field.key, e.target.value)}
                            className="bg-[#111217] border-[#1F222B] text-white text-sm" />
                        )}
                        {field.type === 'textarea' && (
                          <Textarea value={form[field.key] || ''} onChange={e => set(field.key, e.target.value)}
                            rows={3} className="bg-[#111217] border-[#1F222B] text-white text-sm resize-none" />
                        )}
                        {field.type === 'photo' && (
                          <PhotoUpload value={form[field.key]} onChange={v => set(field.key, v)} />
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Certificados */}
      <div className="border border-[#1F222B] rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 bg-[#111217]">
          <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0"
            style={{ background: '#f9731622', color: '#f97316', border: '1.5px solid #f9731655' }}>
            7
          </div>
          <FileText className="w-4 h-4 flex-shrink-0 text-orange-400" />
          <span className="font-bold text-white text-sm flex-1">Certificados</span>
        </div>
        <div className="px-5 py-4 bg-[#0B0B0D] border-t border-[#1F222B]">
          <label className="text-xs font-semibold text-[#B8BDC7] mb-2 block">
            Adicione PDFs ou imagens de certificados do membro
          </label>
          <CertificatesUpload
            value={form.certificates || []}
            onChange={v => set('certificates', v)}
          />
        </div>
      </div>

      {/* Admin: definir progresso manualmente */}
      {isAdmin && (
        <div className="bg-[#111217] border border-[#f59e0b]/30 rounded-xl p-4">
          <label className="text-xs font-bold text-[#f59e0b] mb-2 block">⚙️ Admin — Nível de Liderança (0–100%)</label>
          <div className="flex items-center gap-3">
            <input
              type="range" min="0" max="100" step="1"
              value={form.progress_override ?? ''}
              onChange={e => set('progress_override', Number(e.target.value))}
              className="flex-1 accent-yellow-400"
            />
            <input
              type="number" min="0" max="100"
              value={form.progress_override ?? ''}
              placeholder="auto"
              onChange={e => {
                const v = e.target.value === '' ? undefined : Math.min(100, Math.max(0, Number(e.target.value)));
                set('progress_override', v);
              }}
              className="w-16 text-center text-sm bg-[#0B0B0D] border border-[#1F222B] rounded text-white outline-none px-2 py-1"
            />
            <span className="text-xs text-[#B8BDC7]">%</span>
            {form.progress_override != null && (
              <button onClick={() => set('progress_override', undefined)}
                className="text-xs text-red-400 hover:text-red-300">limpar</button>
            )}
          </div>
          <p className="text-[10px] text-[#B8BDC7] mt-1.5">
            {(form.progress_override ?? -1) >= 80 ? '🟢 Pronto pra ser um líder' :
             (form.progress_override ?? -1) >= 40 ? '🟡 Em desenvolvimento de liderança' :
             form.progress_override != null ? '🔴 À desenvolver liderança' : 'Calculado automaticamente pelo preenchimento'}
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button onClick={() => onSave({ ...form, status: 'rascunho' })}
          variant="outline" className="border-[#1F222B] text-[#B8BDC7] hover:text-white">
          <Save className="w-4 h-4 mr-1" /> Salvar Rascunho
        </Button>
        <Button onClick={() => onSave({ ...form, status: 'completo' })}
          className="bg-[#E10600] hover:bg-[#b00500] text-white">
          <CheckCircle className="w-4 h-4 mr-1" /> Marcar como Completo
        </Button>
        <Button onClick={onCancel} variant="ghost" className="text-[#B8BDC7] hover:text-white ml-auto">
          <X className="w-4 h-4 mr-1" /> Cancelar
        </Button>
      </div>
    </div>
  );
}

// Tags de valores FIRST extraídas das respostas
function extractTags(pdi) {
  const tags = [];
  const text = [pdi.teamwork, pdi.final_reflection, pdi.activities].join(' ').toLowerCase();
  if (text.includes('inclus')) tags.push('Inclusão');
  if (text.includes('apresent')) tags.push('Apresentação');
  if (text.includes('trabalho em equipe') || text.includes('colabora')) tags.push('Trabalho em equipe');
  if (text.includes('valor')) tags.push('Valores');
  if (text.includes('comunica')) tags.push('Comunicação');
  if (text.includes('inova')) tags.push('Inovação');
  if (tags.length === 0 && pdi.main_role) tags.push(pdi.main_role.split(' ')[0]);
  return tags.slice(0, 3);
}

function PDICard({ pdi, onEdit, onDelete, onUpdateProgress, isAdmin }) {
  const [expanded, setExpanded] = useState(false);
  const tags = extractTags(pdi);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2"
    >
      <div className="bg-[#111217] rounded-2xl overflow-hidden shadow-sm border border-[#1F222B] flex flex-col flex-1">
      {/* Photo */}
      <div className="flex justify-center pt-6 pb-3">
        {pdi.photo_url ? (
          <img src={pdi.photo_url} alt={pdi.member_name}
            className="w-24 h-24 rounded-2xl object-cover border-2 border-[#E10600]/40 shadow" />
        ) : (
          <div className="w-24 h-24 rounded-2xl bg-[#1F222B] border-2 border-[#1F222B] flex items-center justify-center">
            <User className="w-10 h-10 text-[#B8BDC7]" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-4 pb-4 flex-1 flex flex-col">
        <p className="font-bold text-white text-base text-center">{pdi.member_name}</p>
        <p className="text-sm text-[#B8BDC7] text-center mb-3">{pdi.main_role}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 justify-center mb-3">
          {tags.map(tag => (
            <span key={tag} className="text-xs text-green-400 font-medium">{tag}</span>
          ))}
        </div>

        {/* Status badge */}
        <div className="flex justify-center mb-3">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            pdi.status === 'completo' ? 'bg-green-900/40 text-green-400' : 'bg-yellow-900/40 text-yellow-400'
          }`}>
            {pdi.status === 'completo' ? '✓ Completo' : '⏳ Rascunho'}
          </span>
        </div>

        {/* Certificates count */}
        {pdi.certificates?.length > 0 && (
          <div className="flex justify-center mb-2">
            <span className="text-[10px] bg-orange-900/30 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              <FileText className="w-2.5 h-2.5" /> {pdi.certificates.length} certificado{pdi.certificates.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-2 mt-auto">
          <button onClick={() => setExpanded(!expanded)}
            className="text-xs text-[#B8BDC7] hover:text-white underline transition-colors">
            {expanded ? 'Fechar' : 'Ver PDI'}
          </button>
          <span className="text-[#1F222B]">|</span>
          <button onClick={() => onEdit(pdi)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
            Editar
          </button>
          <span className="text-[#1F222B]">|</span>
          <button onClick={() => onDelete(pdi.id)}
            className="text-xs text-red-400 hover:text-red-300 transition-colors">
            Excluir
          </button>
        </div>
      </div>

      {/* Expanded PDI detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-[#1F222B]">
            <div className="px-4 py-4 bg-[#0B0B0D] space-y-3">
              {SECTIONS.map(sec => {
                const hasData = sec.fields.some(f => f.type !== 'photo' && pdi[f.key]?.trim());
                if (!hasData) return null;
                const Icon = sec.icon;
                return (
                  <div key={sec.id}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Icon className="w-3 h-3" style={{ color: sec.color }} />
                      <p className="text-xs font-bold text-[#B8BDC7]">{sec.title}</p>
                    </div>
                    {sec.fields.filter(f => f.type !== 'photo').map(f =>
                      pdi[f.key]?.trim() ? (
                        <p key={f.key} className="text-xs text-[#B8BDC7] bg-[#111217] rounded-lg px-3 py-2 mb-1 border border-[#1F222B]">
                          {pdi[f.key]}
                        </p>
                      ) : null
                    )}
                  </div>
                );
              })}
              {pdi.certificates?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <FileText className="w-3 h-3 text-orange-400" />
                    <p className="text-xs font-bold text-[#B8BDC7]">Certificados</p>
                  </div>
                  <div className="space-y-1">
                    {pdi.certificates.map((cert, i) => (
                      <a key={i} href={cert.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 bg-[#111217] rounded-lg px-3 py-2 border border-[#1F222B] transition-colors">
                        <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="flex-1 truncate">{cert.name}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
      <PDIProgressBar pdi={pdi} isAdmin={isAdmin} onUpdate={(val) => onUpdateProgress(pdi.id, val)} />
    </motion.div>
  );
}

function InternalFTCPDIContent({ user }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingPDI, setEditingPDI] = useState(null);

  const { data: pdis = [], isLoading } = useQuery({
    queryKey: ['pdis-ftc'],
    queryFn: () => base44.entities.PDI.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PDI.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['pdis-ftc']); setShowForm(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PDI.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['pdis-ftc']); setEditingPDI(null); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PDI.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['pdis-ftc']),
  });

  const handleSave = (data) => {
    if (editingPDI) updateMutation.mutate({ id: editingPDI.id, data });
    else createMutation.mutate(data);
  };

  const handleUpdateProgress = (id, val) => {
    updateMutation.mutate({ id, data: { progress_override: val } });
  };

  const isAdmin = user?.role === 'admin' || user?.member_role === 'admin';

  const completos = pdis.filter(p => p.status === 'completo').length;

  return (
    <InternalPageLayout user={user} currentPage="InternalFTCPDI" title="PDI — Membros FTC">
      <div className="space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#0B0B0D] border border-[#1F222B] rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-black text-white mb-1">PDI — Plano de Desenvolvimento Individual</h2>
              <p className="text-sm text-[#B8BDC7] leading-relaxed">
                Equipe FTC · Foco no <strong className="text-white">processo e aprendizado</strong>, não em desempenho competitivo. Pode ser visualizado por juízes durante entrevistas.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {['Foco em aprendizado', 'Sem comparação entre membros', 'Conteúdo educacional', 'Valores FIRST'].map(t => (
                  <span key={t} className="text-[10px] bg-[#111217] border border-[#1F222B] text-[#B8BDC7] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle className="w-2.5 h-2.5 text-green-400" /> {t}
                  </span>
                ))}
              </div>
            </div>
            {!showForm && !editingPDI && (
              <Button onClick={() => setShowForm(true)} className="bg-[#E10600] hover:bg-[#b00500] text-white flex-shrink-0">
                <Plus className="w-4 h-4 mr-1" /> Novo PDI
              </Button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: 'Total', value: pdis.length, color: '#E10600' },
              { label: 'Completos', value: completos, color: '#22c55e' },
              { label: 'Rascunhos', value: pdis.length - completos, color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} className="bg-[#111217] border border-[#1F222B] rounded-xl p-4 text-center">
                <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs text-[#B8BDC7] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Form */}
        <AnimatePresence>
          {(showForm || editingPDI) && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="bg-[#0B0B0D] border border-[#E10600]/30 rounded-2xl p-6">
              <h3 className="font-black text-white mb-4">{editingPDI ? 'Editar PDI' : 'Novo PDI'}</h3>
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <PDIForm
                    initial={editingPDI}
                    onSave={handleSave}
                    onCancel={() => { setShowForm(false); setEditingPDI(null); }}
                    isAdmin={isAdmin}
                  />
                </div>
                {editingPDI && (
                  <div className="flex-shrink-0 pt-2">
                    <PDIProgressBar pdi={editingPDI} isAdmin={false} onUpdate={() => {}} />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* List */}
        {isLoading ? (
          <p className="text-sm text-[#B8BDC7]">Carregando...</p>
        ) : pdis.length === 0 && !showForm ? (
          <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-10 text-center">
            <User className="w-10 h-10 text-[#B8BDC7] mx-auto mb-3" />
            <p className="text-sm text-[#B8BDC7]">Nenhum PDI registrado ainda.</p>
            <p className="text-xs text-[#B8BDC7]/60 mt-1">Clique em "Novo PDI" para começar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {pdis.map(pdi => (
              <PDICard key={pdi.id} pdi={pdi}
                isAdmin={isAdmin}
                onUpdateProgress={handleUpdateProgress}
                onEdit={(p) => { setEditingPDI(p); setShowForm(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                onDelete={(id) => { if (confirm('Excluir este PDI?')) deleteMutation.mutate(id); }}
              />
            ))}
          </div>
        )}
      </div>
    </InternalPageLayout>
  );
}

export default function InternalFTCPDI() {
  return (
    <ProtectedRoute requireApproved={true}>
      <InternalFTCPDIContent />
    </ProtectedRoute>
  );
}