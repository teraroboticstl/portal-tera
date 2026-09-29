import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, Bookmark, Share2, Clock, Trophy 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { playStartWhistle, playEndgameWarning, playBuzzer } from '@/lib/fllAudio';

export default function BioglowScoreHeader({
  score = 0,
  onResetClick,
  onSaveClick,
  onShareClick,
  resetTrigger = 0
}) {
  const [secondsLeft, setSecondsLeft] = useState(150);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef(null);

  // Sincroniza reset quando o usuário confirma zerar a simulação
  useEffect(() => {
    if (resetTrigger > 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRunning(false);
      setSecondsLeft(150);
    }
  }, [resetTrigger]);

  // Limpeza de timers na desmontagem
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Formatação estrita MM:SS (ex: 02:30)
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Controle de som e contagem do cronômetro oficial
  const handleTick = (prev) => {
    if (prev <= 1) {
      try { playBuzzer(); } catch {}
      setIsRunning(false);
      return 0;
    }
    const next = prev - 1;
    if (next === 30) {
      try { playEndgameWarning(); } catch {}
    }
    return next;
  };

  const startTimer = () => {
    setIsRunning(true);
    if (timerRef.current) clearInterval(timerRef.current);
    try { playStartWhistle(); } catch {}
    timerRef.current = setInterval(() => {
      setSecondsLeft(handleTick);
    }, 1000);
  };

  const pauseTimer = () => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const resumeTimer = () => {
    setIsRunning(true);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft(handleTick);
    }, 1000);
  };

  // Alternador único: Iniciar -> Pausar -> Retomar
  const handleToggleTimer = () => {
    if (isRunning) {
      pauseTimer();
    } else if (secondsLeft === 0) {
      setSecondsLeft(150);
      startTimer();
    } else if (secondsLeft < 150) {
      resumeTimer();
    } else {
      startTimer();
    }
  };

  const isPaused = !isRunning && secondsLeft < 150 && secondsLeft > 0;
  const isEndgame = secondsLeft <= 30 && secondsLeft > 0;
  const isFinished = secondsLeft === 0;

  let timerColor = 'text-white';
  if (isFinished) timerColor = 'text-red-500';
  else if (isEndgame) timerColor = 'text-amber-400';
  else if (isRunning) timerColor = 'text-emerald-400';

  return (
    <header className="sticky top-14 z-40 bg-[#0B0B0D]/95 backdrop-blur-md border-b border-white/10 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5">
        
        {/* Layout Desktop: 1 linha contínua (Título à esquerda, Controles ao centro, Cronômetro e Pontos à direita) */}
        <div className="hidden lg:flex items-center justify-between gap-4 h-11">
          
          {/* Título Oficial */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#E10600]/15 border border-[#E10600]/30 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 text-[#E10600]" />
            </div>
            <div className="font-extrabold text-sm tracking-tight whitespace-nowrap">
              <span className="text-white">SIMULADOR DE ROUND</span>
              <span className="text-[#E10600] ml-1.5 font-black">| FLL BIOGLOW</span>
            </div>
          </div>

          {/* Controles Centralizados: Iniciar/Pausar/Retomar, Zerar, Salvar, Compartilhar */}
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleToggleTimer}
              className={`h-9 w-24 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors select-none ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-600 text-black'
                  : isPaused
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-[#E10600] hover:bg-[#c00500] text-white'
              }`}
              title={isRunning ? 'Pausar cronômetro' : isPaused ? 'Retomar cronômetro' : 'Iniciar cronômetro de 2min30s'}
            >
              {isRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pausar</span>
                </>
              ) : isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Retomar</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Iniciar</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetClick}
              className="h-9 px-3 bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white border-white/10 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
              title="Zerar pontuação da partida"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
              <span>Zerar</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSaveClick}
              className="h-9 px-3 bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white border-white/10 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
              title="Salvar resultado da simulação"
            >
              <Bookmark className="w-3.5 h-3.5 text-[#E10600]" />
              <span>Salvar</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onShareClick}
              className="h-9 px-3 bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white border-white/10 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
              title="Compartilhar resultado do round"
            >
              <Share2 className="w-3.5 h-3.5 text-gray-400" />
              <span>Compartilhar</span>
            </Button>
          </div>

          {/* Destaques à Direita: Cronômetro (02:30) e Pontuação Total (Pontos) */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Cronômetro */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/50 border border-white/10">
              <Clock className="w-4 h-4 text-[#E10600] shrink-0" />
              <span className={`font-mono text-xl font-black tabular-nums tracking-tight ${timerColor}`}>
                {formattedTime}
              </span>
            </div>

            {/* Pontuação */}
            <div className="flex items-baseline gap-1.5 px-3 py-1.5 rounded-xl bg-[#E10600]/15 border border-[#E10600]/35">
              <span className="font-mono text-xl font-black text-white tabular-nums tracking-tight">
                {score}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-300 font-mono">
                Pontos
              </span>
            </div>
          </div>
        </div>

        {/* Layout Mobile / Tablet: 2 linhas compactas sem rolagem horizontal */}
        <div className="lg:hidden flex flex-col gap-2">
          
          {/* Linha 1: Título à esquerda + Destaques (Cronômetro e Pontos) à direita */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 pr-1">
              <Trophy className="w-4 h-4 text-[#E10600] shrink-0" />
              <span className="font-black text-xs sm:text-sm tracking-tight text-white leading-tight truncate">
                SIMULADOR DE ROUND <span className="text-[#E10600]">| FLL BIOGLOW</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Cronômetro Mobile */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 border border-white/10">
                <Clock className="w-3.5 h-3.5 text-[#E10600] shrink-0" />
                <span className={`font-mono text-sm sm:text-base font-black tabular-nums tracking-tight ${timerColor}`}>
                  {formattedTime}
                </span>
              </div>

              {/* Pontuação Mobile */}
              <div className="flex items-baseline gap-1 px-2 py-1 rounded-lg bg-[#E10600]/15 border border-[#E10600]/30">
                <span className="font-mono text-sm sm:text-base font-black text-white tabular-nums tracking-tight">
                  {score}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-300 font-mono">
                  Pontos
                </span>
              </div>
            </div>
          </div>

          {/* Linha 2: Os 4 Controles distribuídos com toque confortável e sem rolagem horizontal */}
          <div className="grid grid-cols-4 gap-1.5">
            <Button
              type="button"
              size="sm"
              onClick={handleToggleTimer}
              className={`h-8.5 px-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors w-full select-none ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-600 text-black'
                  : isPaused
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-[#E10600] hover:bg-[#c00500] text-white'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-3 h-3 fill-current shrink-0" />
                  <span className="truncate">Pausar</span>
                </>
              ) : isPaused ? (
                <>
                  <Play className="w-3 h-3 fill-current shrink-0" />
                  <span className="truncate">Retomar</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current shrink-0" />
                  <span className="truncate">Iniciar</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetClick}
              className="h-8.5 px-1.5 bg-white/5 hover:bg-white/10 text-gray-200 border-white/10 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors w-full"
            >
              <RotateCcw className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="truncate">Zerar</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSaveClick}
              className="h-8.5 px-1.5 bg-white/5 hover:bg-white/10 text-gray-200 border-white/10 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors w-full"
            >
              <Bookmark className="w-3 h-3 text-[#E10600] shrink-0" />
              <span className="truncate">Salvar</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onShareClick}
              className="h-8.5 px-1.5 bg-white/5 hover:bg-white/10 text-gray-200 border-white/10 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors w-full"
            >
              <Share2 className="w-3 h-3 text-gray-400 shrink-0" />
              <span className="truncate">Compartilhar</span>
            </Button>
          </div>

        </div>

      </div>
    </header>
  );
}
