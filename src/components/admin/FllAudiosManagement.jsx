import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, Play, Pause, Upload, CheckCircle2, 
  AlertCircle, RefreshCw, FileAudio, Hash
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { 
  FLL_AUDIO_SLOTS, 
  fetchFllAudioConfig, 
  uploadFllAudio, 
  getSlotAudioUrl 
} from '@/api/fllAudioClient';

export default function FllAudiosManagement({ user }) {
  const [configs, setConfigs] = useState({ start: null, beep: null, end: null });
  const [loading, setLoading] = useState(true);
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const [playingSlot, setPlayingSlot] = useState(null);
  const [currentTime, setCurrentTime] = useState({});
  const [duration, setDuration] = useState({});
  const audioRefs = useRef({});

  // Carregar dados na montagem
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await fetchFllAudioConfig();
      setConfigs(data || {});
    } catch (err) {
      toast.error('Erro ao carregar configurações de áudio.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (slotId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.mp3') && file.type !== 'audio/mpeg' && file.type !== 'audio/mp3') {
      toast.error('Formato inválido. Por favor, selecione um arquivo MP3 (.mp3).');
      return;
    }

    setUploadingSlot(slotId);
    toast.info(`Iniciando upload de "${file.name}" para o Google Drive institucional...`);

    try {
      const result = await uploadFllAudio({
        file,
        slot: slotId
      });

      // Atualizar estado
      setConfigs(prev => ({
        ...prev,
        [slotId]: result.config || {
          fileName: file.name,
          fileSize: file.size,
          fileId: result.fileId,
          sha256: result.sha256
        }
      }));

      // Interromper qualquer prévia ativa desse slot
      if (audioRefs.current[slotId]) {
        audioRefs.current[slotId].pause();
        audioRefs.current[slotId].load();
      }

      toast.success(`Áudio para "${FLL_AUDIO_SLOTS.find(s => s.id === slotId)?.label}" salvo com sucesso no Google Drive!`);
    } catch (err) {
      console.error('[FLL Audio Upload] Erro:', err);
      toast.error(err.message || 'Falha ao enviar arquivo de áudio.');
    } finally {
      setUploadingSlot(null);
      // Limpar o input file para permitir selecionar o mesmo arquivo se desejado
      e.target.value = '';
    }
  };

  const togglePlayPreview = (slotId) => {
    const audio = audioRefs.current[slotId];
    if (!audio) return;

    if (playingSlot === slotId) {
      audio.pause();
      setPlayingSlot(null);
    } else {
      // Parar outros áudios tocando
      Object.keys(audioRefs.current).forEach(id => {
        if (id !== slotId && audioRefs.current[id]) {
          audioRefs.current[id].pause();
          audioRefs.current[id].currentTime = 0;
        }
      });

      audio.currentTime = 0;
      audio.play()
        .then(() => setPlayingSlot(slotId))
        .catch(err => {
          console.warn('Erro ao reproduzir prévia:', err);
          toast.error('Não foi possível reproduzir a prévia do áudio.');
          setPlayingSlot(null);
        });
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return 'Tamanho desconhecido';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatSeconds = (sec) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Cabeçalho da Seção */}
      <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#E10600]/10 border border-[#E10600]/30 flex items-center justify-center text-[#E10600]">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Áudios do Simulador FLL BIOGLOW</h2>
            <p className="text-sm text-[#B8BDC7]">
              Armazenamento dos MP3 originais no Google Drive institucional (04. Torneios &amp; Eventos / FLL BIOGLOW / Áudios)
            </p>
          </div>
        </div>
        <p className="text-sm text-[#B8BDC7] leading-relaxed">
          Configure os três áudios oficiais da partida. Os arquivos enviados são armazenados diretamente no Google Drive, 
          preservando integralmente os bytes originais do MP3 (sem recompressão, síntese ou sintetizadores). A entrega aos visitantes é feita 
          por streaming do servidor em tempo real, sem necessidade de login.
        </p>
      </div>

      {/* Grid com os 3 Slots Independentes */}
      <div className="space-y-6">
        {FLL_AUDIO_SLOTS.map((slot) => {
          const config = configs[slot.id];
          const isConfigured = Boolean(config && config.fileId);
          const isUploading = uploadingSlot === slot.id;
          const isPlaying = playingSlot === slot.id;
          const audioUrl = getSlotAudioUrl(slot.id, config?.sha256 || config?.updatedAt);

          return (
            <div 
              key={slot.id} 
              className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6 transition-all hover:border-[#B8BDC7]/20"
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                
                {/* Informações do Slot */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E10600]" />
                    <h3 className="text-base font-bold text-white">{slot.label}</h3>
                    {isConfigured ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Configurado no Drive
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <AlertCircle className="w-3 h-3" />
                        Pendente de Upload
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#B8BDC7] leading-relaxed">
                    {slot.description}
                  </p>

                  {/* Metadados do Arquivo Atual */}
                  {isConfigured && (
                    <div className="bg-[#0B0B0D] border border-white/5 rounded-xl p-3 mt-3 space-y-1.5 font-mono text-xs">
                      <div className="flex items-center gap-2 text-white truncate">
                        <FileAudio className="w-4 h-4 text-[#E10600] shrink-0" />
                        <span className="font-semibold truncate">{config.fileName || slot.defaultFileName}</span>
                        <span className="text-[#B8BDC7] text-[11px]">({formatFileSize(config.fileSize)})</span>
                      </div>

                      {config.sha256 && (
                        <div className="flex items-center gap-1.5 text-[11px] text-[#B8BDC7]/80 truncate">
                          <Hash className="w-3 h-3 shrink-0 text-gray-500" />
                          <span className="text-gray-400">SHA-256:</span>
                          <span className="text-gray-300 truncate" title={config.sha256}>{config.sha256}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Ações: Player de Prévia + Botão de Upload */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
                  
                  {/* Elemento de áudio oculto para prévia */}
                  {isConfigured && (
                    <audio 
                      ref={el => { audioRefs.current[slot.id] = el; }}
                      src={audioUrl}
                      preload="metadata"
                      onTimeUpdate={(e) => {
                        setCurrentTime(prev => ({ ...prev, [slot.id]: e.target.currentTime }));
                      }}
                      onLoadedMetadata={(e) => {
                        setDuration(prev => ({ ...prev, [slot.id]: e.target.duration }));
                      }}
                      onEnded={() => setPlayingSlot(null)}
                      onError={() => {
                        setPlayingSlot(null);
                      }}
                    />
                  )}

                  {/* Botão de Prévia */}
                  {isConfigured && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => togglePlayPreview(slot.id)}
                      className={`h-10 px-4 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border transition-colors ${
                        isPlaying 
                          ? 'bg-[#E10600]/20 border-[#E10600] text-white' 
                          : 'bg-[#1F222B] hover:bg-[#2A2D38] border-white/10 text-white'
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-4 h-4 text-[#E10600] fill-current" />
                          <span>Pausar ({formatSeconds(currentTime[slot.id])} / {formatSeconds(duration[slot.id])})</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 text-emerald-400 fill-current" />
                          <span>Ouvir Prévia</span>
                        </>
                      )}
                    </Button>
                  )}

                  {/* Input de Upload Customizado */}
                  <div className="relative">
                    <input 
                      type="file"
                      id={`fll-audio-file-${slot.id}`}
                      accept=".mp3,audio/mpeg"
                      className="sr-only"
                      disabled={isUploading}
                      onChange={(e) => handleFileUpload(slot.id, e)}
                    />
                    <Label 
                      htmlFor={`fll-audio-file-${slot.id}`}
                      className={`h-10 px-4 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors border select-none ${
                        isUploading 
                          ? 'bg-white/5 border-white/10 text-gray-400 cursor-not-allowed'
                          : 'bg-[#E10600] hover:bg-[#c00500] border-[#E10600] text-white shadow-md'
                      }`}
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Enviando MP3...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>{isConfigured ? 'Substituir MP3' : 'Enviar MP3 Oficial'}</span>
                        </>
                      )}
                    </Label>
                  </div>

                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
