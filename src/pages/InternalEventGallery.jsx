import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Image as ImageIcon, Video, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProtectedRoute, { canEdit } from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';

function InternalEventGalleryContent({ user }) {
  const queryClient = useQueryClient();
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const [eventForm, setEventForm] = useState({
    title: '',
    year: new Date().getFullYear(),
    event_type: 'Torneio',
    date_start: '',
    date_end: '',
    location: '',
    description: '',
    cover_image: '',
    is_public: false,
    parent_event_id: null,
    order: 0,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.EventGallery.list('-year'),
  });

  const { data: allMedia = [] } = useQuery({
    queryKey: ['media'],
    queryFn: () => base44.entities.EventMedia.list('order'),
  });

  const mediaByEvent = {};
  allMedia.forEach(media => {
    if (!mediaByEvent[media.event_id]) mediaByEvent[media.event_id] = [];
    mediaByEvent[media.event_id].push(media);
  });

  const createEventMutation = useMutation({
    mutationFn: (data) => base44.entities.EventGallery.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      resetEventForm();
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EventGallery.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      resetEventForm();
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id) => base44.entities.EventGallery.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const createMediaMutation = useMutation({
    mutationFn: (data) => base44.entities.EventMedia.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media'] }),
  });

  const deleteMediaMutation = useMutation({
    mutationFn: (id) => base44.entities.EventMedia.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media'] }),
  });

  const toggleMediaVisibility = useMutation({
    mutationFn: ({ id, is_public }) => base44.entities.EventMedia.update(id, { is_public }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['media'] }),
  });

  const resetEventForm = () => {
    setEventForm({
      title: '',
      year: new Date().getFullYear(),
      event_type: 'Torneio',
      date_start: '',
      date_end: '',
      location: '',
      description: '',
      cover_image: '',
      is_public: false,
      parent_event_id: null,
      order: 0,
    });
    setEditingEvent(null);
    setShowEventForm(false);
  };

  const handleEventSubmit = (e) => {
    e.preventDefault();
    if (editingEvent) {
      updateEventMutation.mutate({ id: editingEvent.id, data: eventForm });
    } else {
      createEventMutation.mutate(eventForm);
    }
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title || '',
      year: event.year || new Date().getFullYear(),
      event_type: event.event_type || 'Torneio',
      date_start: event.date_start || '',
      date_end: event.date_end || '',
      location: event.location || '',
      description: event.description || '',
      cover_image: event.cover_image || '',
      is_public: event.is_public || false,
      parent_event_id: event.parent_event_id || null,
      order: event.order || 0,
    });
    setShowEventForm(true);
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setEventForm({ ...eventForm, cover_image: file_url });
    }
  };

  const handleMediaUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (file && selectedEvent) {
      setUploadingMedia(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await createMediaMutation.mutateAsync({
        event_id: selectedEvent.id,
        media_type: type,
        media_url: file_url,
        is_public: false,
        order: (mediaByEvent[selectedEvent.id]?.length || 0) + 1,
      });
      setUploadingMedia(false);
    }
  };

  const userCanEdit = canEdit(user);

  return (
    <InternalPageLayout user={user} currentPage="gallery" title="Galeria de Eventos">
      <Tabs defaultValue="events" className="space-y-6">
        <TabsList className="bg-[#1F222B]">
          <TabsTrigger value="events">Eventos</TabsTrigger>
          <TabsTrigger value="media">Gerenciar Mídia</TabsTrigger>
        </TabsList>

        {/* Tab: Eventos */}
        <TabsContent value="events" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Eventos & Viagens</h1>
              <p className="text-gray-400">Gerencie eventos, torneios e viagens da equipe</p>
            </div>
            {userCanEdit && (
              <Button onClick={() => setShowEventForm(true)} className="bg-[#E10600] hover:bg-[#E10600]/90 gap-2">
                <Plus className="w-4 h-4" /> Novo Evento
              </Button>
            )}
          </div>

          {/* Lista de eventos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event, i) => {
              const eventMedia = mediaByEvent[event.id] || [];
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="bg-[#111217] border-[#1F222B] hover:border-[#E10600]/50 transition-all">
                    {event.cover_image && (
                      <div className="aspect-video overflow-hidden rounded-t-lg">
                        <img src={event.cover_image} alt={event.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-[#E10600] text-xs font-bold rounded">{event.year}</span>
                        <span className="px-2 py-1 bg-blue-500 text-xs font-bold rounded text-white">{event.event_type}</span>
                        {event.is_public ? (
                          <Eye className="w-4 h-4 text-green-500" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{event.title}</h3>
                      <p className="text-sm text-gray-400 mb-3 line-clamp-2">{event.description}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                        <span className="flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          {eventMedia.filter(m => m.media_type === 'photo').length}
                        </span>
                        <span className="flex items-center gap-1">
                          <Video className="w-3 h-3" />
                          {eventMedia.filter(m => m.media_type === 'video').length}
                        </span>
                      </div>
                      {userCanEdit && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setSelectedEvent(event)} className="flex-1">
                            Mídia
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEditEvent(event)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteEventMutation.mutate(event.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab: Mídia */}
        <TabsContent value="media" className="space-y-6">
          {selectedEvent ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedEvent.title}</h2>
                  <p className="text-gray-400">Gerencie fotos e vídeos deste evento</p>
                </div>
                <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                  Voltar
                </Button>
              </div>

              {userCanEdit && (
                <div className="flex gap-3 mb-6">
                  <label className={`inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium cursor-pointer hover:bg-primary/90 transition-colors ${uploadingMedia ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input type="file" accept="image/*" onChange={(e) => handleMediaUpload(e, 'photo')} className="hidden" disabled={uploadingMedia} />
                    <ImageIcon className="w-4 h-4" /> {uploadingMedia ? 'Enviando...' : 'Adicionar Fotos'}
                  </label>
                  <label className={`inline-flex items-center gap-2 px-4 py-2 border border-input bg-background rounded-md text-sm font-medium cursor-pointer hover:bg-accent transition-colors ${uploadingMedia ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input type="file" accept="video/*" onChange={(e) => handleMediaUpload(e, 'video')} className="hidden" disabled={uploadingMedia} />
                    <Video className="w-4 h-4" /> Adicionar Vídeos
                  </label>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {(mediaByEvent[selectedEvent.id] || []).map(media => (
                  <div key={media.id} className="relative group">
                    <div className="aspect-square overflow-hidden rounded-lg bg-[#1F222B]">
                      {media.media_type === 'photo' ? (
                        <img src={media.media_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-12 h-12 text-gray-600" />
                        </div>
                      )}
                    </div>
                    {userCanEdit && (
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => toggleMediaVisibility.mutate({ id: media.id, is_public: !media.is_public })}
                          className="p-2 bg-black/70 rounded-full hover:bg-black transition-colors"
                        >
                          {media.is_public ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                        </button>
                        <button
                          onClick={() => deleteMediaMutation.mutate(media.id)}
                          className="p-2 bg-red-500/70 rounded-full hover:bg-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-gray-500">Selecione um evento para gerenciar suas mídias</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de evento */}
      <Dialog open={showEventForm} onOpenChange={(open) => !open && resetEventForm()}>
        <DialogContent className="max-w-2xl bg-[#111217] border-[#1F222B] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEventSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Título *</Label>
                <Input
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  required
                  className="bg-[#1F222B] border-[#2A2D38]"
                />
              </div>
              <div>
                <Label>Ano *</Label>
                <Input
                  type="number"
                  value={eventForm.year}
                  onChange={(e) => setEventForm({ ...eventForm, year: parseInt(e.target.value) })}
                  required
                  className="bg-[#1F222B] border-[#2A2D38]"
                />
              </div>
            </div>

            <div>
              <Label>Tipo de Evento *</Label>
              <Select value={eventForm.event_type} onValueChange={(v) => setEventForm({ ...eventForm, event_type: v })}>
                <SelectTrigger className="bg-[#1F222B] border-[#2A2D38]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1F222B] border-[#2A2D38]">
                  <SelectItem value="Torneio">Torneio</SelectItem>
                  <SelectItem value="Viagem">Viagem</SelectItem>
                  <SelectItem value="Offseason">Offseason</SelectItem>
                  <SelectItem value="Evento Interno">Evento Interno</SelectItem>
                  <SelectItem value="Bastidores">Bastidores</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={eventForm.date_start}
                  onChange={(e) => setEventForm({ ...eventForm, date_start: e.target.value })}
                  className="bg-[#1F222B] border-[#2A2D38]"
                />
              </div>
              <div>
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={eventForm.date_end}
                  onChange={(e) => setEventForm({ ...eventForm, date_end: e.target.value })}
                  className="bg-[#1F222B] border-[#2A2D38]"
                />
              </div>
            </div>

            <div>
              <Label>Local</Label>
              <Input
                value={eventForm.location}
                onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                className="bg-[#1F222B] border-[#2A2D38]"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                rows={4}
                className="bg-[#1F222B] border-[#2A2D38]"
              />
            </div>

            <div>
              <Label>Imagem de Capa</Label>
              {eventForm.cover_image && (
                <img src={eventForm.cover_image} alt="Capa" className="w-full h-40 object-cover rounded mb-2" />
              )}
              <Input type="file" accept="image/*" onChange={handleCoverUpload} className="bg-[#1F222B] border-[#2A2D38]" />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={eventForm.is_public}
                onCheckedChange={(checked) => setEventForm({ ...eventForm, is_public: checked })}
              />
              <Label>Visível publicamente</Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={resetEventForm} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-[#E10600] hover:bg-[#E10600]/90">
                {editingEvent ? 'Atualizar' : 'Criar'} Evento
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </InternalPageLayout>
  );
}

export default function InternalEventGallery() {
  return (
    <ProtectedRoute requireApproved>
      <InternalEventGalleryContent />
    </ProtectedRoute>
  );
}