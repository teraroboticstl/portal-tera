import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Blocks, Wrench, Rocket, CircleCheck, ArrowRight, Cog } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const programs = {
  fll: {
    label: 'FLL',
    subtitle: 'FIRST LEGO League',
    age: '9-16 anos',
    icon: Blocks,
    description: 'A FIRST LEGO League é a porta de entrada para o mundo da robótica competitiva. Utilizando kits LEGO® Education, os estudantes desenvolvem robôs autônomos enquanto trabalham em projetos de inovação para resolver problemas do mundo real.',
    features: ['Programação com LEGO® SPIKE™ Prime', 'Projeto de Inovação com impacto social', 'Desenvolvimento de Core Values', 'Competições regionais e nacionais'],
    components: [
      { title: 'Missões do Robô', desc: 'Robô autônomo que completa missões em uma mesa de jogo temática' },
      { title: 'Projeto de Inovação', desc: 'Solução criativa para um problema relacionado ao tema da temporada' },
      { title: 'Core Values', desc: 'Demonstração dos valores de trabalho em equipe e Gracious Professionalism®' },
    ],
    link: 'CompetitionsFLL',
  },
  ftc: {
    label: 'FTC #17730',
    subtitle: 'FIRST Tech Challenge',
    age: '12-18 anos',
    icon: Wrench,
    description: 'O FIRST Tech Challenge oferece uma experiência mais avançada de engenharia. As equipes projetam, constroem e programam robôs customizados para competir em desafios de alto nível técnico.',
    features: ['Robôs customizados com peças reais', 'Programação em Java/Kotlin', 'Design e fabricação de peças', 'Portfólio de engenharia'],
    components: [
      { title: 'Período Autônomo', desc: 'Robô executa tarefas de forma totalmente autônoma nos primeiros 30 segundos' },
      { title: 'TeleOp', desc: 'Operadores controlam o robô remotamente por 2 minutos e 30 segundos' },
      { title: 'Endgame', desc: 'Manobras especiais nos últimos 30 segundos para pontuação extra' },
    ],
    link: 'CompetitionsFTC',
  },
  frc: {
    label: 'FRC #10343',
    subtitle: 'FIRST Robotics Competition',
    age: '14-18 anos',
    icon: Rocket,
    description: 'A FIRST Robotics Competition é o pináculo da robótica estudantil. Em apenas 6 semanas de build season, construímos robôs de grande porte para competições de nível internacional.',
    features: ['Robôs de grande porte (~54kg)', 'Build season de 6 semanas', 'Tecnologia industrial real', 'Competições nacionais e mundiais'],
    components: [
      { title: 'Período Autônomo', desc: '15 segundos de operação totalmente autônoma' },
      { title: 'TeleOp', desc: '2 minutos e 15 segundos de operação com pilotos' },
      { title: 'Endgame', desc: 'Manobras finais para maximizar pontuação' },
    ],
    link: 'CompetitionsFRC',
  },
};

export default function Competitions() {
  const [active, setActive] = useState('fll');
  const prog = programs[active];

  return (
    <div className="pt-14 bg-black">
      {/* Hero */}
      <section className="py-20 px-6 relative overflow-hidden">
        <div className="absolute -right-48 top-1/2 -translate-y-1/2 opacity-5">
          <Cog className="w-[500px] h-[500px] text-[#E10600]" style={{ transform: 'rotate(7deg)' }} />
        </div>
        <div className="max-w-5xl mx-auto relative text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-[#E10600] font-bold text-sm tracking-widest uppercase">Programas FIRST</span>
            <h1 className="text-5xl md:text-7xl font-black text-white mt-4 mb-6 tracking-tighter">
              NOSSOS <span className="text-[#E10600]">PROGRAMAS</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Participamos dos três programas da FIRST, oferecendo uma jornada completa de desenvolvimento em robótica para estudantes de todas as idades.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Tabs */}
      <section className="py-20 px-6 bg-white/5">
        <div className="max-w-6xl mx-auto">
          <Tabs value={active} onValueChange={setActive}>
            <TabsList className="grid grid-cols-3 gap-4 bg-transparent h-auto p-0 mb-12">
              {Object.entries(programs).map(([key, p]) => (
                <TabsTrigger key={key} value={key}
                  className="flex flex-col items-center gap-3 p-6 bg-black border-2 border-white/10 data-[state=active]:border-[#E10600] data-[state=active]:bg-[#E10600]/10 hover:border-white/30 transition-all h-auto rounded-none">
                  <div className="w-14 h-14 bg-[#E10600] flex items-center justify-center">
                    <p.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-white">{p.label}</p>
                    <p className="text-xs text-gray-500">{p.age}</p>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(programs).map(([key, p]) => (
              <TabsContent key={key} value={key}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid lg:grid-cols-2 gap-12">
                  <div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#E10600] text-white text-sm font-bold uppercase tracking-wider mb-6">
                      <p.icon className="w-4 h-4" />
                      {p.subtitle}
                    </div>
                    <h2 className="text-3xl font-black text-white mb-4">{p.label}</h2>
                    <p className="text-gray-400 leading-relaxed mb-8">{p.description}</p>
                    <div className="space-y-3 mb-8">
                      {p.features.map(f => (
                        <div key={f} className="flex items-center gap-3">
                          <CircleCheck className="w-5 h-5 text-[#E10600] flex-shrink-0" />
                          <span className="text-gray-300">{f}</span>
                        </div>
                      ))}
                    </div>
                    <Link to={createPageUrl('Contact')}>
                      <Button className="bg-[#E10600] hover:bg-[#7A0000] text-white font-bold uppercase tracking-wider">
                        Quero Participar <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-white uppercase tracking-wider mb-6">Componentes da Competição</h3>
                    {p.components.map(c => (
                      <div key={c.title} className="bg-black border border-white/10 p-5 hover:border-[#E10600]/30 transition-all">
                        <h4 className="font-bold text-[#E10600] mb-1">{c.title}</h4>
                        <p className="text-gray-400 text-sm">{c.desc}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-[#E10600]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-4 uppercase">Quer Fazer Parte?</h2>
          <p className="text-white/80 mb-8">Se você é estudante do SESI Três Lagoas interessado em robótica, entre em contato!</p>
          <Link to={createPageUrl('Contact')}>
            <button className="bg-black hover:bg-gray-900 text-white font-bold uppercase tracking-wider px-8 py-3">
              Fale Conosco
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}