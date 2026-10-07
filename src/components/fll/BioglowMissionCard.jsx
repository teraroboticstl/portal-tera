import React, { useState, useEffect } from 'react';
import { Info, AlertCircle, Check, ChevronDown, ChevronUp, Maximize2, X, ImageOff } from 'lucide-react';

export default function BioglowMissionCard({
  compact = false,
  code,
  title,
  subtotal = 0,
  maxPoints = 0,
  description,
  requirements = [],
  bonuses = [],
  restrictions = [],
  imageUrl = '',
  imageAlt = '',
  children
}) {
  const [showRules, setShowRules] = useState(false);
  const [isEnlarged, setIsEnlarged] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Fecha o modal ao pressionar Escape
  useEffect(() => {
    if (!isEnlarged) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsEnlarged(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEnlarged]);

  const hasScore = subtotal > 0;
  const isMaxScore = maxPoints > 0 && subtotal >= maxPoints;
  const effectiveAlt = imageAlt || `Ilustração do modelo e condição de pontuação da missão ${code} - ${title}`;

  return (
    <div
      className={`${compact ? 'md:grid md:grid-cols-2 ' : ''}rounded-2xl border transition-all duration-200 overflow-hidden ${
        hasScore
          ? 'bg-[#14151C] border-[#E10600]/30 shadow-lg shadow-black/40'
          : 'bg-[#111217] border-white/10 hover:border-white/20'
      }`}
    >
      {/* Cabeçalho do Card */}
      <div className={`${compact ? 'p-3 md:border-r md:border-b-0' : 'p-4 sm:p-5'} border-b border-white/5 flex items-start justify-between gap-3`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-[#E10600]">
              {code}
            </span>
            <span className="text-xs text-gray-500">·</span>
            <span className="text-xs text-gray-400">
              Máx: {maxPoints} pts
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {title}
          </h3>
          {description && (
            <p className="text-xs sm:text-sm text-[#B8BDC7] leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Subtotal da Missão */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div
            className={`font-mono text-base sm:text-lg font-black px-2.5 py-1 rounded-lg border tabular-nums ${
              isMaxScore
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                : hasScore
                ? 'bg-[#E10600]/20 text-red-400 border-[#E10600]/40'
                : 'bg-white/5 text-gray-400 border-white/10'
            }`}
          >
            {subtotal} pts
          </div>

          <button
            type="button"
            onClick={() => setShowRules(!showRules)}
            className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 transition-colors px-1 py-0.5"
            aria-expanded={showRules}
          >
            <Info className="w-3 h-3 text-[#E10600]" />
            <span>{showRules ? 'Ocultar regras' : 'Regras'}</span>
            {showRules ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* Imagem Oficial da Missão com Armazenamento no Google Drive */}
      {!compact && imageUrl && !imageError && (
        <div className="px-4 sm:px-5 pt-4">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsEnlarged(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsEnlarged(true);
              }
            }}
            aria-label={`Ampliar imagem da missão ${code}`}
            title="Clique para ampliar a imagem do modelo"
            className="group/img relative w-full h-44 sm:h-52 bg-[#0B0B0D] rounded-xl overflow-hidden border border-white/10 hover:border-[#E10600]/50 transition-all cursor-pointer flex items-center justify-center"
          >
            <img
              src={imageUrl}
              alt={effectiveAlt}
              loading="lazy"
              onError={() => setImageError(true)}
              className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover/img:scale-[1.03]"
            />
            {/* Overlay com indicação visual de ampliação */}
            <div className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white/90 border border-white/10 backdrop-blur-md opacity-90 sm:opacity-0 sm:group-hover/img:opacity-100 transition-opacity duration-200 shadow-md flex items-center gap-1 text-[11px]">
              <Maximize2 className="w-3.5 h-3.5 text-[#E10600]" />
              <span className="hidden sm:inline font-mono">Ampliar</span>
            </div>
            {imageAlt && (
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-left pointer-events-none opacity-0 group-hover/img:opacity-100 transition-opacity duration-200">
                <p className="text-[11px] text-gray-300 truncate font-sans">
                  {imageAlt}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Indicação discreta em caso de falha de carregamento */}
      {imageUrl && imageError && (
        <div className="px-4 sm:px-5 pt-3">
          <div className="p-2.5 bg-white/[0.02] border border-white/5 rounded-lg flex items-center gap-2 text-xs text-gray-500">
            <ImageOff className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <span className="truncate">Imagem ilustrativa temporariamente indisponível.</span>
          </div>
        </div>
      )}

      {/* Explicação acessível das regras expansível */}
      {showRules && (
        <div className={`${compact ? 'order-2 md:col-span-2' : ''} bg-black/30 border-b border-white/5 p-4 sm:p-5 text-xs sm:text-sm space-y-3`}>
          {requirements.length > 0 && (
            <div>
              <p className="font-semibold text-white mb-1 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Requisitos de Pontuação:</span>
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 pl-1">
                {requirements.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </div>
          )}

          {bonuses.length > 0 && (
            <div>
              <p className="font-semibold text-red-400 mb-1 flex items-center gap-1.5">
                <span className="text-[#E10600]">★</span>
                <span>Bônus Condicionais:</span>
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 pl-1">
                {bonuses.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}

          {restrictions.length > 0 && (
            <div>
              <p className="font-semibold text-amber-400 mb-1 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Restrições e Condições de Fim de Partida:</span>
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 pl-1">
                {restrictions.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Controles interativos da missão */}
      <div className={compact ? 'p-3 space-y-2 md:self-center' : 'p-4 sm:p-5 space-y-3.5'}>
        {children}
      </div>

      {/* Modal / Lightbox de Ampliação da Imagem */}
      {isEnlarged && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Visualização ampliada da missão ${code}`}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in-0 duration-200"
          onClick={() => setIsEnlarged(false)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] bg-[#111217] border border-white/20 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-xs font-mono font-bold uppercase text-[#E10600]">
                  {code} · FLL BIOGLOW
                </span>
                <h4 className="text-base sm:text-lg font-bold text-white">
                  {title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsEnlarged(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                aria-label="Fechar ampliação"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Imagem Ampliada com aspect ratio preservado */}
            <div className="flex-1 w-full min-h-[240px] max-h-[60vh] bg-[#0B0B0D] rounded-xl overflow-hidden flex items-center justify-center p-3 border border-white/5">
              <img
                src={imageUrl}
                alt={effectiveAlt}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Descrição Acessível */}
            {imageAlt && (
              <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-xs sm:text-sm text-gray-300 space-y-1">
                <span className="font-semibold text-white block">Descrição do Modelo:</span>
                <p className="leading-relaxed">{imageAlt}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
