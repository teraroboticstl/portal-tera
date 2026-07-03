import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Lightbulb, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ProtectedRoute, { canEdit } from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';

const STATUS_META = {
  rascunho: { label: 'Rascunho', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
  em_andamento: { label: 'Em Andamento', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  finalizado: { label: 'Finalizado', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
};

const EMPTY = { title: '', date: new Date().toISOString().split('T')[0], problem: '', solution: '', research: '', prototypes: '', feedbacks: '', evolution: '', status: 'rascunho', links: [] };

function ProjectCard({ p, onEdit, onDelete, canEditItem }) {
  const [open, setOpen] = useState(false);
  const meta = STATUS_META[p.status] || STATUS_META.rascunho;
  const sections = [['🔍 Problema', p.problem], ['💡 Solução', p.solution], ['📚 Pesquisas', p.research], ['🔧 Protótipos', p.prototypes], ['💬 Feedbacks', p.feedbacks], ['📈 Evolução', p.evolution]].filter(([, v]) => v);
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
      className={`bg-[#111217] border ${meta.border} rounded-xl overflow-hidden`}>
      <div className="p-4 flex items-start justify-between gap-3 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-orange-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-sm">{p.title}</p>
              <span className={`text-xs px-2 py-0.5 rounded ${meta.bg} ${meta.color} font-bold`}>{meta.label}</span>
            </div>
            <p className="text-xs text-[#B8BDC7] mt-1">{format(new Date(p.date + 'T12:00:00'), "d 'de' MMM, yyyy", { locale: ptBR })}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {canEditItem && <>
            <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); onEdit(p); }} className="text-[#B8BDC7] hover:text-white h-7 px-2"><Edit2 className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); onDelete(p.id); }} className="text-red-500 hover:text-red-400 h-7 px-2"><Trash2 className="w-3.5 h-3.5" /></Button>
          </>}
          {open ? <ChevronUp className="w-4 h-4 text-[#B8BDC7]" /> : <ChevronDown className="w-4 h-4 text-[#B8BDC7]" />}
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 pt-4 border-t border-[#1F222B] space-y-3">
              {sections.map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-[#B8BDC7] text-sm whitespace-pre-wrap">{val}</p>
                </div>
              ))}
              {p.links?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-1">🔗 Links</p>
                  {p.links.map((l, i) => <a key={i} href={l} target="_blank" rel="noopener noreferrer" className="block text-blue-400 text-sm hover:underline truncate">{l}</a>)}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ProjectForm({ initial, onSave, onClose, isPending }) {
  const [form, setForm] = useState(initial || EMPTY);
  const [newLink, setNewLink] = useState('');
  const f = (key) => ({ value: form[key] || '', onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });
  const addLink = () => { if (!newLink.trim()) return; setForm(p => ({ ...p, links: [...(p.links || []), newLink.trim()] })); setNewLink(''); };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Título *</Label>
          <Input {...f('title')} className="bg-[#0B0B0D] border-[#1F222B] text-white" /></div>
        <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Data</Label>
          <Input type="date" {...f('date')} className="bg-[#0B0B0D] border-[#1F222B] text-white" /></div>
      </div>
      <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Status</Label>
        <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
          <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B] text-white"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#111217] border-[#1F222B] text-white">
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="finalizado">Finalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {[['Problema Identificado', 'problem'], ['Solução Proposta', 'solution'], ['Pesquisas', 'research'], ['Protótipos', 'prototypes'], ['Feedbacks', 'feedbacks'], ['Evolução do Projeto', 'evolution']].map(([lbl, key]) => (
        <div key={key}><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">{lbl}</Label>
          <Textarea {...f(key)} className="bg-[#0B0B0D] border-[#1F222B] text-white min-h-[80px] resize-none" /></div>
      ))}
      <div>
        <Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Links</Label>
        <div className="flex gap-2 mb-2">
          <Input value={newLink} onChange={e => setNewLink(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }} placeholder="https://..." className="bg-[#0B0B0D] border-[#1F222B] text-white text-sm" />
          <Button type="button" onClick={addLink} size="sm" className="bg-orange-600 hover:bg-orange-700 flex-shrink-0">+</Button>
        </div>
        {(form.links || []).map((l, i) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <a href={l} target="_blank" rel="noopener noreferrer" className="flex-1 text-blue-400 text-xs truncate hover:underline">{l}</a>
            <button onClick={() => setForm(p => ({ ...p, links: p.links.filter((_, idx) => idx !== i) }))} className="text-red-400 hover:text-red-300">✕</button>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose} className="border-[#1F222B]">Cancelar</Button>
        <Button onClick={() => onSave(form)} disabled={!form.title || isPending} className="bg-orange-600 hover:bg-orange-700">
          {isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}

function Content({ user }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['fll-innovation'],
    queryFn: () => base44.entities.FLLInnovationProject.list('-date'),
  });

  const save = useMutation({
    mutationFn: d => editing ? base44.entities.FLLInnovationProject.update(editing.id, d) : base44.entities.FLLInnovationProject.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fll-innovation'] }); toast.success(editing ? 'Atualizado!' : 'Projeto criado!'); setShowForm(false); setEditing(null); },
  });
  const del = useMutation({
    mutationFn: id => base44.entities.FLLInnovationProject.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fll-innovation'] }); toast.success('Excluído!'); },
  });

  return (
    <InternalPageLayout user={user} currentPage="InternalFLLInnovation" title="FLL — Projeto de Inovação">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2"><Lightbulb className="w-6 h-6 text-orange-500" /> Projeto de Inovação</h2>
            <p className="text-[#B8BDC7] text-sm mt-1">Documentação completa do projeto FLL</p>
          </div>
          {canEdit(user) ? (
            <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-orange-600 hover:bg-orange-700"><Plus className="w-4 h-4 mr-2" /> Novo Registro</Button>
          ) : (
            <Button disabled className="bg-[#1F222B] text-[#B8BDC7]"><Lock className="w-4 h-4 mr-2" /> Visualização</Button>
          )}
        </div>

        {isLoading ? <p className="text-[#B8BDC7]">Carregando...</p> : projects.length === 0 ? (
          <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-12 text-center">
            <Lightbulb className="w-12 h-12 text-[#1F222B] mx-auto mb-4" />
            <p className="text-[#B8BDC7]">Nenhum projeto registrado.</p>
          </div>
        ) : (
          <div className="space-y-3">{projects.map(p => (
            <ProjectCard key={p.id} p={p} onEdit={e => { setEditing(e); setShowForm(true); }} onDelete={id => del.mutate(id)} canEditItem={canEdit(user)} />
          ))}</div>
        )}

        <Dialog open={showForm} onOpenChange={o => { if (!o) { setShowForm(false); setEditing(null); } }}>
          <DialogContent className="bg-[#111217] border-[#1F222B] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? 'Editar Projeto' : 'Novo Registro'}</DialogTitle></DialogHeader>
            <ProjectForm initial={editing} onSave={d => save.mutate(d)} onClose={() => { setShowForm(false); setEditing(null); }} isPending={save.isPending} />
          </DialogContent>
        </Dialog>
      </div>
    </InternalPageLayout>
  );
}

export default function InternalFLLInnovation() {
  return <ProtectedRoute requireApproved><Content /></ProtectedRoute>;
}