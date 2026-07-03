import React, { useState, useEffect } from 'react';

const IMAGES = [
  "https://media.base44.com/images/public/698a86446abc83aece20025a/88990565d_image.png",
  "https://media.base44.com/images/public/698a86446abc83aece20025a/9be0471da_image.png",
  "https://media.base44.com/images/public/698a86446abc83aece20025a/23fa406fc_image.png",
  "https://media.base44.com/images/public/698a86446abc83aece20025a/5f76d340a_image.png",
  "https://media.base44.com/images/public/698a86446abc83aece20025a/60119fc19_image.png",
];

export default function HeroSlideshow({ children }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent(prev => (prev + 1) % IMAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative" style={{ minHeight: '100vh' }}>
      {/* All images stacked, cross-fade via opacity */}
      {IMAGES.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: i === current ? 1 : 0,
            transition: 'opacity 1s ease-in-out',
            zIndex: i === current ? 1 : 0,
          }}
        />
      ))}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" style={{ zIndex: 2 }} />

      {/* Subtle grid overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(rgba(225,6,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(225,6,0,0.3) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        zIndex: 3,
      }} />

      {/* Content */}
      <div className="relative" style={{ zIndex: 4 }}>
        {children}
      </div>

      {/* Dot navigation */}
      <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-2" style={{ zIndex: 5 }}>
        {IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === current ? '24px' : '8px',
              height: '8px',
              backgroundColor: i === current ? '#E10600' : 'rgba(255,255,255,0.35)',
            }}
          />
        ))}
      </div>
    </div>
  );
}