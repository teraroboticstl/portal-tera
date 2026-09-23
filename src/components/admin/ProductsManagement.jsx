import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { uploadToGoogleDrive } from '@/api/googleDriveClient';
import { 
  Package, Plus, Edit2, Trash2, HardDrive, 
  Upload, ImageIcon, Loader2, AlertTriangle, 
  ExternalLink 
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

export default function ProductsManagement() {
  const queryClient = useQueryClient();
  const savedDraft = loadAdminDraft('products');

  const [showForm, setShowForm] = useState(Boolean(savedDraft?.isOpen));
  const [editingProduct, setEditingProduct] = useState(
    savedDraft?.mode === 'edit' && savedDraft?.recordId
      ? { id: savedDraft.recordId, ...(savedDraft.data || {}) }
      : null
  );

  const emptyForm = {
    name: '',
    description: '',
    price: 0,
    category: 'Camisetas',
    image_url: '',
    available: true
  };

  const [form, setForm] = useState(savedDraft?.data || emptyForm);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  // Sincroniza rascunho de sessão
  useEffect(() => {
    if (showForm) {
      saveAdminDraft('products', {
        isOpen: true,
        mode: editingProduct ? 'edit' : 'create',
        recordId: editingProduct?.id || null,
        data: form
      });
    } else {
      clearAdminDraft('products');
    }
  }, [showForm, editingProduct, form]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingProduct(null);
    setUploadingImage(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (product) => {
    const editData = {
      name: product.name || '',
      description: product.description || '',
      price: product.price !== undefined ? product.price : 0,
      category: product.category || 'Camisetas',
      image_url: product.image_url || '',
      available: product.available !== undefined ? Boolean(product.available) : (product.in_stock !== undefined ? Boolean(product.in_stock) : true)
    };
    setEditingProduct(product);
    setForm(editData);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
    clearAdminDraft('products');
  };

  const createProduct = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      clearAdminDraft('products');
      closeForm();
      toast.success('Produto adicionado à TeraShop!');
    },
    onError: (err) => {
      console.error('Erro ao criar produto:', err);
      toast.error('Erro ao adicionar produto: ' + (err.message || 'Verifique as permissões de administrador.'));
    }
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      clearAdminDraft('products');
      closeForm();
      toast.success('Produto atualizado com sucesso!');
    },
    onError: (err) => {
      console.error('Erro ao atualizar produto:', err);
      toast.error('Erro ao atualizar produto: ' + (err.message || 'Verifique as permissões de administrador.'));
    }
  });

  const deleteProduct = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setDeleteCandidate(null);
      toast.success('Produto removido da TeraShop!');
    },
    onError: (err) => {
      console.error('Erro ao remover produto:', err);
      toast.error('Erro ao remover produto: ' + (err.message || 'Verifique as permissões de administrador.'));
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
    const toastId = toast.loading('Enviando imagem para o Google Drive institucional (02. Produtos)...');
    try {
      const uploadResult = await uploadToGoogleDrive({
        file,
        context: 'products'
      });

      if (!uploadResult || !uploadResult.directUrl) {
        throw new Error('Servidor não retornou o identificador direto da mídia.');
      }

      setForm(prev => ({
        ...prev,
        image_url: uploadResult.directUrl
      }));

      toast.success('Imagem salva no Google Drive com sucesso!', { id: toastId });
    } catch (err) {
      console.error('[ProductsManagement] Erro no upload:', err);
      toast.error(`Falha no upload da imagem: ${err.message || 'Erro de conexão com o Google Drive.'}`, { id: toastId });
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    setForm(prev => ({ ...prev, image_url: '' }));
    toast.info('Imagem removida do produto.');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Informe o nome do produto.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description?.trim() || '',
      price: parseFloat(form.price) || 0,
      category: form.category || 'Camisetas',
      image_url: form.image_url || '',
      available: Boolean(form.available)
    };

    if (editingProduct) {
      updateProduct.mutate({ id: editingProduct.id, data: payload });
    } else {
      createProduct.mutate(payload);
    }
  };

  const isDriveImage = (url) => url && typeof url === 'string' && url.startsWith('/api/media/');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-[#E10600]" />
            Gerenciar Produtos da TeraShop
          </h2>
          <p className="text-sm text-[#B8BDC7]">
            Cadastre os produtos oficiais, gerencie preços, estoque e fotos no Google Drive.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[#E10600] hover:bg-[#E10600]/90 text-white font-medium">
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center">
          <LoadingSpinner text="Carregando produtos da TeraShop..." />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-[#111217] border border-[#1F222B] rounded-2xl p-8">
          <Package className="w-12 h-12 text-[#1F222B] mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">Nenhum produto cadastrado</h3>
          <p className="text-sm text-[#B8BDC7] mb-4">Adicione o primeiro produto para iniciar as vendas na loja oficial.</p>
          <Button onClick={openCreate} className="bg-[#E10600] hover:bg-[#E10600]/90 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Cadastrar Produto
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => {
            const hasDriveImg = isDriveImage(product.image_url);
            const isAvailable = product.available !== false && product.in_stock !== false;

            return (
              <div 
                key={product.id} 
                className="bg-[#111217] border border-[#1F222B] rounded-xl overflow-hidden flex flex-col justify-between hover:border-[#1F222B]/90 transition-all"
              >
                {/* Quadro de Imagem com fit contain */}
                <div className="relative w-full h-44 bg-[#0B0B0D] flex items-center justify-center p-2 border-b border-[#1F222B]/60">
                  <SafeImage
                    src={product.image_url}
                    alt={product.name}
                    fit="contain"
                    allowEnlarge={true}
                    enlargeTitle="Abrir imagem em nova guia"
                    containerClassName="w-full h-full"
                    fallbackIcon={<Package className="w-10 h-10 text-[#1F222B]" />}
                  />

                  <div className="absolute top-2 left-2 flex gap-1 pointer-events-none">
                    <Badge className="bg-[#111217]/90 backdrop-blur-sm border-[#1F222B] text-xs">
                      {product.category}
                    </Badge>
                  </div>

                  <div className="absolute top-2 right-2 flex gap-1 pointer-events-none">
                    {hasDriveImg && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-sm" title="Imagem armazenada no Google Drive">
                        <HardDrive className="w-3 h-3" />
                        Drive
                      </span>
                    )}
                  </div>
                </div>

                {/* Dados do Produto */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h3 className="font-semibold text-white text-sm line-clamp-1">{product.name}</h3>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${isAvailable ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
                        {isAvailable ? 'Em estoque' : 'Esgotado'}
                      </span>
                    </div>

                    {product.description && (
                      <p className="text-xs text-[#B8BDC7] line-clamp-2 mb-2 leading-relaxed">{product.description}</p>
                    )}

                    <p className="text-[#E10600] font-bold text-base mt-1">
                      R$ {Number(product.price || 0).toFixed(2)}
                    </p>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#1F222B]">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(product)}
                      className="border-[#1F222B] bg-white text-zinc-900 hover:bg-zinc-100 hover:text-black flex-1 font-medium text-xs"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteCandidate(product)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2.5"
                      title="Excluir produto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Unificado: Criar / Editar Produto */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="bg-[#111217] border-[#1F222B] max-w-xl max-h-[90vh] overflow-y-auto text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              {editingProduct ? (
                <>
                  <Edit2 className="w-5 h-5 text-[#E10600]" />
                  Editar Produto
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-[#E10600]" />
                  Novo Produto
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-sm text-[#B8BDC7]">
              Preencha os detalhes do produto e envie a imagem oficial para o Google Drive institucional.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">Nome do Produto *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Camiseta Oficial Temporada 2025"
                className="bg-[#0B0B0D] border-[#1F222B] text-white placeholder:text-zinc-500"
                required
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Detalhes sobre o produto, tecidos, tamanhos disponíveis..."
                rows={3}
                className="bg-[#0B0B0D] border-[#1F222B] text-white placeholder:text-zinc-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-white mb-1.5 block">Preço (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                  className="bg-[#0B0B0D] border-[#1F222B] text-white"
                  required
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-white mb-1.5 block">Categoria *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111217] border-[#1F222B] text-white [&_*]:text-white">
                    <SelectItem value="Camisetas">Camisetas</SelectItem>
                    <SelectItem value="Canecas">Canecas</SelectItem>
                    <SelectItem value="Bottons">Bottons</SelectItem>
                    <SelectItem value="Chaveiros">Chaveiros</SelectItem>
                    <SelectItem value="Acessórios">Acessórios</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Disponibilidade / Em estoque */}
            <div className="flex items-center justify-between p-3 bg-[#0B0B0D] border border-[#1F222B] rounded-lg">
              <div>
                <Label className="text-sm font-medium text-white block cursor-pointer">Disponível para venda (Em estoque)</Label>
                <p className="text-xs text-[#B8BDC7]">Define se o produto é exibido como disponível para pedidos na TeraShop.</p>
              </div>
              <Switch
                checked={form.available}
                onCheckedChange={(checked) => setForm({ ...form, available: checked })}
              />
            </div>

            {/* Imagem do Produto com Google Drive */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium text-white">Imagem do Produto</Label>
                <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-emerald-400" />
                  Google Drive institucional (02. Produtos)
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
                      title="Remover imagem"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="pt-2 border-t border-[#1F222B]/60 flex items-center gap-2">
                    <Label htmlFor="product-img-replace" className="cursor-pointer text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 py-1 px-2.5 rounded bg-[#111217] border border-[#1F222B] hover:border-zinc-500 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      Substituir imagem no Google Drive
                    </Label>
                    <input
                      id="product-img-replace"
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
                  <p className="text-xs text-[#B8BDC7] mb-3">Selecione uma foto do produto (PNG, JPG, WebP, GIF, SVG - até 15MB)</p>

                  <Label
                    htmlFor="product-img-upload"
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
                        Selecionar Imagem do Computador
                      </>
                    )}
                  </Label>
                  <input
                    id="product-img-upload"
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
                disabled={uploadingImage || createProduct.isPending || updateProduct.isPending}
                className="border-[#1F222B] text-[#B8BDC7] hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={uploadingImage || createProduct.isPending || updateProduct.isPending}
                className="bg-[#E10600] hover:bg-[#E10600]/90 text-white font-medium min-w-[120px]"
              >
                {(createProduct.isPending || updateProduct.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : editingProduct ? (
                  'Salvar Alterações'
                ) : (
                  'Cadastrar Produto'
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
              Excluir Produto
            </DialogTitle>
            <DialogDescription className="text-[#B8BDC7] text-sm pt-2">
              Tem certeza que deseja remover o produto <strong className="text-white">"{deleteCandidate?.name}"</strong> da TeraShop?
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
                  deleteProduct.mutate(deleteCandidate.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-medium"
              disabled={deleteProduct.isPending}
            >
              {deleteProduct.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir Produto'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
