import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, ListTodo, Lock } from 'lucide-react';
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
  pendente: { label: 'Pendente', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
  em_andamento: { label: 'Em Andamento', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  concluida: { label: 'Concluída', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
};

const PRIORITY_META = {
  baixa: { label: 'Baixa', color: 'text-gray-400' },
  media: { label: 'Média', color: 'text-blue-400' },
  alta: { label: 'Alta', color: 'text-orange-400' },
  urgente: { label: 'URGENTE', color: 'text-red-400' },
};

const EMPTY = { title: '', responsible: '', deadline: '', status: 'pendente', priority: 'media', notes: '' };

function TaskForm({ initial, onSave, onClose, isPending }) {
  const [form, setForm] = useState(initial || EMPTY);
  const f = (key) => ({ value: form[key] || '', onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });
  return (
    <div className="space-y-4">
      <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Título *</Label>
        <Input {...f('title')} className="bg-[#0B0B0D] border-[#1F222B] text-white" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Responsável</Label>
          <Input {...f('responsible')} placeholder="Nome" className="bg-[#0B0B0D] border-[#1F222B] text-white" /></div>
        <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Prazo</Label>
          <Input type="date" {...f('deadline')} className="bg-[#0B0B0D] border-[#1F222B] text-white" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Status</Label>
          <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
            <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B] text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#111217] border-[#1F222B] text-white">
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Prioridade</Label>
          <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
            <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B] text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#111217] border-[#1F222B] text-white">
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Observações</Label>
        <Textarea {...f('notes')} className="bg-[#0B0B0D] border-[#1F222B] text-white min-h-[70px] resize-none" /></div>
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
  const [filterStatus, setFilterStatus] = useState('all');
  const qc = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['fll-tasks'],
    queryFn: () => base44.entities.FLLTask.list('-created_date'),
  });

  const save = useMutation({
    mutationFn: d => editing ? base44.entities.FLLTask.update(editing.id, d) : base44.entities.FLLTask.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fll-tasks'] }); toast.success('Salvo!'); setShowForm(false); setEditing(null); },
  });
  const del = useMutation({
    mutationFn: id => base44.entities.FLLTask.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fll-tasks'] }); toast.success('Excluída!'); },
  });

  const quickStatus = (task, status) => save.mutate({ ...task, status });

  const filtered = filterStatus === 'all' ? tasks : tasks.filter(t => t.status === filterStatus);

  return (
    <InternalPageLayout user={user} currentPage="InternalFLLTasks" title="FLL — Prioridades">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2"><ListTodo className="w-6 h-6 text-orange-500" /> Prioridades & Tarefas</h2>
            <p className="text-[#B8BDC7] text-sm mt-1">Gestão de tarefas da equipe FLL</p>
          </div>
          {canEdit(user) ? (
            <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-orange-600 hover:bg-orange-700"><Plus className="w-4 h-4 mr-2" /> Nova Tarefa</Button>
          ) : (
            <Button disabled className="bg-[#1F222B] text-[#B8BDC7]"><Lock className="w-4 h-4 mr-2" /> Visualização</Button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'pendente', 'em_andamento', 'concluida'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-colors ${filterStatus === s ? 'bg-orange-600 text-white' : 'bg-[#1F222B] text-[#B8BDC7] hover:text-white'}`}>
              {s === 'all' ? 'Todas' : STATUS_META[s]?.label}
            </button>
          ))}
        </div>

        {isLoading ? <p className="text-[#B8BDC7]">Carregando...</p> : filtered.length === 0 ? (
          <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-12 text-center">
            <ListTodo className="w-12 h-12 text-[#1F222B] mx-auto mb-4" />
            <p className="text-[#B8BDC7]">Nenhuma tarefa encontrada.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(t => {
              const sm = STATUS_META[t.status] || STATUS_META.pendente;
              const pm = PRIORITY_META[t.priority] || PRIORITY_META.media;
              return (
                <motion.div key={t.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                  className={`bg-[#111217] border ${sm.border} rounded-xl p-4 flex items-start gap-4`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className={`font-bold text-sm ${t.status === 'concluida' ? 'line-through text-[#B8BDC7]' : 'text-white'}`}>{t.title}</p>
                      <span className={`text-xs font-bold ${pm.color}`}>{pm.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${sm.bg} ${sm.color} font-bold`}>{sm.label}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#B8BDC7]">
                      {t.responsible && <span>👤 {t.responsible}</span>}
                      {t.deadline && <span>📅 {format(new Date(t.deadline + 'T12:00:00'), "d 'de' MMM", { locale: ptBR })}</span>}
                    </div>
                    {t.notes && <p className="text-xs text-[#B8BDC7] mt-1">{t.notes}</p>}
                  </div>
                  {canEdit(user) && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {t.status !== 'concluida' && (
                        <Button variant="ghost" size="sm" onClick={() => quickStatus(t, 'concluida')} className="text-green-500 hover:text-green-400 h-7 px-2 text-xs">✓</Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(t); setShowForm(true); }} className="text-[#B8BDC7] hover:text-white h-7 px-2"><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => del.mutate(t.id)} className="text-red-500 hover:text-red-400 h-7 px-2"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        <Dialog open={showForm} onOpenChange={o => { if (!o) { setShowForm(false); setEditing(null); } }}>
          <DialogContent className="bg-[#111217] border-[#1F222B] max-w-lg">
            <DialogHeader><DialogTitle>{editing ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle></DialogHeader>
            <TaskForm initial={editing} onSave={d => save.mutate(d)} onClose={() => { setShowForm(false); setEditing(null); }} isPending={save.isPending} />
          </DialogContent>
        </Dialog>
      </div>
    </InternalPageLayout>
  );
}

export default function InternalFLLTasks() {
  return <ProtectedRoute requireApproved><Content /></ProtectedRoute>;
}