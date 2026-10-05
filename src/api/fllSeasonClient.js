import { supabase } from './supabaseClient.js';

export const FLL_SEASON_STORAGE_KEY = 'portal_tera_fll_active_season_cache_v2';

export const DEFAULT_FLL_SEASON = {
  id: 'fll-bioglow-2026',
  program: 'FLL',
  year: 2026,
  theme: 'BIOGLOW',
  season_name: 'BIOGLOW 2026–2027',
  description: 'Temporada Oficial FLL BIOGLOW 2026–2027',
  fll_missions: {},
  fll_audios: {
    round_start: null,
    countdown_beep: null,
    round_end: null
  }
};

/**
 * Lê o cache local síncrono da temporada FLL ativa
 */
export function getLocalActiveFllSeason() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(FLL_SEASON_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('[FllSeasonClient] Falha ao ler cache local de temporada FLL:', err);
  }
  return { ...DEFAULT_FLL_SEASON };
}

/**
 * Grava o cache local síncrono da temporada FLL ativa
 */
export function saveLocalActiveFllSeason(seasonData) {
  try {
    if (typeof window !== 'undefined' && window.localStorage && seasonData) {
      window.localStorage.setItem(FLL_SEASON_STORAGE_KEY, JSON.stringify(seasonData));
    }
  } catch (err) {
    console.warn('[FllSeasonClient] Falha ao gravar cache local de temporada FLL:', err);
  }
}

/**
 * Consulta a temporada FLL ativa no servidor (/api/fll/season)
 * Sincroniza missões e áudios com o banco persistente
 */
export async function fetchActiveFllSeason(preferredTheme = null) {
  const localData = getLocalActiveFllSeason();
  try {
    const queryUrl = preferredTheme 
      ? `/api/fll/season?season=${encodeURIComponent(preferredTheme)}`
      : '/api/fll/season';

    const res = await fetch(queryUrl);
    if (res.ok) {
      const result = await res.json();
      if (result && result.data) {
        saveLocalActiveFllSeason(result.data);
        return result.data;
      }
    }
  } catch (err) {
    console.warn('[FllSeasonClient] Falha na busca remota da temporada FLL (usando cache local):', err);
  }
  return localData;
}

/**
 * Persiste no banco de dados e servidor a foto oficial de uma missão vinculada à temporada FLL
 */
export async function persistFllMissionImage({ season = 'BIOGLOW', code, fileId, imageUrl, imageAlt, title, maxScore }) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Usuário não autenticado. Faça login como administrador para salvar missões.');
  }

  const response = await fetch('/api/fll/season', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      action: 'save_mission',
      season,
      data: {
        code,
        fileId,
        imageUrl: imageUrl || (fileId ? `/api/media/${fileId}` : ''),
        imageAlt: imageAlt || '',
        title: title || code,
        maxScore: maxScore ?? 0
      }
    })
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || result.error || 'Falha ao salvar missão na temporada FLL.');
  }

  saveLocalActiveFllSeason(result.data);
  return result.data;
}

/**
 * Remove a foto oficial de uma missão sem excluir o arquivo do Google Drive
 */
export async function removeFllMissionImage({ season = 'BIOGLOW', code }) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Usuário não autenticado.');
  }

  const response = await fetch('/api/fll/season', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      action: 'remove_mission',
      season,
      data: { code }
    })
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || result.error || 'Falha ao remover imagem da missão.');
  }

  saveLocalActiveFllSeason(result.data);
  return result.data;
}

/**
 * Persiste no banco de dados e servidor o áudio oficial (MP3) de um slot da temporada FLL
 */
export async function persistFllAudioSlot({ season = 'BIOGLOW', slot, fileId, fileName, fileSize, sha256, mimeType }) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Usuário não autenticado. Faça login como administrador para salvar áudios.');
  }

  const response = await fetch('/api/fll/season', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      action: 'save_audio',
      season,
      data: {
        slot,
        fileId,
        fileName,
        fileSize,
        sha256,
        mimeType: mimeType || 'audio/mpeg'
      }
    })
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || result.error || 'Falha ao salvar configuração do áudio na temporada FLL.');
  }

  saveLocalActiveFllSeason(result.data);
  return result.data;
}

/**
 * Remove a configuração de um áudio da temporada FLL
 */
export async function removeFllAudioSlot({ season = 'BIOGLOW', slot }) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Usuário não autenticado.');
  }

  const response = await fetch('/api/fll/season', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      action: 'remove_audio',
      season,
      data: { slot }
    })
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || result.error || 'Falha ao remover áudio da temporada.');
  }

  saveLocalActiveFllSeason(result.data);
  return result.data;
}

/**
 * Retorna a URL direta de streaming de áudio
 */
export function getFllAudioSlotUrl(slot, season = null, v = '') {
  const seasonParam = season ? `&season=${encodeURIComponent(season)}` : '';
  const versionParam = v ? `&v=${encodeURIComponent(v)}` : '';
  return `/api/fll/audio?slot=${slot}${seasonParam}${versionParam}`;
}
