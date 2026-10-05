import { getLocalActiveFllSeason } from '@/api/fllSeasonClient';

/**
 * Gerenciador de Áudio Oficial FLL - Portal Tera
 * 
 * Arquitetura de Reprodução Fiel de MP3:
 * - Áudios vinculados à temporada FLL correspondente e armazenados no Google Drive institucional
 * - Reprodução estrita de MP3 via elemento de áudio nativo do navegador (HTMLAudioElement)
 * - SEM sintetizadores Web Audio, sem osciladores, sem beeps eletrônicos sintéticos e sem versões MIDI
 * - Preservação integral dos bytes originais enviados pelo administrador
 * 
 * Sequência Oficial:
 * - 02:30: Som de início (round_start) reproduzido uma única vez simultaneamente à contagem
 * - 00:10 até 00:01: Bip curto (countdown_beep) disparado 1x por segundo (10 disparos no total),
 *   reiniciando a reprodução desde o início do arquivo a cada segundo e interrompendo o anterior
 * - 00:00: Interrompe imediatamente qualquer bip ativo e reproduz exclusivamente o Som de término (round_end)
 * - NUNCA reproduz simultaneamente bip e som final em 00:00
 * - Controles: Pausar (interrompe tudo), Retomar (sem repetir início nem bips passados),
 *   Zerar (cancela e silencia), Mudo (silencia imediatamente; reativar habilita apenas próximos)
 * - Falha graciosa: Se o áudio estiver ausente, mantém o cronômetro sem travar e sem som sintético
 */

// Slots oficiais da temporada FLL
export const AUDIO_SLOTS = {
  START: 'round_start',
  BEEP: 'countdown_beep',
  END: 'round_end',
  // Aliases de compatibilidade
  start: 'round_start',
  beep: 'countdown_beep',
  end: 'round_end',
  round_start: 'round_start',
  countdown_beep: 'countdown_beep',
  round_end: 'round_end'
};

const CANONICAL_SLOTS = ['round_start', 'countdown_beep', 'round_end'];

// Fallbacks de arquivos estáticos MP3 locais caso a rede ou rota ainda não tenha retornado
const LOCAL_STATIC_FALLBACKS = {
  round_start: ['/audio/Som inicio de round.MP3', '/Som inicio de round.MP3', '/audio/som-inicio-round.mp3'],
  countdown_beep: ['/audio/Bip.MP3', '/Bip.MP3', '/audio/bip.mp3'],
  round_end: ['/audio/Som final de Round.MP3', '/Som final de Round.MP3', '/audio/som-final-round.mp3']
};

// Instâncias de HTMLAudioElement no navegador (uma por slot canônico)
const audioElements = {
  round_start: null,
  countdown_beep: null,
  round_end: null
};

// Estados do gerenciador
let isSoundMuted = false;
let audioUnavailable = false;
let currentSeasonTheme = 'BIOGLOW';

/**
 * Retorna a chave canônica de um slot
 */
function toCanonical(slot) {
  if (!slot) return 'round_start';
  const s = String(slot).toLowerCase().trim();
  if (s === 'start' || s === 'round_start') return 'round_start';
  if (s === 'beep' || s === 'countdown_beep') return 'countdown_beep';
  if (s === 'end' || s === 'round_end') return 'round_end';
  return 'round_start';
}

/**
 * Retorna a URL canônica de áudio da temporada atual
 */
function getCanonicalSlotUrl(canonicalSlot, seasonTheme) {
  const theme = seasonTheme || currentSeasonTheme || 'BIOGLOW';
  return `/api/fll/audio?slot=${canonicalSlot}&season=${encodeURIComponent(theme)}`;
}

/**
 * Cria ou recupera o elemento HTMLAudioElement para um slot canônico
 */
function getOrCreateAudio(rawSlot, seasonTheme = null) {
  if (typeof window === 'undefined') return null;

  const canonicalSlot = toCanonical(rawSlot);
  if (seasonTheme) {
    currentSeasonTheme = seasonTheme;
  } else {
    try {
      const active = getLocalActiveFllSeason();
      if (active && active.theme) currentSeasonTheme = active.theme;
    } catch {}
  }

  if (audioElements[canonicalSlot]) {
    return audioElements[canonicalSlot];
  }

  const audio = new Audio();
  audio.preload = 'auto';

  // Configurar fonte principal: rota oficial do servidor vinculada à temporada e ao Google Drive
  const primaryUrl = getCanonicalSlotUrl(canonicalSlot, currentSeasonTheme);
  audio.src = primaryUrl;

  let fallbackIndex = 0;
  const fallbacks = LOCAL_STATIC_FALLBACKS[canonicalSlot] || [];

  audio.addEventListener('error', (e) => {
    // Tenta carregar fallback local se a rota do servidor ainda não estiver provisionada
    if (fallbackIndex < fallbacks.length) {
      const nextFallback = fallbacks[fallbackIndex++];
      audio.src = nextFallback;
      audio.load();
    } else {
      console.warn(`[fllAudio] Arquivo de áudio para "${canonicalSlot}" indisponível (partida continuará silenciosa):`, e?.message || e);
      audioUnavailable = true;
    }
  });

  audioElements[canonicalSlot] = audio;
  return audio;
}

