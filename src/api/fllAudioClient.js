import { supabase } from './supabaseClient.js';
import { uploadToGoogleDrive } from './googleDriveClient.js';
import { 
  fetchActiveFllSeason, 
  persistFllAudioSlot, 
  removeFllAudioSlot, 
  getLocalActiveFllSeason,
  getFllAudioSlotUrl
} from './fllSeasonClient.js';

export const FLL_AUDIO_LOCAL_KEY = 'portal_tera_fll_audio_cache_v2';

export const FLL_AUDIO_SLOTS = [
  {
    id: 'round_start',
    canonicalId: 'round_start',
    legacyId: 'start',
    label: 'Som de início do round',
    description: 'Reproduzido uma única vez em 02:30 simultaneamente ao início da contagem.',
    defaultFileName: 'Som inicio de round.MP3'
  },
  {
    id: 'countdown_beep',
    canonicalId: 'countdown_beep',
    legacyId: 'beep',
    label: 'Bip dos últimos 10 segundos',
    description: 'Disparado uma vez por segundo de 00:10 a 00:01 (10 disparos no total).',
    defaultFileName: 'Bip.MP3'
  },
  {
    id: 'round_end',
    canonicalId: 'round_end',
    legacyId: 'end',
    label: 'Som de término do round',
    description: 'Reproduzido exclusivamente em 00:00, sem bip simultâneo.',
    defaultFileName: 'Som final de Round.MP3'
  }
];

export const SLOT_ALIASES = {
  start: 'round_start',
  beep: 'countdown_beep',
  end: 'round_end',
  round_start: 'round_start',
  countdown_beep: 'countdown_beep',
  round_end: 'round_end'
};

/**
 * Lê o cache local do navegador para resposta imediata
 */
export function getLocalAudioConfig() {
  try {
    const activeSeason = getLocalActiveFllSeason();
    if (activeSeason && activeSeason.fll_audios) {
      const audios = activeSeason.fll_audios;
      return {
        round_start: audios.round_start || null,
        countdown_beep: audios.countdown_beep || null,
        round_end: audios.round_end || null,
        start: audios.round_start || audios.start || null,
        beep: audios.countdown_beep || audios.beep || null,
        end: audios.round_end || audios.end || null
      };
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(FLL_AUDIO_LOCAL_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (err) {
    console.warn('[fllAudioClient] Falha ao ler cache local de áudios:', err);
  }
  return { 
    round_start: null, 
    countdown_beep: null, 
    round_end: null,
    start: null, 
    beep: null, 
    end: null 
  };
}

/**
 * Salva no cache local do navegador
 */
export function saveLocalAudioConfig(data) {
  try {
    if (typeof window !== 'undefined' && window.localStorage && data) {
      window.localStorage.setItem(FLL_AUDIO_LOCAL_KEY, JSON.stringify(data));
    }
  } catch (err) {
    console.warn('[fllAudioClient] Falha ao gravar cache local de áudios:', err);
  }
}

/**
 * Carrega a configuração dos 3 áudios oficiais da temporada FLL ativa
 */
export async function fetchFllAudioConfig(seasonTheme = null) {
  const localCache = getLocalAudioConfig();
  try {
    const seasonData = await fetchActiveFllSeason(seasonTheme);
    if (seasonData && seasonData.fll_audios) {
      const audios = seasonData.fll_audios;
      const normalized = {
        round_start: audios.round_start || null,
        countdown_beep: audios.countdown_beep || null,
        round_end: audios.round_end || null,
        start: audios.round_start || audios.start || null,
        beep: audios.countdown_beep || audios.beep || null,
        end: audios.round_end || audios.end || null
      };
      saveLocalAudioConfig(normalized);
      return normalized;
    }
  } catch (err) {
    console.warn('[fllAudioClient] Falha ao buscar configuração no servidor, usando cache:', err);
  }
  return localCache;
}

/**
 * Salva a associação de um slot de áudio no servidor vinculado à temporada FLL
 */
export async function saveAudioSlotConfig({ slot, fileId, fileName, fileSize, sha256, mimeType, season = 'BIOGLOW' }) {
  const canonicalSlot = SLOT_ALIASES[slot] || slot;
  const updatedSeason = await persistFllAudioSlot({
    season,
    slot: canonicalSlot,
    fileId,
    fileName,
    fileSize,
    sha256,
    mimeType: mimeType || 'audio/mpeg'
  });

  const nextAudios = updatedSeason?.fll_audios || {};
  saveLocalAudioConfig(nextAudios);
  return nextAudios[canonicalSlot] || nextAudios;
}

/**
 * Faz o upload de um arquivo MP3 para o Google Drive institucional sob a pasta oficial da temporada FLL
 * e persiste no banco de dados e servidor vinculado à temporada FLL correspondente.
 */
export async function uploadFllAudio({ file, slot, season = 'BIOGLOW' }) {
  if (!file) {
    throw new Error('Nenhum arquivo fornecido.');
  }

  // 1. Validação estrita de extensão e MIME type do MP3
  const isMp3Name = file.name?.toLowerCase().endsWith('.mp3');
  const isMp3Mime = file.type === 'audio/mpeg' || file.type === 'audio/mp3';
  if (!isMp3Name && !isMp3Mime) {
    throw new Error('Apenas arquivos de áudio MP3 (.mp3) são suportados para o simulador oficial.');
  }

  const maxAudioBytes = 15 * 1024 * 1024; // 15MB
  if (file.size > maxAudioBytes) {
    throw new Error('O arquivo de áudio excede o limite máximo permitido de 15MB.');
  }

  const canonicalSlot = SLOT_ALIASES[slot] || slot;

  // 2. Upload REAL para o Google Drive institucional
  const uploadResult = await uploadToGoogleDrive({
    file,
    context: 'fll-audio',
    subfolder: 'Áudios',
    season,
    program: 'FLL',
    recordId: canonicalSlot
  });

  if (!uploadResult || !uploadResult.fileId) {
    throw new Error('O upload para o Google Drive não retornou um ID de arquivo válido.');
  }

  // 3. Salvar imediatamente a nova referência associada ao slot e temporada no Supabase / servidor
  try {
    const savedConfig = await saveAudioSlotConfig({
      season,
      slot: canonicalSlot,
      fileId: uploadResult.fileId,
      fileName: file.name,
      fileSize: file.size,
      sha256: uploadResult.sha256,
      mimeType: file.type || 'audio/mpeg'
    });

    return {
      ...uploadResult,
      config: savedConfig
    };
  } catch (dbErr) {
    console.error(`[fllAudioClient] Falha ao persistir áudio ${canonicalSlot} no Supabase:`, dbErr);
    // Tenta rollback do arquivo recém-enviado para o Google Drive
    try {
      const { deleteFromGoogleDrive } = await import('./googleDriveClient.js');
      await deleteFromGoogleDrive(uploadResult.fileId);
      console.log(`[fllAudioClient] Rollback do áudio órfão ${uploadResult.fileId} executado.`);
    } catch (cleanupErr) {
      console.error(`[fllAudioClient] Erro no rollback do áudio órfão ${uploadResult.fileId}:`, cleanupErr.message);
    }
    throw new Error(`Falha ao registrar áudio no Supabase: ${dbErr.message || 'Erro de banco de dados.'}`);
  }
}

/**
 * Retorna a URL direta de streaming do áudio para um slot e temporada
 */
export function getSlotAudioUrl(slot, v = '', season = null) {
  const canonicalSlot = SLOT_ALIASES[slot] || slot;
  return getFllAudioSlotUrl(canonicalSlot, season, v);
}
