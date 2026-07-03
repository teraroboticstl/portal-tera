import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Heart, Lock } from 'lucide-react';
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

const VALUES_META = {
  'Descoberta': { emoji: '🤝', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  'Inovação': { emoji: '💡', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  'Impacto': { emoji: '🎯', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  'Inclusão': { emoji: '🤗', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30' },
  'Trabalho em Equipe': { emoji: '👥', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  'Diversão': { emoji: '🎉', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
};

const VALUES_LIST = Object.keys(VALUES_META);
const EMPTY = { date: new Date().toISOString().split('T')[0], value: 'Descoberta', activity: '', reflection: '', participants: '' };

function CVForm({ initial, onSave, onClose, isPending }) {
  const [form, setForm] = useState(initial || EMPTY);
  const f = (key) => ({ value: form[key] || '', onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Data</Label>
          <Input type="date" {...f('date')} className="bg-[#0B0B0D] border-[#1F222B] text-white" /></div>
        <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Core Value</Label>
          <Select value={form.value} onValueChange={v => setForm(p => ({ ...p, value: v }))}>
            <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B] text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#111217] border-[#1F222B] text-white">
              {VALUES_LIST.map(v => <SelectItem key={v} value={v}>{VALUES_META[v].emoji} {v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Participantes</Label>
        <Input {...f('participants')} placeholder="Ex: Nathan, Isabela..." className="bg-[#0B0B0D] border-[#1F222B] text-white" /></div>
      <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Atividade Realizada *</Label>
        <Textarea {...f('activity')} className="bg-[#0B0B0D] border-[#1F222B] text-white min-h-[80px] resize-none" /></div>
      <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Reflexão do Grupo</Label>
        <Textarea {...f('reflection')} className="bg-[#0B0B0D] border-[#1F222B] text-white min-h-[80px] resize-none" /></div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose} className="border-[#1F222B]">Cancelar</Button>
        <Button onClick={() => onSave(form)} disabled={!form.activity || isPending} className="bg-orange-600 hover:bg-orange-700">
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

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['fll-core-values'],
    queryFn: () => base44.entities.FLLCoreValues.list('-date'),
  });

  const save = useMutation({
    mutationFn: d => editing ? base44.entities.FLLCoreValues.update(editing.id, d) : base44.entities.FLLCoreValues.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fll-core-values'] }); toast.success('Salvo!'); setShowForm(false); setEditing(null); },
  });
  const del = useMutation({
    mutationFn: id => base44.entities.FLLCoreValues.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fll-core-values'] }); toast.success('Excluído!'); },
  });

  return (
    <InternalPageLayout user={user} currentPage="InternalFLLCoreValues" title="FLL — Core Values">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2"><Heart className="w-6 h-6 text-orange-500" /> Core Values</h2>
            <p className="text-[#B8BDC7] text-sm mt-1">Atividades e reflexões sobre os valores FLL</p>
          </div>
          {canEdit(user) ? (
            <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-orange-600 hover:bg-orange-700"><Plus className="w-4 h-4 mr-2" /> Nova Atividade</Button>
          ) : (
            <Button disabled className="bg-[#1F222B] text-[#B8BDC7]"><Lock className="w-4 h-4 mr-2" /> Visualização</Button>
          )}
        </div>

        {/* Cards de valores */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {VALUES_LIST.map(v => {
            const meta = VALUES_META[v];
            const count = entries.filter(e => e.value === v).length;
            return (
              <div key={v} className={`bg-[#111217] border ${meta.border} rounded-xl p-4 text-center`}>
                <div className="text-2xl mb-1">{meta.emoji}</div>
                <p className={`text-xs font-bold ${meta.color}`}>{v}</p>
                <p className="text-[#B8BDC7] text-xs mt-1">{count} atividade{count !== 1 ? 's' : ''}</p>
              </div>
            );
          })}
        </div>

        {isLoading ? <p className="text-[#B8BDC7]">Carregando...</p> : entries.length === 0 ? (
          <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-12 text-center">
            <Heart className="w-12 h-12 text-[#1F222B] mx-auto mb-4" />
            <p className="text-[#B8BDC7]">Nenhuma atividade registrada.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map(e => {
              const meta = VALUES_META[e.value] || VALUES_META['Descoberta'];
              return (
                <motion.div key={e.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                  className={`bg-[#111217] border ${meta.border} rounded-xl p-5`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl">{meta.emoji}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-bold ${meta.color}`}>{e.value}</span>
                          <span className="text-xs text-[#B8BDC7]">{format(new Date(e.date + 'T12:00:00'), "d 'de' MMM", { locale: ptBR })}</span>
                          {e.participants && <span className="text-xs text-[#B8BDC7]">· {e.participants}</span>}
                        </div>
                        <p className="text-sm text-white mt-1">{e.activity}</p>
                        {e.reflection && <p className="text-xs text-[#B8BDC7] mt-1">💬 {e.reflection}</p>}
                      </div>
                    </div>
                    {canEdit(user) && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(e); setShowForm(true); }} className="text-[#B8BDC7] hover:text-white h-7 px-2"><Edit2 className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => del.mutate(e.id)} className="text-red-500 hover:text-red-400 h-7 px-2"><Trash2 className="w-3.5 h-3.5" /></Button>
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
            <DialogHeader><DialogTitle>{editing ? 'Editar Atividade' : 'Nova Atividade — Core Values'}</DialogTitle></DialogHeader>
            <CVForm initial={editing} onSave={d => save.mutate(d)} onClose={() => { setShowForm(false); setEditing(null); }} isPending={save.isPending} />
          </DialogContent>
        </Dialog>
      </div>
    </InternalPageLayout>
  );
}

export default function InternalFLLCoreValues() {
  return <ProtectedRoute requireApproved><Content /></ProtectedRoute>;
}