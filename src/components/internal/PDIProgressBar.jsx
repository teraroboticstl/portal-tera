import React, { useRef, useState, useCallback } from 'react';

const CONTENT_FIELDS = [
  'learning_goal', 'how_to_learn', 'activities',
  'main_learning', 'challenge_learning', 'teamwork', 'final_reflection'
];

function calcProgress(pdi) {
  const filled = CONTENT_FIELDS.filter(f => pdi[f]?.trim?.()).length;
  return Math.round((filled / CONTENT_FIELDS.length) * 100);
}

export default function PDIProgressBar({ pdi, isAdmin, onUpdate }) {
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const barRef = useRef(null);

  const pct = pdi.progress_override != null
    ? Math.min(100, Math.max(0, Number(pdi.progress_override)))
    : calcProgress(pdi);

  let color, label, textColor;
  if (pct >= 80) {
    color = '#22c55e'; label = 'Pronto pra ser um líder'; textColor = 'text-green-400';
  } else if (pct >= 40) {
    color = '#f59e0b'; label = 'Em desenvolvimento de liderança'; textColor = 'text-yellow-400';
  } else {
    color = '#E10600'; label = 'À desenvolver liderança'; textColor = 'text-red-400';
  }

  const getPctFromEvent = useCallback((clientY) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect) return pct;
    // barra está invertida (rotate-180), então topo = 0%, baixo = 100%
    const relY = clientY - rect.top;
    const raw = 1 - relY / rect.height;
    return Math.round(Math.min(100, Math.max(0, raw * 100)));
  }, [pct]);

  const handlePointerDown = useCallback((e) => {
    if (!isAdmin) return;
    e.preventDefault();
    setDragging(true);
    barRef.current?.setPointerCapture(e.pointerId);
    const newPct = getPctFromEvent(e.clientY);
    onUpdate(newPct);
  }, [isAdmin, getPctFromEvent, onUpdate]);

  const handlePointerMove = useCallback((e) => {
    if (!dragging || !isAdmin) return;
    const newPct = getPctFromEvent(e.clientY);
    onUpdate(newPct);
  }, [dragging, isAdmin, getPctFromEvent, onUpdate]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  return (
    <div
      className="flex flex-col items-center gap-1.5 flex-shrink-0"
      style={{ width: 28 }}
      title={`${label} — ${pct}%`}
    >
      {/* Barra vertical clicável/arrastável */}
      <div
        ref={barRef}
        className={`relative rounded-full overflow-hidden select-none transition-all ${
          isAdmin ? (dragging ? 'cursor-grabbing' : 'cursor-ns-resize') : ''
        } ${hovered && isAdmin ? 'shadow-lg' : ''}`}
        style={{
          width: hovered && isAdmin ? 14 : 10,
          height: 80,
          background: '#1F222B',
          transform: 'rotate(180deg)',
          transition: 'width 0.15s',
          boxShadow: dragging ? `0 0 12px ${color}88` : undefined,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setDragging(false); }}
      >
        <div
          className="w-full rounded-full transition-all duration-300"
          style={{
            height: `${pct}%`,
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}88`
          }}
        />
        {/* Handle thumb quando hovering */}
        {isAdmin && hovered && (
          <div
            className="absolute left-0 right-0 rounded-full"
            style={{
              bottom: `${pct}%`,
              height: 4,
              marginBottom: -2,
              backgroundColor: '#fff',
              opacity: 0.8,
            }}
          />
        )}
      </div>

      {/* Label */}
      <span
        className={`font-black leading-none text-center ${textColor} ${isAdmin ? 'cursor-ns-resize' : ''}`}
        style={{ fontSize: 10, writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', maxHeight: 120, lineHeight: 1.2 }}
        title={`${pct}%`}
      >
        {label}
        {pdi.progress_override != null && <span style={{ fontSize: 6 }}> ●</span>}
      </span>
    </div>
  );
}