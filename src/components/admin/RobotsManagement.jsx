import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { uploadToGoogleDrive } from '@/api/googleDriveClient';
import { 
  Bot, Plus, Edit2, Trash2, HardDrive, 
  ExternalLink, Upload, ImageIcon, Loader2, 
  AlertTriangle, Layers
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Badge from '@/components/common/Badge';
import SafeImage from '@/components/common/SafeImage';
import { loadAdminDraft, saveAdminDraft, clearAdminDraft } from '@/lib/adminDrafts';

export default function RobotsManagement() {
  const queryClient = useQueryClient();
  const savedDraft = loadAdminDraft('robots');

  const [showForm, setShowForm] = useState(Boolean(savedDraft?.isOpen));
  const [editingRobot, setEditingRobot] = useState(
    savedDraft?.mode === 'edit' && savedDraft?.recordId
      ? { id: savedDraft.recordId, ...(savedDraft.data || {}) }
      : null
  );

  const emptyForm = {
    name: '',
    category: 'FRC',
    year: new Date().getFullYear(),
    season_name: '',
    season_id: '',
    game_objective: '',
    description: '',
    cad_url: '',
    image_url: '',
    is_current: false
  };

  const [form, setForm] = useState(savedDraft?.data || emptyForm);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  // Sincroniza rascunho de sessão para evitar perdas acidentais
  useEffect(() => {
    if (showForm) {
      saveAdminDraft('robots', {
        isOpen: true,
        mode: editingRobot ? 'edit' : 'create',
        recordId: editingRobot?.id || null,
        data: form
      });
    } else {
      clearAdminDraft('robots');
    }
  }, [showForm, editingRobot, form]);

  const { data: robots = [], isLoading: isLoadingRobots } = useQuery({
    queryKey: ['admin-robots'],
    queryFn: () => base44.entities.Robot.list('-created_at'),
  });

  const { data: seasons = [] } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => base44.entities.Season.list('-year'),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingRobot(null);
    setUploadingImage(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (robot) => {
    const editData = {
      name: robot.name || '',
      category: robot.category || 'FRC',
      year: robot.year || new Date().getFullYear(),
      season_name: robot.season_name || '',
      season_id: robot.season_id || '',
      game_objective: robot.game_objective || '',
      description: robot.description || '',
      cad_url: robot.cad_url || robot.cad_link || '',
      image_url: robot.image_url || (Array.isArray(robot.images) ? robot.images[0] : '') || '',
      is_current: Boolean(robot.is_current || robot.is_active)
    };
    setEditingRobot(robot);
    setForm(editData);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
    clearAdminDraft('robots');
  };

  const createRobot = useMutation({
    mutationFn: (data) => base44.entities.Robot.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-robots'] });
      clearAdminDraft('robots');
      closeForm();
      toast.success('Robô cadastrado com sucesso!');
    },
    onError: (err) => {
      console.error('Erro ao criar robô:', err);
      toast.error('Erro ao cadastrar robô: ' + (err.message || 'Verifique as permissões de administrador.'));
    }
  });

  const updateRobot = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Robot.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-robots'] });
      clearAdminDraft('robots');
      closeForm();
      toast.success('Robô atualizado com sucesso!');
    },
    onError: (err) => {
      console.error('Erro ao atualizar robô:', err);
      toast.error('Erro ao atualizar robô: ' + (err.message || 'Verifique as permissões de administrador.'));
    }
  });

  const deleteRobot = useMutation({
    mutationFn: (id) => base44.entities.Robot.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-robots'] });
      setDeleteCandidate(null);
      toast.success('Robô excluído com sucesso!');
    },
    onError: (err) => {
      console.error('Erro ao excluir robô:', err);
      toast.error('Erro ao excluir robô: ' + (err.message || 'Verifique as permissões de administrador.'));
    }
  });

  const handleImageUpload = async (e) => {
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
    const toastId = toast.loading('Enviando foto do robô para o Google Drive institucional (03. Robos)...');
    try {
      const uploadResult = await uploadToGoogleDrive({
        file,
        context: 'robots'
      });

      if (!uploadResult || !uploadResult.directUrl) {
        throw new Error('Servidor não retornou o identificador direto da mídia.');
      }

      setForm(prev => ({
        ...prev,
        image_url: uploadResult.directUrl
      }));

      toast.success('Foto do robô salva no Google Drive com sucesso!', { id: toastId });
    } catch (err) {
      console.error('[RobotsManagement] Erro no upload para Google Drive:', err);
      toast.error(`Falha no upload da foto: ${err.message || 'Erro de conexão com o Google Drive.'}`, { id: toastId });
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    setForm(prev => ({ ...prev, image_url: '' }));
    toast.info('Foto removida do formulário. Salve as alterações para confirmar.');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Informe o nome do robô.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      category: form.category || 'FRC',
      year: parseInt(form.year, 10) || new Date().getFullYear(),
      season_name: form.season_name?.trim() || '',
      season_id: form.season_id || null,
      game_objective: form.game_objective?.trim() || '',
      description: form.description?.trim() || '',
      cad_url: form.cad_url?.trim() || '',
      image_url: form.image_url || '',
      is_current: Boolean(form.is_current)
    };

    if (editingRobot) {
      updateRobot.mutate({ id: editingRobot.id, data: payload });
    } else {
      createRobot.mutate(payload);
    }
  };

  const isDriveImage = (url) => url && typeof url === 'string' && url.startsWith('/api/media/');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#E10600]" />
            Gerenciar Robôs das Temporadas
          </h2>
          <p className="text-sm text-[#B8BDC7]">
            Cadastre os robôs de competição, fotos oficiais no Google Drive, links de CAD e dados técnicos.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[#E10600] hover:bg-[#E10600]/90 text-white font-medium">
          <Plus className="w-4 h-4 mr-2" />
          Novo Robô
        </Button>
      </div>

      {isLoadingRobots ? (
        <div className="py-16 text-center">
          <LoadingSpinner text="Carregando catálogo de robôs..." />
        </div>
      ) : robots.length === 0 ? (
        <div className="text-center py-16 bg-[#111217] border border-[#1F222B] rounded-2xl p-8">
          <Bot className="w-12 h-12 text-[#1F222B] mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">Nenhum robô cadastrado</h3>
          <p className="text-sm text-[#B8BDC7] mb-4">Adicione o primeiro robô da equipe para exibição no portal.</p>
          <Button onClick={openCreate} className="bg-[#E10600] hover:bg-[#E10600]/90 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Cadastrar Robô
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {robots.map((robot) => {
            const hasDriveImg = isDriveImage(robot.image_url);
            const isCurrent = robot.is_current || robot.is_active;

            return (
              <div 
                key={robot.id} 
                className="bg-[#111217] border border-[#1F222B] rounded-2xl overflow-hidden flex flex-col justify-between hover:border-[#1F222B]/90 transition-all group"
              >
                {/* Visual da Imagem */}
                <div className="relative w-full h-48 bg-[#0B0B0D] flex items-center justify-center p-3 border-b border-[#1F222B]/60">
                  <SafeImage
                    src={robot.image_url}
                    alt={robot.name}
                    fit="contain"
                    allowEnlarge={true}
                    enlargeTitle="Abrir foto técnica em nova guia"
                    containerClassName="w-full h-full"
                    fallbackIcon={<Bot className="w-12 h-12 text-[#1F222B]" />}
                  />
                  
                  <div className="absolute top-2 left-2 flex gap-1 pointer-events-none">
                    <Badge variant={robot.category?.toLowerCase() || 'default'}>
                      {robot.category || 'FRC'}
                    </Badge>
                    {isCurrent && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm">
                        Robô Atual
                      </span>
                    )}
                  </div>

                  <div className="absolute top-2 right-2 flex gap-1 pointer-events-none">
                    {hasDriveImg && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm" title="Foto hospedada no Google Drive institucional">
                        <HardDrive className="w-3 h-3" />
                        Drive
                      </span>
                    )}
                  </div>
                </div>

                {/* Conteúdo textual */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-white text-lg">{robot.name}</h3>
                      <span className="text-xs font-mono font-medium text-[#B8BDC7] shrink-0">
                        {robot.year || 'Ano N/D'}
                      </span>
                    </div>

                    {robot.season_name && (
                      <p className="text-xs text-[#E10600] font-semibold mb-2 flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {robot.season_name}
                      </p>
                    )}

                    {robot.game_objective && (
                      <p className="text-xs text-zinc-300 font-medium line-clamp-2 mb-2 bg-[#0B0B0D] p-2 rounded border border-[#1F222B]">
                        🎯 {robot.game_objective}
                      </p>
                    )}

                    {robot.description && (
                      <p className="text-xs text-[#B8BDC7] line-clamp-2 mb-3">
                        {robot.description}
                      </p>
                    )}

                    {robot.cad_url && (
                      <a
                        href={robot.cad_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#E10600] hover:underline inline-flex items-center gap-1 mb-2 font-mono truncate max-w-full"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        Acessar modelo CAD
                      </a>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 pt-4 border-t border-[#1F222B] mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(robot)}
                      className="border-[#1F222B] bg-white text-zinc-900 hover:bg-zinc-100 hover:text-black flex-1 font-medium text-xs"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteCandidate(robot)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2.5"
                      title="Excluir robô"
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

      {/* Modal Unificado: Criar / Editar Robô */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="bg-[#111217] border-[#1F222B] max-w-xl max-h-[90vh] overflow-y-auto text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              {editingRobot ? (
                <>
                  <Edit2 className="w-5 h-5 text-[#E10600]" />
                  Editar Robô
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-[#E10600]" />
                  Novo Robô
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm text-[#B8BDC7]">
              Preencha as informações do robô de competição e vincule à sua respectiva temporada.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Label className="text-sm font-medium text-white mb-1.5 block">Nome do Robô *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Cerberus v3, Titan..."
                  className="bg-[#0B0B0D] border-[#1F222B] text-white"
                  required
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-white mb-1.5 block">Categoria *</Label>
                <Select value={form.category} onValueChange={(val) => setForm({ ...form, category: val })}>
                  <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111217] border-[#1F222B] text-white [&_*]:text-white">
                    <SelectItem value="FRC">FRC</SelectItem>
                    <SelectItem value="FTC">FTC</SelectItem>
                    <SelectItem value="FLL">FLL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-white mb-1.5 block">Ano *</Label>
                <Input
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  className="bg-[#0B0B0D] border-[#1F222B] text-white"
                  required
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-white mb-1.5 block">Vincular a uma Temporada</Label>
                <Select
                  value={form.season_id || 'none'}
                  onValueChange={(val) => {
                    if (val === 'none') {
                      setForm({ ...form, season_id: '', season_name: form.season_name });
                    } else {
                      const matched = seasons.find(s => s.id === val);
                      setForm({ 
                        ...form, 
                        season_id: val, 
                        season_name: matched ? (matched.season_name || matched.theme) : form.season_name,
                        year: matched ? matched.year : form.year
                      });
                    }
                  }}
                >
                  <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B] text-white">
                    <SelectValue placeholder="Selecione a temporada" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111217] border-[#1F222B] text-white [&_*]:text-white">
                    <SelectItem value="none">Personalizada / Sem vínculo direto</SelectItem>
                    {seasons.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.season_name || s.theme} ({s.year})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">Nome da Temporada / Tema</Label>
              <Input
                value={form.season_name}
                onChange={(e) => setForm({ ...form, season_name: e.target.value })}
                placeholder="Ex: REEFSCAPE 2025 ou CHARGED UP"
                className="bg-[#0B0B0D] border-[#1F222B] text-white"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">Objetivo / Estratégia no Jogo</Label>
              <Input
                value={form.game_objective}
                onChange={(e) => setForm({ ...form, game_objective: e.target.value })}
                placeholder="Ex: Ciclos rápidos de Coral nível 4 e subida em gaiola profunda"
                className="bg-[#0B0B0D] border-[#1F222B] text-white"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">Descrição Técnica</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Mecanismos principais, drivetrain, manipuladores, sensores..."
                rows={3}
                className="bg-[#0B0B0D] border-[#1F222B] text-white resize-none"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">Link do Modelo CAD (Onshape / Fusion)</Label>
              <Input
                value={form.cad_url}
                onChange={(e) => setForm({ ...form, cad_url: e.target.value })}
                placeholder="https://cad.onshape.com/documents/..."
                className="bg-[#0B0B0D] border-[#1F222B] text-white font-mono text-xs"
              />
            </div>

            {/* Switch de Robô Atual */}
            <div className="flex items-center justify-between p-3 bg-[#0B0B0D] border border-[#1F222B] rounded-lg">
              <div>
                <Label className="text-sm font-medium text-white block cursor-pointer">Definir como Robô Atual da Equipe</Label>
                <p className="text-xs text-[#B8BDC7]">Destaca este robô na página inicial e na vitrine de robótica.</p>
              </div>
              <Switch
                checked={form.is_current}
                onCheckedChange={(checked) => setForm({ ...form, is_current: checked })}
              />
            </div>

            {/* Upload de Imagem com Google Drive */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium text-white">Foto Oficial do Robô</Label>
                <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-emerald-400" />
                  Google Drive institucional (03. Robos)
                </span>
              </div>

              {form.image_url ? (
                <div className="p-3 bg-[#0B0B0D] border border-[#1F222B] rounded-lg space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 shrink-0 relative rounded-md overflow-hidden border border-[#1F222B] bg-[#111217]">
                      <SafeImage
                        src={form.image_url}
                        alt="Pré-visualização"
                        fit="contain"
                        allowEnlarge={true}
                        containerClassName="w-full h-full p-1"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {isDriveImage(form.image_url) ? (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <HardDrive className="w-3 h-3" />
                            Google Drive (Ativo)
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            URL Externa
                          </span>
                        )}
                      </div>
                      <a
                        href={form.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#E10600] hover:underline flex items-center gap-1 truncate"
                        title="Abrir imagem original em nova guia"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{form.image_url}</span>
                      </a>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveImage}
                      disabled={uploadingImage}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2"
                      title="Remover foto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="pt-2 border-t border-[#1F222B]/60 flex items-center gap-2">
                    <Label htmlFor="robot-img-replace" className="cursor-pointer text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 py-1 px-2.5 rounded bg-[#111217] border border-[#1F222B] hover:border-zinc-500 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      Substituir foto no Google Drive
                    </Label>
                    <input
                      id="robot-img-replace"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-[#1F222B] rounded-lg p-6 text-center bg-[#0B0B0D] hover:border-zinc-500 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-[#111217] border border-[#1F222B] flex items-center justify-center mx-auto mb-3">
                    <ImageIcon className="w-6 h-6 text-zinc-400" />
                  </div>
                  <p className="text-sm font-medium text-white mb-1">Upload para Google Drive institucional</p>
                  <p className="text-xs text-[#B8BDC7] mb-3">Envie a imagem do robô (PNG, JPG, WebP, GIF, SVG - até 15MB)</p>

                  <Label
                    htmlFor="robot-img-upload"
                    className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#111217] border border-[#1F222B] text-white hover:bg-zinc-800 text-sm font-medium transition-colors ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#E10600]" />
                        Enviando ao Drive...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-[#E10600]" />
                        Selecionar Foto do Robô
                      </>
                    )}
                  </Label>
                  <input
                    id="robot-img-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-[#1F222B]">
              <Button
                type="button"
                variant="outline"
                onClick={closeForm}
                disabled={uploadingImage || createRobot.isPending || updateRobot.isPending}
                className="border-[#1F222B] text-[#B8BDC7] hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={uploadingImage || createRobot.isPending || updateRobot.isPending}
                className="bg-[#E10600] hover:bg-[#E10600]/90 text-white font-medium min-w-[120px]"
              >
                {(createRobot.isPending || updateRobot.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : editingRobot ? (
                  'Salvar Alterações'
                ) : (
                  'Cadastrar Robô'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={!!deleteCandidate} onOpenChange={(open) => { if (!open) setDeleteCandidate(null); }}>
        <DialogContent className="bg-[#111217] border-[#1F222B] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Excluir Robô
            </DialogTitle>
            <DialogDescription className="text-[#B8BDC7] text-sm pt-2">
              Tem certeza que deseja excluir permanentemente o robô <strong className="text-white">"{deleteCandidate?.name}"</strong> ({deleteCandidate?.year})? Esta ação não pode ser desfeita no banco de dados.
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
                  deleteRobot.mutate(deleteCandidate.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-medium"
              disabled={deleteRobot.isPending}
            >
              {deleteRobot.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir Permanentemente'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
