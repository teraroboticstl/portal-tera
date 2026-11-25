import React from 'react';
import {biButton} from './BiVisuals';

export default function BiExternalScouting({program}) {
  if (program !== 'FRC') return null;
  return <section aria-labelledby="frc-external-scouting-title" className="rounded-2xl border border-red-500/30 bg-[#111217] p-5 sm:p-6">
    <h2 id="frc-external-scouting-title" className="text-xl font-bold text-white">Scouting FRC — ScoutOS</h2>
    <p className="mt-2 text-sm leading-relaxed text-gray-300">Acesse o ScoutOS para o scouting da FRC. A plataforma externa solicita seu próprio login.</p>
    <a href="https://frc-scout-pulse.base44.app/login" target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className={biButton+' mt-4 w-full sm:w-auto'}>
      Abrir scouting FRC <span className="text-xs">(nova aba)</span><span aria-hidden="true">↗</span>
    </a>
  </section>;
}
