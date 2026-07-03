import React, { useState, useEffect } from 'react';

const IMAGES = [
  { url: "https://media.base44.com/images/public/698a86446abc83aece20025a/88990565d_image.png", caption: "Festival Regional SESI de Robótica" },
  { url: "https://media.base44.com/images/public/698a86446abc83aece20025a/9be0471da_image.png", caption: "Champion's Award — Finalista Regional MS" },
  { url: "https://media.base44.com/images/public/698a86446abc83aece20025a/23fa406fc_image.png", caption: "Festival SESI de Educação" },
  { url: "https://media.base44.com/images/public/698a86446abc83aece20025a/5f76d340a_image.png", caption: "TeraRobotics FTC #17730 — Z Machine" },
  { url: "https://media.base44.com/images/public/698a86446abc83aece20025a/60119fc19_image.png", caption: "Festival Regional SESI de Robótica" },
];

export default function TeamSlideshow() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent(prev => (prev + 1) % IMAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden mb-8" style={{ height: '500px' }}>
      {/* All images stacked with cross-fade */}
      {IMAGES.map((img, i) => (
        <img
          key={img.url}
          src={img.url}
          alt={img.caption}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: i === current ? 1 : 0,
            transition: 'opacity 1s ease-in-out',
            zIndex: i === current ? 1 : 0,
          }}
        />
      ))}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/35" style={{ zIndex: 2 }} />

      {/* Text overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6" style={{ zIndex: 3 }}>
        <p className="text-xs font-bold text-[#E10600] uppercase tracking-widest mb-2">TeraRobotics</p>
        <h2 className="text-3xl md:text-5xl font-black text-white mb-3 drop-shadow-lg">
          TERA<span className="text-[#E10600]">ROBOTICS</span>
        </h2>
        <p className="text-sm md:text-base text-white/80 font-medium">{IMAGES[current].caption}</p>
      </div>

      {/* Dots navigation */}
      <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-2" style={{ zIndex: 4 }}>
        {IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === current ? '24px' : '8px',
              height: '8px',
              backgroundColor: i === current ? '#E10600' : 'rgba(255,255,255,0.4)',
            }}
          />
        ))}
      </div>
    </div>
  );
}