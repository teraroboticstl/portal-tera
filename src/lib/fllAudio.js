/**
 * Efeitos sonoros sintetizados via Web Audio API para o cronômetro FLL BIOGLOW
 * Sem arquivos externos, 100% autônomo, compatível com todos os navegadores.
 */

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playTone(freq = 440, duration = 0.15, type = 'sine', volume = 0.3) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    console.warn('Audio play tone error:', err);
  }
}

export function playCountdownPip() {
  playTone(520, 0.08, 'triangle', 0.25);
}

export function playStartWhistle() {
  playTone(880, 0.35, 'square', 0.3);
}

export function playEndgameWarning() {
  playTone(660, 0.12, 'sawtooth', 0.25);
  setTimeout(() => {
    playTone(660, 0.15, 'sawtooth', 0.25);
  }, 160);
}

export function playBuzzer() {
  playTone(220, 0.8, 'sawtooth', 0.35);
}
