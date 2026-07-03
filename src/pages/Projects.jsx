import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { FolderOpen, Calendar, ExternalLink, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SectionTitle from '@/components/common/SectionTitle';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Badge from '@/components/common/Badge';

const tagColors = {
  'Educação': 'bg-blue-500/20 text-blue-400',
  'Engenharia': 'bg-purple-500/20 text-purple-400',
  'Impacto Social': 'bg-green-500/20 text-green-400',
  'Tecnologia': 'bg-cyan-500/20 text-cyan-400',
};

export default function Projects() {
  const [selectedProject, setSelectedProject] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => base44.entities.Project.filter({ status: 'active' }, '-created_date'),
  });

  const nextImage = () => {
    if (selectedProject?.images?.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === selectedProject.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (selectedProject?.images?.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? selectedProject.images.length - 1 : prev - 1
      );
    }
  };

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
              Nossos <span className="text-[#E10600]">Projetos</span>
            </h1>
            <p className="text-xl text-[#B8BDC7]">
              Conheça os projetos desenvolvidos pela TeraRobotics que impactam nossa comunidade 
              e demonstram nossa paixão por inovação.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <LoadingSpinner />
          ) : projects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <FolderOpen className="w-16 h-16 text-[#1F222B] mx-auto mb-4" />
              <p className="text-[#B8BDC7]">Nenhum projeto cadastrado ainda.</p>
            </motion.div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                  onClick={() => {
                    setSelectedProject(project);
                    setCurrentImageIndex(0);
                  }}
                  className="bg-[#111217] border border-[#1F222B] rounded-2xl overflow-hidden cursor-pointer group hover:border-[#E10600]/50 transition-all"
                >
                  <div className="aspect-video relative overflow-hidden bg-[#0B0B0D]">
                    {project.images?.[0] ? (
                      <img 
                        src={project.images[0]} 
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FolderOpen className="w-16 h-16 text-[#1F222B]" />
                      </div>
                    )}
                    {project.images?.length > 1 && (
                      <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/50 rounded-lg text-xs">
                        +{project.images.length - 1} fotos
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg mb-2 group-hover:text-[#E10600] transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-[#B8BDC7] text-sm line-clamp-2 mb-4">
                      {project.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.tags?.map((tag) => (
                        <span 
                          key={tag}
                          className={`px-2 py-1 rounded-full text-xs ${tagColors[tag] || 'bg-[#1F222B] text-[#B8BDC7]'}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    {project.date_period && (
                      <div className="flex items-center gap-2 text-xs text-[#B8BDC7]">
                        <Calendar className="w-3 h-3" />
                        {project.date_period}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Project Detail Modal */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="bg-[#111217] border-[#1F222B] max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedProject && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedProject.title}</DialogTitle>
                {selectedProject.date_period && (
                  <div className="flex items-center gap-2 text-sm text-[#B8BDC7]">
                    <Calendar className="w-4 h-4" />
                    {selectedProject.date_period}
                  </div>
                )}
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Image Gallery */}
                {selectedProject.images?.length > 0 && (
                  <div className="relative">
                    <div className="aspect-video rounded-xl overflow-hidden bg-[#0B0B0D]">
                      <img 
                        src={selectedProject.images[currentImageIndex]} 
                        alt={`${selectedProject.title} - ${currentImageIndex + 1}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    {selectedProject.images.length > 1 && (
                      <>
                        <button
                          onClick={prevImage}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                          {selectedProject.images.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setCurrentImageIndex(idx)}
                              className={`w-2 h-2 rounded-full transition-colors ${
                                idx === currentImageIndex ? 'bg-[#E10600]' : 'bg-white/50'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Tags */}
                {selectedProject.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.tags.map((tag) => (
                      <span 
                        key={tag}
                        className={`px-3 py-1 rounded-full text-sm ${tagColors[tag] || 'bg-[#1F222B] text-[#B8BDC7]'}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Description */}
                <div>
                  <p className="text-[#B8BDC7] whitespace-pre-wrap">
                    {selectedProject.description}
                  </p>
                </div>

                {/* Link */}
                {selectedProject.link && (
                  <a 
                    href={selectedProject.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Button className="w-full bg-[#E10600] hover:bg-[#E10600]/90">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Acessar Link do Projeto
                    </Button>
                  </a>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}