import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { uploadToGoogleDrive } from '@/api/googleDriveClient';
import { 
  FolderOpen, Plus, Edit2, Trash2, HardDrive, 
  Upload, Loader2, AlertTriangle, 
  ExternalLink, Calendar, X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import LoadingSpinner from '@/components/common/LoadingSpinner';
import SafeImage from '@/components/common/SafeImage';
import { loadAdminDraft, saveAdminDraft, clearAdminDraft } from '@/lib/adminDrafts';

const TAG_OPTIONS = ['Educação', 'Engenharia', 'Impacto Social', 'Tecnologia', 'Comunidade', 'Robótica'];

export default function ProjectsManagement() {
  const queryClient = useQueryClient();
  const savedDraft = loadAdminDraft('projects');

  const [showForm, setShowForm] = useState(Boolean(savedDraft?.isOpen));
  const [editingProject, setEditingProject] = useState(
    savedDraft?.mode === 'edit' && savedDraft?.recordId
      ? { id: savedDraft.recordId, ...(savedDraft.data || {}) }
      : null
  );

  const emptyForm = {
    title: '',
    description: '',
    date_period: '',
    tags: [],
    link: '',
    status: 'active'
  };

  const [form, setForm] = useState(savedDraft?.data || emptyForm);
  const [images, setImages] = useState(savedDraft?.images || []);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  // Sincroniza rascunho de sessão
  useEffect(() => {
    if (showForm) {
      saveAdminDraft('projects', {
        isOpen: true,
        mode: editingProject ? 'edit' : 'create',
        recordId: editingProject?.id || null,
        data: form,
        images
      });
    } else {
      clearAdminDraft('projects');
    }
  }, [showForm, editingProject, form, images]);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['admin-projects'],
    queryFn: () => base44.entities.Project.list('-created_date'),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setImages([]);
    setEditingProject(null);
    setUploadingImage(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (project) => {
    const editData = {
      title: project.title || '',
      description: project.description || '',
      date_period: project.date_period || '',
      tags: Array.isArray(project.tags) ? [...project.tags] : [],
      link: project.link || '',
      status: project.status || 'active'
    };
    setEditingProject(project);
    setForm(editData);
    setImages(Array.isArray(project.images) ? [...project.images] : (project.image_url ? [project.image_url] : []));
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
    clearAdminDraft('projects');
  };

  const createProject = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      clearAdminDraft('projects');
      closeForm();
      toast.success('Projeto social criado com sucesso!');
    },
    onError: (err) => {
      console.error('Erro ao criar projeto:', err);
      toast.error('Erro ao criar projeto: ' + (err.message || 'Verifique as permissões de administrador.'));
    }
  });

  const updateProject = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      clearAdminDraft('projects');
      closeForm();
      toast.success('Projeto atualizado com sucesso!');
    },
    onError: (err) => {
      console.error('Erro ao atualizar projeto:', err);
      toast.error('Erro ao atualizar projeto: ' + (err.message || 'Verifique as permissões de administrador.'));
    }
  });

  const deleteProject = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      setDeleteCandidate(null);
      toast.success('Projeto excluído com sucesso!');
    },
    onError: (err) => {
      console.error('Erro ao remover projeto:', err);
      toast.error('Erro ao remover projeto: ' + (err.message || 'Verifique as permissões de administrador.'));
    }
  });

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedMimeTypes.includes(file.type)) {
      toast.error('Formato não suportado. Envie imagens JPG, PNG, WebP, GIF ou SVG.');
      return;
    }

    const maxSizeBytes = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSizeBytes) {
      toast.error('A imagem excede o tamanho máximo de 15MB permitido.');
      return;
    }

    setUploadingImage(true);
    const toastId = toast.loading('Enviando foto para o Google Drive institucional (01. Projetos)...');
    try {
      const uploadResult = await uploadToGoogleDrive({
        file,
        context: 'projects'
      });

      if (!uploadResult || !uploadResult.directUrl) {
        throw new Error('Servidor não retornou o identificador direto da mídia.');
      }

      setImages(prev => [...prev, uploadResult.directUrl]);
      toast.success('Foto salva no Google Drive com sucesso!', { id: toastId });
    } catch (err) {
      console.error('[ProjectsManagement] Erro no upload:', err);
      toast.error(`Falha no envio da imagem: ${err.message || 'Erro ao conectar ao Google Drive.'}`, { id: toastId });
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleRemoveImageByIndex = (indexToRemove) => {
    setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
    toast.info('Imagem removida do projeto.');
  };

  const toggleTag = (tag) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag) 
        : [...prev.tags, tag]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Informe o título do projeto.');
      return;
    }
    if (!form.description.trim()) {
      toast.error('Informe a descrição do projeto.');
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      date_period: form.date_period?.trim() || '',
      tags: form.tags || [],
      link: form.link?.trim() || '',
      status: form.status || 'active',
      images: images
    };

    if (editingProject) {
      updateProject.mutate({ id: editingProject.id, data: payload });
    } else {
      createProject.mutate(payload);
    }
  };

  const isDriveImage = (url) => url && typeof url === 'string' && url.startsWith('/api/media/');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-[#E10600]" />
            Gerenciar Projetos Sociais
          </h2>
          <p className="text-sm text-[#B8BDC7]">
            Cadastre as iniciativas comunitárias, histórico de ações e acervo de fotos no Google Drive.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[#E10600] hover:bg-[#E10600]/90 text-white font-medium">
          <Plus className="w-4 h-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center">
          <LoadingSpinner text="Carregando projetos da equipe..." />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-[#111217] border border-[#1F222B] rounded-2xl p-8">
          <FolderOpen className="w-12 h-12 text-[#1F222B] mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">Nenhum projeto cadastrado</h3>
          <p className="text-sm text-[#B8BDC7] mb-4">Adicione o primeiro projeto social para exibição na vitrine de impacto.</p>
          <Button onClick={openCreate} className="bg-[#E10600] hover:bg-[#E10600]/90 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Cadastrar Projeto
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const projectImages = Array.isArray(project.images) ? project.images : (project.image_url ? [project.image_url] : []);
            const primaryImg = projectImages[0];
            const hasDriveImg = isDriveImage(primaryImg);

            return (
              <div 
                key={project.id} 
                className="bg-[#111217] border border-[#1F222B] rounded-2xl overflow-hidden flex flex-col justify-between hover:border-[#E10600]/50 transition-all group"
              >
                {/* Banner de Imagem com Enquadramento SafeImage */}
                <div className="relative pt-6 pb-4 px-4 flex items-center justify-center bg-[#0B0B0D]/60 border-b border-[#1F222B]/60">
                  <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-full overflow-hidden bg-[#111217] border-2 border-[#1F222B] group-hover:border-[#E10600] transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center flex-shrink-0">
                    <SafeImage
                      src={primaryImg}
                      alt={project.title}
                      fit="cover"
                      position="center"
                      allowEnlarge={true}
                      enlargeTitle="Abrir imagem em nova guia"
                      containerClassName="w-full h-full"
                      rounded="rounded-full"
                      fallbackIcon={<FolderOpen className="w-10 h-10 text-[#1F222B]" />}
                    />
                  </div>

                  {projectImages.length > 1 && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 bg-[#111217]/90 border border-[#1F222B] rounded-full text-[11px] text-[#B8BDC7] backdrop-blur-sm">
                      +{projectImages.length - 1} fotos
                    </div>
                  )}

                  {hasDriveImg && (
                    <div className="absolute top-3 left-3">
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm" title="Armazenado no Google Drive">
                        <HardDrive className="w-3 h-3" />
                        Drive
                      </span>
                    </div>
                  )}
                </div>

                {/* Conteúdo textual */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white text-lg mb-1">{project.title}</h3>
                    {project.date_period && (
                      <p className="text-xs text-[#B8BDC7] flex items-center gap-1 mb-2">
                        <Calendar className="w-3 h-3 text-[#E10600]" />
                        {project.date_period}
                      </p>
                    )}
                    <p className="text-sm text-[#B8BDC7] line-clamp-3 mb-3 leading-relaxed">
                      {project.description}
                    </p>

                    {/* Tags */}
                    {project.tags && project.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {project.tags.map((tag) => (
                          <span 
                            key={tag}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-[#1F222B] text-zinc-300 border border-zinc-700/50"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {project.link && (
                      <a
                        href={project.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#E10600] hover:underline flex items-center gap-1 mb-2 truncate"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{project.link}</span>
                      </a>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 pt-4 border-t border-[#1F222B] mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(project)}
                      className="border-[#1F222B] bg-white text-zinc-900 hover:bg-zinc-100 hover:text-black flex-1 font-medium text-xs"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteCandidate(project)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2.5"
                      title="Excluir projeto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Unificado: Criar / Editar Projeto */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="bg-[#111217] border-[#1F222B] max-w-xl max-h-[90vh] overflow-y-auto text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              {editingProject ? (
                <>
                  <Edit2 className="w-5 h-5 text-[#E10600]" />
                  Editar Projeto Social
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-[#E10600]" />
                  Novo Projeto Social
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm text-[#B8BDC7]">
              Preencha os detalhes da ação social e faça upload das fotos oficiais no Google Drive.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">Título do Projeto *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Oficinas STEAM para Escolas Públicas"
                className="bg-[#0B0B0D] border-[#1F222B] text-white"
                required
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">Descrição Completa *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descreva o impacto do projeto, público atendido, metodologias e resultados..."
                rows={3}
                className="bg-[#0B0B0D] border-[#1F222B] text-white resize-none"
                required
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">Período de Realização</Label>
              <Input
                value={form.date_period}
                onChange={(e) => setForm({ ...form, date_period: e.target.value })}
                placeholder="Ex: Jan 2025 – Presente ou Temporada 2024/2025"
                className="bg-[#0B0B0D] border-[#1F222B] text-white text-xs"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">Categorias / Tags Temáticas</Label>
              <div className="flex flex-wrap gap-1.5">
                {TAG_OPTIONS.map((tag) => {
                  const isSelected = form.tags?.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        isSelected 
                          ? 'bg-[#E10600] border-[#E10600] text-white' 
                          : 'bg-[#0B0B0D] border-[#1F222B] text-[#B8BDC7] hover:border-zinc-500'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">Link Externo / Documentação (opcional)</Label>
              <Input
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="https://..."
                className="bg-[#0B0B0D] border-[#1F222B] text-white font-mono text-xs"
              />
            </div>

            {/* Galeria de Fotos no Google Drive */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium text-white">Fotos do Projeto</Label>
                <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-emerald-400" />
                  Google Drive institucional (01. Projetos)
                </span>
              </div>

              {/* Botão de Upload */}
              <div className="border border-dashed border-[#1F222B] rounded-lg p-4 text-center bg-[#0B0B0D] hover:border-zinc-500 transition-colors">
                <Label
                  htmlFor="project-img-upload"
                  className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#111217] border border-[#1F222B] text-white hover:bg-zinc-800 text-xs font-medium transition-colors ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#E10600]" />
                      Enviando foto ao Google Drive...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-[#E10600]" />
                      Adicionar Foto ao Projeto
                    </>
                  )}
                </Label>
                <input
                  id="project-img-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  onChange={handleUploadImage}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </div>

              {/* Miniaturas das Fotos */}
              {images.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-[#B8BDC7]">Fotos vinculadas ({images.length}):</p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {images.map((url, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border border-[#1F222B] bg-[#0B0B0D] aspect-square">
                        <SafeImage
                          src={url}
                          alt=""
                          fit="cover"
                          allowEnlarge={true}
                          containerClassName="w-full h-full"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImageByIndex(i)}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-600/90 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow"
                          title="Remover foto do projeto"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        {isDriveImage(url) && (
                          <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded text-[8px] font-bold bg-emerald-500/80 text-white backdrop-blur-sm pointer-events-none">
                            Drive
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-[#1F222B]">
              <Button
                type="button"
                variant="outline"
                onClick={closeForm}
                disabled={uploadingImage || createProject.isPending || updateProject.isPending}
                className="border-[#1F222B] text-[#B8BDC7] hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={uploadingImage || createProject.isPending || updateProject.isPending}
                className="bg-[#E10600] hover:bg-[#E10600]/90 text-white font-medium min-w-[120px]"
              >
                {(createProject.isPending || updateProject.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : editingProject ? (
                  'Salvar Alterações'
                ) : (
                  'Criar Projeto'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <Dialog open={!!deleteCandidate} onOpenChange={(open) => { if (!open) setDeleteCandidate(null); }}>
        <DialogContent className="bg-[#111217] border-[#1F222B] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Excluir Projeto
            </DialogTitle>
            <DialogDescription className="text-[#B8BDC7] text-sm pt-2">
              Tem certeza que deseja excluir o projeto <strong className="text-white">"{deleteCandidate?.title}"</strong>? Esta ação removerá os dados do banco de dados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteCandidate(null)}
              className="border-[#1F222B] text-[#B8BDC7] hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (deleteCandidate) {
                  deleteProject.mutate(deleteCandidate.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-medium"
              disabled={deleteProject.isPending}
            >
              {deleteProject.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir Projeto'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
