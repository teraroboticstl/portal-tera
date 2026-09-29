import React from 'react';
import { Minus, Plus, Check } from 'lucide-react';

/**
 * Controle de Alternância / Checkbox com alvo tátil confortável
 */
export function BioglowToggle({
  label,
  checked,
  onChange,
  pointsText,
  disabled = false,
  disabledReason = ''
}) {
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`w-full min-h-[46px] p-3 rounded-xl border flex items-center justify-between gap-3 text-left transition-all ${
          disabled
            ? 'opacity-40 bg-white/[0.02] border-white/5 cursor-not-allowed text-gray-500'
            : checked
            ? 'bg-[#E10600]/15 border-[#E10600]/50 text-white font-medium shadow-sm'
            : 'bg-white/[0.03] border-white/10 hover:border-white/25 text-gray-300 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
              checked
                ? 'bg-[#E10600] border-[#E10600] text-white'
                : 'border-white/30 bg-transparent'
            }`}
          >
            {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </div>
          <span className="text-xs sm:text-sm select-none leading-snug">
            {label}
          </span>
        </div>

        {pointsText && (
          <span
            className={`font-mono text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 tabular-nums ${
              checked
                ? 'bg-[#E10600]/20 text-red-400'
                : 'bg-white/5 text-gray-400'
            }`}
          >
            {pointsText}
          </span>
        )}
      </button>

      {disabled && disabledReason && (
        <p className="text-[11px] text-amber-400/90 pl-1 italic">
          ↳ {disabledReason}
        </p>
      )}
    </div>
  );
}

/**
 * Grupo de Opções Exclusivas (Radio / Segmented Control)
 */
export function BioglowRadioGroup({
  label,
  options = [], // [{ value: 'none', label: 'Não', points: 0 }]
  value,
  onChange,
  disabled = false
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <p className="text-xs font-semibold text-gray-300 select-none">
          {label}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => !disabled && onChange(opt.value)}
              className={`min-h-[44px] px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-left transition-all ${
                disabled
                  ? 'opacity-40 bg-white/[0.02] border-white/5 cursor-not-allowed text-gray-500'
                  : isSelected
                  ? 'bg-[#E10600] text-white border-[#E10600] font-bold shadow-md'
                  : 'bg-white/[0.03] border-white/10 hover:border-white/20 text-gray-300 hover:text-white'
              }`}
            >
              <span className="text-xs sm:text-sm select-none truncate">
                {opt.label}
              </span>
              {opt.points !== undefined && (
                <span
                  className={`font-mono text-xs px-1.5 py-0.5 rounded font-bold tabular-nums ${
                    isSelected ? 'bg-black/30 text-white' : 'bg-white/10 text-gray-300'
                  }`}
                >
                  {opt.points > 0 ? `+${opt.points}` : '0'} pts
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Contador Numérico com botões táteis largos (min 44px)
 */
export function BioglowCounter({
  label,
  value = 0,
  min = 0,
  max = 10,
  onChange,
  pointsPerUnit = 0,
  unitLabel = 'unidades',
  disabled = false,
  disabledReason = ''
}) {
  const handleDecrement = () => {
    if (!disabled && value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (!disabled && value < max) {
      onChange(value + 1);
    }
  };

  const totalPoints = value * pointsPerUnit;

  return (
    <div className="flex flex-col gap-1">
      <div
        className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
          disabled
            ? 'opacity-40 bg-white/[0.02] border-white/5 cursor-not-allowed'
            : value > 0
            ? 'bg-[#E10600]/10 border-[#E10600]/40'
            : 'bg-white/[0.03] border-white/10'
        }`}
      >
        <div className="space-y-0.5">
          <span className="text-xs sm:text-sm font-medium text-gray-200 select-none block">
            {label}
          </span>
          <span className="text-[11px] text-gray-400 font-mono">
            {value} de {max} {unitLabel} ({pointsPerUnit > 0 ? `+${pointsPerUnit} pts/un.` : ''})
          </span>
        </div>

        <div className="flex items-center gap-3">
          {pointsPerUnit > 0 && (
            <span
              className={`font-mono text-xs font-bold px-2 py-1 rounded tabular-nums ${
                value > 0 ? 'bg-[#E10600]/20 text-red-400' : 'bg-white/5 text-gray-400'
              }`}
            >
              {totalPoints} pts
            </span>
          )}

          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              disabled={disabled || value <= min}
              onClick={handleDecrement}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-white transition-all"
              aria-label={`Diminuir ${label}`}
            >
              <Minus className="w-4 h-4" />
            </button>

            <span className="font-mono text-base font-black w-8 text-center tabular-nums text-white select-none">
              {value}
            </span>

            <button
              type="button"
              disabled={disabled || value >= max}
              onClick={handleIncrement}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#E10600] hover:bg-[#c00500] active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-white transition-all"
              aria-label={`Aumentar ${label}`}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      {disabled && disabledReason && (
        <p className="text-[11px] text-amber-400/90 pl-1 italic">
          ↳ {disabledReason}
        </p>
      )}
    </div>
  );
}
