import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Cpu, Settings, Zap, Target, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Badge from '@/components/common/Badge';

export default function CurrentRobot() {
  const { data: robots, isLoading } = useQuery({
    queryKey: ['robots', 'current'],
    queryFn: () => base44.entities.Robot.filter({ is_current: true }),
  });

  const currentRobot = robots?.[0];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!currentRobot) {
    return (
      <div className="min-h-screen py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111217] border border-[#1F222B] rounded-2xl p-12"
          >
            <div className="text-6xl mb-6">🤖</div>
            <h1 className="text-3xl font-bold mb-4">Robô da Temporada Atual</h1>
            <p className="text-[#B8BDC7] max-w-md mx-auto">
              O robô da temporada atual ainda não foi cadastrado. 
              Aguarde novidades em breve!
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  const categoryColors = {
    FRC: 'red',
    FTC: 'orange',
    FLL: 'yellow',
  };

  const color = categoryColors[currentRobot.category] || 'red';

  return (
    <div className="min-h-screen py-12">
      {/* Hero */}
      <section className="relative py-24 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br from-${color}-500/10 via-transparent to-transparent`} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <Badge variant={currentRobot.category.toLowerCase()}>
                  {currentRobot.category}
                </Badge>
                <Badge variant="accent">
                  Temporada {currentRobot.year}
                </Badge>
                {currentRobot.season_name && (
                  <Badge>{currentRobot.season_name}</Badge>
                )}
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                <span className={`text-${color}-500`}>{currentRobot.name}</span>
              </h1>

              {currentRobot.game_objective && (
                <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-6 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className={`w-5 h-5 text-${color}-500`} />
                    <span className="font-medium">Objetivo no Jogo</span>
                  </div>
                  <p className="text-[#B8BDC7]">{currentRobot.game_objective}</p>
                </div>
              )}

              {currentRobot.cad_url && (
                <a href={currentRobot.cad_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="border-[#1F222B] hover:bg-[#1F222B]">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ver CAD 3D
                  </Button>
                </a>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative"
            >
              {currentRobot.image_url ? (
                <div className="relative rounded-2xl overflow-hidden border border-[#1F222B]">
                  <img 
                    src={currentRobot.image_url} 
                    alt={currentRobot.name}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D] via-transparent to-transparent" />
                </div>
              ) : (
                <div className="w-full aspect-square bg-[#111217] border border-[#1F222B] rounded-2xl flex items-center justify-center">
                  <Cpu className="w-24 h-24 text-[#1F222B]" />
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Description */}
      {currentRobot.description && (
        <section className="py-24 bg-[#111217]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl font-bold mb-6">
                <span className="text-[#E10600]">Descrição</span> Técnica
              </h2>
              <div className="prose prose-invert max-w-none">
                <p className="text-[#B8BDC7] leading-relaxed whitespace-pre-wrap">
                  {currentRobot.description}
                </p>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Specs */}
      {currentRobot.specs && (
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold">
                <span className="text-[#E10600]">Especificações</span> Técnicas
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {currentRobot.specs.weight && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-[#111217] border border-[#1F222B] rounded-xl p-6 text-center"
                >
                  <Settings className="w-8 h-8 text-[#E10600] mx-auto mb-3" />
                  <p className="text-[#B8BDC7] text-sm mb-1">Peso</p>
                  <p className="text-xl font-bold">{currentRobot.specs.weight}</p>
                </motion.div>
              )}

              {currentRobot.specs.dimensions && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="bg-[#111217] border border-[#1F222B] rounded-xl p-6 text-center"
                >
                  <Cpu className="w-8 h-8 text-[#E10600] mx-auto mb-3" />
                  <p className="text-[#B8BDC7] text-sm mb-1">Dimensões</p>
                  <p className="text-xl font-bold">{currentRobot.specs.dimensions}</p>
                </motion.div>
              )}

              {currentRobot.specs.drivetrain && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="bg-[#111217] border border-[#1F222B] rounded-xl p-6 text-center"
                >
                  <Zap className="w-8 h-8 text-[#E10600] mx-auto mb-3" />
                  <p className="text-[#B8BDC7] text-sm mb-1">Drivetrain</p>
                  <p className="text-xl font-bold">{currentRobot.specs.drivetrain}</p>
                </motion.div>
              )}
            </div>

            {currentRobot.specs.features && currentRobot.specs.features.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-8 bg-[#111217] border border-[#1F222B] rounded-xl p-6"
              >
                <h3 className="font-bold mb-4">Recursos Especiais</h3>
                <div className="flex flex-wrap gap-3">
                  {currentRobot.specs.features.map((feature, index) => (
                    <span 
                      key={index}
                      className="px-4 py-2 bg-[#1F222B] rounded-lg text-sm"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}