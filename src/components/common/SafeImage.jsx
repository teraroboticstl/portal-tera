import React, { useState } from 'react';
import { ExternalLink, ImageOff } from 'lucide-react';

/**
 * Componente padrão para exibição e enquadramento de imagens no Portal Tera.
 * 
 * Modos de enquadramento:
 * - fit="contain": Exibe a imagem integralmente sem cortes (produtos, logotipos, artes, bottons).
 * - fit="cover": Preenche o quadro preservando proporções para fotos editoriais e capas.
 */
export default function SafeImage({
  src,
  alt = 'Imagem',
  fit = 'contain',
  position = 'center',
  allowEnlarge = false,
  enlargeUrl = null,
  enlargeTitle = 'Abrir imagem em nova guia',
  fallbackIcon = null,
  className = '',
  containerClassName = '',
  background = 'bg-[#0B0B0D]',
  rounded = 'rounded-none',
  padding = '',
  imgStyle = {},
  containerStyle = {}
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const targetUrl = enlargeUrl || src;

  const handleEnlargeClick = (e) => {
    if (!allowEnlarge || !targetUrl) return;
    e.stopPropagation();
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  // Se não houver src ou tiver ocorrido erro no carregamento
  if (!src || hasError) {
    return (
      <div 
        className={`w-full h-full flex items-center justify-center ${background} ${rounded} ${containerClassName}`}
        style={containerStyle}
      >
        {fallbackIcon || <ImageOff className="w-8 h-8 text-[#1F222B]" />}
      </div>
    );
  }

  const fitClass = fit === 'contain' ? 'object-contain' : 'object-cover';
  const positionClass = position === 'top' ? 'object-top' 
    : position === 'bottom' ? 'object-bottom' 
    : 'object-center';

  return (
    <div 
      className={`relative overflow-hidden flex items-center justify-center ${background} ${rounded} ${allowEnlarge ? 'cursor-pointer group/safeimg' : ''} ${containerClassName}`}
      style={containerStyle}
      onClick={allowEnlarge ? handleEnlargeClick : undefined}
      title={allowEnlarge ? enlargeTitle : undefined}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setHasError(true)}
        onLoad={() => setIsLoaded(true)}
        className={`w-full h-full ${fitClass} ${positionClass} ${padding} transition-transform duration-300 ${allowEnlarge ? 'group-hover/safeimg:scale-[1.02]' : ''} ${className}`}
        style={imgStyle}
      />

      {/* Indicador visual discreto de ampliação em nova guia */}
      {allowEnlarge && targetUrl && (
        <button
          type="button"
          onClick={handleEnlargeClick}
          aria-label={enlargeTitle}
          title={enlargeTitle}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white/80 hover:text-white border border-white/10 backdrop-blur-md opacity-0 group-hover/safeimg:opacity-100 transition-all duration-200 z-10 shadow-lg"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
