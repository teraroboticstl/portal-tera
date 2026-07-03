import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, HelpCircle, Lock, CheckCircle, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import ProtectedRoute, { canEdit } from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';

const CATEGORIES = ['Robot Game', 'Innovation Project', 'Core Values'];
const CAT_META = {
  'Robot Game': { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  'Innovation Project': { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  'Core Values': { color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30' },
};

const EMPTY = { category: 'Robot Game', question: '', answer: '', notes: '', ready: false };

function PrepForm({ initial, onSave, onClose, isPending }) {
  const [form, setForm] = useState(initial || EMPTY);
  const f = (key) => ({ value: form[key] || '', onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });
  return (
    <div className="space-y-4">
      <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Categoria</Label>
        <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
          <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B] text-white"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#111217] border-[#1F222B] text-white">
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Pergunta *</Label>
        <Input {...f('question')} placeholder="Ex: Como vocês escolheram o problema a resolver?" className="bg-[#0B0B0D] border-[#1F222B] text-white" /></div>
      <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Resposta Preparada</Label>
        <Textarea {...f('answer')} className="bg-[#0B0B0D] border-[#1F222B] text-white min-h-[100px] resize-none" /></div>
      <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Notas / Observações</Label>
        <Textarea {...f('notes')} className="bg-[#0B0B0D] border-[#1F222B] text-white min-h-[70px] resize-none" /></div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setForm(p => ({ ...p, ready: !p.ready }))}>
          {form.ready ? <CheckCircle className="w-5 h-5 text-green-400" /> : <Circle className="w-5 h-5 text-[#B8BDC7]" />}
        </button>
        <span className="text-sm text-[#B8BDC7]">Resposta pronta para apresentação</span>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose} className="border-[#1F222B]">Cancelar</Button>
        <Button onClick={() => onSave(form)} disabled={!form.question || isPending} className="bg-orange-600 hover:bg-orange-700">
          {isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}

function Content({ user }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [activeTab, setActiveTab] = useState('Robot Game');
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['fll-judge-prep'],
    queryFn: () => base44.entities.FLLJudgePrep.list(),
  });

  const save = useMutation({
    mutationFn: d => editing ? base44.entities.FLLJudgePrep.update(editing.id, d) : base44.entities.FLLJudgePrep.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fll-judge-prep'] }); toast.success('Salvo!'); setShowForm(false); setEditing(null); },
  });
  const del = useMutation({
    mutationFn: id => base44.entities.FLLJudgePrep.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fll-judge-prep'] }); toast.success('Excluído!'); },
  });
  const toggleReady = (item) => save.mutate({ ...item, ready: !item.ready });

  const filtered = items.filter(i => i.category === activeTab);
  const readyCount = filtered.filter(i => i.ready).length;

  return (
    <InternalPageLayout user={user} currentPage="InternalFLLJudgePrep" title="FLL — Prep. Juízes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2"><HelpCircle className="w-6 h-6 text-orange-500" /> Preparação para Juízes</h2>
            <p className="text-[#B8BDC7] text-sm mt-1">Perguntas, respostas e checklists de apresentação</p>
          </div>
          {canEdit(user) ? (
            <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-orange-600 hover:bg-orange-700"><Plus className="w-4 h-4 mr-2" /> Nova Pergunta</Button>
          ) : (
            <Button disabled className="bg-[#1F222B] text-[#B8BDC7]"><Lock className="w-4 h-4 mr-2" /> Visualização</Button>
          )}
        </div>

        {/* Tabs de categoria */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(c => {
            const meta = CAT_META[c];
            const total = items.filter(i => i.category === c).length;
            const ready = items.filter(i => i.category === c && i.ready).length;
            return (
              <button key={c} onClick={() => setActiveTab(c)}
                className={`text-xs px-4 py-2 rounded-lg font-bold transition-colors ${activeTab === c ? 'bg-orange-600 text-white' : 'bg-[#1F222B] text-[#B8BDC7] hover:text-white'}`}>
                {c} <span className="ml-1 opacity-70">{ready}/{total}</span>
              </button>
            );
          })}
        </div>

        {/* Progresso */}
        {filtered.length > 0 && (
          <div className="bg-[#111217] border border-orange-500/20 rounded-xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#B8BDC7]">Respostas prontas</span>
              <span className="text-orange-400 font-bold">{readyCount}/{filtered.length}</span>
            </div>
            <div className="w-full bg-[#1F222B] rounded-full h-2">
              <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${filtered.length > 0 ? (readyCount / filtered.length) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        {isLoading ? <p className="text-[#B8BDC7]">Carregando...</p> : filtered.length === 0 ? (
          <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-12 text-center">
            <HelpCircle className="w-12 h-12 text-[#1F222B] mx-auto mb-4" />
            <p className="text-[#B8BDC7]">Nenhuma pergunta cadastrada para {activeTab}.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => {
              const meta = CAT_META[item.category] || CAT_META['Robot Game'];
              return (
                <motion.div key={item.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                  className={`bg-[#111217] border ${item.ready ? 'border-green-500/30' : meta.border} rounded-xl p-5`}>
                  <div className="flex items-start gap-3">
                    <button onClick={() => canEdit(user) && toggleReady(item)} className="mt-0.5 flex-shrink-0">
                      {item.ready ? <CheckCircle className="w-5 h-5 text-green-400" /> : <Circle className="w-5 h-5 text-[#B8BDC7]" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm mb-2">{item.question}</p>
                      {item.answer && (
                        <div className="bg-[#0B0B0D] rounded-lg p-3 mb-2">
                          <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-1">Resposta</p>
                          <p className="text-sm text-[#B8BDC7] whitespace-pre-wrap">{item.answer}</p>
                        </div>
                      )}
                      {item.notes && <p className="text-xs text-[#B8BDC7]">📝 {item.notes}</p>}
                    </div>
                    {canEdit(user) && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(item); setShowForm(true); }} className="text-[#B8BDC7] hover:text-white h-7 px-2"><Edit2 className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => del.mutate(item.id)} className="text-red-500 hover:text-red-400 h-7 px-2"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <Dialog open={showForm} onOpenChange={o => { if (!o) { setShowForm(false); setEditing(null); } }}>
          <DialogContent className="bg-[#111217] border-[#1F222B] max-w-lg">
            <DialogHeader><DialogTitle>{editing ? 'Editar Pergunta' : 'Nova Pergunta'}</DialogTitle></DialogHeader>
            <PrepForm initial={editing} onSave={d => save.mutate(d)} onClose={() => { setShowForm(false); setEditing(null); }} isPending={save.isPending} />
          </DialogContent>
        </Dialog>
      </div>
    </InternalPageLayout>
  );
}

export default function InternalFLLJudgePrep() {
  return <ProtectedRoute requireApproved><Content /></ProtectedRoute>;
}