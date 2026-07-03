import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Target, Lock, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import ProtectedRoute, { canEdit } from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';

const STATUS_META = {
  em_teste: { label: 'Em Teste', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  concluida: { label: 'Concluída', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  descartada: { label: 'Descartada', color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/30' },
};

const EMPTY = { name: '', max_score: 0, best_score: 0, status: 'em_teste', notes: '', order: 0 };

function MissionForm({ initial, onSave, onClose, isPending }) {
  const [form, setForm] = useState(initial || EMPTY);
  const f = (key, type = 'text') => ({
    value: form[key],
    onChange: e => setForm(p => ({ ...p, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))
  });
  return (
    <div className="space-y-4">
      <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Nome da Missão *</Label>
        <Input {...f('name')} placeholder="Ex: Quadra de Rebocagem" className="bg-[#0B0B0D] border-[#1F222B] text-white" /></div>
      <div className="grid grid-cols-3 gap-3">
        <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Pontuação Máx.</Label>
          <Input type="number" {...f('max_score', 'number')} className="bg-[#0B0B0D] border-[#1F222B] text-white" /></div>
        <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Melhor Resultado</Label>
          <Input type="number" {...f('best_score', 'number')} className="bg-[#0B0B0D] border-[#1F222B] text-white" /></div>
        <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Status</Label>
          <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
            <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B] text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#111217] border-[#1F222B] text-white">
              <SelectItem value="em_teste">Em Teste</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
              <SelectItem value="descartada">Descartada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Notas</Label>
        <Textarea {...f('notes')} className="bg-[#0B0B0D] border-[#1F222B] text-white min-h-[80px] resize-none" placeholder="Observações sobre a missão..." /></div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose} className="border-[#1F222B]">Cancelar</Button>
        <Button onClick={() => onSave(form)} disabled={!form.name || isPending} className="bg-orange-600 hover:bg-orange-700">
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

  const { data: missions = [], isLoading } = useQuery({
    queryKey: ['fll-missions'],
    queryFn: () => base44.entities.FLLMission.list('order'),
  });

  const save = useMutation({
    mutationFn: d => editing ? base44.entities.FLLMission.update(editing.id, d) : base44.entities.FLLMission.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fll-missions'] }); toast.success(editing ? 'Atualizada!' : 'Missão criada!'); setShowForm(false); setEditing(null); },
  });
  const del = useMutation({
    mutationFn: id => base44.entities.FLLMission.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fll-missions'] }); toast.success('Excluída!'); },
  });

  const totalMax = missions.reduce((s, m) => s + (m.max_score || 0), 0);
  const totalBest = missions.reduce((s, m) => s + (m.best_score || 0), 0);

  return (
    <InternalPageLayout user={user} currentPage="InternalFLLMissions" title="FLL — Missões">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2"><Target className="w-6 h-6 text-orange-500" /> Missões do Robot Game</h2>
            <p className="text-[#B8BDC7] text-sm mt-1">Pontuação atual: <span className="text-orange-400 font-bold">{totalBest}</span> / {totalMax} pts</p>
          </div>
          {canEdit(user) ? (
            <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-orange-600 hover:bg-orange-700"><Plus className="w-4 h-4 mr-2" /> Nova Missão</Button>
          ) : (
            <Button disabled className="bg-[#1F222B] text-[#B8BDC7]"><Lock className="w-4 h-4 mr-2" /> Visualização</Button>
          )}
        </div>

        {/* Progresso geral */}
        {missions.length > 0 && (
          <div className="bg-[#111217] border border-orange-500/20 rounded-xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#B8BDC7]">Progresso total</span>
              <span className="text-orange-400 font-bold">{totalMax > 0 ? Math.round((totalBest / totalMax) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-[#1F222B] rounded-full h-2">
              <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${totalMax > 0 ? Math.min(100, (totalBest / totalMax) * 100) : 0}%` }} />
            </div>
          </div>
        )}

        {isLoading ? <p className="text-[#B8BDC7]">Carregando...</p> : missions.length === 0 ? (
          <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-12 text-center">
            <Target className="w-12 h-12 text-[#1F222B] mx-auto mb-4" />
            <p className="text-[#B8BDC7]">Nenhuma missão cadastrada.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {missions.map(m => {
              const meta = STATUS_META[m.status] || STATUS_META.em_teste;
              const pct = m.max_score > 0 ? Math.round((m.best_score / m.max_score) * 100) : 0;
              return (
                <motion.div key={m.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                  className={`bg-[#111217] border ${meta.border} rounded-xl p-5`}>
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-sm flex-1">{m.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded ${meta.bg} ${meta.color} font-bold ml-2 flex-shrink-0`}>{meta.label}</span>
                  </div>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="text-center">
                      <p className="text-2xl font-black text-orange-400">{m.best_score}</p>
                      <p className="text-xs text-[#B8BDC7]">Melhor</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-[#B8BDC7]">{m.max_score}</p>
                      <p className="text-xs text-[#B8BDC7]">Máximo</p>
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-[#1F222B] rounded-full h-1.5">
                        <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                      <p className="text-xs text-[#B8BDC7] mt-1 text-right">{pct}%</p>
                    </div>
                  </div>
                  {m.notes && <p className="text-xs text-[#B8BDC7] mb-3">{m.notes}</p>}
                  {canEdit(user) && (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(m); setShowForm(true); }} className="text-[#B8BDC7] hover:text-white h-7 px-2"><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => del.mutate(m.id)} className="text-red-500 hover:text-red-400 h-7 px-2"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        <Dialog open={showForm} onOpenChange={o => { if (!o) { setShowForm(false); setEditing(null); } }}>
          <DialogContent className="bg-[#111217] border-[#1F222B] max-w-lg">
            <DialogHeader><DialogTitle>{editing ? 'Editar Missão' : 'Nova Missão'}</DialogTitle></DialogHeader>
            <MissionForm initial={editing} onSave={d => save.mutate(d)} onClose={() => { setShowForm(false); setEditing(null); }} isPending={save.isPending} />
          </DialogContent>
        </Dialog>
      </div>
    </InternalPageLayout>
  );
}

export default function InternalFLLMissions() {
  return <ProtectedRoute requireApproved><Content /></ProtectedRoute>;
}