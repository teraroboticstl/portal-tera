import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';

const TERA_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698a86446abc83aece20025a/553877171_LogoTera.png";

function SponsorCard({ sponsor }) {
  const inner = (
    <div className="group flex items-center justify-center h-14 px-2 cursor-pointer">
      {sponsor.logo_url || sponsor.logo ? (
        <img
          src={sponsor.logo_url || sponsor.logo}
          alt={sponsor.name}
          className="max-w-full max-h-10 object-contain opacity-70 group-hover:opacity-100 transition-opacity"
          style={{ filter: 'brightness(0) invert(1)' }}
        />
      ) : (
        <span className="text-[10px] font-bold text-gray-500 group-hover:text-gray-300 text-center leading-tight">{sponsor.name}</span>
      )}
    </div>
  );

  if (sponsor.link) return <a href={sponsor.link} target="_blank" rel="noopener noreferrer">{inner}</a>;
  return inner;
}

export default function SponsorsBanner({ sponsors = [] }) {
  const withLogos = sponsors.filter(s => s.logo_url);
  const leftSponsors = withLogos.slice(0, 6);
  const rightSponsors = withLogos.slice(6, 12);

  // Fallback placeholders if not enough sponsors
  const leftGrid = [...leftSponsors, ...Array(Math.max(0, 6 - leftSponsors.length)).fill(null)];
  const rightGrid = [...rightSponsors, ...Array(Math.max(0, 6 - rightSponsors.length)).fill(null)];

  return (
    <section className="py-16 sm:py-24 bg-black relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-block border border-[#E10600] bg-[#E10600]/10 px-4 py-1 mb-4">
            <span className="text-[#E10600] font-bold text-xs tracking-widest uppercase">Nossos Apoiadores</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mt-3 mb-4 tracking-tight">
            PARCEIROS QUE FAZEM A <span className="text-[#E10600]">DIFERENÇA</span>
          </h2>
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto">
            Agradecemos às empresas e instituições que acreditam no poder transformador da educação STEM.
          </p>
        </motion.div>
      </div>

      {/* Full-width dark banner */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="w-full"
      >
        <div className="w-full bg-[#111] border-t-2 border-b-2 border-[#E10600]/40">
          <div className="flex items-center min-h-[130px]">

            {/* LEFT sponsors - 3x2 grid */}
            <div className="flex-1 grid grid-cols-3 gap-2 px-4 sm:px-8 py-5">
              {leftGrid.map((s, i) =>
                s ? (
                  <SponsorCard key={s.id || i} sponsor={s} />
                ) : (
                  <div key={`pl-${i}`} className="h-16 rounded-lg bg-white/[0.03] border border-white/5" />
                )
              )}
            </div>

            {/* Divider */}
            <div className="h-24 w-px bg-[#E10600]/30 flex-shrink-0" />

            {/* CENTER logo */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center px-6 sm:px-10 py-5">
              <img src={TERA_LOGO} alt="TeraRobotics" className="w-24 h-24 sm:w-28 sm:h-28 object-contain" />
            </div>

            {/* Divider */}
            <div className="h-24 w-px bg-[#E10600]/30 flex-shrink-0" />

            {/* RIGHT sponsors - 3x2 grid */}
            <div className="flex-1 grid grid-cols-3 gap-2 px-4 sm:px-8 py-5">
              {rightGrid.map((s, i) =>
                s ? (
                  <SponsorCard key={s.id || i} sponsor={s} />
                ) : (
                  <div key={`pr-${i}`} className="h-16 rounded-lg bg-white/[0.03] border border-white/5" />
                )
              )}
            </div>

          </div>
        </div>
      </motion.div>

      {/* Button */}
      <div className="text-center mt-10 px-4">
        <Link to={createPageUrl('Sponsors')}>
          <Button variant="outline" className="border-[#E10600] text-[#E10600] hover:bg-[#E10600] hover:text-white font-bold uppercase tracking-wider px-8">
            VER TODOS OS PARCEIROS
          </Button>
        </Link>
      </div>
    </section>
  );
}