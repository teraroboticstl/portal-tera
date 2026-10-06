import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { supabaseServer } from './supabaseServer.js';

const STORAGE_DIR = path.resolve(process.cwd(), 'src/config/fll-audio-store');

// Garante que o diretório de armazenamento local seguro exista para cache transitório de bytes
if (!fs.existsSync(STORAGE_DIR)) {
  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch {}
}

export const VALID_SLOTS = [
  'round_start',
  'countdown_beep',
  'round_end',
  'start',
  'beep',
  'end'
];

export const SLOT_CANONICAL_MAP = {
  start: 'round_start',
  beep: 'countdown_beep',
  end: 'round_end',
  round_start: 'round_start',
  countdown_beep: 'countdown_beep',
  round_end: 'round_end'
};

export const CANONICAL_TO_LEGACY_MAP = {
  round_start: 'start',
  countdown_beep: 'beep',
  round_end: 'end'
};

const DEFAULT_FLL_SEASON_THEME = 'BIOGLOW';

/**
 * Consulta e decodifica a temporada FLL do Supabase (Fonte de Verdade Única).
 * @param {string|null} preferredTheme 
 * @returns {Promise<object|null>}
 */
export async function getFllSeasonFromSupabase(preferredTheme = null) {
  try {
    let query = supabaseServer
      .from('seasons')
      .select('*')
      .eq('program', 'FLL')
      .order('year', { ascending: false });

    if (preferredTheme) {
      query = query.ilike('theme', preferredTheme.trim());
    }

    const { data, error } = await query;
    if (error) {
      console.error('[fllAudioStorage] Erro ao consultar seasons no Supabase:', error.message);
      return null;
    }

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    // Se preferredTheme foi especificado, pega a primeira correspondente
    // Senão pega a mais recente por ano
    const row = data[0];
    let extra = {};
    if (row.description && typeof row.description === 'string' && row.description.startsWith('{')) {
      try {
        extra = JSON.parse(row.description);
      } catch {}
    }

    return {
      id: row.id,
      program: row.program || 'FLL',
      year: row.year || new Date().getFullYear(),
      theme: row.theme || DEFAULT_FLL_SEASON_THEME,
      season_name: extra.season_name || row.theme || `Temporada ${row.year}`,
      description: extra.custom_description || (typeof row.description === 'string' && !row.description.startsWith('{') ? row.description : ''),
      raw_description: row.description,
      extra_fields: extra,
      fll_missions: extra.fll_missions || {},
      fll_audios: extra.fll_audios || {
        round_start: null,
        countdown_beep: null,
        round_end: null
      }
    };
  } catch (err) {
    console.error('[fllAudioStorage] Exceção ao consultar Supabase:', err);
    return null;
  }
}

/**
 * Retorna os dados da temporada FLL ativa ou solicitada.
 * Fonte primária e canônica: Supabase (public.seasons).
 * Se o Supabase estiver temporariamente indisponível ou vazio, fornece estrutura padrão sem inventar persistência falsa.
 */
export async function getActiveFllSeasonData(preferredTheme = null) {
  const dbSeason = await getFllSeasonFromSupabase(preferredTheme);
  if (dbSeason) {
    return dbSeason;
  }

  const theme = (preferredTheme || DEFAULT_FLL_SEASON_THEME).toUpperCase().trim();
  return {
    id: `fll-${theme.toLowerCase()}-2026`,
    program: 'FLL',
    year: 2026,
    theme: theme,
    season_name: `${theme} 2026–2027`,
    description: `Temporada Oficial FLL ${theme}`,
    raw_description: '',
    extra_fields: {},
    fll_missions: {},
    fll_audios: {
      round_start: null,
      countdown_beep: null,
      round_end: null
    }
  };
}

/**
 * Lê a configuração persistente dos áudios da temporada a partir do Supabase.
 * Retorna tanto chaves canônicas (round_start, countdown_beep, round_end) quanto legadas (start, beep, end)
 */
export async function getFllAudioConfig(seasonTheme = null) {
  const season = await getActiveFllSeasonData(seasonTheme);
  const audios = season.fll_audios || {};

  return {
    // Canônicos
    round_start: audios.round_start || null,
    countdown_beep: audios.countdown_beep || null,
    round_end: audios.round_end || null,
    // Legados
    start: audios.round_start || audios.start || null,
    beep: audios.countdown_beep || audios.beep || null,
    end: audios.round_end || audios.end || null
  };
}

/**
 * Grava em cache local transitório os bytes do arquivo para entrega de áudio (transitório de memória/disco da instância).
 */
export function cacheAudioBytes(fileId, buffer) {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
    const filePath = path.join(STORAGE_DIR, `${fileId}.mp3`);
    fs.writeFileSync(filePath, buffer);
  } catch (err) {
    console.warn('[fllAudioStorage] Falha ao gravar cache transitório de áudio:', err.message);
  }
}

/**
 * Obtém os bytes do áudio em cache local transitório (se disponível)
 */
export function getCachedAudioBytes(fileId) {
  try {
    const filePath = path.join(STORAGE_DIR, `${fileId}.mp3`);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
  } catch (err) {
    console.warn('[fllAudioStorage] Falha ao recuperar cache de áudio:', err.message);
  }
  return null;
}

/**
 * Remove os bytes de um arquivo antigo não mais referenciado
 */
export function purgeCachedAudioBytes(fileId) {
  try {
    const filePath = path.join(STORAGE_DIR, `${fileId}.mp3`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {}
}

/**
 * Calcula o hash SHA-256 de um buffer
 */
export function computeSha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
