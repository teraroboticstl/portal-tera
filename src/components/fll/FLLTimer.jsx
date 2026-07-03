import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Square, RotateCcw, Plus, Minus, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SOUNDS = {
  trois: 'https://komurobo.com/wav/trois-fr.mp3',
  deux:  'https://komurobo.com/wav/deux-fr.mp3',
  un:    'https://komurobo.com/wav/un-fr.mp3',
  lego:  'https://komurobo.com/wav/lego-fr.mp3',
  start: 'https://komurobo.com/wav/start.mp3',
  pause: 'https://komurobo.com/wav/pause.mp3',
  gameEnd: 'https://komurobo.com/wav/game-end.mp3',
  end:   'https://komurobo.com/wav/end.mp3',
};

const COUNTDOWN_STEPS = [
  { label: '3', speech: 'Three' },
  { label: '2', speech: 'Two' },
  { label: '1', speech: 'One' },
  { label: 'LEGO!', speech: 'LEGO!' },
];

function speak(text, onEnd) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.9;
  if (onEnd) u.onend = onEnd;
  speechSynthesis.speak(u);
}

export default function FLLTimer({
  timeLeft, setTimeLeft, timerRunning, setTimerRunning,
  timerDone, setTimerDone, jetons, setJetons, precisionTable, onReset
}) {
  const intervalRef = useRef(null);
  const audioRef = useRef(null);
  const warned30Ref = useRef(false);
  const endFiredRef = useRef(false);

  const [muted, setMuted] = useState(false);
  const [countdown, setCountdown] = useState(null); // null | '3' | '2' | '1' | 'LEGO!'
  const [countingDown, setCountingDown] = useState(false);

  const mutedRef = useRef(muted);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const playSound = useCallback((key, onEnded) => {
    if (mutedRef.current) { onEnded?.(); return; }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    const audio = new Audio(SOUNDS[key]);
    audioRef.current = audio;
    audio.play().catch(() => {});
    if (onEnded) audio.addEventListener('ended', onEnded, { once: true });
  }, []);

  // Timer tick
  useEffect(() => {
    if (timerRunning) {
      warned30Ref.current = timeLeft > 30 ? false : warned30Ref.current;
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setTimerRunning(false);
            setTimerDone(true);
            return 0;
          }
          // Warning at 30s
          if (prev - 1 === 30 && !warned30Ref.current) {
            warned30Ref.current = true;
            if (!mutedRef.current) {
              const a = new Audio(SOUNDS.pause);
              a.play().catch(() => {});
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [timerRunning]);

  // Game end sounds
  useEffect(() => {
    if (timerDone && !endFiredRef.current) {
      endFiredRef.current = true;
      playSound('gameEnd', () => {
        setTimeout(() => {
          if (!mutedRef.current) {
            const a = new Audio(SOUNDS.end);
            a.play().catch(() => {});
          }
        }, 2000);
      });
    }
  }, [timerDone, playSound]);

  // Countdown then start
  const handleStart = useCallback(() => {
    if (timerRunning || countingDown) return;
    setCountingDown(true);
    endFiredRef.current = false;
    warned30Ref.current = false;

    let step = 0;
    const runStep = () => {
      if (step >= COUNTDOWN_STEPS.length) {
        setCountdown(null);
        setCountingDown(false);
        setTimerRunning(true);
        if (!mutedRef.current) {
          const startAudio = new Audio(SOUNDS.start);
          startAudio.play().catch(() => {});
          setTimeout(() => { startAudio.pause(); }, 3000);
        }
        return;
      }
      const { label, speech } = COUNTDOWN_STEPS[step];
      setCountdown(label);
      if (!mutedRef.current) {
        speak(speech, () => { step++; setTimeout(runStep, 100); });
      } else {
        step++;
        setTimeout(runStep, 900);
      }
    };
    runStep();
  }, [timerRunning, countingDown, playSound, setTimerRunning]);

  const handleStop = () => {
    setTimerRunning(false);
  };

  const handleReset = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    endFiredRef.current = false;
    warned30Ref.current = false;
    setCountdown(null);
    setCountingDown(false);
    onReset();
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const pct = (timeLeft / 150) * 100;
  const isWarning = timeLeft <= 30;
  const isCritical = timeLeft <= 10;
  const pts = precisionTable[jetons] || 0;

  return (
    <div className="relative bg-[#111827] border border-[#1e3a5f] rounded-xl p-4 mb-4 overflow-hidden">

      {/* Countdown Overlay */}
      <AnimatePresence>
        {countdown && (
          <motion.div
            key={countdown}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.4 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-[#0a0e1a]/90 rounded-xl"
          >
            <div className="text-center">
              <p className={`font-black tabular-nums ${
                countdown === 'LEGO!'
                  ? 'text-7xl text-yellow-400'
                  : 'text-9xl text-white'
              }`}>
                {countdown}
              </p>
              {countdown === 'LEGO!' && (
                <p className="text-blue-300 text-lg font-bold mt-2 uppercase tracking-widest">Vai!</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        {/* Timer */}
        <div className="flex-1 text-center">
          <div className={`text-6xl font-black tabular-nums font-mono transition-colors ${isCritical ? 'text-red-400 animate-pulse' : isWarning ? 'text-orange-400' : 'text-white'}`}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>

          {/* Progress bar */}
          <div className="mt-2 h-2 bg-[#1a237e]/40 rounded-full overflow-hidden w-full">
            <div className={`h-full rounded-full transition-all duration-1000 ${isCritical ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-blue-500'}`}
              style={{ width: `${pct}%` }} />
          </div>

          {timerDone && (
            <p className="text-red-400 font-bold text-sm mt-1 animate-pulse">⏰ TEMPO ESGOTADO — Entradas bloqueadas!</p>
          )}

          {/* Buttons */}
          <div className="flex gap-2 justify-center mt-3 flex-wrap">
            {!timerDone && (
              timerRunning ? (
                <button onClick={handleStop}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm bg-orange-500 hover:bg-orange-400 text-white transition-colors">
                  <Square className="w-4 h-4" /> Parar
                </button>
              ) : (
                <button onClick={handleStart} disabled={countingDown}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white transition-colors">
                  <Play className="w-4 h-4" /> {countingDown ? 'Iniciando...' : 'Iniciar'}
                </button>
              )
            )}
            <button onClick={handleReset}
              className="flex items-center gap-2 px-5 py-2 bg-[#1a237e]/60 hover:bg-[#1a237e] border border-[#283593] rounded-lg font-bold text-sm transition-colors text-blue-300">
              <RotateCcw className="w-4 h-4" /> Resetar
            </button>
            <button onClick={() => setMuted(m => !m)}
              title={muted ? 'Ativar sons' : 'Silenciar'}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-sm border transition-colors ${muted ? 'bg-red-900/30 border-red-700/40 text-red-400' : 'bg-[#1a237e]/40 border-[#283593] text-blue-300 hover:bg-[#1a237e]'}`}>
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {muted ? 'Mudo' : 'Sons'}
            </button>
          </div>
        </div>

        {/* Jetons */}
        <div className="border-t sm:border-t-0 sm:border-l border-[#283593] pt-4 sm:pt-0 sm:pl-6 text-center w-full sm:w-40">
          <p className="text-xs text-blue-300 font-bold uppercase tracking-widest mb-1">Disco de Precisão</p>
          <div className={`text-5xl font-black mb-1 ${jetons === 0 ? 'text-gray-500' : jetons >= 5 ? 'text-green-400' : jetons >= 3 ? 'text-yellow-400' : 'text-red-400'}`}>
            {jetons}
          </div>
          <p className="text-yellow-400 font-bold text-lg mb-3">+{pts} pts</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => setJetons(j => Math.max(0, j - 1))} disabled={timerDone}
              className="w-9 h-9 rounded-lg bg-red-600/20 hover:bg-red-600/40 border border-red-600/30 text-red-400 font-black flex items-center justify-center disabled:opacity-40 transition-colors">
              <Minus className="w-4 h-4" />
            </button>
            <button onClick={() => setJetons(j => Math.min(6, j + 1))} disabled={timerDone}
              className="w-9 h-9 rounded-lg bg-green-600/20 hover:bg-green-600/40 border border-green-600/30 text-green-400 font-black flex items-center justify-center disabled:opacity-40 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {[6,5,4,3,2,1,0].map(j => (
              <div key={j} className={`flex justify-between px-2 ${jetons === j ? 'text-yellow-400 font-bold' : ''}`}>
                <span>{j}🪙</span><span>{precisionTable[j]}pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}