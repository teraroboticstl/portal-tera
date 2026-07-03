import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Save, X, Plus, Trash2, Upload, FileText, Video, Film } from 'lucide-react';
import { useDraft } from './useDraft';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const PROGRAMS = ['FRC', 'FTC', 'FLL'];
const CONCLUSIONS = ['Aprovado', 'Refazer', 'Cancelado'];

export default function PrototypeForm({ prototype = null, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const isEditing = !!prototype;
  const { form, setForm, hasDraft, clearDraft } = useDraft('draft_prototype', {
    date: new Date().toISOString().split('T')[0],
    program: 'FRC',
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
    mutationFn: (data) => base44.entities.PrototypeTest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prototypes'] });
      clearDraft();
      toast.success('Protótipo registrado!');
      onSuccess?.();
      onClose?.();
    }
  });

  const updatePrototype = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PrototypeTest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prototypes'] });
      toast.success('Protótipo atualizado!');
      onSuccess?.();
      onClose?.();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
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
      {hasDraft && !isEditing && (
        <div className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2 text-yellow-400 text-sm">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>Rascunho salvo automaticamente</span>
          </div>
          <button type="button" onClick={() => { clearDraft(); setCurrentForm({ date: new Date().toISOString().split('T')[0], program: 'FRC', subsystem: '', hypothesis: '', test_method: '', result: '', what_didnt_work: '', lessons_learned: '', improvements: '', decision_reason: '', metrics_kpis: '', conclusion: 'Aprovado', evidence_links: [], evidence_images: [] }); }} className="text-xs underline hover:text-yellow-300">
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
          <Label>Subsistema *</Label>
          <Input
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
          <Label>O que tentamos / Hipótese *</Label>
          <Textarea
            value={currentForm.hypothesis}
            onChange={(e) => setCurrentForm({ ...currentForm, hypothesis: e.target.value })}
            placeholder="Descreva a hipótese ou o que foi testado..."
            className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
            required
          />
        </div>

        <div>
          <Label>Como testamos *</Label>
          <Textarea
            value={currentForm.test_method}
            onChange={(e) => setCurrentForm({ ...currentForm, test_method: e.target.value })}
            placeholder="Descreva o método de teste..."
            className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
            required
          />
        </div>

        <div>
          <Label>Resultado</Label>
          <Textarea
            value={currentForm.result}
            onChange={(e) => setCurrentForm({ ...currentForm, result: e.target.value })}
            placeholder="O que aconteceu..."
            className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>O que NÃO funcionou</Label>
            <Textarea
              value={currentForm.what_didnt_work}
              onChange={(e) => setCurrentForm({ ...currentForm, what_didnt_work: e.target.value })}
              placeholder="Problemas encontrados..."
              className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
            />
          </div>
          <div>
            <Label>O que aprendemos</Label>
            <Textarea
              value={currentForm.lessons_learned}
              onChange={(e) => setCurrentForm({ ...currentForm, lessons_learned: e.target.value })}
              placeholder="Lições aprendidas..."
              className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>O que melhoramos</Label>
            <Textarea
              value={currentForm.improvements}
              onChange={(e) => setCurrentForm({ ...currentForm, improvements: e.target.value })}
              placeholder="Melhorias implementadas..."
              className="bg-[#1F222B] border-[#2A2D36] text-white placeholder:text-gray-400 min-h-20"
            />
          </div>
          <div>
            <Label>Por que decidimos isso</Label>
            <Textarea
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
          <Label>Métricas / KPIs</Label>
          <Textarea
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

      <div className="flex justify-end gap-3 pt-4 border-t border-[#1F222B]">
        <Button type="button" variant="outline" onClick={onClose} className="border-[#1F222B]">
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" className="bg-[#E10600] hover:bg-[#E10600]/90" disabled={createPrototype.isPending || updatePrototype.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {prototype ? 'Salvar Alterações' : 'Registrar Teste'}
        </Button>
      </div>
    </form>
  );
}