import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Cpu, X, Play, Ruler, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MuseumSection({ robots }) {
  const [selectedRobot, setSelectedRobot] = useState(null);
  const [imgIndex, setImgIndex] = useState(0);

  const frcRobots = robots.filter(r => r.category === 'FRC').sort((a, b) => b.year - a.year);
  const ftcRobots = robots.filter(r => r.category === 'FTC').sort((a, b) => b.year - a.year);

  const openRobot = (robot) => { setSelectedRobot(robot); setImgIndex(0); };
  const closeModal = () => setSelectedRobot(null);

  const allImages = selectedRobot ? [
    ...(selectedRobot.image_url ? [selectedRobot.image_url] : []),
    ...(selectedRobot.extra_images || [])
  ] : [];

  return (
    <section className="py-24 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#E10600] rounded text-white text-xs font-bold uppercase tracking-wider mb-5">
            <Cpu className="w-4 h-4" /> Galeria de Robôs
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">MUSEU DA <span className="text-[#E10600]">TERA</span></h2>
          <p className="text-[#B8BDC7] max-w-2xl mx-auto">Conheça a evolução dos robôs desenvolvidos pela TeraRobotics ao longo das temporadas FTC e FRC.</p>
        </motion.div>

        {frcRobots.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center gap-4 mb-8">
              <h3 className="text-xl font-bold text-red-500">FRC <span className="text-[#B8BDC7] font-normal text-sm">• #10343</span></h3>
              <div className="flex-1 h-px bg-[#1F222B]" />
            </div>
            <div className="relative">
              <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px bg-[#E10600]/30 -translate-y-1/2 z-0" />
              <div className="flex gap-6 overflow-x-auto pb-4">
                {frcRobots.map((robot, index) => (
                  <RobotCard key={robot.id} robot={robot} index={index} onOpen={openRobot} color="red" />
                ))}
              </div>
            </div>
          </div>
        )}

        {ftcRobots.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-8">
              <h3 className="text-xl font-bold text-orange-500">FTC <span className="text-[#B8BDC7] font-normal text-sm">• #17730</span></h3>
              <div className="flex-1 h-px bg-[#1F222B]" />
            </div>
            <div className="relative">
              <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px bg-orange-500/30 -translate-y-1/2 z-0" />
              <div className="flex gap-6 overflow-x-auto pb-4">
                {ftcRobots.map((robot, index) => (
                  <RobotCard key={robot.id} robot={robot} index={index} onOpen={openRobot} color="orange" />
                ))}
              </div>
            </div>
          </div>
        )}

        {frcRobots.length === 0 && ftcRobots.length === 0 && (
          <div className="text-center py-16 text-[#B8BDC7]">
            <Cpu className="w-16 h-16 mx-auto mb-4 text-[#1F222B]" />
            <p>Nenhum robô cadastrado ainda.</p>
          </div>
        )}

        <div className="text-center mt-8">
          <Link to={createPageUrl('Memoria')}>
            <Button className="bg-[#E10600] hover:bg-[#E10600]/90 text-white">Ver Galeria de Robôs</Button>
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {selectedRobot && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={closeModal}>
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#111217] border border-[#1F222B] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-[#1F222B]">
                <div>
                  <span className={`text-xs font-bold px-2 py-1 rounded mr-3 ${selectedRobot.category === 'FRC' ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-500'}`}>{selectedRobot.category}</span>
                  <span className="text-[#B8BDC7] text-sm">{selectedRobot.year}</span>
                  <h2 className="text-2xl font-black text-white mt-1">{selectedRobot.name}</h2>
                  {selectedRobot.season_name && <p className="text-[#E10600] text-sm font-semibold">{selectedRobot.season_name}</p>}
                </div>
                <button onClick={closeModal} className="text-[#B8BDC7] hover:text-white transition-colors p-2"><X className="w-6 h-6" /></button>
              </div>

              <div className="p-6 grid md:grid-cols-2 gap-6">
                <div>
                  {allImages.length > 0 ? (
                    <div className="relative">
                      <div className="aspect-square bg-[#0B0B0D] rounded-xl overflow-hidden">
                        <img src={allImages[imgIndex]} alt={selectedRobot.name} className="w-full h-full object-contain" />
                      </div>
                      {allImages.length > 1 && (
                        <div className="flex items-center justify-center gap-3 mt-3">
                          <button onClick={() => setImgIndex(i => (i - 1 + allImages.length) % allImages.length)} className="p-1 text-[#B8BDC7] hover:text-white"><ChevronLeft className="w-5 h-5" /></button>
                          <span className="text-xs text-[#B8BDC7]">{imgIndex + 1} / {allImages.length}</span>
                          <button onClick={() => setImgIndex(i => (i + 1) % allImages.length)} className="p-1 text-[#B8BDC7] hover:text-white"><ChevronRight className="w-5 h-5" /></button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-square bg-[#0B0B0D] rounded-xl flex items-center justify-center"><Cpu className="w-20 h-20 text-[#1F222B]" /></div>
                  )}
                  {selectedRobot.video_urls && selectedRobot.video_urls.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[#B8BDC7] text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2"><Play className="w-3 h-3" /> Vídeos</p>
                      <div className="space-y-2">
                        {selectedRobot.video_urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#E10600] hover:text-[#E10600]/80 transition-colors">
                            <Play className="w-4 h-4" /> Vídeo {i + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-5">
                  <div>
                    <p className="text-[#B8BDC7] text-xs font-semibold uppercase tracking-wider mb-3">Especificações</p>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedRobot.robot_weight && <div className="bg-[#0B0B0D] rounded-xl p-3 flex items-center gap-3"><Ruler className="w-5 h-5 text-[#E10600] flex-shrink-0" /><div><p className="text-xs text-[#B8BDC7]">Peso</p><p className="text-white font-bold text-sm">{selectedRobot.robot_weight} kg</p></div></div>}
                      {selectedRobot.robot_width && <div className="bg-[#0B0B0D] rounded-xl p-3 flex items-center gap-3"><Ruler className="w-5 h-5 text-[#E10600] flex-shrink-0" /><div><p className="text-xs text-[#B8BDC7]">Largura</p><p className="text-white font-bold text-sm">{selectedRobot.robot_width} cm</p></div></div>}
                      {selectedRobot.robot_height && <div className="bg-[#0B0B0D] rounded-xl p-3 flex items-center gap-3"><Ruler className="w-5 h-5 text-[#E10600] flex-shrink-0" /><div><p className="text-xs text-[#B8BDC7]">Altura</p><p className="text-white font-bold text-sm">{selectedRobot.robot_height} cm</p></div></div>}
                      {selectedRobot.robot_length && <div className="bg-[#0B0B0D] rounded-xl p-3 flex items-center gap-3"><Ruler className="w-5 h-5 text-[#E10600] flex-shrink-0" /><div><p className="text-xs text-[#B8BDC7]">Comprimento</p><p className="text-white font-bold text-sm">{selectedRobot.robot_length} cm</p></div></div>}
                    </div>
                  </div>
                  {selectedRobot.description && <div><p className="text-[#B8BDC7] text-xs font-semibold uppercase tracking-wider mb-2">Descrição</p><p className="text-[#B8BDC7] text-sm leading-relaxed">{selectedRobot.description}</p></div>}
                  {selectedRobot.game_objective && <div><p className="text-[#B8BDC7] text-xs font-semibold uppercase tracking-wider mb-2">Objetivo no Jogo</p><p className="text-[#B8BDC7] text-sm leading-relaxed">{selectedRobot.game_objective}</p></div>}
                  {selectedRobot.cad_url && <a href={selectedRobot.cad_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#E10600]/10 border border-[#E10600]/30 text-[#E10600] text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#E10600]/20 transition-colors">Acessar CAD →</a>}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function RobotCard({ robot, index, onOpen, color }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }}
      className="flex-shrink-0 w-52 relative z-10 cursor-pointer group" onClick={() => onOpen(robot)}>
      <div className={`hidden md:block absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-[#0B0B0D] z-10 ${color === 'red' ? 'bg-red-500' : 'bg-orange-500'}`} />
      <div className={`bg-[#111217] border rounded-2xl overflow-hidden hover:-translate-y-2 transition-all duration-300 ${color === 'red' ? 'border-[#1F222B] hover:border-red-500/50' : 'border-[#1F222B] hover:border-orange-500/50'}`}>
        {robot.image_url ? (
          <div className="h-40 bg-[#0B0B0D] overflow-hidden"><img src={robot.image_url} alt={robot.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" /></div>
        ) : (
          <div className="h-40 bg-[#0B0B0D] flex items-center justify-center"><Cpu className="w-12 h-12 text-[#1F222B]" /></div>
        )}
        <div className="p-4">
          <p className={`text-xs font-bold mb-1 ${color === 'red' ? 'text-red-500' : 'text-orange-500'}`}>{robot.year}</p>
          <h4 className="text-white font-bold text-sm leading-tight">{robot.name}</h4>
          {robot.season_name && <p className="text-[#B8BDC7] text-xs mt-1 truncate">{robot.season_name}</p>}
          <p className="text-[#E10600] text-xs mt-2 group-hover:translate-x-1 transition-transform">Ver detalhes →</p>
        </div>
      </div>
    </motion.div>
  );
}