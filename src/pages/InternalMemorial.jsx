import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Calendar, MapPin, Trophy, Trash2, Edit, Image as ImageIcon, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import ProtectedRoute, { canEdit } from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';

function InternalMemorialContent({ user }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingMoment, setEditingMoment] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    program: 'FRC',
    category: 'Torneio',
    description: '',
    location: '',
    ranking: '',
    images: [],
    achievements: [],
    video_urls: [],
    team_members: '',
    highlight: false,
  });

  const { data: moments = [] } = useQuery({
    queryKey: ['memorial'],
    queryFn: () => base44.entities.TournamentMemorial.list('-date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TournamentMemorial.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['memorial']);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TournamentMemorial.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['memorial']);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TournamentMemorial.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['memorial']),
  });

  const resetForm = () => {
    setFormData({
      title: '',
      date: '',
      program: 'FRC',
      category: 'Torneio',
      description: '',
      location: '',
      ranking: '',
      images: [],
      achievements: [],
      video_urls: [],
      team_members: '',
      highlight: false,
    });
    setEditingMoment(null);
    setShowForm(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingMoment) {
      updateMutation.mutate({ id: editingMoment.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (moment) => {
    setEditingMoment(moment);
    setFormData({
      title: moment.title || '',
      date: moment.date || '',
      program: moment.program || 'FRC',
      category: moment.category || 'Torneio',
      description: moment.description || '',
      location: moment.location || '',
      ranking: moment.ranking || '',
      images: moment.images || [],
      achievements: moment.achievements || [],
      video_urls: moment.video_urls || [],
      team_members: moment.team_members || '',
      highlight: moment.highlight || false,
    });
    setShowForm(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, images: [...formData.images, file_url] });
    }
  };

  const removeImage = (index) => {
    setFormData({ 
      ...formData, 
      images: formData.images.filter((_, i) => i !== index) 
    });
  };

  const addAchievement = () => {
    const achievement = prompt('Digite a conquista/prêmio:');
    if (achievement) {
      setFormData({ 
        ...formData, 
        achievements: [...formData.achievements, achievement] 
      });
    }
  };

  const removeAchievement = (index) => {
    setFormData({ 
      ...formData, 
      achievements: formData.achievements.filter((_, i) => i !== index) 
    });
  };

  const addVideoUrl = () => {
    const url = prompt('Digite a URL do vídeo:');
    if (url) {
      setFormData({ 
        ...formData, 
        video_urls: [...formData.video_urls, url] 
      });
    }
  };

  const removeVideoUrl = (index) => {
    setFormData({ 
      ...formData, 
      video_urls: formData.video_urls.filter((_, i) => i !== index) 
    });
  };

  const userCanEdit = canEdit(user);

  return (
    <InternalPageLayout user={user} currentPage="memorial" title="Memorial de Torneios">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Gerenciar Memorial</h1>
            <p className="text-gray-400">Adicione momentos históricos e conquistas da equipe</p>
          </div>
          {userCanEdit && (
            <Button onClick={() => setShowForm(true)} className="bg-[#E10600] hover:bg-[#E10600]/90 gap-2">
              <Plus className="w-4 h-4" /> Novo Momento
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-[#111217] border-[#1F222B]">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-[#E10600]">{moments.length}</div>
              <div className="text-sm text-gray-400">Total de Momentos</div>
            </CardContent>
          </Card>
          <Card className="bg-[#111217] border-[#1F222B]">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-yellow-500">{moments.filter(m => m.highlight).length}</div>
              <div className="text-sm text-gray-400">Destaques</div>
            </CardContent>
          </Card>
          <Card className="bg-[#111217] border-[#1F222B]">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-500">{moments.filter(m => m.category === 'Prêmio').length}</div>
              <div className="text-sm text-gray-400">Prêmios</div>
            </CardContent>
          </Card>
          <Card className="bg-[#111217] border-[#1F222B]">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-500">{moments.filter(m => m.category === 'Torneio').length}</div>
              <div className="text-sm text-gray-400">Torneios</div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de momentos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {moments.map((moment, i) => (
            <motion.div
              key={moment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="bg-[#111217] border-[#1F222B] hover:border-[#E10600]/50 transition-all">
                {moment.images?.[0] && (
                  <div className="aspect-video overflow-hidden rounded-t-lg">
                    <img src={moment.images[0]} alt={moment.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-[#E10600] text-xs font-bold rounded">{moment.program}</span>
                    <span className="px-2 py-1 bg-blue-500 text-xs font-bold rounded text-white">{moment.category}</span>
                    {moment.highlight && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{moment.title}</h3>
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">{moment.description}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
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
                  {userCanEdit && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(moment)} className="flex-1 gap-2">
                        <Edit className="w-3 h-3" /> Editar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(moment.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Modal de formulário */}
        <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-3xl bg-[#111217] border-[#1F222B] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMoment ? 'Editar Momento' : 'Novo Momento'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Título *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="bg-[#1F222B] border-[#2A2D38]"
                  />
                </div>
                <div>
                  <Label>Data *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="bg-[#1F222B] border-[#2A2D38]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Programa *</Label>
                  <Select value={formData.program} onValueChange={(v) => setFormData({ ...formData, program: v })}>
                    <SelectTrigger className="bg-[#1F222B] border-[#2A2D38]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1F222B] border-[#2A2D38]">
                      <SelectItem value="FRC">FRC</SelectItem>
                      <SelectItem value="FTC">FTC</SelectItem>
                      <SelectItem value="FLL">FLL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria *</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger className="bg-[#1F222B] border-[#2A2D38]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1F222B] border-[#2A2D38]">
                      <SelectItem value="Torneio">Torneio</SelectItem>
                      <SelectItem value="Prêmio">Prêmio</SelectItem>
                      <SelectItem value="Conquista">Conquista</SelectItem>
                      <SelectItem value="Evento Especial">Evento Especial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="bg-[#1F222B] border-[#2A2D38]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Local</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="bg-[#1F222B] border-[#2A2D38]"
                  />
                </div>
                <div>
                  <Label>Ranking/Posição</Label>
                  <Input
                    value={formData.ranking}
                    onChange={(e) => setFormData({ ...formData, ranking: e.target.value })}
                    placeholder="Ex: 1º Lugar"
                    className="bg-[#1F222B] border-[#2A2D38]"
                  />
                </div>
              </div>

              <div>
                <Label>Membros da Equipe</Label>
                <Input
                  value={formData.team_members}
                  onChange={(e) => setFormData({ ...formData, team_members: e.target.value })}
                  placeholder="Liste os membros que participaram"
                  className="bg-[#1F222B] border-[#2A2D38]"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.highlight}
                  onCheckedChange={(checked) => setFormData({ ...formData, highlight: checked })}
                />
                <Label>Marcar como destaque</Label>
              </div>

              {/* Imagens */}
              <div>
                <Label>Fotos</Label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {formData.images.map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={img} alt="" className="w-full h-24 object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <Input type="file" accept="image/*" onChange={handleImageUpload} className="bg-[#1F222B] border-[#2A2D38]" />
              </div>

              {/* Conquistas */}
              <div>
                <Label>Conquistas/Prêmios</Label>
                <div className="space-y-2 mb-2">
                  {formData.achievements.map((achievement, i) => (
                    <div key={i} className="flex items-center gap-2 bg-[#1F222B] p-2 rounded">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span className="flex-1 text-sm">{achievement}</span>
                      <button type="button" onClick={() => removeAchievement(i)} className="text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addAchievement} className="gap-2">
                  <Plus className="w-3 h-3" /> Adicionar Conquista
                </Button>
              </div>

              {/* Vídeos */}
              <div>
                <Label>Links de Vídeos</Label>
                <div className="space-y-2 mb-2">
                  {formData.video_urls.map((url, i) => (
                    <div key={i} className="flex items-center gap-2 bg-[#1F222B] p-2 rounded">
                      <span className="flex-1 text-sm truncate">{url}</span>
                      <button type="button" onClick={() => removeVideoUrl(i)} className="text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addVideoUrl} className="gap-2">
                  <Plus className="w-3 h-3" /> Adicionar Vídeo
                </Button>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 bg-[#E10600] hover:bg-[#E10600]/90">
                  {editingMoment ? 'Atualizar' : 'Criar'} Momento
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </InternalPageLayout>
  );
}

export default function InternalMemorial() {
  return (
    <ProtectedRoute requireApproved>
      <InternalMemorialContent />
    </ProtectedRoute>
  );
}