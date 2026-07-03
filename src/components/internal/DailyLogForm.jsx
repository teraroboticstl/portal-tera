import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Save, X, Upload, Plus, Trash2, FileText, Video, Film } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useDraft } from './useDraft';

const LOG_TYPES = ['Reunião', 'Build', 'CAD', 'Programação', 'Teste', 'Divulgação'];
const PROGRAMS = ['FRC', 'FTC', 'FLL'];

export default function DailyLogForm({ log = null, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const isEditing = !!log;
  const { form, setForm, hasDraft, clearDraft } = useDraft('draft_dailylog', {
    date: new Date().toISOString().split('T')[0],
    program: 'FRC',
    log_type: 'Build',
    participants: [],
    what_was_done: '',
    decisions_made: '',
    problems_found: '',
    solutions: '',
    next_steps: '',
    evidence_links: [],
    evidence_images: [],
    video_urls: [],
  }, isEditing);

  // Se editando, usa os dados do registro
  const [editForm, setEditForm] = useState(isEditing ? {
    date: log.date,
    program: log.program,
    log_type: log.log_type,
    participants: log.participants || [],
    what_was_done: log.what_was_done || '',
    decisions_made: log.decisions_made || '',
    problems_found: log.problems_found || '',
    solutions: log.solutions || '',
    next_steps: log.next_steps || '',
    evidence_links: log.evidence_links || [],
    evidence_images: log.evidence_images || [],
    video_urls: log.video_urls || [],
  } : null);

  const currentForm = isEditing ? editForm : form;
  const setCurrentForm = isEditing ? setEditForm : setForm;

  const [newParticipant, setNewParticipant] = useState('');
  const [newLink, setNewLink] = useState('');
  const [newVideo, setNewVideo] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const createLog = useMutation({
    mutationFn: (data) => base44.entities.DailyLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
      clearDraft();
      toast.success('Log criado com sucesso!');
      onSuccess?.();
      onClose?.();
    }
  });

  const updateLog = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DailyLog.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
      toast.success('Log atualizado com sucesso!');
      onSuccess?.();
      onClose?.();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentForm.date || !currentForm.what_was_done) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    if (log) {
      updateLog.mutate({ id: log.id, data: currentForm });
    } else {
      createLog.mutate(currentForm);
    }
  };

  const addParticipant = () => {
    if (newParticipant.trim()) {
      setCurrentForm({ ...currentForm, participants: [...currentForm.participants, newParticipant.trim()] });
      setNewParticipant('');
    }
  };

  const removeParticipant = (index) => {
    setCurrentForm({ ...currentForm, participants: currentForm.participants.filter((_, i) => i !== index) });
  };

  const addLink = () => {
    if (newLink.trim()) {
      setCurrentForm({ ...currentForm, evidence_links: [...currentForm.evidence_links, newLink.trim()] });
      setNewLink('');
    }
  };

  const removeLink = (index) => {
    setCurrentForm({ ...currentForm, evidence_links: currentForm.evidence_links.filter((_, i) => i !== index) });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Apenas PNG, JPG e WebP são permitidos.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5MB.');
      return;
    }

    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setCurrentForm({ ...currentForm, evidence_images: [...currentForm.evidence_images, file_url] });
    toast.success('Imagem enviada!');
    setUploading(false);
  };

  const removeImage = (index) => {
    setCurrentForm({ ...currentForm, evidence_images: currentForm.evidence_images.filter((_, i) => i !== index) });
  };

  const addVideo = () => {
    if (newVideo.trim()) {
      setCurrentForm({ ...currentForm, video_urls: [...(currentForm.video_urls || []), newVideo.trim()] });
      setNewVideo('');
    }
  };

  const removeVideo = (index) => {
    setCurrentForm({ ...currentForm, video_urls: (currentForm.video_urls || []).filter((_, i) => i !== index) });
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      toast.error('Apenas arquivos de vídeo são permitidos.');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error('Vídeo deve ter no máximo 100MB.');
      return;
    }
    setUploadingVideo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setCurrentForm({ ...currentForm, video_urls: [...(currentForm.video_urls || []), file_url] });
    toast.success('Vídeo enviado!');
    setUploadingVideo(false);
    e.target.value = '';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Rascunho salvo automaticamente */}
      {hasDraft && !isEditing && (
        <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2 text-yellow-400 text-sm">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>Rascunho salvo automaticamente</span>
          </div>
          <button type="button" onClick={() => { clearDraft(); setCurrentForm({ date: new Date().toISOString().split('T')[0], program: 'FRC', log_type: 'Build', participants: [], what_was_done: '', decisions_made: '', problems_found: '', solutions: '', next_steps: '', evidence_links: [], evidence_images: [] }); }} className="text-xs underline hover:text-yellow-300">
            Limpar rascunho
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <Label>Data *</Label>
          <Input
            type="date"
            value={currentForm.date}
            onChange={(e) => setCurrentForm({ ...currentForm, date: e.target.value })}
            className="bg-[#1F222B] border-[#2A2D36] text-white"
            required
          />
        </div>
        <div>
          <Label>Programa *</Label>
          <Select value={currentForm.program} onValueChange={(v) => setCurrentForm({ ...currentForm, program: v })}>
            <SelectTrigger className="bg-[#1F222B] border-[#2A2D36] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#111217] border-[#1F222B] text-white [&_*]:text-white">
              {PROGRAMS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tipo *</Label>
          <Select value={currentForm.log_type} onValueChange={(v) => setCurrentForm({ ...currentForm, log_type: v })}>
            <SelectTrigger className="bg-[#1F222B] border-[#2A2D36] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#111217] border-[#1F222B] text-white [&_*]:text-white">
              {LOG_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Participants */}
      <div>
        <Label>Participantes</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newParticipant}
            onChange={(e) => setNewParticipant(e.target.value)}
            placeholder="Nome do participante"
            className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addParticipant())}
          />
          <Button type="button" onClick={addParticipant} variant="outline" className="border-[#1F222B]">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {currentForm.participants.map((p, i) => (
            <span key={i} className="flex items-center gap-1 px-3 py-1 bg-[#1F222B] rounded-full text-sm">
              {p}
              <button type="button" onClick={() => removeParticipant(i)} className="text-[#E10600] hover:text-red-400">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Main Content - Judge Ready Pattern */}
      <div className="bg-[#1A1D24] border border-[#2A2D36] rounded-xl p-4 space-y-4">
        <h3 className="font-bold text-[#E10600]">📋 Registro (Padrão Judge Ready)</h3>
        
        <div>
          <Label>O que foi feito *</Label>
          <Textarea
            value={currentForm.what_was_done}
            onChange={(e) => setCurrentForm({ ...currentForm, what_was_done: e.target.value })}
            placeholder="Descreva as atividades realizadas..."
            className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-24"
            required
          />
        </div>

        <div>
          <Label>Decisões tomadas</Label>
          <Textarea
            value={currentForm.decisions_made}
            onChange={(e) => setCurrentForm({ ...currentForm, decisions_made: e.target.value })}
            placeholder="Quais decisões foram tomadas e por quê..."
            className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Problemas encontrados</Label>
            <Textarea
              value={currentForm.problems_found}
              onChange={(e) => setCurrentForm({ ...currentForm, problems_found: e.target.value })}
              placeholder="O que não funcionou..."
              className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
            />
          </div>
          <div>
            <Label>Soluções aplicadas</Label>
            <Textarea
              value={currentForm.solutions}
              onChange={(e) => setCurrentForm({ ...currentForm, solutions: e.target.value })}
              placeholder="O que aprendemos e melhoramos..."
              className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
            />
          </div>
        </div>

        <div>
          <Label>Próximos passos</Label>
          <Textarea
            value={currentForm.next_steps}
            onChange={(e) => setCurrentForm({ ...currentForm, next_steps: e.target.value })}
            placeholder="O que fazer a seguir..."
            className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
          />
        </div>
      </div>

      {/* Evidence Links */}
      <div>
        <Label>Links de Evidências</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newLink}
            onChange={(e) => setNewLink(e.target.value)}
            placeholder="https://..."
            className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())}
          />
          <Button type="button" onClick={addLink} variant="outline" className="border-[#1F222B]">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-1">
          {currentForm.evidence_links.map((link, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <a href={link} target="_blank" rel="noopener noreferrer" className="text-[#E10600] hover:underline truncate flex-1">
                {link}
              </a>
              <button type="button" onClick={() => removeLink(i)} className="text-red-500 hover:text-red-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Evidence Images */}
      <div>
        <Label>Imagens de Evidência</Label>
        <div className="flex gap-2 mb-4">
          <Input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="bg-[#1F222B] border-[#2A2D36] text-white"
            disabled={uploading}
          />
          {uploading && <span className="text-[#B8BDC7] text-sm">Enviando...</span>}
        </div>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {currentForm.evidence_images.map((img, i) => (
            <div key={i} className="relative group">
              <img src={img} alt={`Evidência ${i + 1}`} className="w-full h-24 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Video URLs */}
      <div>
        <Label className="flex items-center gap-2"><Video className="w-4 h-4 text-[#E10600]" /> Vídeos</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newVideo}
            onChange={(e) => setNewVideo(e.target.value)}
            placeholder="https://youtube.com/... ou https://drive.google.com/..."
            className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addVideo())}
          />
          <Button type="button" onClick={addVideo} variant="outline" className="border-[#1F222B]">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 bg-[#1F222B] border border-[#2A2D36] rounded-md text-sm text-gray-300 hover:border-[#E10600] transition-colors">
            <Film className="w-4 h-4 text-[#E10600]" />
            {uploadingVideo ? 'Enviando...' : 'Enviar arquivo de vídeo'}
            <input type="file" accept="video/*" onChange={handleVideoUpload} disabled={uploadingVideo} className="hidden" />
          </label>
        </div>
        <div className="space-y-3">
          {(currentForm.video_urls || []).map((url, i) => {
            const isFile = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov') || url.includes('.avi') || url.includes('base44.app');
            return (
              <div key={i} className="bg-[#1A1D24] border border-[#2A2D36] rounded-lg p-2">
                {isFile ? (
                  <video src={url} controls className="w-full rounded mb-2 max-h-48" />
                ) : null}
                <div className="flex items-center gap-2 text-sm">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate flex-1">{url}</a>
                  <button type="button" onClick={() => removeVideo(i)} className="text-red-500 hover:text-red-400 flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-[#1F222B]">
        <Button type="button" variant="outline" onClick={onClose} className="border-[#1F222B]">
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" className="bg-[#E10600] hover:bg-[#E10600]/90" disabled={createLog.isPending || updateLog.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {log ? 'Salvar Alterações' : 'Criar Log'}
        </Button>
      </div>
    </form>
  );
}