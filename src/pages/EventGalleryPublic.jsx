import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Image as ImageIcon, Play, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/698a86446abc83aece20025a/71928ec1c_WhatsAppImage2026-02-05at171715.jpg";

export default function EventGalleryPublic() {
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaIndex, setMediaIndex] = useState(0);

  const { data: events = [] } = useQuery({
    queryKey: ['public-events'],
    queryFn: async () => {
      const allEvents = await base44.entities.EventGallery.filter({ is_public: true }, '-year');
      return allEvents;
    },
  });

  const { data: mediaMap = {} } = useQuery({
    queryKey: ['public-media'],
    queryFn: async () => {
      const allMedia = await base44.entities.EventMedia.filter({ is_public: true }, 'order');
      const grouped = {};
      allMedia.forEach(media => {
        if (!grouped[media.event_id]) grouped[media.event_id] = [];
        grouped[media.event_id].push(media);
      });
      return grouped;
    },
  });

  // Filtros
  const filteredEvents = events.filter(event => {
    const matchYear = selectedYear === 'all' || event.year === parseInt(selectedYear);
    const matchType = selectedType === 'all' || event.event_type === selectedType;
    const matchSearch = !searchTerm || event.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchYear && matchType && matchSearch;
  });

  // Agrupar por ano
  const eventsByYear = {};
  filteredEvents.forEach(event => {
    if (!eventsByYear[event.year]) eventsByYear[event.year] = [];
    eventsByYear[event.year].push(event);
  });

  const years = [...new Set(events.map(e => e.year))].sort((a, b) => b - a);

  const openEvent = (event) => {
    setSelectedEvent(event);
  };

  const openMedia = (media, index) => {
    setSelectedMedia(media);
    setMediaIndex(index);
  };

  const nextMedia = () => {
    const eventMedia = mediaMap[selectedEvent.id] || [];
    const newIndex = (mediaIndex + 1) % eventMedia.length;
    setMediaIndex(newIndex);
    setSelectedMedia(eventMedia[newIndex]);
  };

  const prevMedia = () => {
    const eventMedia = mediaMap[selectedEvent.id] || [];
    const newIndex = (mediaIndex - 1 + eventMedia.length) % eventMedia.length;
    setMediaIndex(newIndex);
    setSelectedMedia(eventMedia[newIndex]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0B0B0D] to-black">
      {/* Hero */}
      <div className="relative h-[50vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black z-10" />
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920')`,
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
            <img src={LOGO} alt="TeraRobotics" className="w-20 h-20 mx-auto mb-6 rounded-full border-4 border-[#E10600]" />
            <h1 className="text-5xl font-black mb-4 tracking-tight">
              NOSSA <span className="text-[#E10600]">JORNADA</span>
            </h1>
            <p className="text-lg text-gray-400">
              Momentos marcantes, viagens inesquecíveis e conquistas da equipe
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Filtros */}
        <div className="mb-12 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="🔍 Buscar eventos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#111217] border-[#1F222B] text-white"
            />
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="bg-[#111217] border-[#1F222B]">
                <SelectValue placeholder="Filtrar por ano" />
              </SelectTrigger>
              <SelectContent className="bg-[#111217] border-[#1F222B]">
                <SelectItem value="all">Todos os anos</SelectItem>
                {years.map(year => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="bg-[#111217] border-[#1F222B]">
                <SelectValue placeholder="Tipo de evento" />
              </SelectTrigger>
              <SelectContent className="bg-[#111217] border-[#1F222B]">
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="Torneio">Torneios</SelectItem>
                <SelectItem value="Viagem">Viagens</SelectItem>
                <SelectItem value="Offseason">Offseason</SelectItem>
                <SelectItem value="Evento Interno">Eventos Internos</SelectItem>
                <SelectItem value="Bastidores">Bastidores</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Timeline por ano */}
        {Object.keys(eventsByYear).sort((a, b) => b - a).map(year => (
          <div key={year} className="mb-16">
            <h2 className="text-4xl font-black mb-8 flex items-center gap-3">
              <span className="text-[#E10600]">{year}</span>
              <span className="text-gray-700 text-2xl">━━━</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {eventsByYear[year].map((event, i) => {
                const eventMedia = mediaMap[event.id] || [];
                const photoCount = eventMedia.filter(m => m.media_type === 'photo').length;
                const videoCount = eventMedia.filter(m => m.media_type === 'video').length;

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="group relative overflow-hidden rounded-xl bg-[#111217] border border-[#1F222B] hover:border-[#E10600] transition-all cursor-pointer"
                    onClick={() => openEvent(event)}
                  >
                    {/* Capa */}
                    {event.cover_image && (
                      <div className="aspect-video overflow-hidden">
                        <img 
                          src={event.cover_image} 
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                    )}

                    <div className="p-6">
                      <span className="inline-block px-3 py-1 bg-[#E10600] text-xs font-bold rounded-full mb-3">
                        {event.event_type}
                      </span>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-[#E10600] transition-colors">
                        {event.title}
                      </h3>
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2">{event.description}</p>

                      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
                        {event.date_start && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(event.date_start).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-3">
                        {photoCount > 0 && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <ImageIcon className="w-4 h-4" />
                            {photoCount}
                          </span>
                        )}
                        {videoCount > 0 && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Play className="w-4 h-4" />
                            {videoCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}

        {filteredEvents.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">Nenhum evento encontrado com os filtros selecionados.</p>
          </div>
        )}
      </div>

      {/* Modal do evento */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-6xl bg-[#111217] border-[#1F222B] max-h-[90vh] overflow-y-auto">
          {selectedEvent && (
            <div>
              <div className="mb-6">
                <span className="inline-block px-3 py-1 bg-[#E10600] text-xs font-bold rounded-full mb-3">
                  {selectedEvent.event_type}
                </span>
                <h2 className="text-3xl font-bold mb-2">{selectedEvent.title}</h2>
                <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                  {selectedEvent.date_start && (
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(selectedEvent.date_start).toLocaleDateString('pt-BR')}
                      {selectedEvent.date_end && ` - ${new Date(selectedEvent.date_end).toLocaleDateString('pt-BR')}`}
                    </span>
                  )}
                  {selectedEvent.location && (
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {selectedEvent.location}
                    </span>
                  )}
                </div>
              </div>

              {selectedEvent.description && (
                <p className="text-gray-300 mb-6 leading-relaxed">{selectedEvent.description}</p>
              )}

              {/* Galeria de mídia */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {(mediaMap[selectedEvent.id] || []).map((media, i) => (
                  <div
                    key={media.id}
                    className="aspect-square overflow-hidden rounded-lg cursor-pointer group relative"
                    onClick={() => openMedia(media, i)}
                  >
                    {media.media_type === 'photo' ? (
                      <img
                        src={media.media_url}
                        alt={media.caption || ''}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                    ) : (
                      <div className="relative w-full h-full bg-black flex items-center justify-center">
                        <Play className="w-12 h-12 text-white opacity-80" />
                        {media.thumbnail_url && (
                          <img
                            src={media.thumbnail_url}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover opacity-60"
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox de mídia */}
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-7xl bg-black border-[#1F222B] p-0">
          {selectedMedia && (
            <div className="relative">
              <button
                onClick={() => setSelectedMedia(null)}
                className="absolute top-4 right-4 z-50 bg-black/50 p-2 rounded-full hover:bg-black/70 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {selectedMedia.media_type === 'photo' ? (
                <img
                  src={selectedMedia.media_url}
                  alt={selectedMedia.caption || ''}
                  className="w-full h-auto max-h-[85vh] object-contain"
                />
              ) : (
                <video
                  src={selectedMedia.media_url}
                  controls
                  className="w-full h-auto max-h-[85vh]"
                />
              )}

              {selectedMedia.caption && (
                <div className="p-4 bg-black/80">
                  <p className="text-white text-sm">{selectedMedia.caption}</p>
                </div>
              )}

              {/* Navegação */}
              {mediaMap[selectedEvent?.id]?.length > 1 && (
                <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 pointer-events-none">
                  <button
                    onClick={prevMedia}
                    className="pointer-events-auto bg-black/50 p-3 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <ChevronRight className="w-6 h-6 rotate-180" />
                  </button>
                  <button
                    onClick={nextMedia}
                    className="pointer-events-auto bg-black/50 p-3 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}