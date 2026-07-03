import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Cog, Settings, Wrench, ChevronDown, Cpu, Rocket, Award } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import MuseumSection from '@/components/home/MuseumSection';
import TeraEmDestaque from '@/components/home/TeraEmDestaque';
import HeroSlideshow from '@/components/home/HeroSlideshow';
import ProgramCards from '@/components/home/ProgramCards';
import SponsorsBanner from '@/components/home/SponsorsBanner';

export default function Home() {
  const { data: allRobots = [] } = useQuery({
    queryKey: ['robots-home'],
    queryFn: () => base44.entities.Robot.list('-year'),
    initialData: []
  });

  const { data: sponsors = [] } = useQuery({
    queryKey: ['sponsors-home'],
    queryFn: () => base44.entities.Sponsor.list('order'),
    initialData: []
  });



  const scrollToContent = () => {
    document.getElementById('programs')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">

      {/* ── HERO ── */}
      <HeroSlideshow>
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#E10600] to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#E10600] to-transparent" />

        <div className="relative z-10 text-center px-4 w-full max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            {/* Logo */}
            <motion.div className="flex justify-center mb-6" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }}>
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698a86446abc83aece20025a/71928ec1c_WhatsAppImage2026-02-05at171715.jpg"
                alt="TeraRobotics"
                className="w-36 h-36 sm:w-48 sm:h-48 rounded-full border-4 border-[#E10600] shadow-[0_0_40px_rgba(225,6,0,0.5)]"
              />
            </motion.div>

            {/* Badge */}
            


              

            {/* Title */}
            <motion.h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-white mb-4 tracking-tighter leading-none" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }}>
              TERA<span className="text-[#E10600]">ROBOTICS</span>
            </motion.h1>

            {/* Tagline */}
            <motion.p className="text-base sm:text-2xl md:text-3xl text-white font-bold tracking-wide mb-3 drop-shadow-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              ENGENHARIA • INOVAÇÃO • <span className="text-[#E10600] font-black">TRANSFORMAÇÃO</span>
            </motion.p>

            <motion.p className="text-sm sm:text-lg text-gray-200 mb-8 max-w-2xl mx-auto px-2 drop-shadow-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              Organização educacional de robótica do SESI • Três Lagoas, MS
            </motion.p>

            {/* CTA Buttons */}
            <motion.div className="flex flex-col sm:flex-row gap-3 justify-center mb-10 px-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <Link to={createPageUrl('About')} className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-[#E10600] hover:bg-[#7A0000] text-white font-bold px-8 h-12 text-sm uppercase tracking-wider">Conheça a Equipe</Button>
              </Link>
              <Link to={createPageUrl('Contact')} className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-[#E10600] hover:bg-[#7A0000] text-white font-bold px-8 h-12 text-sm uppercase tracking-wider">Seja Parceiro</Button>
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div className="grid grid-cols-3 gap-4 max-w-xs sm:max-w-md md:max-w-3xl mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
              <div className="text-center">
                <Cog className="w-5 h-5 text-[#E10600] mx-auto mb-1" />
                <div className="text-2xl sm:text-3xl md:text-4xl font-black text-white">3</div>
                <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide leading-tight mt-1">Programas FIRST</div>
              </div>
              <div className="text-center">
                <Settings className="w-5 h-5 text-[#E10600] mx-auto mb-1" />
                <div className="text-2xl sm:text-3xl md:text-4xl font-black text-white">10+</div>
                <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide leading-tight mt-1">Anos de História</div>
              </div>
              <div className="text-center">
                <Wrench className="w-5 h-5 text-[#E10600] mx-auto mb-1" />
                <div className="text-2xl sm:text-3xl md:text-4xl font-black text-white">7</div>
                <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide leading-tight mt-1">Prêmios</div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2 cursor-pointer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} onClick={scrollToContent}>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <ChevronDown className="w-6 h-6 text-[#E10600]" />
          </motion.div>
        </motion.div>
      </section>
      </HeroSlideshow>

      {/* ── PROGRAMS ── */}
      <section id="programs" className="py-16 sm:py-24 px-4 sm:px-6 bg-black relative">
        <div className="absolute top-0 left-0 w-16 h-16 sm:w-32 sm:h-32 border-l-2 border-t-2 border-[#E10600]/20" />
        <div className="absolute bottom-0 right-0 w-16 h-16 sm:w-32 sm:h-32 border-r-2 border-b-2 border-[#E10600]/20" />
        <div className="max-w-7xl mx-auto">
          <motion.div className="text-center mb-10 sm:mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="text-[#E10600] font-bold text-xs sm:text-sm tracking-widest uppercase">Programas FIRST</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mt-3 mb-4 tracking-tight">TRÊS CAMINHOS PARA A <span className="text-[#E10600]">INOVAÇÃO</span></h2>
            <p className="text-sm sm:text-lg text-gray-400 max-w-2xl mx-auto">Participamos dos três principais programas da FIRST, oferecendo oportunidades para estudantes de todas as idades.</p>
          </motion.div>

          <ProgramCards />
        </div>
      </section>

      {/* ── PROJECTS ── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-[#050505] relative">
        <div className="max-w-5xl mx-auto">
          <motion.div className="text-center mb-10 sm:mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="inline-block border border-[#E10600] bg-[#E10600]/10 px-4 py-1 mb-4">
              <span className="text-[#E10600] font-bold text-xs sm:text-sm tracking-widest uppercase">Nossos Projetos</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mt-3 mb-4 tracking-tight">PROJETOS <span className="text-[#E10600]">INOVADORES</span></h2>
            <p className="text-sm sm:text-lg text-gray-400 max-w-2xl mx-auto">Conheça os projetos desenvolvidos pela nossa equipe que estão evoluindo a robótica educacional.</p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-10 justify-items-center">
            {[
              { logo: 'https://media.base44.com/images/public/698a86446abc83aece20025a/e685bd1ed_ChatGPTImage11demaide202621_33_32.png', title: 'TIR' },
              { logo: 'https://media.base44.com/images/public/698a86446abc83aece20025a/df0a61560_Ecotera.jpg', title: 'Eco Tera' },
              { logo: 'https://media.base44.com/images/public/698a86446abc83aece20025a/b59f1ff25_TeraUnearthed.jpg', title: 'M.I.A' },
              { logo: 'https://media.base44.com/images/public/698a86446abc83aece20025a/e9a7bf59e_LogoTera-Corao2.png', title: 'NeuroBotics' },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center gap-3"
              >
                <Link to={`/ProjectDetail?project=${encodeURIComponent(item.title)}`} className="flex flex-col items-center gap-3 group">
                  <div className="w-52 h-52 sm:w-64 sm:h-64 rounded-full overflow-hidden border-4 border-black group-hover:border-[#E10600] transition-all duration-300 shadow-[0_0_20px_rgba(225,6,0,0.15)] group-hover:shadow-[0_0_30px_rgba(225,6,0,0.35)]">
                    <img src={item.logo} alt={item.title} className="w-full h-full object-cover scale-110" />
                  </div>
                  <span className="bg-[#CC0000] text-white text-xs sm:text-sm font-black uppercase tracking-wider px-4 py-1.5 rounded-full">
                    {item.title}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TERA EM DESTAQUE ── */}
      <TeraEmDestaque />

      {/* ── MUSEUM ── */}
      <MuseumSection robots={allRobots} />

      {/* ── QUEM SOMOS ── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-[#050505] relative">
        <div className="absolute top-0 left-0 w-16 h-16 sm:w-32 sm:h-32 border-l-2 border-t-2 border-[#E10600]/20" />
        <div className="absolute bottom-0 right-0 w-16 h-16 sm:w-32 sm:h-32 border-r-2 border-b-2 border-[#E10600]/20" />
        <div className="max-w-7xl mx-auto">
          <motion.div className="text-center mb-10 sm:mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="text-[#E10600] font-bold text-xs sm:text-sm tracking-widest uppercase">Quem Somos</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mt-3 mb-4 tracking-tight">MAIS QUE <span className="text-[#E10600]">ROBÓTICA</span></h2>
            <p className="text-sm sm:text-lg text-gray-400 max-w-2xl mx-auto">Acreditamos que a robótica é uma ferramenta poderosa para desenvolver as habilidades do futuro.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
            { icon: '🎯', title: 'Missão', desc: 'Inspirar jovens a explorar ciência, tecnologia, engenharia e matemática através da robótica competitiva.' },
            { icon: '🏆', title: 'Visão', desc: 'Ser referência em educação STEM no Brasil, formando líderes inovadores que transformam comunidades.' },
            { icon: '🤝', title: 'Valores', desc: 'Gracious Professionalism®, Coopertition®, trabalho em equipe, respeito e compromisso com a excelência.' },
            { icon: '🚀', title: 'Impacto', desc: 'Desenvolvemos futuros engenheiros, cientistas e empreendedores preparados para o século XXI.' }].
            map((item, index) =>
            <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }} className="relative bg-white/5 border border-white/10 p-5 sm:p-6 hover:border-[#E10600]/40 transition-all duration-300">
                <div className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 border-[#E10600]" />
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="text-lg sm:text-xl font-black text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            )}
          </div>


        </div>
      </section>

      {/* ── SPONSORS ── */}
      <SponsorsBanner sponsors={sponsors} />

      {/* ── CTA ── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-[#E10600] relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
          <Cog className="w-64 sm:w-96 h-64 sm:h-96 text-black" style={{ transform: 'rotate(20deg)' }} />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-5 tracking-tight">FAÇA PARTE DESSA TRANSFORMAÇÃO</h2>
            <p className="text-sm sm:text-lg text-white/80 mb-8">Seja como patrocinador, mentor voluntário ou apoiador, você pode ajudar a inspirar a próxima geração de inovadores.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link to={createPageUrl('Sponsors')} className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-black hover:bg-gray-900 text-white font-bold px-8 h-12 uppercase tracking-wider flex items-center justify-center gap-2">
                  <Award className="w-5 h-5" /> SEJA PATROCINADOR
                </Button>
              </Link>
              <Link to={createPageUrl('About')} className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-white hover:bg-gray-100 text-[#E10600] font-bold px-8 h-12 uppercase tracking-wider flex items-center justify-center gap-2">
                  <Cpu className="w-5 h-5" /> CONHEÇA A EQUIPE
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mt-12 pt-10 border-t border-white/20">
            <p className="text-white/60 text-xs sm:text-sm mb-5 uppercase tracking-widest">Participante oficial dos programas</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {['FIRST® LEGO® League', 'FIRST® Tech Challenge', 'FIRST® Robotics Competition'].map((p) =>
              <span key={p} className="border border-white/40 text-white font-bold text-xs sm:text-sm px-4 py-2 w-full sm:w-auto text-center">{p}</span>
              )}
            </div>
          </motion.div>
        </div>
      </section>

    </div>);

}