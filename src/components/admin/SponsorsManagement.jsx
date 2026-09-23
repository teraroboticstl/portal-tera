import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { uploadToGoogleDrive } from '@/api/googleDriveClient';
import { 
  Building2, Plus, Edit2, Trash2, HardDrive, 
  ExternalLink, Upload, ImageIcon, Loader2, 
  ArrowUp, ArrowDown, AlertTriangle 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import LoadingSpinner from '@/components/common/LoadingSpinner';
import SafeImage from '@/components/common/SafeImage';
import { loadAdminDraft, saveAdminDraft, clearAdminDraft } from '@/lib/adminDrafts';

export default function SponsorsManagement() {
  const queryClient = useQueryClient();
  const savedDraft = loadAdminDraft('sponsors');

  const [showForm, setShowForm] = useState(Boolean(savedDraft?.isOpen));
  const [editingSponsor, setEditingSponsor] = useState(
    savedDraft?.mode === 'edit' && savedDraft?.recordId
      ? { id: savedDraft.recordId, ...(savedDraft.data || {}) }
      : null
  );

  const emptyForm = {
    name: '',
    category: 'Gold',
    logo_url: '',
    link: '',
    order: 0
  };

  const [form, setForm] = useState(savedDraft?.data || emptyForm);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  // Sincroniza rascunho de sessão
  useEffect(() => {
    if (showForm) {
      saveAdminDraft('sponsors', {
        isOpen: true,
        mode: editingSponsor ? 'edit' : 'create',
        recordId: editingSponsor?.id || null,
        data: form
      });
    } else {
      clearAdminDraft('sponsors');
    }
  }, [showForm, editingSponsor, form]);

  const { data: sponsors = [], isLoading } = useQuery({
    queryKey: ['admin-sponsors'],
    queryFn: () => base44.entities.Sponsor.list('order'),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingSponsor(null);
    setUploadingLogo(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (sponsor) => {
    const editData = {
      name: sponsor.name || '',
      category: sponsor.category || sponsor.tier || 'Gold',
      logo_url: sponsor.logo_url || '',
      link: sponsor.link || sponsor.website || '',
      order: sponsor.order !== undefined ? Number(sponsor.order) : 0
    };
    setEditingSponsor(sponsor);
    setForm(editData);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
    clearAdminDraft('sponsors');
  };

  const createSponsor = useMutation({
    mutationFn: (data) => base44.entities.Sponsor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sponsors'] });
      clearAdminDraft('sponsors');
      closeForm();
      toast.success('Patrocinador adicionado com sucesso!');
    },
    onError: (err) => {
      console.error('Erro ao adicionar patrocinador:', err);
      toast.error('Erro ao cadastrar patrocinador: ' + (err.message || 'Verifique as permissões de administrador.'));
    }
  });

  const updateSponsor = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Sponsor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sponsors'] });
      clearAdminDraft('sponsors');
      closeForm();
      toast.success('Patrocinador atualizado com sucesso!');
    },
    onError: (err) => {
      console.error('Erro ao atualizar patrocinador:', err);
      toast.error('Erro ao atualizar patrocinador: ' + (err.message || 'Verifique as permissões de administrador.'));
    }
  });

  const deleteSponsor = useMutation({
    mutationFn: (id) => base44.entities.Sponsor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sponsors'] });
      setDeleteCandidate(null);
      toast.success('Patrocinador removido com sucesso!');
    },
    onError: (err) => {
      console.error('Erro ao remover patrocinador:', err);
      toast.error('Erro ao remover patrocinador: ' + (err.message || 'Verifique as permissões de administrador.'));
    }
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedMimeTypes.includes(file.type)) {
      toast.error('Formato não suportado. Envie a logo em PNG, JPG, WebP ou SVG.');
      return;
    }

    const maxSizeBytes = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSizeBytes) {
      toast.error('A logo excede o tamanho máximo de 15MB permitido.');
      return;
    }

    setUploadingLogo(true);
    const toastId = toast.loading('Enviando logo para o Google Drive institucional (04. Patrocinadores)...');
    try {
      const uploadResult = await uploadToGoogleDrive({
        file,
        context: 'sponsors'
      });

      if (!uploadResult || !uploadResult.directUrl) {
        throw new Error('Servidor não retornou o identificador direto da mídia.');
      }

      setForm(prev => ({
        ...prev,
        logo_url: uploadResult.directUrl
      }));

      toast.success('Logo salva no Google Drive com sucesso!', { id: toastId });
    } catch (err) {
      console.error('[SponsorsManagement] Erro no upload da logo:', err);
      toast.error(`Falha no envio da logo: ${err.message || 'Erro de conexão com o Google Drive.'}`, { id: toastId });
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleRemoveLogo = () => {
    setForm(prev => ({ ...prev, logo_url: '' }));
    toast.info('Logo removida do formulário.');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Informe o nome do patrocinador.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      category: form.category || 'Gold',
      logo_url: form.logo_url || '',
      link: form.link?.trim() || '',
      order: parseInt(form.order, 10) || 0
    };

    if (editingSponsor) {
      updateSponsor.mutate({ id: editingSponsor.id, data: payload });
    } else {
      createSponsor.mutate(payload);
    }
  };

  const moveOrder = (sponsor, direction) => {
    const currentOrder = sponsor.order ?? 0;
    const newOrder = direction === 'up' ? Math.max(0, currentOrder - 1) : currentOrder + 1;
    updateSponsor.mutate({ id: sponsor.id, data: { ...sponsor, order: newOrder } });
  };

  const isDriveImage = (url) => url && typeof url === 'string' && url.startsWith('/api/media/');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#E10600]" />
            Gerenciar Patrocinadores
          </h2>
          <p className="text-sm text-[#B8BDC7]">
            Cadastre as empresas parceiras, logos em alta resolução no Google Drive e links institucionais.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[#E10600] hover:bg-[#E10600]/90 text-white font-medium">
          <Plus className="w-4 h-4 mr-2" />
          Novo Patrocinador
        </Button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center">
          <LoadingSpinner text="Carregando patrocinadores..." />
        </div>
      ) : sponsors.length === 0 ? (
        <div className="text-center py-16 bg-[#111217] border border-[#1F222B] rounded-2xl p-8">
          <Building2 className="w-12 h-12 text-[#1F222B] mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">Nenhum patrocinador cadastrado</h3>
          <p className="text-sm text-[#B8BDC7] mb-4">Adicione empresas parceiras para exibição no rodapé e vitrine.</p>
          <Button onClick={openCreate} className="bg-[#E10600] hover:bg-[#E10600]/90 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Cadastrar Patrocinador
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...sponsors].sort((a, b) => (a.order || 0) - (b.order || 0)).map((sponsor) => {
            const hasDriveImg = isDriveImage(sponsor.logo_url);
            return (
              <div 
                key={sponsor.id} 
                className="bg-[#111217] border border-[#1F222B] rounded-xl p-4 flex flex-col justify-between hover:border-[#1F222B]/90 transition-all"
              >
                <div>
                  {/* Quadro da Logo com fit contain */}
                  <div className="relative w-full h-24 bg-[#0B0B0D] rounded-lg flex items-center justify-center p-3 border border-[#1F222B] mb-3">
                    <SafeImage
                      src={sponsor.logo_url}
                      alt={sponsor.name}
                      fit="contain"
                      allowEnlarge={true}
                      enlargeTitle="Abrir logo em nova guia"
                      containerClassName="w-full h-full"
                      fallbackIcon={<span className="text-gray-500 text-xs font-semibold text-center">{sponsor.name}</span>}
                    />

                    {hasDriveImg && (
                      <span className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm" title="Logo armazenada no Google Drive">
                        <HardDrive className="w-2.5 h-2.5" />
                        Drive
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#E10600] bg-[#E10600]/10 px-2 py-0.5 rounded border border-[#E10600]/20 inline-block mb-1">
                      {sponsor.category || sponsor.tier || 'Apoio'}
                    </span>
                    <h3 className="font-semibold text-white text-sm line-clamp-1">{sponsor.name}</h3>
                    {sponsor.link && (
                      <a 
                        href={sponsor.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs text-[#B8BDC7] hover:text-[#E10600] flex items-center gap-1 truncate mt-0.5"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{sponsor.link}</span>
                      </a>
                    )}
                    <p className="text-[11px] text-zinc-500 mt-1">Ordem de exibição: {sponsor.order ?? 0}</p>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1 mt-4 pt-3 border-t border-[#1F222B]">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(sponsor)}
                    className="border-[#1F222B] bg-white text-zinc-900 hover:bg-zinc-100 hover:text-black text-xs h-7 px-2.5 flex-1 font-medium"
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moveOrder(sponsor, 'up')}
                    className="text-gray-400 hover:text-white h-7 px-2 text-xs"
                    title="Mover para cima"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moveOrder(sponsor, 'down')}
                    className="text-gray-400 hover:text-white h-7 px-2 text-xs"
                    title="Mover para baixo"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteCandidate(sponsor)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 px-2"
                    title="Excluir patrocinador"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Unificado: Criar / Editar Patrocinador */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="bg-[#111217] border-[#1F222B] max-w-lg max-h-[90vh] overflow-y-auto text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              {editingSponsor ? (
                <>
                  <Edit2 className="w-5 h-5 text-[#E10600]" />
                  Editar Patrocinador
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-[#E10600]" />
                  Novo Patrocinador
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm text-[#B8BDC7]">
              Preencha os dados da empresa parceira e faça upload da logo em alta resolução.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">Nome da Empresa / Parceiro *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Petrobras, Gerdau, Siemens..."
                className="bg-[#0B0B0D] border-[#1F222B] text-white"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-white mb-1.5 block">Categoria / Cota *</Label>
                <Select value={form.category} onValueChange={(val) => setForm({ ...form, category: val })}>
                  <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111217] border-[#1F222B] text-white [&_*]:text-white">
                    <SelectItem value="Master">Master (Diamante)</SelectItem>
                    <SelectItem value="Gold">Gold (Ouro)</SelectItem>
                    <SelectItem value="Silver">Silver (Prata)</SelectItem>
                    <SelectItem value="Apoio">Apoio Institucional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-white mb-1.5 block">Ordem de Exibição</Label>
                <Input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: parseInt(e.target.value, 10) || 0 })}
                  className="bg-[#0B0B0D] border-[#1F222B] text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">Link do Site Oficial</Label>
              <Input
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="https://empresa.com.br"
                className="bg-[#0B0B0D] border-[#1F222B] text-white font-mono text-xs"
              />
            </div>

            {/* Upload de Logo com Google Drive */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium text-white">Logo do Patrocinador</Label>
                <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-emerald-400" />
                  Google Drive institucional (04. Patrocinadores)
                </span>
              </div>

              {form.logo_url ? (
                <div className="p-3 bg-[#0B0B0D] border border-[#1F222B] rounded-lg space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-14 shrink-0 relative rounded-md overflow-hidden border border-[#1F222B] bg-[#111217] p-1 flex items-center justify-center">
                      <SafeImage
                        src={form.logo_url}
                        alt="Logo"
                        fit="contain"
                        allowEnlarge={true}
                        containerClassName="w-full h-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {isDriveImage(form.logo_url) ? (
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
                        href={form.logo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#E10600] hover:underline flex items-center gap-1 truncate"
                        title="Abrir logo em nova guia"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{form.logo_url}</span>
                      </a>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      disabled={uploadingLogo}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2"
                      title="Remover logo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="pt-2 border-t border-[#1F222B]/60 flex items-center gap-2">
                    <Label htmlFor="sponsor-logo-replace" className="cursor-pointer text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 py-1 px-2.5 rounded bg-[#111217] border border-[#1F222B] hover:border-zinc-500 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      Substituir logo no Google Drive
                    </Label>
                    <input
                      id="sponsor-logo-replace"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-[#1F222B] rounded-lg p-6 text-center bg-[#0B0B0D] hover:border-zinc-500 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-[#111217] border border-[#1F222B] flex items-center justify-center mx-auto mb-3">
                    <ImageIcon className="w-6 h-6 text-zinc-400" />
                  </div>
                  <p className="text-sm font-medium text-white mb-1">Upload de logo para o Google Drive institucional</p>
                  <p className="text-xs text-[#B8BDC7] mb-3">Formatos aceitos: PNG (preferencialmente transparente), SVG, JPG ou WebP (até 15MB)</p>

                  <Label
                    htmlFor="sponsor-logo-upload"
                    className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#111217] border border-[#1F222B] text-white hover:bg-zinc-800 text-sm font-medium transition-colors ${uploadingLogo ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {uploadingLogo ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#E10600]" />
                        Enviando ao Drive...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-[#E10600]" />
                        Selecionar Logo da Empresa
                      </>
                    )}
                  </Label>
                  <input
                    id="sponsor-logo-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
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
                disabled={uploadingLogo || createSponsor.isPending || updateSponsor.isPending}
                className="border-[#1F222B] text-[#B8BDC7] hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={uploadingLogo || createSponsor.isPending || updateSponsor.isPending}
                className="bg-[#E10600] hover:bg-[#E10600]/90 text-white font-medium min-w-[120px]"
              >
                {(createSponsor.isPending || updateSponsor.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : editingSponsor ? (
                  'Salvar Alterações'
                ) : (
                  'Cadastrar Patrocinador'
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
              Excluir Patrocinador
            </DialogTitle>
            <DialogDescription className="text-[#B8BDC7] text-sm pt-2">
              Tem certeza que deseja remover <strong className="text-white">"{deleteCandidate?.name}"</strong>? O parceiro não será mais exibido no portal público.
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
                  deleteSponsor.mutate(deleteCandidate.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-medium"
              disabled={deleteSponsor.isPending}
            >
              {deleteSponsor.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir Patrocinador'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
