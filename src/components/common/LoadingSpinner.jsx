import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ size = 'default', text = 'Carregando...' }) {
  const sizes = {
    sm: 'w-4 h-4',
    default: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <Loader2 className={`${sizes[size]} animate-spin text-[#E10600]`} />
      {text && <p className="text-[#B8BDC7] text-sm">{text}</p>}
    </div>
  );
}