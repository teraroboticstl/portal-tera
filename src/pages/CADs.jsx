import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Box, ExternalLink, Filter, Calendar } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SectionTitle from '@/components/common/SectionTitle';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Badge from '@/components/common/Badge';

export default function CADs() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: robots = [], isLoading } = useQuery({
    queryKey: ['robots', 'cads'],
    queryFn: () => base44.entities.Robot.list('-year'),
  });

  const robotsWithCAD = robots.filter(r => r.cad_url);
  
  const filteredRobots = selectedCategory === 'all' 
    ? robotsWithCAD 
    : robotsWithCAD.filter(r => r.category === selectedCategory);

  const currentRobots = filteredRobots.filter(r => r.is_current);
  const pastRobots = filteredRobots.filter(r => !r.is_current);

  return (
    <div className="min-h-screen py-12">
      {/* Hero */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-[#E10600]">CADs</span> da Equipe
            </h1>
            <p className="text-xl text-[#B8BDC7]">
              Explore os modelos 3D dos nossos robôs. Documentamos todo o processo 
              de design para compartilhar conhecimento com a comunidade FIRST.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-16 lg:top-20 z-40 bg-[#0B0B0D]/95 backdrop-blur-md border-b border-[#1F222B] py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#B8BDC7]" />
              <span className="text-sm text-[#B8BDC7]">Filtrar por:</span>
            </div>
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="bg-[#111217] border border-[#1F222B]">
                <TabsTrigger value="all" className="data-[state=active]:bg-[#E10600]">
                  Todos
                </TabsTrigger>
                <TabsTrigger value="FRC" className="data-[state=active]:bg-red-500">
                  FRC
                </TabsTrigger>
                <TabsTrigger value="FTC" className="data-[state=active]:bg-orange-500">
                  FTC
                </TabsTrigger>
                <TabsTrigger value="FLL" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
                  FLL
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <LoadingSpinner />
          ) : robotsWithCAD.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <Box className="w-16 h-16 text-[#1F222B] mx-auto mb-4" />
              <p className="text-[#B8BDC7]">Nenhum CAD disponível no momento.</p>
            </motion.div>
          ) : (
            <div className="space-y-16">
              {/* Current Season */}
              {currentRobots.length > 0 && (
                <div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-8"
                  >
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <span className="w-3 h-3 bg-[#E10600] rounded-full animate-pulse" />
                      Temporada Atual
                    </h2>
                  </motion.div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentRobots.map((robot) => (
                      <CADCard key={robot.id} robot={robot} featured />
                    ))}
                  </div>
                </div>
              )}

              {/* Past Seasons */}
              {pastRobots.length > 0 && (
                <div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-8"
                  >
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-[#B8BDC7]" />
                      Temporadas Anteriores
                    </h2>
                  </motion.div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pastRobots.map((robot) => (
                      <CADCard key={robot.id} robot={robot} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function CADCard({ robot, featured = false }) {
  const categoryColors = {
    FRC: 'border-red-500/30 hover:border-red-500/50',
    FTC: 'border-orange-500/30 hover:border-orange-500/50',
    FLL: 'border-yellow-500/30 hover:border-yellow-500/50',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`bg-[#111217] border ${categoryColors[robot.category] || 'border-[#1F222B]'} rounded-2xl overflow-hidden ${featured ? 'ring-2 ring-[#E10600]/30' : ''}`}
    >
      <div className="aspect-video relative overflow-hidden bg-[#0B0B0D]">
        {robot.image_url ? (
          <img 
            src={robot.image_url} 
            alt={robot.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Box className="w-16 h-16 text-[#1F222B]" />
          </div>
        )}
        {featured && (
          <div className="absolute top-3 right-3">
            <span className="px-2 py-1 bg-[#E10600] text-white text-xs rounded-full">
              Atual
            </span>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <Badge variant={robot.category.toLowerCase()}>
            {robot.category}
          </Badge>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-bold text-lg mb-1">{robot.name}</h3>
        <p className="text-[#B8BDC7] text-sm mb-4">
          {robot.season_name || `Temporada ${robot.year}`}
        </p>
        <a 
          href={robot.cad_url} 
          target="_blank" 
          rel="noopener noreferrer"
        >
          <Button className="w-full bg-[#E10600] hover:bg-[#E10600]/90">
            <ExternalLink className="w-4 h-4 mr-2" />
            Ver CAD 3D
          </Button>
        </a>
      </div>
    </motion.div>
  );
}