/**
 * Carrega antecipadamente os três arquivos MP3 da temporada FLL ativa
 */
export function preloadFllAudio(seasonTheme = null) {
  if (typeof window === 'undefined') return;

  if (seasonTheme) {
    currentSeasonTheme = seasonTheme;
  } else {
    try {
      const active = getLocalActiveFllSeason();
      if (active && active.theme) currentSeasonTheme = active.theme;
    } catch {}
  }

  try {
    CANONICAL_SLOTS.forEach(canonicalSlot => {
      const audio = getOrCreateAudio(canonicalSlot, currentSeasonTheme);
      if (audio) {
        audio.src = getCanonicalSlotUrl(canonicalSlot, currentSeasonTheme);
        audio.load();
      }
    });
  } catch (err) {
    console.warn('[fllAudio] Falha ao pré-carregar áudios da temporada FLL:', err);
    audioUnavailable = true;
  }
}

/**
 * Atualiza a URL do áudio de um slot
 */
export function updateAudioSource(rawSlot, url, seasonTheme = null) {
  const canonicalSlot = toCanonical(rawSlot);
  const audio = getOrCreateAudio(canonicalSlot, seasonTheme);
  if (audio) {
    audio.src = url || getCanonicalSlotUrl(canonicalSlot, seasonTheme || currentSeasonTheme);
    audio.load();
    audioUnavailable = false;
  }
}

/**
 * Toca o som oficial de início de round ("round_start")
 * Disparado simultaneamente em 02:30 sem aguardar término para contar
 */
export function playStartRoundSound() {
  if (isSoundMuted) return Promise.resolve(false);

  // Interrompe qualquer áudio prévio
  stopAllAudio();

  const audio = getOrCreateAudio('round_start');
  if (!audio) return Promise.resolve(false);

  return new Promise((resolve) => {
    try {
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => resolve(true))
          .catch((err) => {
            console.warn('[fllAudio] Reprodução de início pausada pelo navegador ou arquivo ausente:', err?.message || err);
            resolve(false);
          });
      } else {
        resolve(true);
      }
    } catch (err) {
      console.warn('[fllAudio] Falha ao acionar som de início:', err);
      resolve(false);
    }
  });
}

/**
 * Reproduz o MP3 oficial de bip uma vez por segundo de 00:10 até 00:01 (10 disparos)
 * Reinicia a reprodução desde o início do arquivo e interrompe reprodução anterior se ativa
 */
export function playCountdownPip() {
  if (isSoundMuted) return Promise.resolve(false);

  const audio = getOrCreateAudio('countdown_beep');
  if (!audio) return Promise.resolve(false);

  return new Promise((resolve) => {
    try {
      // Reinicia reprodução desde o começo; se ativo, interrompe imediatamente o disparo anterior
      audio.pause();
      audio.currentTime = 0;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => resolve(true))
          .catch((err) => {
            console.warn('[fllAudio] Bip dos 10 segundos silencioso ou bloqueado:', err?.message || err);
            resolve(false);
          });
      } else {
        resolve(true);
      }
    } catch (err) {
      console.warn('[fllAudio] Falha ao reproduzir bip MP3:', err);
      resolve(false);
    }
  });
}

/**
 * Toca o som oficial de término de round ("round_end")
 * Ao atingir 00:00, interrompe qualquer bip ativo e reproduz exclusivamente o término (sem bip adicional)
 */
export function playEndRoundSound() {
  if (isSoundMuted) return Promise.resolve(false);

  // Interrompe imediatamente qualquer bip ativo e outros áudios para não tocar simultâneo
  stopAllAudio();

  const audio = getOrCreateAudio('round_end');
  if (!audio) return Promise.resolve(false);

  return new Promise((resolve) => {
    try {
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => resolve(true))
          .catch((err) => {
            console.warn('[fllAudio] Reprodução final bloqueada ou arquivo ausente:', err?.message || err);
            resolve(false);
          });
      } else {
        resolve(true);
      }
    } catch (err) {
      console.warn('[fllAudio] Falha ao acionar som final:', err);
      resolve(false);
    }
  });
}

/**
 * Interrompe imediatamente todos os áudios do cronômetro (Pausar, Zerar, Silenciar)
 */
export function stopAllAudio() {
  try {
    Object.values(audioElements).forEach((audio) => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
  } catch (err) {
    console.warn('[fllAudio] Erro ao interromper áudios:', err);
  }
}

/**
 * Controle de som: ativado ou desativado
 * Ao desativar, silencia imediatamente. Ao reativar, habilita apenas próximos eventos
 */
export function setSoundMuted(muted) {
  isSoundMuted = Boolean(muted);
  if (isSoundMuted) {
    stopAllAudio();
  }
}

export function getSoundMuted() {
  return isSoundMuted;
}

export function isAudioFileUnavailable() {
  return audioUnavailable;
}

// Aliases para compatibilidade retroativa
export const playStartWhistle = playStartRoundSound;
export const playBuzzer = playEndRoundSound;
export const playEndgameWarning = playCountdownPip;
