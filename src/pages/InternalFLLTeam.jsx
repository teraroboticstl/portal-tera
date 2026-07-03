import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Users, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import ProtectedRoute, { canEdit } from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';

const EMPTY = { name: '', photo_url: '', role: '', skills: '', contributions: '', order: 0 };

function MemberForm({ initial, onSave, onClose, isPending }) {
  const [form, setForm] = useState(initial || EMPTY);
  const [uploading, setUploading] = useState(false);
  const f = (key) => ({ value: form[key] || '', onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, photo_url: file_url }));
    setUploading(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Nome *</Label>
          <Input {...f('name')} className="bg-[#0B0B0D] border-[#1F222B] text-white" /></div>
        <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Função</Label>
          <Input {...f('role')} placeholder="Ex: Programação" className="bg-[#0B0B0D] border-[#1F222B] text-white" /></div>
      </div>
      <div>
        <Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Foto</Label>
        {form.photo_url && <img src={form.photo_url} alt="foto" className="w-16 h-16 rounded-full object-cover mb-2" />}
        <Input type="file" accept="image/*" onChange={handlePhoto} className="bg-[#0B0B0D] border-[#1F222B] text-white text-sm" />
        {uploading && <p className="text-xs text-orange-400 mt-1">Enviando...</p>}
      </div>
      <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Habilidades</Label>
        <Textarea {...f('skills')} placeholder="Ex: Python, CAD, Arduino..." className="bg-[#0B0B0D] border-[#1F222B] text-white min-h-[70px] resize-none" /></div>
      <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Contribuições</Label>
        <Textarea {...f('contributions')} className="bg-[#0B0B0D] border-[#1F222B] text-white min-h-[70px] resize-none" /></div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose} className="border-[#1F222B]">Cancelar</Button>
        <Button onClick={() => onSave(form)} disabled={!form.name || isPending || uploading} className="bg-orange-600 hover:bg-orange-700">
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

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['fll-members'],
    queryFn: () => base44.entities.FLLMember.list('order'),
  });

  const save = useMutation({
    mutationFn: d => editing ? base44.entities.FLLMember.update(editing.id, d) : base44.entities.FLLMember.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fll-members'] }); toast.success('Salvo!'); setShowForm(false); setEditing(null); },
  });
  const del = useMutation({
    mutationFn: id => base44.entities.FLLMember.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fll-members'] }); toast.success('Excluído!'); },
  });

  return (
    <InternalPageLayout user={user} currentPage="InternalFLLTeam" title="FLL — Equipe">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6 text-orange-500" /> Equipe FLL</h2>
            <p className="text-[#B8BDC7] text-sm mt-1">Perfis dos membros da equipe</p>
          </div>
          {canEdit(user) ? (
            <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-orange-600 hover:bg-orange-700"><Plus className="w-4 h-4 mr-2" /> Novo Membro</Button>
          ) : (
            <Button disabled className="bg-[#1F222B] text-[#B8BDC7]"><Lock className="w-4 h-4 mr-2" /> Visualização</Button>
          )}
        </div>

        {isLoading ? <p className="text-[#B8BDC7]">Carregando...</p> : members.length === 0 ? (
          <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-12 text-center">
            <Users className="w-12 h-12 text-[#1F222B] mx-auto mb-4" />
            <p className="text-[#B8BDC7]">Nenhum membro cadastrado.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {members.map(m => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                className="bg-[#111217] border border-orange-500/20 rounded-xl p-5">
                <div className="flex items-start gap-4 mb-4">
                  {m.photo_url ? (
                    <img src={m.photo_url} alt={m.name} className="w-14 h-14 rounded-full object-cover flex-shrink-0 border-2 border-orange-500/30" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0 border-2 border-orange-500/20">
                      <span className="text-xl font-bold text-orange-400">{m.name[0]}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-bold">{m.name}</h3>
                    <span className="text-xs text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded">{m.role}</span>
                  </div>
                </div>
                {m.skills && <div className="mb-2"><p className="text-xs font-bold text-[#B8BDC7] uppercase tracking-wider mb-1">Habilidades</p><p className="text-sm text-white">{m.skills}</p></div>}
                {m.contributions && <div className="mb-3"><p className="text-xs font-bold text-[#B8BDC7] uppercase tracking-wider mb-1">Contribuições</p><p className="text-sm text-[#B8BDC7]">{m.contributions}</p></div>}
                {canEdit(user) && (
                  <div className="flex gap-2 pt-2 border-t border-[#1F222B]">
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(m); setShowForm(true); }} className="text-[#B8BDC7] hover:text-white h-7 px-2"><Edit2 className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => del.mutate(m.id)} className="text-red-500 hover:text-red-400 h-7 px-2"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        <Dialog open={showForm} onOpenChange={o => { if (!o) { setShowForm(false); setEditing(null); } }}>
          <DialogContent className="bg-[#111217] border-[#1F222B] max-w-lg">
            <DialogHeader><DialogTitle>{editing ? 'Editar Membro' : 'Novo Membro'}</DialogTitle></DialogHeader>
            <MemberForm initial={editing} onSave={d => save.mutate(d)} onClose={() => { setShowForm(false); setEditing(null); }} isPending={save.isPending} />
          </DialogContent>
        </Dialog>
      </div>
    </InternalPageLayout>
  );
}

export default function InternalFLLTeam() {
  return <ProtectedRoute requireApproved><Content /></ProtectedRoute>;
}