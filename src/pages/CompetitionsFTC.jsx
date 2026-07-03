import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Code, Wrench, Lightbulb, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import SectionTitle from '@/components/common/SectionTitle';

export default function CompetitionsFTC() {
  const features = [
    { icon: Cpu, title: 'Robôs Compactos', description: 'Robôs de até 19kg com design modular e eficiente.' },
    { icon: Code, title: 'Programação Avançada', description: 'Java e Kotlin com sistemas de visão computacional.' },
    { icon: Wrench, title: 'Engenharia Acessível', description: 'Kits padronizados com peças personalizáveis.' },
    { icon: Lightbulb, title: 'Foco em Inovação', description: 'Engineering Notebook documenta todo o processo.' },
  ];

  return (
    <div className="min-h-screen py-12">
      {/* Hero */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-full text-orange-400 text-sm font-medium mb-6">
              <Cpu className="w-4 h-4" />
              FIRST Tech Challenge – DECODE
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-orange-500">FTC</span> – Engenharia em Escala
            </h1>
            <p className="text-xl text-[#B8BDC7] leading-relaxed mb-8">
              O FIRST Tech Challenge é a porta de entrada para a robótica competitiva avançada. 
              Com robôs menores e mais acessíveis, o FTC desafia equipes a criar soluções 
              criativas com foco em programação e design.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to={createPageUrl('Museum')}>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                  Ver Robôs FTC
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Current Season */}
      <section className="py-24 bg-[#111217]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/30 rounded-2xl p-8 md:p-12"
          >
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-orange-400 font-medium">Temporada 2024-2025</span>
                <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-4">INTO THE DEEP</h2>
                <p className="text-[#B8BDC7] mb-6">
                  Na temporada INTO THE DEEP, as equipes exploram as profundezas dos oceanos,
                  desenvolvendo robôs para coletar e depositar elementos no fundo do mar.
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm">
                    Coleta de Amostras
                  </span>
                  <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm">
                    Ascender
                  </span>
                  <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm">
                    Submersível
                  </span>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="w-48 h-48 bg-orange-500/10 rounded-full flex items-center justify-center">
                  <span className="text-6xl">🌊</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle title="O que é o FTC" subtitle="Engenharia acessível para equipes menores" />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6 hover:border-orange-500/50 transition-all"
              >
                <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-[#B8BDC7] text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-24 bg-[#111217]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle title="FTC vs FRC" subtitle="Entenda as diferenças entre as competições" />

          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-orange-500/5 border border-orange-500/30 rounded-2xl p-8"
            >
              <h3 className="text-2xl font-bold text-orange-500 mb-6">FTC</h3>
              <ul className="space-y-3 text-[#B8BDC7]">
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-orange-500 rounded-full" />
                  Robôs de até 19kg
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-orange-500 rounded-full" />
                  Equipes de 4-15 membros
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-orange-500 rounded-full" />
                  Programação em Java/Kotlin
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-orange-500 rounded-full" />
                  Custo inicial mais baixo
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-orange-500 rounded-full" />
                  Idade: 12-18 anos
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-red-500/5 border border-red-500/30 rounded-2xl p-8"
            >
              <h3 className="text-2xl font-bold text-red-500 mb-6">FRC</h3>
              <ul className="space-y-3 text-[#B8BDC7]">
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  Robôs de até 57kg
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  Equipes de 10-50+ membros
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  Múltiplas linguagens de programação
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  Investimento maior
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  Idade: 14-18 anos
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}