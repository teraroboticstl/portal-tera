import { usePageVisibility } from '@/lib/usePageVisibility';
import { format } from 'date-fns';
import { requestDeadline } from '@/api/requestDeadline';
import PortalMedia from '@/components/common/PortalMedia';
import { RECORD_PROGRAMS } from '@/lib/modalities';
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Save, X, Plus, Trash2, FileText, Video, Film } from 'lucide-react';
import { useDraft } from './useDraft';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const PROGRAMS = [...RECORD_PROGRAMS, 'Geral'];
const CONCLUSIONS = ['Aprovado', 'Refazer', 'Cancelado'];

export default function PrototypeForm({ prototype = null, onClose, onSuccess, initialProgram = 'FRC' }) {
  const queryClient = useQueryClient();
  const {canShowModality}=usePageVisibility();
  const allowedPrograms=PROGRAMS.filter(canShowModality);
  const defaultProgram=allowedPrograms.includes(initialProgram)?initialProgram:(allowedPrograms[0] || 'Geral');
  const [formError,setFormError]=useState('');
  const isEditing = !!prototype;
  const { form, setForm, hasDraft, clearDraft } = useDraft('draft_prototype', {
    date: format(new Date(), 'yyyy-MM-dd'),
    program: defaultProgram,
    subsystem: '',
    hypothesis: '',
    test_method: '',
    result: '',
    what_didnt_work: '',
    lessons_learned: '',
    improvements: '',
    decision_reason: '',
    metrics_kpis: '',
    conclusion: 'Aprovado',
    evidence_links: [],
    evidence_images: [],
    video_urls: [],
  }, isEditing);

  const [editForm, setEditForm] = useState(isEditing ? {
    date: prototype.date,
    program: prototype.program,
    subsystem: prototype.subsystem || '',
    hypothesis: prototype.hypothesis || '',
    test_method: prototype.test_method || '',
    result: prototype.result || '',
    what_didnt_work: prototype.what_didnt_work || '',
    lessons_learned: prototype.lessons_learned || '',
    improvements: prototype.improvements || '',
    decision_reason: prototype.decision_reason || '',
    metrics_kpis: prototype.metrics_kpis || '',
    conclusion: prototype.conclusion || 'Aprovado',
    evidence_links: prototype.evidence_links || [],
    evidence_images: prototype.evidence_images || [],
    video_urls: prototype.video_urls || [],
  } : null);

  const currentForm = isEditing ? editForm : form;
  const setCurrentForm = isEditing ? setEditForm : setForm;

  const [newLink, setNewLink] = useState('');
  const [newVideo, setNewVideo] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const createPrototype = useMutation({
    mutationFn: (data) => requestDeadline(() => base44.entities.PrototypeTest.create(data)),
    onError: () => setFormError('Não foi possível confirmar o salvamento. Seu texto foi preservado. Confira sua conexão, seu nível de acesso e a lista antes de tentar novamente.'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prototypes'] });
      clearDraft();
      toast.success('Protótipo registrado!');
      onSuccess?.();
      onClose?.();
    }
  });

  const updatePrototype = useMutation({
    mutationFn: ({ id, data }) => requestDeadline(() => base44.entities.PrototypeTest.update(id, data)),
    onError: () => setFormError('Não foi possível confirmar o salvamento. Seu texto foi preservado. Confira sua conexão, seu nível de acesso e a lista antes de tentar novamente.'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prototypes'] });
      toast.success('Protótipo atualizado!');
      onSuccess?.();
      onClose?.();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (uploadingVideo || uploading) { setFormError('Aguarde o envio do anexo terminar antes de salvar.'); return; }
    setFormError('');
    if (!currentForm.subsystem || !currentForm.hypothesis || !currentForm.test_method) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    if (prototype) {
      updatePrototype.mutate({ id: prototype.id, data: currentForm });
    } else {
      createPrototype.mutate(currentForm);
    }
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
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 4 MB.');
      return;
    }

    const input=e.target;
    setUploading(true);
    setFormError('');
    try {
    const { file_url } = await base44.integrations.Core.UploadFile({ file, context: 'seasons', program: currentForm.program });
    setCurrentForm(previous => ({ ...previous, evidence_images: [...(previous.evidence_images || []), file_url] }));
    toast.success('Imagem enviada!');
    } catch { setFormError('Falha no envio. O arquivo não foi anexado; você pode salvar o texto sem ele ou tentar novamente. Limite: 4 MB por arquivo.'); }
    finally { setUploading(false); input.value=''; }
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
          <button type="button" onClick={() => { setCurrentForm({ date: format(new Date(), 'yyyy-MM-dd'), program: 'FRC', subsystem: '', hypothesis: '', test_method: '', result: '', what_didnt_work: '', lessons_learned: '', improvements: '', decision_reason: '', metrics_kpis: '', conclusion: 'Aprovado', evidence_links: [], evidence_images: [] }); clearDraft(); }} className="text-xs underline hover:text-yellow-300">
            Limpar rascunho
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="Prototype-date">Data *</Label>
          <Input id="Prototype-date"
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
        <div>
          <Label htmlFor="Prototype-subsystem">Subsistema *</Label>
          <Input id="Prototype-subsystem"
            value={currentForm.subsystem}
            onChange={(e) => setCurrentForm({ ...currentForm, subsystem: e.target.value })}
            placeholder="Ex: Drivetrain, Intake, Arm..."
            className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400"
            required
          />
        </div>
      </div>

      {/* Judge Ready Pattern */}
      <div className="bg-[#1A1D24] border border-[#2A2D36] rounded-xl p-4 space-y-4">
        <h3 className="font-bold text-[#E10600]">🧪 Teste (Padrão Judge Ready)</h3>
        
        <div>
          <Label htmlFor="Prototype-hypothesis">O que tentamos / Hipótese *</Label>
          <Textarea id="Prototype-hypothesis"
            value={currentForm.hypothesis}
            onChange={(e) => setCurrentForm({ ...currentForm, hypothesis: e.target.value })}
            placeholder="Descreva a hipótese ou o que foi testado..."
            className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
            required
          />
        </div>

        <div>
          <Label htmlFor="Prototype-test_method">Como testamos *</Label>
          <Textarea id="Prototype-test_method"
            value={currentForm.test_method}
            onChange={(e) => setCurrentForm({ ...currentForm, test_method: e.target.value })}
            placeholder="Descreva o método de teste..."
            className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
            required
          />
        </div>

        <div>
          <Label htmlFor="Prototype-result">Resultado</Label>
          <Textarea id="Prototype-result"
            value={currentForm.result}
            onChange={(e) => setCurrentForm({ ...currentForm, result: e.target.value })}
            placeholder="O que aconteceu..."
            className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="Prototype-what_didnt_work">O que NÃO funcionou</Label>
            <Textarea id="Prototype-what_didnt_work"
              value={currentForm.what_didnt_work}
              onChange={(e) => setCurrentForm({ ...currentForm, what_didnt_work: e.target.value })}
              placeholder="Problemas encontrados..."
              className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
            />
          </div>
          <div>
            <Label htmlFor="Prototype-lessons_learned">O que aprendemos</Label>
            <Textarea id="Prototype-lessons_learned"
              value={currentForm.lessons_learned}
              onChange={(e) => setCurrentForm({ ...currentForm, lessons_learned: e.target.value })}
              placeholder="Lições aprendidas..."
              className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="Prototype-improvements">O que melhoramos</Label>
            <Textarea id="Prototype-improvements"
              value={currentForm.improvements}
              onChange={(e) => setCurrentForm({ ...currentForm, improvements: e.target.value })}
              placeholder="Melhorias implementadas..."
              className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
            />
          </div>
          <div>
            <Label htmlFor="Prototype-decision_reason">Por que decidimos isso</Label>
            <Textarea id="Prototype-decision_reason"
              value={currentForm.decision_reason}
              onChange={(e) => setCurrentForm({ ...currentForm, decision_reason: e.target.value })}
              placeholder="Justificativa da decisão..."
              className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
            />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="Prototype-metrics_kpis">Métricas / KPIs</Label>
          <Textarea id="Prototype-metrics_kpis"
            value={currentForm.metrics_kpis}
            onChange={(e) => setCurrentForm({ ...currentForm, metrics_kpis: e.target.value })}
            placeholder="Dados mensuráveis..."
            className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
          />
        </div>
        <div>
          <Label>Conclusão *</Label>
          <Select value={currentForm.conclusion} onValueChange={(v) => setCurrentForm({ ...currentForm, conclusion: v })}>
            <SelectTrigger className="bg-[#1F222B] border-[#2A2D36] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#111217] border-[#1F222B] text-white [&_*]:text-white">
              {CONCLUSIONS.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              <button type="button" onClick={() => removeLink(i)} className="text-red-500">
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
              <PortalMedia src={img} alt={`Evidência ${i + 1}`} className="w-full h-24 object-cover rounded-lg" />
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
        <Button type="submit" className="bg-[#E10600] hover:bg-[#E10600]/90" disabled={uploadingVideo || uploading || createPrototype.isPending || updatePrototype.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {prototype ? 'Salvar Alterações' : 'Registrar Teste'}
        </Button>
      </div>
    </form>
  );
}