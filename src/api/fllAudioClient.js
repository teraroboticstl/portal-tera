import { supabase } from './supabaseClient';
import { uploadToGoogleDrive } from './googleDriveClient';

export const FLL_AUDIO_LOCAL_KEY = 'portal_tera_fll_audio_cache_v1';

export const FLL_AUDIO_SLOTS = [
  {
    id: 'start',
    label: 'Som de início do round',
    description: 'Reproduzido uma única vez em 02:30 simultaneamente ao início da contagem.',
    defaultFileName: 'Som inicio de round.MP3'
  },
  {
    id: 'beep',
    label: 'Bip dos últimos 10 segundos',
    description: 'Disparado uma vez por segundo de 00:10 a 00:01 (10 disparos no total).',
    defaultFileName: 'Bip.MP3'
  },
  {
    id: 'end',
    label: 'Som de término do round',
    description: 'Reproduzido exclusivamente em 00:00, sem bip simultâneo.',
    defaultFileName: 'Som final de Round.MP3'
  }
];

/**
 * Lê o cache local do navegador para resposta imediata
 */
export function getLocalAudioConfig() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(FLL_AUDIO_LOCAL_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (err) {
    console.warn('[fllAudioClient] Falha ao ler cache local de áudios:', err);
  }
  return { start: null, beep: null, end: null };
}

/**
 * Salva no cache local do navegador
 */
export function saveLocalAudioConfig(data) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(FLL_AUDIO_LOCAL_KEY, JSON.stringify(data));
    }
  } catch (err) {
    console.warn('[fllAudioClient] Falha ao gravar cache local de áudios:', err);
  }
}

/**
 * Carrega a configuração dos 3 áudios do servidor
 */
export async function fetchFllAudioConfig() {
  const localCache = getLocalAudioConfig();
  try {
    const res = await fetch('/api/fll/audio/config');
    if (res.ok) {
      const result = await res.json();
      if (result && result.data) {
        saveLocalAudioConfig(result.data);
        return result.data;
      }
    }
  } catch (err) {
    console.warn('[fllAudioClient] Falha ao buscar configuração no servidor, usando cache:', err);
  }
  return localCache;
}

/**
 * Salva a associação de um slot de áudio no servidor (exclusivo para administradores)
 */
export async function saveAudioSlotConfig({ slot, fileId, fileName, fileSize, sha256, mimeType }) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Autenticação necessária. Faça login como administrador para salvar.');
  }

  const response = await fetch('/api/fll/audio/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      slot,
      fileId,
      fileName,
      fileSize,
      sha256,
      mimeType: mimeType || 'audio/mpeg'
    })
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || result.error || 'Falha ao salvar configuração de áudio.');
  }

  // Atualizar cache local
  const current = getLocalAudioConfig();
  current[slot] = result.data;
  saveLocalAudioConfig(current);

  return result.data;
}

/**
 * Faz o upload de um arquivo MP3 para o Google Drive sob a pasta oficial da FLL
 */
export async function uploadFllAudio({ file, slot }) {
  if (!file) {
    throw new Error('Nenhum arquivo fornecido.');
  }

  // Validação estrita de extensão / tipo de áudio
  const isMp3 = file.name?.toLowerCase().endsWith('.mp3') || file.type === 'audio/mpeg' || file.type === 'audio/mp3';
  if (!isMp3) {
    throw new Error('Apenas arquivos de áudio MP3 (.mp3) são suportados para o simulador.');
  }

  // 1. Upload seguro para o Google Drive institucional
  const uploadResult = await uploadToGoogleDrive({
    file,
    context: 'fll-audio',
    subfolder: 'Áudios'
  });

  if (!uploadResult || !uploadResult.fileId) {
    throw new Error('O upload para o Google Drive não retornou um ID de arquivo válido.');
  }

  // 2. Salvar imediatamente a nova referência associada ao slot
  const savedData = await saveAudioSlotConfig({
    slot,
    fileId: uploadResult.fileId,
    fileName: file.name,
    fileSize: file.size,
    sha256: uploadResult.sha256,
    mimeType: file.type || 'audio/mpeg'
  });

  return {
    ...uploadResult,
    config: savedData
  };
}

/**
 * Retorna a URL direta de streaming do áudio para um slot
 */
export function getSlotAudioUrl(slot, v = '') {
  return `/api/fll/audio?slot=${slot}${v ? `&v=${encodeURIComponent(v)}` : ''}`;
}
