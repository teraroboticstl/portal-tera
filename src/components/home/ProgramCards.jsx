import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { X } from 'lucide-react';

const PROGRAMS = [
  {
    id: 'fll',
    title: 'FLL',
    subtitle: 'FIRST LEGO LEAGUE',
    description: 'Introdução à robótica para estudantes de 9 a 16 anos. Desenvolvemos habilidades STEM através de desafios com LEGO.',
    age: '9-16 anos',
    logo: 'https://media.base44.com/images/public/698a86446abc83aece20025a/b47671104_FIRSTLego_IconVert_RGB.png',
    page: 'CompetitionsFLL',
    bgLogo: false,
  },
  {
    id: 'ftc',
    title: 'FTC #17730',
    subtitle: 'FIRST TECH CHALLENGE',
    description: 'Competição intermediária com robôs personalizados. Estudantes projetam, constroem e programam robôs de médio porte.',
    age: '12-18 anos',
    logo: 'https://media.base44.com/images/public/698a86446abc83aece20025a/1da61c346_logoftc.png',
    page: 'CompetitionsFTC',
    bgLogo: true, // tem fundo branco, usar mix-blend-mode
  },
  {
    id: 'frc',
    title: 'FRC #10343',
    subtitle: 'FIRST ROBOTICS COMPETITION',
    description: 'O maior programa da FIRST. Construímos robôs industriais de grande porte em apenas 6 semanas de build season.',
    age: '14-18 anos',
    logo: 'https://media.base44.com/images/public/698a86446abc83aece20025a/ebb25b928_FRC-LOGO.png',
    page: 'CompetitionsFRC',
    bgLogo: false,
  },
];

export default function ProgramCards() {
  const [selected, setSelected] = useState(null);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-2xl mx-auto sm:max-w-none">
        {PROGRAMS.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="flex justify-center"
          >
            <button
              onClick={() => setSelected(p)}
              className="group relative w-44 h-44 sm:w-52 sm:h-52 rounded-2xl bg-[#111] border border-white/10 hover:border-[#E10600]/60 hover:shadow-[0_0_30px_rgba(225,6,0,0.2)] transition-all duration-400 flex items-center justify-center overflow-hidden focus:outline-none"
            >
              {/* corner accents */}
              <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-[#E10600] opacity-60" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-[#E10600] opacity-60" />

              <img
                src={p.logo}
                alt={p.title}
                className={`w-28 h-28 sm:w-32 sm:h-32 object-contain transition-transform duration-300 group-hover:scale-105 ${p.bgLogo ? 'mix-blend-lighten' : ''}`}
              />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              className="relative bg-[#111] border border-white/10 p-8 w-full max-w-md rounded-2xl"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={e => e.stopPropagation()}
            >
              {/* corner accents */}
              <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-[#E10600]" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-[#E10600]" />

              <button
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex justify-center mb-6">
                <img
                  src={selected.logo}
                  alt={selected.title}
                  className={`h-20 w-auto object-contain ${selected.bgLogo ? 'mix-blend-lighten' : ''}`}
                />
              </div>

              <h3 className="text-2xl font-black text-white mb-1 text-center">{selected.title}</h3>
              <p className="text-[#E10600] text-sm font-bold mb-4 tracking-wide text-center">{selected.subtitle}</p>
              <p className="text-gray-400 text-sm leading-relaxed mb-5 text-center">{selected.description}</p>

              <div className="flex items-center justify-center gap-4">
                <span className="text-xs text-gray-300 bg-white/10 px-3 py-1 rounded">{selected.age}</span>
                <Link
                  to={createPageUrl(selected.page)}
                  onClick={() => setSelected(null)}
                  className="text-[#E10600] text-sm font-black uppercase tracking-wider hover:underline"
                >
                  SAIBA MAIS →
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}