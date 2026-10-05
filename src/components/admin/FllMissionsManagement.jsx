import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, HardDrive, Upload, Image as ImageIcon, Trash2, Edit3, 
  Search, RefreshCw, CheckCircle2
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
import { fetchActiveFllSeason } from '@/api/fllSeasonClient';
import { 
  BIOGLOW_MISSIONS_CATALOG, 
  fetchFllMissionImages, 
  persistMissionImage, 
  removeMissionImageAssociation 
} from '@/api/fllMissionsClient';

export default function FllMissionsManagement() {
  const [activeSeason, setActiveSeason] = useState({
    theme: 'BIOGLOW',
    year: 2026,
    season_name: 'BIOGLOW 2026–2027'
  });
  const [missionsImages, setMissionsImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingMission, setEditingMission] = useState(null);
  const [altText, setAltText] = useState('');
  const [uploadingCode, setUploadingCode] = useState(null);
  const fileInputRef = useRef(null);
  const targetCodeRef = useRef(null);

  // Carrega a temporada ativa e as imagens persistidas das missões
  const loadSeasonAndImages = async () => {
    setLoading(true);
    try {
      const seasonData = await fetchActiveFllSeason();
      if (seasonData) {
        setActiveSeason({
          id: seasonData.id,
          theme: seasonData.theme || 'BIOGLOW',
          year: seasonData.year || 2026,
          season_name: seasonData.season_name || `${seasonData.theme} ${seasonData.year}`
        });
        setMissionsImages(seasonData.fll_missions || {});
      } else {
        const data = await fetchFllMissionImages();
        setMissionsImages(data || {});
      }
    } catch (err) {
      console.error('[FLL Missions Admin] Erro ao carregar missões da temporada:', err);
      toast.error('Não foi possível carregar as imagens das missões da temporada.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSeasonAndImages();
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

    // 2. Validação de tamanho (máximo 15MB, padrão da plataforma)
    const maxSizeBytes = 15 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error('A imagem excede o tamanho máximo de 15MB permitido.');
      return;
    }

    setUploadingCode(code);
    const missionInfo = BIOGLOW_MISSIONS_CATALOG.find(m => m.code === code);
    const toastId = toast.loading(`Enviando foto da missão ${code} para a pasta oficial no Google Drive...`);

    let uploadedFileId = null;
    try {
      // 1. Upload REAL no Google Drive sob a pasta oficial da temporada FLL
      const uploadResult = await uploadToGoogleDrive({
        file,
        context: 'fll-missions',
        season: activeSeason.theme,
        program: 'FLL',
        recordId: code
      });

      if (!uploadResult || !uploadResult.fileId || !uploadResult.directUrl) {
        throw new Error('Servidor não retornou uma referência persistente (fileId) do Google Drive.');
      }

      uploadedFileId = uploadResult.fileId;
      const existingData = missionsImages[code] || {};
      const currentAlt = existingData.imageAlt || missionInfo?.defaultAlt || `Modelo ilustrativo da missão ${code}`;

      // 2. Salva referência permanente vinculada à temporada FLL ativa no banco e servidor
      const updatedMap = await persistMissionImage({
        code,
        fileId: uploadResult.fileId,
        imageUrl: uploadResult.directUrl,
        imageAlt: currentAlt,
        title: missionInfo?.title,
        maxScore: missionInfo?.maxScore,
        season: activeSeason.theme
      });

      setMissionsImages(updatedMap);
      toast.success(`Foto da missão ${code} salva no Google Drive e vinculada à temporada ${activeSeason.theme}!`, { id: toastId });
    } catch (err) {
      console.error('[FLL Missions Admin] Falha no upload / persistência:', err);
      // Se o upload no Drive teve sucesso mas a gravação no Supabase falhou, tentar rollback do arquivo órfão
      if (uploadedFileId) {
        console.warn(`[FLL Missions Admin] Tentando rollback de arquivo órfão ${uploadedFileId} no Google Drive...`);
        try {
          await deleteFromGoogleDrive(uploadedFileId);
          console.log(`[FLL Missions Admin] Rollback do arquivo órfão ${uploadedFileId} concluído.`);
        } catch (cleanupErr) {
          console.error(`[FLL Missions Admin] Falha no rollback do arquivo órfão ${uploadedFileId}:`, cleanupErr.message);
        }
      }
      toast.error(`Falha ao salvar missão: ${err.message || 'Erro de conexão.'}`, { id: toastId });
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
        fileId: current.fileId || null,
        imageUrl: current.imageUrl || '',
        imageAlt: altText.trim(),
        title: editingMission.title,
        maxScore: editingMission.maxScore,
        season: activeSeason.theme
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
      const updatedMap = await removeMissionImageAssociation(code, activeSeason.theme);
      setMissionsImages(updatedMap);
      toast.info(`Imagem da missão ${code} desvinculada da temporada.`);
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
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#E10600]/20 text-red-400 border border-[#E10600]/30">
              FLL · {activeSeason.theme} ({activeSeason.year})
            </span>
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Temporada Ativa
            </span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Bot className="w-5 h-5 text-[#E10600]" />
            <span>Imagens das Missões · FLL {activeSeason.theme}</span>
          </h2>
          <p className="text-sm text-[#B8BDC7]">
            Fotos oficiais das missões armazenadas permanentemente no Google Drive institucional (04. Torneios &amp; Eventos / FLL {activeSeason.theme} / Missões).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadSeasonAndImages}
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
          <LoadingSpinner text={`Carregando missões da temporada FLL ${activeSeason.theme}...`} />
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
                      className="max-h-full max-w-full drop-shadow-md"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 text-gray-600">
                      <ImageIcon className="w-10 h-10 stroke-[1.2]" />
                      <span className="text-xs text-gray-500 font-medium">Sem imagem cadastrada</span>
                    </div>
                  )}

                  {/* Badges de Status do Armazenamento */}
                  {hasImage && (
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      {isDrive ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 backdrop-blur-md">
                          <HardDrive className="w-3 h-3 text-emerald-400" />
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
                      <span className="text-xs text-gray-400 uppercase font-mono">
                        {activeSeason.theme}
                      </span>
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
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditAlt(mission)}
                            title="Editar texto alternativo (Acessibilidade)"
                            className="h-8.5 w-8.5 text-gray-400 hover:text-white hover:bg-white/5"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveImage(mission.code)}
                            title="Desvincular imagem desta missão"
                            className="h-8.5 w-8.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Edição de Texto Acessível */}
      <Dialog open={Boolean(editingMission)} onOpenChange={(open) => !open && setEditingMission(null)}>
        <DialogContent className="bg-[#111217] border border-[#1F222B] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Descrição Acessível · {editingMission?.code}
            </DialogTitle>
            <DialogDescription className="text-sm text-[#B8BDC7]">
              Descreva os detalhes visuais do modelo e da condição de pontuação da missão para leitores de tela.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs text-gray-300">Texto Alternativo (alt)</Label>
              <Textarea
                rows={4}
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Ex: Drone com asas estendidas na copa da árvore, fora da base..."
                className="bg-[#0B0B0D] border-[#1F222B] text-white text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingMission(null)}
              className="border-white/10 text-gray-300 hover:bg-white/5"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveAlt}
              className="bg-[#E10600] hover:bg-[#c00500] text-white"
            >
              Salvar Descrição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
