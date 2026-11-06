import { usePageVisibility } from '@/lib/usePageVisibility';
import { format } from 'date-fns';
import MeetingAttachments from './MeetingAttachments';
import { requestDeadline } from '@/api/requestDeadline';
import PortalMedia from '@/components/common/PortalMedia';
import { RECORD_PROGRAMS } from '@/lib/modalities';
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

const PROGRAMS = [...RECORD_PROGRAMS, 'Geral'];

export default function MeetingForm({ meeting = null, onClose, onSuccess, initialProgram = 'FRC' }) {
  const queryClient = useQueryClient();
  const {canShowModality}=usePageVisibility();
  const allowedPrograms=PROGRAMS.filter(canShowModality);
  const defaultProgram=allowedPrograms.includes(initialProgram)?initialProgram:(allowedPrograms[0] || 'Geral');
  const [formError,setFormError]=useState('');
  const isEditing = !!meeting;
  const { form, setForm, hasDraft, clearDraft } = useDraft('draft_meeting', {
    date: format(new Date(), 'yyyy-MM-dd'),
    program: defaultProgram,
    participants: [],
    agenda: '',
    technical_discussions: '',
    final_decisions: '',
    pending_items: '',
    responsible_deadlines: '',
    video_urls: [],
    evidence_images: [], evidence_links: [],
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
    evidence_images: meeting.evidence_images || [], evidence_links: meeting.evidence_links || [],
  } : null);

  const currentForm = isEditing ? editForm : form;
  const setCurrentForm = isEditing ? setEditForm : setForm;

  const [newParticipant, setNewParticipant] = useState('');
  const [newVideo, setNewVideo] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

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
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Vídeo deve ter no máximo 4 MB; para maiores, use um link do Drive.');
      return;
    }
    const input=e.target;
    setUploadingVideo(true);
    setFormError('');
    try {
    const { file_url } = await base44.integrations.Core.UploadFile({ file, context: 'seasons', program: currentForm.program });
    setCurrentForm(previous => ({ ...previous, video_urls: [...(previous.video_urls || []), file_url] }));
    toast.success('Vídeo enviado!');
    } catch { setFormError('Falha no envio. O arquivo não foi anexado; você pode salvar o texto sem ele ou tentar novamente. Limite: 4 MB por arquivo.'); }
    finally { setUploadingVideo(false); input.value=''; }
  };

  const createMeeting = useMutation({
    mutationFn: (data) => requestDeadline(() => base44.entities.MeetingNote.create(data)),
    onError: () => setFormError('Não foi possível confirmar o salvamento. Seu texto foi preservado. Confira sua conexão, seu nível de acesso e a lista antes de tentar novamente.'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['fll-meetings'] });
      clearDraft();
      toast.success('Reunião registrada!');
      onSuccess?.();
      onClose?.();
    }
  });

  const updateMeeting = useMutation({
    mutationFn: ({ id, data }) => requestDeadline(() => base44.entities.MeetingNote.update(id, data)),
    onError: () => setFormError('Não foi possível confirmar o salvamento. Seu texto foi preservado. Confira sua conexão, seu nível de acesso e a lista antes de tentar novamente.'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast.success('Reunião atualizada!');
      onSuccess?.();
      onClose?.();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (uploadingVideo || uploadingAttachment) { setFormError('Aguarde o envio do anexo terminar antes de salvar.'); return; }
    setFormError('');
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
    <form onSubmit={handleSubmit} className="space-y-6 min-w-0">
      {formError && <p role="alert" className="rounded-lg border border-red-500 p-3 text-red-200">{formError}</p>}
      <p className="text-sm text-gray-400">Anexos opcionais, até 4 MB por arquivo. Para vídeos maiores, adicione um link do Drive restrito à equipe.</p>
      {hasDraft && !isEditing && (
        <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2 text-yellow-400 text-sm">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>Rascunho salvo automaticamente</span>
          </div>
          <button type="button" onClick={() => { setCurrentForm({ date: format(new Date(), 'yyyy-MM-dd'), program: 'Geral', participants: [], agenda: '', technical_discussions: '', final_decisions: '', pending_items: '', responsible_deadlines: '' }); clearDraft(); }} className="text-xs underline hover:text-yellow-300">
            Limpar rascunho
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="Meeting-date">Data *</Label>
          <Input id="Meeting-date"
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
              {allowedPrograms.map((p) => (
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
        <Label htmlFor="Meeting-agenda">Pauta *</Label>
        <Textarea id="Meeting-agenda"
          value={currentForm.agenda}
          onChange={(e) => setCurrentForm({ ...currentForm, agenda: e.target.value })}
          placeholder="Tópicos a serem discutidos..."
          className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-24"
          required
        />
      </div>

      <div>
        <Label htmlFor="Meeting-technical_discussions">Discussões Técnicas</Label>
        <Textarea id="Meeting-technical_discussions"
          value={currentForm.technical_discussions}
          onChange={(e) => setCurrentForm({ ...currentForm, technical_discussions: e.target.value })}
          placeholder="Pontos técnicos discutidos..."
          className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
        />
      </div>

      <div>
        <Label htmlFor="Meeting-final_decisions">Decisões Finais</Label>
        <Textarea id="Meeting-final_decisions"
          value={currentForm.final_decisions}
          onChange={(e) => setCurrentForm({ ...currentForm, final_decisions: e.target.value })}
          placeholder="O que foi decidido..."
          className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="Meeting-pending_items">Pendências</Label>
          <Textarea id="Meeting-pending_items"
            value={currentForm.pending_items}
            onChange={(e) => setCurrentForm({ ...currentForm, pending_items: e.target.value })}
            placeholder="Itens pendentes..."
            className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
          />
        </div>
        <div>
          <Label htmlFor="Meeting-responsible_deadlines">Responsáveis e Prazos</Label>
          <Textarea id="Meeting-responsible_deadlines"
            value={currentForm.responsible_deadlines}
            onChange={(e) => setCurrentForm({ ...currentForm, responsible_deadlines: e.target.value })}
            placeholder="Quem faz o quê e quando..."
            className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
          />
        </div>
      </div>

      <MeetingAttachments form={currentForm} setForm={setCurrentForm} uploading={uploadingAttachment} setUploading={setUploadingAttachment} onError={setFormError} />

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
            const isFile = url.startsWith('/api/media/') || url.includes('.mp4') || url.includes('.webm') || url.includes('.mov') || url.includes('.avi') || url.includes('base44.app');
            return (
              <div key={i} className="bg-[#1A1D24] border border-[#2A2D36] rounded-lg p-2">
                {isFile ? (
                  <PortalMedia type="video" src={url} controls className="w-full rounded mb-2 max-h-48" />
                ) : null}
                <div className="flex items-center gap-2 text-sm">
                  <PortalMedia src={url} type="link" className="text-blue-400 hover:underline truncate flex-1">{url}</PortalMedia>
                  <button type="button" onClick={() => removeVideo(i)} className="text-red-500 hover:text-red-400 flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="sticky bottom-0 bg-[#111217] flex flex-wrap justify-end gap-3 py-4 border-t border-[#1F222B]">
        {formError && <p role="alert" className="w-full text-sm text-red-200">{formError}</p>}
        <Button type="button" variant="outline" onClick={onClose} className="border-[#1F222B]">
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" className="bg-[#E10600] hover:bg-[#E10600]/90" disabled={uploadingVideo || uploadingAttachment || createMeeting.isPending || updateMeeting.isPending} >
          <Save className="w-4 h-4 mr-2" />
          {meeting ? 'Salvar Alterações' : 'Registrar Reunião'}
        </Button>
      </div>
    </form>
  );
}