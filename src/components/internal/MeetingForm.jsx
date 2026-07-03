import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Save, X, Plus, FileText, Trash2, Video, Film } from 'lucide-react';
import { useDraft } from './useDraft';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const PROGRAMS = ['FRC', 'FTC', 'FLL', 'Geral'];

export default function MeetingForm({ meeting = null, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const isEditing = !!meeting;
  const { form, setForm, hasDraft, clearDraft } = useDraft('draft_meeting', {
    date: new Date().toISOString().split('T')[0],
    program: 'Geral',
    participants: [],
    agenda: '',
    technical_discussions: '',
    final_decisions: '',
    pending_items: '',
    responsible_deadlines: '',
    video_urls: [],
  }, isEditing);

  const [editForm, setEditForm] = useState(isEditing ? {
    date: meeting.date,
    program: meeting.program,
    participants: meeting.participants || [],
    agenda: meeting.agenda || '',
    technical_discussions: meeting.technical_discussions || '',
    final_decisions: meeting.final_decisions || '',
    pending_items: meeting.pending_items || '',
    responsible_deadlines: meeting.responsible_deadlines || '',
    video_urls: meeting.video_urls || [],
  } : null);

  const currentForm = isEditing ? editForm : form;
  const setCurrentForm = isEditing ? setEditForm : setForm;

  const [newParticipant, setNewParticipant] = useState('');
  const [newVideo, setNewVideo] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);

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

  const createMeeting = useMutation({
    mutationFn: (data) => base44.entities.MeetingNote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      clearDraft();
      toast.success('Reunião registrada!');
      onSuccess?.();
      onClose?.();
    }
  });

  const updateMeeting = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MeetingNote.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast.success('Reunião atualizada!');
      onSuccess?.();
      onClose?.();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentForm.date || !currentForm.agenda) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    if (meeting) {
      updateMeeting.mutate({ id: meeting.id, data: currentForm });
    } else {
      createMeeting.mutate(currentForm);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {hasDraft && !isEditing && (
        <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2 text-yellow-400 text-sm">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>Rascunho salvo automaticamente</span>
          </div>
          <button type="button" onClick={() => { clearDraft(); setCurrentForm({ date: new Date().toISOString().split('T')[0], program: 'Geral', participants: [], agenda: '', technical_discussions: '', final_decisions: '', pending_items: '', responsible_deadlines: '' }); }} className="text-xs underline hover:text-yellow-300">
            Limpar rascunho
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
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

      <div>
        <Label>Pauta *</Label>
        <Textarea
          value={currentForm.agenda}
          onChange={(e) => setCurrentForm({ ...currentForm, agenda: e.target.value })}
          placeholder="Tópicos a serem discutidos..."
          className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-24"
          required
        />
      </div>

      <div>
        <Label>Discussões Técnicas</Label>
        <Textarea
          value={currentForm.technical_discussions}
          onChange={(e) => setCurrentForm({ ...currentForm, technical_discussions: e.target.value })}
          placeholder="Pontos técnicos discutidos..."
          className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
        />
      </div>

      <div>
        <Label>Decisões Finais</Label>
        <Textarea
          value={currentForm.final_decisions}
          onChange={(e) => setCurrentForm({ ...currentForm, final_decisions: e.target.value })}
          placeholder="O que foi decidido..."
          className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Pendências</Label>
          <Textarea
            value={currentForm.pending_items}
            onChange={(e) => setCurrentForm({ ...currentForm, pending_items: e.target.value })}
            placeholder="Itens pendentes..."
            className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
          />
        </div>
        <div>
          <Label>Responsáveis e Prazos</Label>
          <Textarea
            value={currentForm.responsible_deadlines}
            onChange={(e) => setCurrentForm({ ...currentForm, responsible_deadlines: e.target.value })}
            placeholder="Quem faz o quê e quando..."
            className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
          />
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

      <div className="flex justify-end gap-3 pt-4 border-t border-[#1F222B]">
        <Button type="button" variant="outline" onClick={onClose} className="border-[#1F222B]">
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" className="bg-[#E10600] hover:bg-[#E10600]/90" disabled={createMeeting.isPending || updateMeeting.isPending} >
          <Save className="w-4 h-4 mr-2" />
          {meeting ? 'Salvar Alterações' : 'Registrar Reunião'}
        </Button>
      </div>
    </form>
  );
}