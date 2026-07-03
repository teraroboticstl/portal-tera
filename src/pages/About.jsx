import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Award, Lightbulb, Users, Heart, Target, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function About() {
  const [teamPhoto, setTeamPhoto] = useState(() => localStorage.getItem('about_team_photo') || null);
  const fileInputRef = useRef(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target.result;
      setTeamPhoto(url);
      localStorage.setItem('about_team_photo', url);
    };
    reader.readAsDataURL(file);
  };

  const pillars = [
  { icon: Lightbulb, title: 'Inovação', desc: 'Soluções criativas para desafios complexos, utilizando tecnologia de ponta.' },
  { icon: Users, title: 'Colaboração', desc: 'Trabalho em equipe, valorizando cada contribuição individual.' },
  { icon: Heart, title: 'Impacto Social', desc: 'Compartilhamos conhecimento e inspiramos jovens a explorar STEM.' },
  { icon: Target, title: 'Excelência', desc: 'Buscamos sempre o melhor resultado com dedicação e comprometimento.' }];


  const timeline = [
  { year: '2015', title: 'Fundação', desc: 'TeraRobotics é fundada no SESI Três Lagoas com a missão de transformar jovens através da robótica.' },
  { year: '2016', title: 'Primeira Competição', desc: 'Participação na primeira competição da FIRST LEGO League (FLL).' },
  { year: '2019', title: 'Início no FTC', desc: 'A equipe expande e começa a participar do programa FIRST Tech Challenge (FTC).' },
  { year: '2022', title: 'Consolidação', desc: 'Participação em competições nacionais e desenvolvimento de projetos de impacto social.' },
  { year: '2023', title: 'Reconhecimento', desc: 'Conquistas em competições e reconhecimento pelo impacto educacional.' },
  { year: '2024', title: 'Presente', desc: 'Temporada REEFSCAPE com o time FRC #10343 e FTC #17730 DECODE.' }];


  return (
    <div className="bg-black">
      {/* Hero */}
      <section className="py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(225,6,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(225,6,0,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>
        <div className="max-w-5xl mx-auto relative text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-[#E10600] font-bold text-sm tracking-widest uppercase">Nossa História</span>
            <h1 className="text-5xl md:text-7xl font-black text-white mt-4 mb-6 tracking-tighter">
              QUEM <span className="text-[#E10600]">SOMOS</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Organização educacional de robótica do SESI Três Lagoas, transformando vidas através da ciência, tecnologia, engenharia e matemática.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 px-6 bg-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-6 tracking-tight">
                TRANSFORMANDO O FUTURO ATRAVÉS DA <span className="text-[#E10600]">ROBÓTICA</span>
              </h2>
              <div className="space-y-4 text-gray-400 leading-relaxed">
                <p>A TeraRobotics nasceu da paixão por educação e tecnologia. Localizada em Três Lagoas, Mato Grosso do Sul, nossa organização faz parte da rede SESI e participa ativamente dos programas da FIRST.</p>
                <p>Nossa missão vai além de construir robôs competitivos. Focamos no desenvolvimento integral dos estudantes, preparando-os para os desafios do século XXI através de habilidades técnicas, trabalho em equipe, liderança e pensamento crítico.</p>
                <p>Como equipe representante da nossa comunidade, participamos ativamente de competições nacionais e internacionais, levando o nome de Três Lagoas e do Mato Grosso do Sul ao cenário mundial da robótica.</p>
              </div>
              <div className="flex flex-wrap gap-6 mt-8">
                <div className="flex items-center gap-2 text-gray-400">
                  <MapPin className="w-5 h-5 text-[#E10600]" />
                  <span>Três Lagoas, MS</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Calendar className="w-5 h-5 text-[#E10600]" />
                  <span>Desde 2015</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  
                  
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="aspect-square bg-gradient-to-br from-[#E10600]/20 to-black border border-[#E10600]/30 relative overflow-hidden group">
                {teamPhoto ?
                <img src={teamPhoto} alt="Equipe TeraRobotics" className="w-full h-full object-cover" /> :

                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                    <Camera className="w-16 h-16 text-[#E10600]/40" />
                    <p className="text-gray-500 text-sm text-center px-8">Adicione uma foto da equipe clicando no botão abaixo</p>
                  </div>
                }
                {/* Overlay com botão de alterar */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 bg-[#E10600] hover:bg-red-700 text-white font-bold text-sm px-5 py-2.5 rounded transition-colors">
                    
                    <Camera className="w-4 h-4" /> Alterar Foto
                  </button>
                </div>
                {/* Botão sempre visível no canto quando não tem foto */}
                {!teamPhoto &&
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#E10600] hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded transition-colors">
                  
                    <Camera className="w-3.5 h-3.5" /> Adicionar Foto
                  </button>
                }
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-20 px-6 bg-black">
        <div className="max-w-7xl mx-auto">
          <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="text-[#E10600] font-bold text-sm tracking-widest uppercase">Nossos Pilares</span>
            <h2 className="text-3xl md:text-4xl font-black text-white mt-3 tracking-tight">
              O QUE NOS <span className="text-[#E10600]">MOVE</span>
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pillars.map((p, i) => {
              const PillarIcon = p.icon;
              return (
                <motion.div key={p.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-white/5 border border-white/10 p-6 hover:border-[#E10600]/30 transition-all group">
                  <div className="w-12 h-12 bg-[#E10600] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <PillarIcon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2 uppercase">{p.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{p.desc}</p>
                </motion.div>);

            })}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 px-6 bg-white/5">
        <div className="max-w-4xl mx-auto">
          <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="text-[#E10600] font-bold text-sm tracking-widest uppercase">Nossa Jornada</span>
            <h2 className="text-3xl md:text-4xl font-black text-white mt-3 tracking-tight">
              LINHA DO <span className="text-[#E10600]">TEMPO</span>
            </h2>
          </motion.div>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-[#E10600]/30 md:left-1/2 md:-translate-x-0.5" />
            <div className="space-y-12">
              {timeline.map((item, i) =>
              <motion.div key={item.year} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className={`relative flex items-start gap-8 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                  <div className="absolute left-8 md:left-1/2 w-4 h-4 bg-[#E10600] -translate-x-1/2 z-10 top-2" />
                  <div className={`ml-16 md:ml-0 md:w-1/2 ${i % 2 === 0 ? 'md:pr-16 md:text-right' : 'md:pl-16'}`}>
                    <span className="inline-block px-4 py-1 bg-[#E10600] text-white text-sm font-black mb-3">{item.year}</span>
                    <h3 className="text-xl font-black text-white mb-2">{item.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-[#E10600]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-4 uppercase">Faça Parte da Nossa História</h2>
          <p className="text-white/80 mb-8">Seja como estudante, mentor voluntário ou parceiro, você pode fazer parte da TeraRobotics.</p>
          <Link to={createPageUrl('Contact')}>
            <button className="bg-black hover:bg-gray-900 text-white font-bold uppercase tracking-wider px-8 py-3">
              Entre em Contato
            </button>
          </Link>
        </div>
      </section>
    </div>);

}