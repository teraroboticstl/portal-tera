import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Calendar, ChevronDown, ChevronUp, Users, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ProtectedRoute, { canEdit, isAdmin } from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';

const EMPTY = { date: new Date().toISOString().split('T')[0], participants: '', agenda: '', technical_discussions: '', final_decisions: '', pending_items: '', responsible_deadlines: '' };

function MeetingCard({ m, onEdit, onDelete, canEditItem }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
      className="bg-[#111217] border border-orange-500/20 rounded-xl overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-3 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-4 h-4 text-orange-500" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{m.agenda}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-[#B8BDC7]">
              <span>{format(new Date(m.date + 'T12:00:00'), "d 'de' MMM, yyyy", { locale: ptBR })}</span>
              {m.participants && <span className="flex items-center gap-1 truncate"><Users className="w-3 h-3 flex-shrink-0" />{m.participants}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {canEditItem && <>
            <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); onEdit(m); }} className="text-[#B8BDC7] hover:text-white h-7 px-2"><Edit2 className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); onDelete(m.id); }} className="text-red-500 hover:text-red-400 h-7 px-2"><Trash2 className="w-3.5 h-3.5" /></Button>
          </>}
          {open ? <ChevronUp className="w-4 h-4 text-[#B8BDC7]" /> : <ChevronDown className="w-4 h-4 text-[#B8BDC7]" />}
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 pt-4 border-t border-[#1F222B] space-y-3">
              {[
                ['Pauta', m.agenda],
                ['Discussões Técnicas', m.technical_discussions],
                ['Decisões Finais', m.final_decisions],
                ['Pendências', m.pending_items],
                ['Responsáveis e Prazos', m.responsible_deadlines],
              ].filter(([, v]) => v).map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-[#B8BDC7] text-sm whitespace-pre-wrap">{val}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MeetingForm({ initial, onSave, onClose, isPending }) {
  const [form, setForm] = useState(initial || EMPTY);
  const f = (key) => ({ value: form[key], onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Data</Label>
          <Input type="date" {...f('date')} className="bg-[#0B0B0D] border-[#1F222B] text-white" /></div>
        <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Participantes</Label>
          <Input {...f('participants')} placeholder="Ex: Nathan, Isabela..." className="bg-[#0B0B0D] border-[#1F222B] text-white" /></div>
      </div>
      {[['Pauta *', 'agenda', 'textarea'], ['Discussões Técnicas', 'technical_discussions', 'textarea'], ['Decisões Finais', 'final_decisions', 'textarea'], ['Pendências', 'pending_items', 'textarea'], ['Responsáveis e Prazos', 'responsible_deadlines', 'textarea']].map(([lbl, key, type]) => (
        <div key={key}><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">{lbl}</Label>
          <Textarea {...f(key)} className="bg-[#0B0B0D] border-[#1F222B] text-white min-h-[80px] resize-none" />
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose} className="border-[#1F222B]">Cancelar</Button>
        <Button onClick={() => onSave(form)} disabled={!form.agenda || isPending} className="bg-orange-600 hover:bg-orange-700">
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

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['fll-meetings'],
    queryFn: () => base44.entities.MeetingNote.filter({ program: 'FLL' }, '-date'),
  });

  const save = useMutation({
    mutationFn: d => editing ? base44.entities.MeetingNote.update(editing.id, d) : base44.entities.MeetingNote.create({ ...d, program: 'FLL' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fll-meetings'] }); toast.success(editing ? 'Atualizada!' : 'Reunião criada!'); setShowForm(false); setEditing(null); },
  });
  const del = useMutation({
    mutationFn: id => base44.entities.MeetingNote.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fll-meetings'] }); toast.success('Excluída!'); },
  });

  const canCreate = canEdit(user);

  return (
    <InternalPageLayout user={user} currentPage="InternalFLLMeetings" title="FLL — Reuniões">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2"><Calendar className="w-6 h-6 text-orange-500" /> Reuniões FLL</h2>
            <p className="text-[#B8BDC7] text-sm mt-1">Atas, decisões e próximos passos</p>
          </div>
          {canCreate ? (
            <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-orange-600 hover:bg-orange-700"><Plus className="w-4 h-4 mr-2" /> Nova Reunião</Button>
          ) : (
            <Button disabled className="bg-[#1F222B] text-[#B8BDC7]"><Lock className="w-4 h-4 mr-2" /> Visualização</Button>
          )}
        </div>

        {isLoading ? <p className="text-[#B8BDC7]">Carregando...</p> : meetings.length === 0 ? (
          <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-12 text-center">
            <Calendar className="w-12 h-12 text-[#1F222B] mx-auto mb-4" />
            <p className="text-[#B8BDC7]">Nenhuma reunião registrada.</p>
          </div>
        ) : (
          <div className="space-y-3">{meetings.map(m => (
            <MeetingCard key={m.id} m={m} onEdit={e => { setEditing(e); setShowForm(true); }} onDelete={id => del.mutate(id)} canEditItem={canEdit(user)} />
          ))}</div>
        )}

        <Dialog open={showForm} onOpenChange={o => { if (!o) { setShowForm(false); setEditing(null); } }}>
          <DialogContent className="bg-[#111217] border-[#1F222B] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? 'Editar Reunião' : 'Nova Reunião'}</DialogTitle></DialogHeader>
            <MeetingForm initial={editing} onSave={d => save.mutate(d)} onClose={() => { setShowForm(false); setEditing(null); }} isPending={save.isPending} />
          </DialogContent>
        </Dialog>
      </div>
    </InternalPageLayout>
  );
}

export default function InternalFLLMeetings() {
  return <ProtectedRoute requireApproved><Content /></ProtectedRoute>;
}