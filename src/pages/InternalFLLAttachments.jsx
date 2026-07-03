import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Plus, Trash2, Paperclip, Lock, ExternalLink, Image, FileText, Video, Table, File } from 'lucide-react';
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

const TYPE_META = {
  foto: { label: 'Foto', icon: Image, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  video: { label: 'Vídeo', icon: Video, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  documento: { label: 'Documento', icon: FileText, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  planilha: { label: 'Planilha', icon: Table, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  outro: { label: 'Outro', icon: File, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
};

const EMPTY = { title: '', file_url: '', file_type: 'documento', description: '', date: new Date().toISOString().split('T')[0] };

function AttachForm({ initial, onSave, onClose, isPending }) {
  const [form, setForm] = useState(initial || EMPTY);
  const [uploading, setUploading] = useState(false);
  const f = (key) => ({ value: form[key] || '', onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) });

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, file_url }));
    setUploading(false);
    toast.success('Arquivo enviado!');
  };

  return (
    <div className="space-y-4">
      <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Título *</Label>
        <Input {...f('title')} placeholder="Ex: Pontuação Tapete - Rodada 1" className="bg-[#0B0B0D] border-[#1F222B] text-white" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Tipo</Label>
          <Select value={form.file_type} onValueChange={v => setForm(p => ({ ...p, file_type: v }))}>
            <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B] text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#111217] border-[#1F222B] text-white">
              {Object.entries(TYPE_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Data</Label>
          <Input type="date" {...f('date')} className="bg-[#0B0B0D] border-[#1F222B] text-white" /></div>
      </div>
      <div>
        <Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Upload de Arquivo</Label>
        <Input type="file" onChange={handleFile} className="bg-[#0B0B0D] border-[#1F222B] text-white text-sm" />
        {uploading && <p className="text-xs text-orange-400 mt-1">Enviando arquivo...</p>}
        {form.file_url && !uploading && <p className="text-xs text-green-400 mt-1">✓ Arquivo pronto</p>}
      </div>
      <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Ou URL direta</Label>
        <Input {...f('file_url')} placeholder="https://..." className="bg-[#0B0B0D] border-[#1F222B] text-white" /></div>
      <div><Label className="text-[#B8BDC7] text-xs uppercase tracking-wider mb-1 block">Descrição</Label>
        <Textarea {...f('description')} className="bg-[#0B0B0D] border-[#1F222B] text-white min-h-[70px] resize-none" /></div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose} className="border-[#1F222B]">Cancelar</Button>
        <Button onClick={() => onSave(form)} disabled={!form.title || !form.file_url || isPending || uploading} className="bg-orange-600 hover:bg-orange-700">
          {isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}

function Content({ user }) {
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const qc = useQueryClient();

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['fll-attachments'],
    queryFn: () => base44.entities.FLLAttachment.list('-date'),
  });

  const save = useMutation({
    mutationFn: d => base44.entities.FLLAttachment.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fll-attachments'] }); toast.success('Anexo adicionado!'); setShowForm(false); },
  });
  const del = useMutation({
    mutationFn: id => base44.entities.FLLAttachment.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fll-attachments'] }); toast.success('Excluído!'); },
  });

  const filtered = filterType === 'all' ? attachments : attachments.filter(a => a.file_type === filterType);

  return (
    <InternalPageLayout user={user} currentPage="InternalFLLAttachments" title="FLL — Anexos">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2"><Paperclip className="w-6 h-6 text-orange-500" /> Anexos</h2>
            <p className="text-[#B8BDC7] text-sm mt-1">Fotos, vídeos, documentos e planilhas da FLL</p>
          </div>
          {canEdit(user) ? (
            <Button onClick={() => setShowForm(true)} className="bg-orange-600 hover:bg-orange-700"><Plus className="w-4 h-4 mr-2" /> Adicionar Anexo</Button>
          ) : (
            <Button disabled className="bg-[#1F222B] text-[#B8BDC7]"><Lock className="w-4 h-4 mr-2" /> Visualização</Button>
          )}
        </div>

        {/* Filtro por tipo */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterType('all')}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-colors ${filterType === 'all' ? 'bg-orange-600 text-white' : 'bg-[#1F222B] text-[#B8BDC7] hover:text-white'}`}>
            Todos ({attachments.length})
          </button>
          {Object.entries(TYPE_META).map(([k, v]) => {
            const count = attachments.filter(a => a.file_type === k).length;
            if (count === 0) return null;
            return (
              <button key={k} onClick={() => setFilterType(k)}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-colors ${filterType === k ? 'bg-orange-600 text-white' : 'bg-[#1F222B] text-[#B8BDC7] hover:text-white'}`}>
                {v.label} ({count})
              </button>
            );
          })}
        </div>

        {isLoading ? <p className="text-[#B8BDC7]">Carregando...</p> : filtered.length === 0 ? (
          <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-12 text-center">
            <Paperclip className="w-12 h-12 text-[#1F222B] mx-auto mb-4" />
            <p className="text-[#B8BDC7]">Nenhum anexo encontrado.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(a => {
              const meta = TYPE_META[a.file_type] || TYPE_META.outro;
              const Icon = meta.icon;
              const isImage = a.file_type === 'foto' || a.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
              return (
                <motion.div key={a.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                  className={`bg-[#111217] border ${meta.border} rounded-xl overflow-hidden`}>
                  {isImage && (
                    <div className="h-36 overflow-hidden bg-[#0B0B0D]">
                      <img src={a.file_url} alt={a.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className={`w-4 h-4 ${meta.color} flex-shrink-0`} />
                        <p className="font-bold text-sm truncate">{a.title}</p>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${meta.bg} ${meta.color} font-bold flex-shrink-0`}>{meta.label}</span>
                    </div>
                    {a.description && <p className="text-xs text-[#B8BDC7] mb-2">{a.description}</p>}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#B8BDC7]">{format(new Date(a.date + 'T12:00:00'), "d 'de' MMM, yyyy", { locale: ptBR })}</span>
                      <div className="flex items-center gap-1">
                        <a href={a.file_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="text-orange-500 hover:text-orange-400 h-7 px-2"><ExternalLink className="w-3.5 h-3.5" /></Button>
                        </a>
                        {canEdit(user) && (
                          <Button variant="ghost" size="sm" onClick={() => del.mutate(a.id)} className="text-red-500 hover:text-red-400 h-7 px-2"><Trash2 className="w-3.5 h-3.5" /></Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <Dialog open={showForm} onOpenChange={o => { if (!o) setShowForm(false); }}>
          <DialogContent className="bg-[#111217] border-[#1F222B] max-w-lg">
            <DialogHeader><DialogTitle>Adicionar Anexo</DialogTitle></DialogHeader>
            <AttachForm onSave={d => save.mutate(d)} onClose={() => setShowForm(false)} isPending={save.isPending} />
          </DialogContent>
        </Dialog>
      </div>
    </InternalPageLayout>
  );
}

export default function InternalFLLAttachments() {
  return <ProtectedRoute requireApproved><Content /></ProtectedRoute>;
}