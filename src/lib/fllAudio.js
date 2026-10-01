/**
 * Gerenciador de Áudio Oficial FLL BIOGLOW - Portal Tera
 * 
 * Arquitetura de Reprodução Fiel de MP3:
 * - Áudios armazenados no Google Drive institucional e entregues via rota /api/fll/audio
 * - Reprodução estrita de MP3 via elemento de áudio nativo do navegador (HTMLAudioElement)
 * - REMOÇÃO TOTAL de sintetizadores Web Audio, osciladores, fallbacks sonoros e versões MIDI
 * - Preservação integral dos bytes originais sem qualquer recompressão ou alteração
 * 
 * Sequência Oficial:
 * - 02:30: Som de início do round reproduzido uma única vez simultaneamente à contagem
 * - 00:10 até 00:01: MP3 de bip curto disparado 1x por segundo (10 disparos no total),
 *   reiniciando a reprodução desde o início do arquivo a cada segundo e interrompendo o anterior
 * - 00:00: Interrompe qualquer bip ativo e reproduz exclusivamente o Som de término (sem bip)
 * - Controles: Pausar (interrompe tudo), Retomar (sem repetir início nem bips passados),
 *   Zerar (cancela e silencia), Mudo (silencia imediatamente; reativar habilita apenas próximos)
 * - Falha graciosa: Se o áudio estiver ausente, mantém o cronômetro sem som alternativo
 */

// Slots oficiais do simulador FLL
export const AUDIO_SLOTS = {
  START: 'start',
  BEEP: 'beep',
  END: 'end'
};

// URLs diretas da rota pública do servidor
const SLOT_URLS = {
  start: '/api/fll/audio?slot=start',
  beep: '/api/fll/audio?slot=beep',
  end: '/api/fll/audio?slot=end'
};

// Fallbacks de arquivos estáticos MP3 locais caso a rota de streaming ainda não tenha sido configurada
const LOCAL_STATIC_FALLBACKS = {
  start: ['/audio/Som inicio de round.MP3', '/Som inicio de round.MP3', '/audio/som-inicio-round.mp3'],
  beep: ['/audio/Bip.MP3', '/Bip.MP3', '/audio/bip.mp3'],
  end: ['/audio/Som final de Round.MP3', '/Som final de Round.MP3', '/audio/som-final-round.mp3']
};

// Instâncias de HTMLAudioElement no navegador
const audioElements = {
  start: null,
  beep: null,
  end: null
};

// Estados do gerenciador
let isSoundMuted = false;
let audioUnavailable = false;
let isPreloaded = false;

/**
 * Cria ou recupera o elemento HTMLAudioElement para um slot específico
 */
function getOrCreateAudio(slot) {
  if (typeof window === 'undefined') return null;

  if (audioElements[slot]) {
    return audioElements[slot];
  }

  const audio = new Audio();
  audio.preload = 'auto';

  // Configurar fonte principal: rota oficial do servidor vinculada ao Google Drive
  const primaryUrl = SLOT_URLS[slot];
  audio.src = primaryUrl;

  let fallbackIndex = 0;
  const fallbacks = LOCAL_STATIC_FALLBACKS[slot] || [];

  audio.addEventListener('error', () => {
    // Tenta carregar fallback local se a rota do servidor ainda não estiver provisionada
    if (fallbackIndex < fallbacks.length) {
      const nextFallback = fallbacks[fallbackIndex++];
      audio.src = nextFallback;
      audio.load();
    } else {
      // Se não carregar nenhum arquivo, marca indisponibilidade sem tocar som sintético
      audioUnavailable = true;
    }
  });

  audioElements[slot] = audio;
  return audio;
}

/**
 * Carrega os três áudios antecipadamente e prepara a reprodução
 */
export function preloadFllAudio() {
  if (typeof window === 'undefined') return;
  try {
    const start = getOrCreateAudio(AUDIO_SLOTS.START);
    const beep = getOrCreateAudio(AUDIO_SLOTS.BEEP);
    const end = getOrCreateAudio(AUDIO_SLOTS.END);

    if (start) start.load();
    if (beep) beep.load();
    if (end) end.load();

    isPreloaded = true;
  } catch (err) {
    console.warn('[fllAudio] Falha ao pré-carregar áudios:', err);
    audioUnavailable = true;
  }
}

/**
 * Atualiza as fontes dos áudios após substituição pelo painel administrativo
 */
export function updateAudioSource(slot, url) {
  if (!audioElements[slot]) {
    getOrCreateAudio(slot);
  }
  const audio = audioElements[slot];
  if (audio) {
    audio.src = url || SLOT_URLS[slot];
    audio.load();
    audioUnavailable = false;
  }
}

/**
 * Toca o som oficial de início de round ("Som inicio de round.MP3")
 * Disparado simultaneamente em 02:30 sem esperar término para contar
 */
export function playStartRoundSound() {
  if (isSoundMuted) return Promise.resolve(false);

  // Interrompe qualquer áudio em reprodução prévia
  stopAllAudio();

  const audio = getOrCreateAudio(AUDIO_SLOTS.START);
  if (!audio) return Promise.resolve(false);

  return new Promise((resolve) => {
    try {
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => resolve(true))
          .catch((err) => {
            console.warn('[fllAudio] Reprodução de início bloqueada ou arquivo ausente:', err?.message || err);
            audioUnavailable = true;
            resolve(false);
          });
      } else {
        resolve(true);
      }
    } catch (err) {
      console.warn('[fllAudio] Falha ao acionar som de início:', err);
      audioUnavailable = true;
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

  const audio = getOrCreateAudio(AUDIO_SLOTS.BEEP);
  if (!audio) return Promise.resolve(false);

  return new Promise((resolve) => {
    try {
      // Reinicia reprodução desde o começo; se ativo, interrompe imediatamente
      audio.pause();
      audio.currentTime = 0;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => resolve(true))
          .catch((err) => {
            console.warn('[fllAudio] Reprodução de bip falhou ou arquivo ausente:', err?.message || err);
            audioUnavailable = true;
            resolve(false);
          });
      } else {
        resolve(true);
      }
    } catch (err) {
      console.warn('[fllAudio] Falha ao reproduzir bip MP3:', err);
      audioUnavailable = true;
      resolve(false);
    }
  });
}

/**
 * Toca o som oficial de término de round ("Som final de Round.MP3")
 * Ao atingir 00:00, interrompe qualquer bip ativo e reproduz exclusivamente o término (sem bip adicional)
 */
export function playEndRoundSound() {
  if (isSoundMuted) return Promise.resolve(false);

  // Interrompe imediatamente qualquer bip ativo e outros áudios
  stopAllAudio();

  const audio = getOrCreateAudio(AUDIO_SLOTS.END);
  if (!audio) return Promise.resolve(false);

  return new Promise((resolve) => {
    try {
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => resolve(true))
          .catch((err) => {
            console.warn('[fllAudio] Reprodução final falhou ou arquivo ausente:', err?.message || err);
            audioUnavailable = true;
            resolve(false);
          });
      } else {
        resolve(true);
      }
    } catch (err) {
      console.warn('[fllAudio] Falha ao acionar som final:', err);
      audioUnavailable = true;
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

// Aliases para compatibilidade retroativa com componentes existentes
export const playStartWhistle = playStartRoundSound;
export const playBuzzer = playEndRoundSound;
export const playEndgameWarning = playCountdownPip;
