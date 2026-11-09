import React, {useEffect,useState} from 'react';
import {remainingBusinessDays} from '@/lib/businessDays';

// National holidays in the preparation period for the 03/12/2026 regional.
// Source: https://agenciagov.ebc.com.br/noticias/202512/confira-o-calendario-oficial-de-feriados-nacionais-e-pontos-facultativos-em-2026
export const REGIONAL_HOLIDAYS_2026=['2026-11-02','2026-11-15','2026-11-20'];

export default function BusinessDaysCountdown({targetDate,label}) {
  const calculate=()=>remainingBusinessDays(targetDate,{excludedDates:REGIONAL_HOLIDAYS_2026});
  const [days,setDays]=useState(calculate);
  useEffect(()=>{
    const refresh=()=>setDays(remainingBusinessDays(targetDate,{excludedDates:REGIONAL_HOLIDAYS_2026}));
    refresh();
    const timer=setInterval(refresh,30000);
    const visible=()=>{if(document.visibilityState==='visible')refresh();};
    document.addEventListener('visibilitychange',visible);
    return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
  },[targetDate]);
  return <div className="w-full space-y-4">
    <div className="flex items-center gap-2"><div className="w-1 h-6 bg-[#E10600] shrink-0" /><h3 className="text-[#F5F7FA] font-medium">{label}</h3></div>
    <div className="rounded-xl border border-[#1F222B] bg-[#0B0B0D] p-5 text-center max-w-sm" role="status" aria-live="polite" aria-atomic="true">
      <p className="text-5xl sm:text-6xl font-bold tabular-nums text-[#E10600]">{String(days).padStart(2,'0')}</p>
      <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-[#B8BDC7]">{days===1?'dia útil restante':'dias úteis restantes'}</p>
    </div>
    <p className="text-xs text-[#B8BDC7] leading-relaxed">Segunda a sexta, exceto feriados nacionais. Inclui hoje quando útil; o dia do regional não entra na contagem.</p>
    <details className="text-xs text-[#B8BDC7]"><summary className="cursor-pointer min-h-11 py-3">Como é calculado</summary><p className="leading-relaxed">Referência: horário de Três Lagoas/MS. Nesta contagem são descontados os feriados nacionais de novembro de 2026 (02, 15 e 20/11). Feriados locais, pontos facultativos e recessos da equipe não foram informados.</p></details>
  </div>;
}
