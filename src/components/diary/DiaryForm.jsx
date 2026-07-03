import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save, X, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const DRAFT_KEY = 'diary_draft_v1';
const DRAFT_TTL = 5 * 60 * 1000; // 5 minutos

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const { data, savedAt } = JSON.parse(raw);
    if (Date.now() - savedAt > DRAFT_TTL) { localStorage.removeItem(DRAFT_KEY); return null; }
    return data;
  } catch { return null; }
}

function saveDraft(data) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ data, savedAt: Date.now() }));
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

export default function DiaryForm({ entry, program, onClose }) {
  const qc = useQueryClient();
  const isNew = !entry;

  const defaultForm = {
    program: entry?.program || program || 'FRC',
    section: entry?.section || 'Engenharia',
    date: entry?.date || new Date().toISOString().split('T')[0],
    participants: entry?.participants || '',
    brainstorm: entry?.brainstorm || '',
    build_notes: entry?.build_notes || '',
    process_description: entry?.process_description || '',
    links: entry?.links || [],
  };

  const [hasDraft, setHasDraft] = useState(false);
  const [form, setForm] = useState(() => {
    if (isNew) {
      const draft = loadDraft();
      if (draft) { setHasDraft(true); return draft; }
    }
    return defaultForm;
  });
  const [newLink, setNewLink] = useState('');
  const saveTimer = useRef(null);

  // Auto-save draft a cada mudança (somente nova entrada)
  useEffect(() => {
    if (!isNew) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveDraft(form), 500);
    return () => clearTimeout(saveTimer.current);
  }, [form, isNew]);

  const save = useMutation({
    mutationFn: (data) => entry
      ? base44.entities.BoardDiary.update(entry.id, data)
      : base44.entities.BoardDiary.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board-diary'] });
      clearDraft();
      toast.success(entry ? 'Entrada atualizada!' : 'Entrada criada!');
      onClose();
    },
  });

  const addLink = () => {
    if (!newLink.trim()) return;
    setForm(p => ({ ...p, links: [...p.links, newLink.trim()] }));
    setNewLink('');
  };

  const removeLink = (i) => setForm(p => ({ ...p, links: p.links.filter((_, idx) => idx !== i) }));

  const field = (label, key, type = 'textarea', placeholder = '') => (
    <div>
      <Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">{label}</Label>
      {type === 'textarea' ? (
        <Textarea
          value={form[key]}
          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          className="bg-[#0B0B0D] border-[#1F222B] text-white min-h-[90px] resize-none"
        />
      ) : (
        <Input
          type={type}
          value={form[key]}
          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          className="bg-[#0B0B0D] border-[#1F222B] text-white"
        />
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Banner de rascunho recuperado */}
      {isNew && hasDraft && (
        <div className="flex items-center justify-between gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2.5">
          <div className="flex items-center gap-2 text-yellow-400 text-sm">
            <RotateCcw className="w-4 h-4 flex-shrink-0" />
            <span>Rascunho recuperado — seus dados foram restaurados.</span>
          </div>
          <button
            onClick={() => { setForm(defaultForm); clearDraft(); setHasDraft(false); }}
            className="text-yellow-500 hover:text-yellow-300 text-xs underline whitespace-nowrap"
          >
            Descartar
          </button>
        </div>
      )}

      {/* Program + Section + Date */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Programa</Label>
          <Select value={form.program} onValueChange={v => setForm(p => ({ ...p, program: v }))}>
            <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#111217] border-[#1F222B] text-white">
              <SelectItem value="FRC" className="text-white focus:bg-[#1F222B] focus:text-white">FRC</SelectItem>
              <SelectItem value="FTC" className="text-white focus:bg-[#1F222B] focus:text-white">FTC</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Seção</Label>
          <Select value={form.section} onValueChange={v => setForm(p => ({ ...p, section: v }))}>
            <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#111217] border-[#1F222B] text-white">
              <SelectItem value="Engenharia" className="text-white focus:bg-[#1F222B] focus:text-white">Engenharia</SelectItem>
              <SelectItem value="Programação" className="text-white focus:bg-[#1F222B] focus:text-white">Programação</SelectItem>
              <SelectItem value="Marketing" className="text-white focus:bg-[#1F222B] focus:text-white">Marketing</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          {field('Data', 'date', 'date')}
        </div>
      </div>

      {field('Participantes do dia', 'participants', 'text', 'Ex: Nathan, Isabela, Tawany...')}
      {field('Brainstorm', 'brainstorm', 'textarea', 'Ideias levantadas, discussões, opções consideradas...')}
      {field('Anotações de Construção / Atividades', 'build_notes', 'textarea', 'O que foi feito na prática hoje...')}
      {field('Descrição dos Processos', 'process_description', 'textarea', 'Como os processos foram executados, detalhes técnicos...')}

      {/* Links */}
      <div>
        <Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Links de Referência</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newLink}
            onChange={e => setNewLink(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }}
            placeholder="https://..."
            className="bg-[#0B0B0D] border-[#1F222B] text-white text-sm"
          />
          <Button type="button" onClick={addLink} size="sm" className="bg-[#E10600] hover:bg-[#E10600]/90 flex-shrink-0">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {form.links.map((l, i) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <a href={l} target="_blank" rel="noopener noreferrer" className="flex-1 text-blue-400 text-xs truncate hover:underline">{l}</a>
            <button onClick={() => removeLink(i)} className="text-red-400 hover:text-red-300 flex-shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose} className="border-[#1F222B]">
          <X className="w-4 h-4 mr-1" /> Cancelar
        </Button>
        <Button
          onClick={() => save.mutate(form)}
          disabled={!form.date || save.isPending}
          className="bg-[#E10600] hover:bg-[#E10600]/90"
        >
          <Save className="w-4 h-4 mr-1" /> {save.isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}