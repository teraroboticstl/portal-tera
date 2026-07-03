import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Award, Trophy, Users, Image as ImageIcon, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';

const LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698a86446abc83aece20025a/71928ec1c_WhatsAppImage2026-02-05at171715.jpg";

export default function Memorial() {
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [selectedMoment, setSelectedMoment] = useState(null);

  const { data: moments = [] } = useQuery({
    queryKey: ['memorial'],
    queryFn: () => base44.entities.TournamentMemorial.list('-date'),
  });

  const filteredMoments = selectedProgram === 'all' 
    ? moments 
    : moments.filter(m => m.program === selectedProgram);

  const highlights = moments.filter(m => m.highlight);

  const categoryColors = {
    'Torneio': 'bg-blue-500',
    'Prêmio': 'bg-yellow-500',
    'Conquista': 'bg-green-500',
    'Evento Especial': 'bg-purple-500'
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0B0B0D] to-black">
      {/* Hero */}
      <div className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black z-10" />
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1920')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        
        <div className="relative z-20 text-center px-6 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <img src={LOGO} alt="TeraRobotics" className="w-24 h-24 mx-auto mb-6 rounded-full border-4 border-[#E10600]" />
            <h1 className="text-6xl font-black mb-4 tracking-tight">
              MEMORIAL <span className="text-[#E10600]">TERAROBOTICS</span>
            </h1>
            <p className="text-xl text-gray-400 mb-8">
              Nossa história em competições de robótica • Momentos inesquecíveis • Conquistas memoráveis
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Destaques */}
        {highlights.length > 0 && (
          <section className="mb-20">
            <div className="flex items-center gap-3 mb-8">
              <Trophy className="w-8 h-8 text-[#E10600]" />
              <h2 className="text-3xl font-bold">Momentos Destaque</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {highlights.map((moment, i) => (
                <motion.div
                  key={moment.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1F222B] to-[#111217] border border-[#E10600]/30 hover:border-[#E10600] transition-all cursor-pointer"
                  onClick={() => setSelectedMoment(moment)}
                >
                  {moment.images?.[0] && (
                    <div className="aspect-video overflow-hidden">
                      <img 
                        src={moment.images[0]} 
                        alt={moment.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-3 py-1 bg-[#E10600] text-xs font-bold rounded-full">
                        {moment.program}
                      </span>
                      <span className={`px-3 py-1 ${categoryColors[moment.category]} text-xs font-bold rounded-full text-white`}>
                        {moment.category}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{moment.title}</h3>
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">{moment.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(moment.date).toLocaleDateString('pt-BR')}
                      </span>
                      {moment.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {moment.location}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Timeline */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <Calendar className="w-8 h-8 text-[#E10600]" />
            <h2 className="text-3xl font-bold">Linha do Tempo</h2>
          </div>

          <Tabs defaultValue="all" className="mb-8">
            <TabsList className="bg-[#1F222B]">
              <TabsTrigger value="all" onClick={() => setSelectedProgram('all')}>Todos</TabsTrigger>
              <TabsTrigger value="FRC" onClick={() => setSelectedProgram('FRC')}>FRC</TabsTrigger>
              <TabsTrigger value="FTC" onClick={() => setSelectedProgram('FTC')}>FTC</TabsTrigger>
              <TabsTrigger value="FLL" onClick={() => setSelectedProgram('FLL')}>FLL</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative">
            {/* Linha vertical */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#E10600] via-gray-700 to-transparent" />

            <div className="space-y-12">
              {filteredMoments.map((moment, i) => (
                <motion.div
                  key={moment.id}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="relative pl-20"
                >
                  {/* Marcador na linha */}
                  <div className="absolute left-5 top-0 w-6 h-6 rounded-full bg-[#E10600] border-4 border-black z-10" />

                  <div 
                    className="bg-[#111217] border border-[#1F222B] rounded-xl p-6 hover:border-[#E10600]/50 transition-all cursor-pointer"
                    onClick={() => setSelectedMoment(moment)}
                  >
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Imagem */}
                      {moment.images?.[0] && (
                        <div className="lg:w-1/3">
                          <img 
                            src={moment.images[0]} 
                            alt={moment.title}
                            className="w-full h-48 object-cover rounded-lg"
                          />
                        </div>
                      )}

                      {/* Conteúdo */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-3 py-1 bg-[#E10600] text-xs font-bold rounded-full">
                            {moment.program}
                          </span>
                          <span className={`px-3 py-1 ${categoryColors[moment.category]} text-xs font-bold rounded-full text-white`}>
                            {moment.category}
                          </span>
                          {moment.highlight && (
                            <Trophy className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>

                        <h3 className="text-2xl font-bold mb-2">{moment.title}</h3>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(moment.date).toLocaleDateString('pt-BR', { 
                              day: '2-digit', 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </span>
                          {moment.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {moment.location}
                            </span>
                          )}
                          {moment.ranking && (
                            <span className="flex items-center gap-1">
                              <Award className="w-4 h-4" />
                              {moment.ranking}
                            </span>
                          )}
                        </div>

                        <p className="text-gray-300 mb-4">{moment.description}</p>

                        {moment.achievements?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {moment.achievements.map((achievement, i) => (
                              <span key={i} className="px-3 py-1 bg-yellow-500/20 text-yellow-500 text-xs font-medium rounded-full border border-yellow-500/30">
                                🏆 {achievement}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-3">
                          {moment.images?.length > 1 && (
                            <Button size="sm" variant="outline" className="gap-2">
                              <ImageIcon className="w-4 h-4" />
                              {moment.images.length} fotos
                            </Button>
                          )}
                          {moment.video_urls?.length > 0 && (
                            <Button size="sm" variant="outline" className="gap-2">
                              <Play className="w-4 h-4" />
                              Vídeos
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Modal de detalhes */}
        <Dialog open={!!selectedMoment} onOpenChange={() => setSelectedMoment(null)}>
          <DialogContent className="max-w-4xl bg-[#111217] border-[#1F222B] max-h-[90vh] overflow-y-auto">
            {selectedMoment && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-[#E10600] text-xs font-bold rounded-full">
                    {selectedMoment.program}
                  </span>
                  <span className={`px-3 py-1 ${categoryColors[selectedMoment.category]} text-xs font-bold rounded-full text-white`}>
                    {selectedMoment.category}
                  </span>
                </div>

                <h2 className="text-3xl font-bold mb-4">{selectedMoment.title}</h2>

                <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-6">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(selectedMoment.date).toLocaleDateString('pt-BR', { 
                      day: '2-digit', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </span>
                  {selectedMoment.location && (
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {selectedMoment.location}
                    </span>
                  )}
                  {selectedMoment.ranking && (
                    <span className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-yellow-500" />
                      {selectedMoment.ranking}
                    </span>
                  )}
                </div>

                {selectedMoment.images?.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {selectedMoment.images.map((img, i) => (
                      <img key={i} src={img} alt={`${selectedMoment.title} ${i + 1}`} className="w-full h-64 object-cover rounded-lg" />
                    ))}
                  </div>
                )}

                <p className="text-gray-300 mb-6 leading-relaxed">{selectedMoment.description}</p>

                {selectedMoment.achievements?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      Conquistas
                    </h3>
                    <ul className="space-y-2">
                      {selectedMoment.achievements.map((achievement, i) => (
                        <li key={i} className="flex items-center gap-2 text-gray-300">
                          <Award className="w-4 h-4 text-[#E10600]" />
                          {achievement}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedMoment.team_members && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#E10600]" />
                      Equipe Participante
                    </h3>
                    <p className="text-gray-300">{selectedMoment.team_members}</p>
                  </div>
                )}

                {selectedMoment.video_urls?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <Play className="w-5 h-5 text-[#E10600]" />
                      Vídeos
                    </h3>
                    <div className="space-y-2">
                      {selectedMoment.video_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block text-[#E10600] hover:underline">
                          Vídeo {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}