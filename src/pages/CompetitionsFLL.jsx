import React from 'react';
import { motion } from 'framer-motion';
import { Rocket, BookOpen, Heart, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import SectionTitle from '@/components/common/SectionTitle';

export default function CompetitionsFLL() {
  const pillars = [
    { 
      icon: Rocket, 
      title: 'Robot Game', 
      description: 'Programação de robôs LEGO para completar missões em uma mesa temática.',
      color: 'yellow'
    },
    { 
      icon: BookOpen, 
      title: 'Projeto de Inovação', 
      description: 'Pesquisa e desenvolvimento de soluções para problemas reais.',
      color: 'green'
    },
    { 
      icon: Heart, 
      title: 'Core Values', 
      description: 'Trabalho em equipe, descoberta, inclusão, inovação, impacto e diversão.',
      color: 'blue'
    },
  ];

  const coreValues = [
    { emoji: '🤝', title: 'Descoberta', description: 'Exploramos novas habilidades e ideias.' },
    { emoji: '💡', title: 'Inovação', description: 'Usamos criatividade para resolver problemas.' },
    { emoji: '🎯', title: 'Impacto', description: 'Aplicamos o que aprendemos para melhorar o mundo.' },
    { emoji: '🤗', title: 'Inclusão', description: 'Respeitamos uns aos outros e abraçamos diferenças.' },
    { emoji: '👥', title: 'Trabalho em Equipe', description: 'Somos mais fortes juntos.' },
    { emoji: '🎉', title: 'Diversão', description: 'Nos divertimos e celebramos o que fazemos!' },
  ];

  return (
    <div className="min-h-screen py-12">
      {/* Hero */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-400 text-sm font-medium mb-6">
              <Rocket className="w-4 h-4" />
              FIRST LEGO League
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-yellow-500">FLL</span> – O Início da Jornada
            </h1>
            <p className="text-xl text-[#B8BDC7] leading-relaxed mb-8">
              A FIRST LEGO League é onde tudo começa. Jovens de 9 a 16 anos descobrem 
              a robótica através de LEGO, desenvolvendo habilidades essenciais enquanto 
              se divertem e fazem a diferença no mundo.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to={createPageUrl('Museum')}>
                <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
                  Ver Projetos FLL
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Three Pillars */}
      <section className="py-24 bg-[#111217]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle title="Os Três Pilares" subtitle="A FLL é muito mais do que construir robôs" />

          <div className="grid md:grid-cols-3 gap-8">
            {pillars.map((pillar, index) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`bg-[#0B0B0D] border border-${pillar.color}-500/30 rounded-2xl p-8 hover:border-${pillar.color}-500/50 transition-all`}
              >
                <div className={`w-14 h-14 bg-${pillar.color}-500/10 rounded-xl flex items-center justify-center mb-6`}>
                  <pillar.icon className={`w-7 h-7 text-${pillar.color}-500`} />
                </div>
                <h3 className="text-xl font-bold mb-3">{pillar.title}</h3>
                <p className="text-[#B8BDC7]">{pillar.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle title="Core Values" subtitle="Os valores que guiam todas as equipes FLL" />

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {coreValues.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="bg-[#111217] border border-[#1F222B] rounded-xl p-4 text-center hover:border-yellow-500/30 transition-all"
              >
                <div className="text-3xl mb-2">{value.emoji}</div>
                <h3 className="font-bold text-sm mb-1">{value.title}</h3>
                <p className="text-[#B8BDC7] text-xs">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Programs */}
      <section className="py-24 bg-[#111217]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle title="Programas FLL" subtitle="Diferentes níveis para diferentes idades" />

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-[#0B0B0D] border border-[#1F222B] rounded-2xl p-6"
            >
              <span className="text-green-400 text-sm font-medium">4-6 anos</span>
              <h3 className="text-xl font-bold mt-2 mb-3">FLL Discover</h3>
              <p className="text-[#B8BDC7] text-sm">
                Introdução ao STEM através de brincadeiras e construções simples com LEGO DUPLO.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-[#0B0B0D] border border-[#1F222B] rounded-2xl p-6"
            >
              <span className="text-blue-400 text-sm font-medium">6-10 anos</span>
              <h3 className="text-xl font-bold mt-2 mb-3">FLL Explore</h3>
              <p className="text-[#B8BDC7] text-sm">
                Projetos de engenharia com LEGO Education e programação básica.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-[#0B0B0D] border border-yellow-500/30 rounded-2xl p-6"
            >
              <span className="text-yellow-400 text-sm font-medium">9-16 anos</span>
              <h3 className="text-xl font-bold mt-2 mb-3">FLL Challenge</h3>
              <p className="text-[#B8BDC7] text-sm">
                Competição completa com Robot Game, Projeto de Inovação e Core Values.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '679,000+', label: 'Estudantes no Mundo' },
              { value: '67,000+', label: 'Equipes' },
              { value: '110+', label: 'Países' },
              { value: '1998', label: 'Ano de Fundação' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="text-3xl md:text-4xl font-bold text-yellow-500 mb-2">{stat.value}</div>
                <div className="text-[#B8BDC7] text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}