import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Flag, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { playCountdownPip, playStartWhistle, playEndgameWarning, playBuzzer } from '@/lib/fllAudio';

export default function BioglowTimer({ compact = false }) {
  const [secondsLeft, setSecondsLeft] = useState(150);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [countdownStep, setCountdownStep] = useState(null); // null, 3, 2, 1, 'LEGO'
  
  const timerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;

  // Cleanup na desmontagem
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    };
  }, []);

  // Formatação MM:SS
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Controle de som e marcos oficiais
  const handleTick = (prev) => {
    if (prev <= 1) {
      if (soundRef.current) playBuzzer();
      setIsRunning(false);
      return 0;
    }
    const next = prev - 1;
    // Alerta de Endgame nos 30 segundos restantes
    if (next === 30 && soundRef.current) {
      playEndgameWarning();
    }
    return next;
  };

  const startMainTimer = () => {
    setIsRunning(true);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft(handleTick);
    }, 1000);
  };

  const handleStart = (withCountdown = false) => {
    if (secondsLeft === 0) {
      setSecondsLeft(150);
    }

    if (withCountdown) {
      setCountdownStep(3);
      if (soundRef.current) playCountdownPip();

      countdownTimerRef.current = setTimeout(() => {
        setCountdownStep(2);
        if (soundRef.current) playCountdownPip();

        countdownTimerRef.current = setTimeout(() => {
          setCountdownStep(1);
          if (soundRef.current) playCountdownPip();

          countdownTimerRef.current = setTimeout(() => {
            setCountdownStep('LEGO!');
            if (soundRef.current) playStartWhistle();

            countdownTimerRef.current = setTimeout(() => {
              setCountdownStep(null);
              startMainTimer();
            }, 600);
          }, 800);
        }, 800);
      }, 800);
    } else {
      startMainTimer();
    }
  };

  const handlePause = () => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    setCountdownStep(null);
  };

  const handleReset = () => {
    handlePause();
    setSecondsLeft(150);
  };

  // Cores de status
  const isEndgame = secondsLeft <= 30 && secondsLeft > 0;
  const isFinished = secondsLeft === 0;

  let timerColor = 'text-white';
  let badgeColor = 'bg-white/10 text-white';
  let badgeText = 'Pronto para Iniciar';

  if (countdownStep !== null) {
    timerColor = 'text-red-400';
    badgeColor = 'bg-[#E10600]/20 text-red-400 animate-pulse';
    badgeText = countdownStep === 'LEGO!' ? 'LARGADA!' : `Contagem: ${countdownStep}`;
  } else if (isFinished) {
    timerColor = 'text-red-500';
    badgeColor = 'bg-red-500/20 text-red-400';
    badgeText = 'TEMPO ESGOTADO!';
  } else if (isEndgame) {
    timerColor = 'text-amber-400';
    badgeColor = 'bg-amber-500/20 text-amber-400 animate-pulse';
    badgeText = 'ENDGAME (30s)';
  } else if (isRunning) {
    timerColor = 'text-emerald-400';
    badgeColor = 'bg-emerald-500/20 text-emerald-400';
    badgeText = 'ROUND EM ANDAMENTO';
  }

  // Porcentagem de tempo decorrido
  const progressPercent = Math.min(100, Math.max(0, ((150 - secondsLeft) / 150) * 100));

  if (compact) {
    return (
      <div className="flex items-center gap-2 bg-[#111217] border border-white/10 rounded-lg px-3 py-1.5 shadow-sm">
        <Clock className="w-4 h-4 text-[#E10600] flex-shrink-0" />
        <span className={`font-mono text-base font-bold tabular-nums ${timerColor}`}>
          {countdownStep !== null ? countdownStep : formattedTime}
        </span>
        <div className="flex items-center gap-1 ml-1">
          {!isRunning && countdownStep === null ? (
            <button
              onClick={() => handleStart(false)}
              className="p-1.5 rounded bg-[#E10600] hover:bg-[#c00500] text-white transition-colors"
              title="Iniciar Cronômetro"
              aria-label="Iniciar cronômetro"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="p-1.5 rounded bg-amber-500 hover:bg-amber-600 text-black transition-colors"
              title="Pausar"
              aria-label="Pausar cronômetro"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
            </button>
          )}
          <button
            onClick={handleReset}
            className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Reiniciar (2:30)"
            aria-label="Reiniciar cronômetro"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#111217] border border-white/10 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
      {/* Barra de progresso do tempo */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/5">
        <div
          className={`h-full transition-all duration-300 ${
            isFinished
              ? 'bg-red-500'
              : isEndgame
              ? 'bg-amber-500'
              : 'bg-emerald-500'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Mostrador de tempo */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6 text-[#E10600]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
                {badgeText}
              </span>
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-white/5"
                title={soundEnabled ? 'Silenciar bips' : 'Ativar som'}
                aria-label={soundEnabled ? 'Silenciar bips sonoros' : 'Ativar bips sonoros'}
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Som ativo</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-gray-500" />
                    <span>Mudo</span>
                  </>
                )}
              </button>
            </div>
            <div className={`font-mono text-4xl sm:text-5xl font-black tracking-tight tabular-nums ${timerColor}`}>
              {countdownStep !== null ? (
                <span className="text-red-400 animate-bounce inline-block">
                  {countdownStep}
                </span>
              ) : (
                formattedTime
              )}
            </div>
          </div>
        </div>

        {/* Controles de Ação com alvos de toque grandes (>= 44px) */}
        <div className="flex flex-wrap items-center gap-2">
          {!isRunning && countdownStep === null ? (
            <>
              <Button
                type="button"
                onClick={() => handleStart(true)}
                className="h-11 px-4 bg-[#E10600] hover:bg-[#c00500] text-white font-bold flex items-center gap-2 rounded-xl shadow-lg transition-all"
              >
                <Flag className="w-4 h-4 fill-current" />
                <span>3, 2, 1, LEGO!</span>
              </Button>
              <Button
                type="button"
                onClick={() => handleStart(false)}
                variant="outline"
                className="h-11 px-4 bg-white/5 hover:bg-white/10 text-white border-white/10 font-medium flex items-center gap-2 rounded-xl transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Iniciar Direto</span>
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={handlePause}
              className="h-11 px-5 bg-amber-500 hover:bg-amber-600 text-black font-bold flex items-center gap-2 rounded-xl shadow-lg transition-all"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>Pausar</span>
            </Button>
          )}

          <Button
            type="button"
            onClick={handleReset}
            variant="outline"
            className="h-11 px-4 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border-white/10 font-medium flex items-center gap-2 rounded-xl transition-all"
            title="Zerar cronômetro para 2:30"
          >
            <RotateCcw className="w-4 h-4" />
            <span>2min30s</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
