import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, HardDrive, Upload, Image as ImageIcon, Trash2, Edit3, 
  Search, RefreshCw 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from 'sonner';
import SafeImage from '@/components/common/SafeImage';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { uploadToGoogleDrive } from '@/api/googleDriveClient';
import { 
  BIOGLOW_MISSIONS_CATALOG, 
  fetchFllMissionImages, 
  persistMissionImage, 
  removeMissionImageAssociation 
} from '@/api/fllMissionsClient';

export default function FllMissionsManagement() {
  const [missionsImages, setMissionsImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingMission, setEditingMission] = useState(null);
  const [altText, setAltText] = useState('');
  const [uploadingCode, setUploadingCode] = useState(null);
  const fileInputRef = useRef(null);
  const targetCodeRef = useRef(null);

  // Carrega as imagens persistidas das missões
  const loadImages = async () => {
    setLoading(true);
    try {
      const data = await fetchFllMissionImages();
      setMissionsImages(data || {});
    } catch (err) {
      console.error('[FLL Missions Admin] Erro ao carregar missões:', err);
      toast.error('Não foi possível carregar as imagens das missões.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, []);

  // Dispara o seletor de arquivos para uma missão específica
  const handleTriggerUpload = (code) => {
    targetCodeRef.current = code;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Processa o upload de imagem para o Google Drive institucional
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    const code = targetCodeRef.current;
    if (!file || !code) return;

    // 1. Validação de formato (apenas imagens suportadas)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato não suportado. Envie imagens JPG, PNG, WebP, GIF ou SVG.');
      return;
    }

    // 2. Validação de tamanho (máximo 15MB, mesmo padrão dos produtos)
    const maxSizeBytes = 15 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error('A imagem excede o tamanho máximo de 15MB permitido.');
      return;
    }

    setUploadingCode(code);
    const missionInfo = BIOGLOW_MISSIONS_CATALOG.find(m => m.code === code);
    const toastId = toast.loading(`Enviando foto da missão ${code} para o Google Drive institucional...`);

    try {
      const uploadResult = await uploadToGoogleDrive({
        file,
        context: 'fll-missions',
        extraMeta: {
          season: 'BIOGLOW',
          program: 'FLL',
          missionCode: code
        }
      });

      if (!uploadResult || !uploadResult.directUrl) {
        throw new Error('Servidor não retornou a URL direta da mídia no Google Drive.');
      }

      const existingData = missionsImages[code] || {};
      const currentAlt = existingData.imageAlt || missionInfo?.defaultAlt || `Modelo ilustrativo da missão ${code}`;

      // Salva referência permanente no Supabase e no cache local
      const updatedMap = await persistMissionImage({
        code,
        imageUrl: uploadResult.directUrl,
        imageAlt: currentAlt,
        title: missionInfo?.title,
        maxScore: missionInfo?.maxScore
      });

      setMissionsImages(updatedMap);
      toast.success(`Imagem da missão ${code} salva no Google Drive com sucesso!`, { id: toastId });
    } catch (err) {
      console.error('[FLL Missions Admin] Falha no upload:', err);
      toast.error(`Falha no upload para o Google Drive: ${err.message || 'Erro de conexão.'}`, { id: toastId });
    } finally {
      setUploadingCode(null);
      targetCodeRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Abre modal para editar a descrição alternativa (acessibilidade)
  const openEditAlt = (mission) => {
    const current = missionsImages[mission.code] || {};
    setEditingMission(mission);
    setAltText(current.imageAlt || mission.defaultAlt || '');
  };

  // Salva a descrição acessível
  const handleSaveAlt = async () => {
    if (!editingMission) return;
    const code = editingMission.code;
    const current = missionsImages[code] || {};

    try {
      const updatedMap = await persistMissionImage({
        code,
        imageUrl: current.imageUrl || '',
        imageAlt: altText.trim(),
        title: editingMission.title,
        maxScore: editingMission.maxScore
      });

      setMissionsImages(updatedMap);
      toast.success(`Descrição acessível da missão ${code} atualizada!`);
      setEditingMission(null);
    } catch (err) {
      toast.error('Erro ao salvar descrição da missão.');
    }
  };

  // Desvincula a imagem da missão
  const handleRemoveImage = async (code) => {
    if (!confirm(`Deseja remover a imagem da missão ${code}? O arquivo não será excluído do Google Drive.`)) {
      return;
    }

    try {
      const updatedMap = await removeMissionImageAssociation(code);
      setMissionsImages(updatedMap);
      toast.info(`Imagem da missão ${code} desvinculada.`);
    } catch (err) {
      toast.error('Erro ao remover imagem da missão.');
    }
  };

  const isDriveImage = (url) => url && typeof url === 'string' && url.startsWith('/api/media/');

  const filteredMissions = BIOGLOW_MISSIONS_CATALOG.filter(m => 
    m.code.toLowerCase().includes(search.toLowerCase()) ||
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Input de arquivo invisível reutilizável */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header da Seção Administrativa */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#111217] border border-[#1F222B] p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Bot className="w-5 h-5 text-[#E10600]" />
            <span>Imagens das Missões · FLL BIOGLOW 2026–2027</span>
          </h2>
          <p className="text-sm text-[#B8BDC7] mt-1">
            Cadastre fotos oficiais de cada missão com armazenamento permanente no Google Drive institucional (04. Torneios & Eventos / FLL BIOGLOW).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadImages}
            disabled={loading}
            className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5 text-xs h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código (ex: M01, INSPEÇÃO) ou título da missão..."
            className="bg-[#111217] border-[#1F222B] text-white pl-10 h-10 text-sm placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Lista / Grid de Missões */}
      {loading ? (
        <div className="py-16 text-center">
          <LoadingSpinner text="Carregando catálogo de missões da temporada..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMissions.map((mission) => {
            const data = missionsImages[mission.code] || {};
            const hasImage = Boolean(data.imageUrl);
            const isUploading = uploadingCode === mission.code;
            const isDrive = isDriveImage(data.imageUrl);

            return (
              <div
                key={mission.code}
                className="bg-[#111217] border border-[#1F222B] rounded-2xl overflow-hidden flex flex-col justify-between hover:border-[#1F222B]/90 transition-all shadow-sm"
              >
                {/* Preview da Imagem no Topo */}
                <div className="relative w-full h-44 bg-[#0B0B0D] flex items-center justify-center p-2 border-b border-[#1F222B]/70">
                  {hasImage ? (
                    <SafeImage
                      src={data.imageUrl}
                      alt={data.imageAlt || mission.title}
                      fit="contain"
                      allowEnlarge={true}
                      enlargeTitle="Abrir imagem original"
                      containerClassName="w-full h-full"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-600 gap-1.5 p-4 text-center">
                      <ImageIcon className="w-9 h-9 stroke-[1.5]" />
                      <span className="text-xs font-mono">Sem imagem cadastrada</span>
                    </div>
                  )}

                  {/* Badge de status no Google Drive */}
                  {hasImage && (
                    <div className="absolute top-2.5 left-2.5">
                      {isDrive ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
                          <HardDrive className="w-2.5 h-2.5" />
                          <span>Google Drive</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 backdrop-blur-md">
                          URL Externa
                        </span>
                      )}
                    </div>
                  )}

                  <div className="absolute top-2.5 right-2.5">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-black/70 text-[#E10600] border border-white/10">
                      {mission.maxScore} pts
                    </span>
                  </div>
                </div>

                {/* Conteúdo Informativo */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-black text-[#E10600] tracking-wider uppercase">
                        {mission.code}
                      </span>
                      <span className="text-xs text-gray-500">·</span>
                      <span className="text-xs text-gray-400">BIOGLOW 26/27</span>
                    </div>
                    <h3 className="text-base font-bold text-white line-clamp-1">
                      {mission.title}
                    </h3>

                    {/* Descrição Acessível */}
                    <div className="pt-1">
                      <p className="text-xs text-gray-400 line-clamp-2 italic">
                        {data.imageAlt || mission.defaultAlt || 'Nenhuma descrição alternativa definida.'}
                      </p>
                    </div>
                  </div>

                  {/* Ações Administrativas */}
                  <div className="pt-2 border-t border-white/5 space-y-2">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={isUploading}
                        onClick={() => handleTriggerUpload(mission.code)}
                        className={`flex-1 text-xs font-semibold h-8.5 ${
                          hasImage
                            ? 'bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10'
                            : 'bg-[#E10600] hover:bg-[#c00500] text-white shadow-sm'
                        }`}
                      >
                        {isUploading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            <span>Enviando ao Drive...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5 mr-1.5" />
                            <span>{hasImage ? 'Substituir no Drive' : 'Upload para o Drive'}</span>
                          </>
                        )}
                      </Button>

                      {hasImage && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveImage(mission.code)}
                          disabled={isUploading}
                          className="h-8.5 px-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          title="Desvincular imagem desta missão"
                          aria-label="Desvincular imagem"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditAlt(mission)}
                      className="w-full text-xs text-gray-400 hover:text-white h-7 justify-start px-1"
                    >
                      <Edit3 className="w-3 h-3 mr-1 text-[#E10600]" />
                      <span>Editar texto de acessibilidade (Alt)</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Edição de Descrição Acessível */}
      {editingMission && (
        <Dialog open={Boolean(editingMission)} onOpenChange={(open) => !open && setEditingMission(null)}>
          <DialogContent className="bg-[#111217] border-[#1F222B] text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Bot className="w-5 h-5 text-[#E10600]" />
                <span>Descrição Acessível · {editingMission.code}</span>
              </DialogTitle>
              <DialogDescription className="text-gray-400 text-xs">
                Insira uma descrição em português para leitores de tela e acessibilidade ilustrando o modelo da missão.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs text-gray-300 mb-1.5 block">
                  Missão
                </Label>
                <p className="text-sm font-bold text-white">
                  {editingMission.code} - {editingMission.title}
                </p>
              </div>

              <div>
                <Label className="text-xs text-gray-300 mb-1.5 block">
                  Descrição Alternativa (Alt text) *
                </Label>
                <Textarea
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Ex: Drone de inspeção fora da árvore com mapa LiDAR virado..."
                  rows={4}
                  className="bg-[#0B0B0D] border-[#1F222B] text-white text-sm placeholder:text-gray-500"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingMission(null)}
                className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveAlt}
                className="bg-[#E10600] hover:bg-[#c00500] text-white font-bold"
              >
                Salvar Descrição
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
