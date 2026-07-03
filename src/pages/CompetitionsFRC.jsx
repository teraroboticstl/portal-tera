import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Cpu, Users, Wrench, Calendar, MapPin, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import SectionTitle from '@/components/common/SectionTitle';

export default function CompetitionsFRC() {
  const features = [
    { icon: Cpu, title: 'Robôs de Grande Porte', description: 'Construímos robôs de até 57kg com sistemas industriais.' },
    { icon: Users, title: 'Equipe Multidisciplinar', description: 'Programação, mecânica, elétrica e business trabalhando juntos.' },
    { icon: Wrench, title: 'Ferramentas Profissionais', description: 'Utilizamos equipamentos industriais como CNC e impressoras 3D.' },
    { icon: Calendar, title: '6 Semanas de Build', description: 'Período intenso para projetar e construir o robô da temporada.' },
  ];

  return (
    <div className="min-h-screen py-12">
      {/* Hero */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-full text-red-400 text-sm font-medium mb-6">
              <Trophy className="w-4 h-4" />
              FIRST Robotics Competition
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-red-500">FRC</span> – A Major League da Robótica
            </h1>
            <p className="text-xl text-[#B8BDC7] leading-relaxed mb-8">
              A FIRST Robotics Competition é a maior competição de robótica para estudantes 
              do ensino médio do mundo. Equipes de todo o mundo constroem robôs de grande porte 
              para competir em um jogo que muda a cada temporada.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to={createPageUrl('CurrentRobot')}>
                <Button className="bg-red-500 hover:bg-red-600 text-white">
                  Ver Robô Atual
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link to={createPageUrl('Museum')}>
                <Button variant="outline" className="border-[#1F222B] hover:bg-[#1F222B]">
                  Museu da Tera
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-[#111217]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTitle title="O que é o FRC" subtitle="A competição mais desafiadora para estudantes" />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-[#0B0B0D] border border-[#1F222B] rounded-2xl p-6 hover:border-red-500/50 transition-all"
              >
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-[#B8BDC7] text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Season Info */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-6">
                <span className="text-[#E10600]">Como</span> Funciona
              </h2>
              <div className="space-y-4 text-[#B8BDC7]">
                <p>
                  A cada janeiro, a FIRST revela um novo jogo temático. As equipes têm apenas 
                  <strong className="text-[#F5F7FA]"> 6 semanas</strong> para projetar, construir e 
                  programar um robô que compete em partidas de 2 minutos e 30 segundos.
                </p>
                <p>
                  Os robôs podem pesar até <strong className="text-[#F5F7FA]">57kg</strong> e utilizam 
                  sistemas pneumáticos, motores industriais e eletrônica avançada.
                </p>
                <p>
                  Mais do que construir robôs, as equipes desenvolvem projetos de impacto na comunidade, 
                  buscam patrocínios e documentam todo o processo.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-[#111217] border border-[#1F222B] rounded-2xl p-8"
            >
              <h3 className="font-bold text-xl mb-6">Estrutura da Temporada</h3>
              <div className="space-y-4">
                {[
                  { month: 'Janeiro', event: 'Kickoff – Revelação do jogo' },
                  { month: 'Jan-Fev', event: 'Build Season (6 semanas)' },
                  { month: 'Março', event: 'Regionais e Districts' },
                  { month: 'Abril', event: 'FIRST Championship' },
                  { month: 'Mai-Dez', event: 'Off-Season e preparação' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-20 text-red-500 font-medium text-sm">{item.month}</div>
                    <div className="flex-1 h-px bg-[#1F222B]" />
                    <div className="text-[#B8BDC7] text-sm">{item.event}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-24 bg-[#111217]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '3,600+', label: 'Equipes no Mundo' },
              { value: '95,000+', label: 'Estudantes' },
              { value: '30+', label: 'Países' },
              { value: '$80M+', label: 'em Bolsas' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="text-3xl md:text-4xl font-bold text-red-500 mb-2">{stat.value}</div>
                <div className="text-[#B8BDC7] text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}