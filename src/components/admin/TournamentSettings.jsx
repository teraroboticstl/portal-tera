import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Trophy, Clock, Edit2, Plus, 
  FileText, ExternalLink, Save, Loader2, Award, 
  CheckCircle2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Badge from '@/components/common/Badge';
import { loadAdminDraft, saveAdminDraft, clearAdminDraft } from '@/lib/adminDrafts';

export default function TournamentSettings() {
  const queryClient = useQueryClient();
  const savedDraft = loadAdminDraft('tournament');

  const [isEditing, setIsEditing] = useState(Boolean(savedDraft?.isOpen));
  const [formData, setFormData] = useState(
    savedDraft?.data || {
      season_name: '',
      year: new Date().getFullYear(),
      game_name: '',
      kickoff_date: '',
      competition_date: '',
      robot_name: '',
      robot_weight: 0,
      game_manual_a: '',
      game_manual_b: '',
      scoring_zones: '',
      endgame_options: '',
      team_objectives: '',
      custom_description: '',
      awards_targeted: []
    }
  );
  const [newAward, setNewAward] = useState('');

  const { data: seasons = [], isLoading } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => base44.entities.Season.list('-year'),
  });

  const activeSeason = seasons && seasons.length > 0 ? seasons[0] : null;

  // Sincroniza rascunho da sessão sempre que formulário for editado
  useEffect(() => {
    if (isEditing) {
      saveAdminDraft('tournament', {
        isOpen: true,
        seasonId: activeSeason?.id || null,
        data: formData
      });
    } else {
      clearAdminDraft('tournament');
    }
  }, [isEditing, formData, activeSeason]);

  const openEditModal = () => {
    if (activeSeason) {
      setFormData({
        season_name: activeSeason.season_name || activeSeason.theme || '',
        year: activeSeason.year || new Date().getFullYear(),
        game_name: activeSeason.game_name || '',
        kickoff_date: activeSeason.kickoff_date ? activeSeason.kickoff_date.split('T')[0] : '',
        competition_date: activeSeason.competition_date ? activeSeason.competition_date.split('T')[0] : '',
        robot_name: activeSeason.robot_name || '',
        robot_weight: activeSeason.robot_weight !== undefined ? Number(activeSeason.robot_weight) : 0,
        game_manual_a: activeSeason.game_manual_a || '',
        game_manual_b: activeSeason.game_manual_b || '',
        scoring_zones: activeSeason.scoring_zones || '',
        endgame_options: activeSeason.endgame_options || '',
        team_objectives: activeSeason.team_objectives || '',
        custom_description: activeSeason.custom_description || activeSeason.description || '',
        awards_targeted: Array.isArray(activeSeason.awards_targeted) ? [...activeSeason.awards_targeted] : []
      });
    } else {
      setFormData({
        season_name: '',
        year: new Date().getFullYear(),
        game_name: '',
        kickoff_date: '',
        competition_date: '',
        robot_name: '',
        robot_weight: 0,
        game_manual_a: '',
        game_manual_b: '',
        scoring_zones: '',
        endgame_options: '',
        team_objectives: '',
        custom_description: '',
        awards_targeted: []
      });
    }
    setIsEditing(true);
  };

  const closeEditModal = () => {
    setIsEditing(false);
    clearAdminDraft('tournament');
  };

  const saveSeasonMutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        year: parseInt(data.year, 10) || new Date().getFullYear(),
        robot_weight: parseFloat(data.robot_weight) || 0,
        theme: data.season_name
      };

      if (activeSeason?.id) {
        return base44.entities.Season.update(activeSeason.id, payload);
      } else {
        return base44.entities.Season.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      clearAdminDraft('tournament');
      closeEditModal();
      toast.success('Configurações da temporada salvas com sucesso!');
    },
    onError: (err) => {
      console.error('Erro ao salvar temporada:', err);
      toast.error('Erro ao salvar configurações: ' + (err.message || 'Verifique as permissões de administrador.'));
    }
  });

  const handleAddAward = () => {
    const trimmed = newAward.trim();
    if (!trimmed) return;
    if (formData.awards_targeted?.includes(trimmed)) {
      toast.error('Este prêmio já foi adicionado à lista.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      awards_targeted: [...(prev.awards_targeted || []), trimmed]
    }));
    setNewAward('');
  };

  const handleRemoveAward = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      awards_targeted: (prev.awards_targeted || []).filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.season_name?.trim()) {
      toast.error('O nome da temporada é obrigatório.');
      return;
    }
    if (!formData.year) {
      toast.error('O ano da temporada é obrigatório.');
      return;
    }
    saveSeasonMutation.mutate(formData);
  };

  // Cálculo de contagem regressiva
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: false });

  useEffect(() => {
    if (!activeSeason?.competition_date) return;

    const calculateTime = () => {
      const target = new Date(activeSeason.competition_date).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true });
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
        isPassed: false
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [activeSeason?.competition_date]);

  if (isLoading) {
    return (
      <div className="py-16 text-center">
        <LoadingSpinner text="Carregando informações do torneio e temporada..." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner / Ações */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#E10600]" />
            Configuração do Torneio e Temporada
          </h2>
          <p className="text-sm text-[#B8BDC7] mt-0.5">
            Gerencie as metas, prazos, datas de kickoff/competição e manuais da temporada ativa.
          </p>
        </div>

        <Button
          onClick={openEditModal}
          className="bg-[#E10600] hover:bg-[#E10600]/90 text-white font-medium"
        >
          {activeSeason ? (
            <>
              <Edit2 className="w-4 h-4 mr-2" />
              Editar Configurações da Temporada
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar Nova Temporada
            </>
          )}
        </Button>
      </div>

      {!activeSeason ? (
        <div className="text-center py-16 bg-[#111217] border border-[#1F222B] rounded-2xl p-8">
          <Trophy className="w-12 h-12 text-[#1F222B] mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">Nenhuma temporada cadastrada</h3>
          <p className="text-sm text-[#B8BDC7] mb-4">
            Configure a primeira temporada para ativar a contagem regressiva e os dados de competição.
          </p>
          <Button onClick={openEditModal} className="bg-[#E10600] hover:bg-[#E10600]/90 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Configurar Temporada Agora
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card Principal da Temporada */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#E10600]/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#E10600] bg-[#E10600]/10 px-2.5 py-0.5 rounded border border-[#E10600]/20">
                      Temporada Ativa • {activeSeason.year}
                    </span>
                    <Badge variant="success">Oficial</Badge>
                  </div>
                  <h3 className="text-2xl font-bold text-white mt-1.5">
                    {activeSeason.season_name || activeSeason.theme || 'Temporada Sem Nome'}
                  </h3>
                  {activeSeason.game_name && (
                    <p className="text-sm text-[#B8BDC7]">Desafio / Jogo: <strong className="text-white">{activeSeason.game_name}</strong></p>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={openEditModal}
                  className="border-[#1F222B] bg-white text-zinc-900 hover:bg-zinc-100 hover:text-black text-xs font-medium"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1" />
                  Editar
                </Button>
              </div>

              {/* Grid de Datas e Robô */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 my-2 border-y border-[#1F222B]">
                <div>
                  <p className="text-xs text-[#B8BDC7]">Kickoff</p>
                  <p className="text-sm font-semibold text-white mt-0.5">
                    {activeSeason.kickoff_date ? new Date(activeSeason.kickoff_date).toLocaleDateString('pt-BR') : 'Não definido'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#B8BDC7]">Competição</p>
                  <p className="text-sm font-semibold text-white mt-0.5">
                    {activeSeason.competition_date ? new Date(activeSeason.competition_date).toLocaleDateString('pt-BR') : 'Não definido'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#B8BDC7]">Robô da Temporada</p>
                  <p className="text-sm font-semibold text-white mt-0.5">
                    {activeSeason.robot_name || 'Em projeto'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#B8BDC7]">Peso Estimado</p>
                  <p className="text-sm font-semibold text-white mt-0.5">
                    {activeSeason.robot_weight ? `${activeSeason.robot_weight} kg` : '0 kg'}
                  </p>
                </div>
              </div>

              {/* Objetivos e Descrição */}
              {(activeSeason.custom_description || activeSeason.team_objectives) && (
                <div className="space-y-3 mt-4 text-sm">
                  {activeSeason.team_objectives && (
                    <div>
                      <p className="text-xs font-medium text-[#B8BDC7] uppercase tracking-wider mb-1">Objetivos da Equipe:</p>
                      <p className="text-zinc-300 bg-[#0B0B0D] p-3 rounded-lg border border-[#1F222B] text-xs leading-relaxed">
                        {activeSeason.team_objectives}
                      </p>
                    </div>
                  )}
                  {activeSeason.custom_description && (
                    <div>
                      <p className="text-xs font-medium text-[#B8BDC7] uppercase tracking-wider mb-1">Descrição Técnica / Notas:</p>
                      <p className="text-zinc-300 bg-[#0B0B0D] p-3 rounded-lg border border-[#1F222B] text-xs leading-relaxed">
                        {activeSeason.custom_description}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Manuais do Jogo */}
              <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-[#1F222B]">
                {activeSeason.game_manual_a ? (
                  <a
                    href={activeSeason.game_manual_a}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#E10600] hover:underline bg-[#0B0B0D] px-3 py-1.5 rounded-lg border border-[#1F222B]"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Game Manual Parte 1
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                ) : (
                  <span className="text-xs text-zinc-500">Manual Parte 1: Não vinculado</span>
                )}

                {activeSeason.game_manual_b ? (
                  <a
                    href={activeSeason.game_manual_b}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#E10600] hover:underline bg-[#0B0B0D] px-3 py-1.5 rounded-lg border border-[#1F222B]"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Game Manual Parte 2
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                ) : (
                  <span className="text-xs text-zinc-500">Manual Parte 2: Não vinculado</span>
                )}
              </div>
            </div>

            {/* Prêmios Almejados */}
            <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6">
              <h4 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-[#E10600]" />
                Prêmios Almejados na Temporada
              </h4>
              {(!activeSeason.awards_targeted || activeSeason.awards_targeted.length === 0) ? (
                <p className="text-sm text-[#B8BDC7]">Nenhum prêmio configurado como meta para esta temporada.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activeSeason.awards_targeted.map((award, i) => (
                    <span 
                      key={i} 
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-[#E10600]/10 border border-[#E10600]/30 text-white flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3 h-3 text-[#E10600]" />
                      {award}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Coluna Lateral: Countdown */}
          <div className="space-y-6">
            <div className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6">
              <div className="flex items-center gap-2 text-white font-bold mb-4">
                <Clock className="w-4 h-4 text-[#E10600]" />
                Contagem Regressiva para Competição
              </div>

              {activeSeason.competition_date ? (
                timeLeft.isPassed ? (
                  <div className="text-center py-6 bg-[#0B0B0D] border border-[#1F222B] rounded-xl">
                    <p className="text-emerald-400 font-bold text-base">Torneio Concluído / Em Andamento</p>
                    <p className="text-xs text-[#B8BDC7] mt-1">Data: {new Date(activeSeason.competition_date).toLocaleDateString('pt-BR')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-[#0B0B0D] border border-[#1F222B] rounded-xl p-3">
                      <p className="text-2xl font-mono font-bold text-white">{timeLeft.days}</p>
                      <p className="text-[10px] text-[#B8BDC7] uppercase font-semibold mt-1">Dias</p>
                    </div>
                    <div className="bg-[#0B0B0D] border border-[#1F222B] rounded-xl p-3">
                      <p className="text-2xl font-mono font-bold text-white">{timeLeft.hours}</p>
                      <p className="text-[10px] text-[#B8BDC7] uppercase font-semibold mt-1">Horas</p>
                    </div>
                    <div className="bg-[#0B0B0D] border border-[#1F222B] rounded-xl p-3">
                      <p className="text-2xl font-mono font-bold text-white">{timeLeft.minutes}</p>
                      <p className="text-[10px] text-[#B8BDC7] uppercase font-semibold mt-1">Min</p>
                    </div>
                    <div className="bg-[#0B0B0D] border border-[#1F222B] rounded-xl p-3">
                      <p className="text-2xl font-mono font-bold text-[#E10600]">{timeLeft.seconds}</p>
                      <p className="text-[10px] text-[#B8BDC7] uppercase font-semibold mt-1">Seg</p>
                    </div>
                  </div>
                )
              ) : (
                <p className="text-xs text-[#B8BDC7] text-center py-4 bg-[#0B0B0D] border border-[#1F222B] rounded-xl">
                  Defina a data da competição no formulário de edição para ativar a contagem regressiva.
                </p>
              )}

              <div className="mt-4 pt-3 border-t border-[#1F222B] text-xs text-[#B8BDC7] space-y-1.5">
                <p>• Sincronizado automaticamente com o portal público.</p>
                <p>• Dados preservados no PostgreSQL do Supabase.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Completo de Edição / Criação da Temporada */}
      <Dialog open={isEditing} onOpenChange={(open) => { if (!open) closeEditModal(); }}>
        <DialogContent className="bg-[#111217] border-[#1F222B] max-w-2xl max-h-[90vh] overflow-y-auto text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <Trophy className="w-5 h-5 text-[#E10600]" />
              {activeSeason ? 'Editar Configurações da Temporada' : 'Cadastrar Nova Temporada'}
            </DialogTitle>
            <DialogDescription className="text-sm text-[#B8BDC7]">
              Preencha os dados oficiais da temporada e competição. As alterações afetam o painel e os cronômetros.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Label className="text-sm font-medium text-white mb-1.5 block">Nome da Temporada / Tema *</Label>
                <Input
                  value={formData.season_name}
                  onChange={(e) => setFormData({ ...formData, season_name: e.target.value })}
                  placeholder="Ex: REEFSCAPE ou FTC DECODE"
                  className="bg-[#0B0B0D] border-[#1F222B] text-white"
                  required
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-white mb-1.5 block">Ano *</Label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="bg-[#0B0B0D] border-[#1F222B] text-white"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">Nome do Desafio / Jogo</Label>
              <Input
                value={formData.game_name}
                onChange={(e) => setFormData({ ...formData, game_name: e.target.value })}
                placeholder="Ex: FIRST ENERGIZE presented by Qualcomm"
                className="bg-[#0B0B0D] border-[#1F222B] text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-white mb-1.5 block">Data do Kickoff</Label>
                <Input
                  type="date"
                  value={formData.kickoff_date}
                  onChange={(e) => setFormData({ ...formData, kickoff_date: e.target.value })}
                  className="bg-[#0B0B0D] border-[#1F222B] text-white"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-white mb-1.5 block">Data da Competição (Countdown)</Label>
                <Input
                  type="date"
                  value={formData.competition_date}
                  onChange={(e) => setFormData({ ...formData, competition_date: e.target.value })}
                  className="bg-[#0B0B0D] border-[#1F222B] text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-white mb-1.5 block">Nome do Robô</Label>
                <Input
                  value={formData.robot_name}
                  onChange={(e) => setFormData({ ...formData, robot_name: e.target.value })}
                  placeholder="Ex: Cerberus v3"
                  className="bg-[#0B0B0D] border-[#1F222B] text-white"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-white mb-1.5 block">Peso do Robô (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.robot_weight}
                  onChange={(e) => setFormData({ ...formData, robot_weight: e.target.value })}
                  className="bg-[#0B0B0D] border-[#1F222B] text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">Objetivos da Equipe</Label>
              <Textarea
                value={formData.team_objectives}
                onChange={(e) => setFormData({ ...formData, team_objectives: e.target.value })}
                placeholder="Ex: Conquistar o Prêmio Impacto, alcançar playoffs regionais..."
                rows={2}
                className="bg-[#0B0B0D] border-[#1F222B] text-white resize-none text-xs"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">Prêmios Almejados</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newAward}
                  onChange={(e) => setNewAward(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAward(); } }}
                  placeholder="Ex: Impact Award, Engineering Inspiration..."
                  className="bg-[#0B0B0D] border-[#1F222B] text-white text-xs"
                />
                <Button
                  type="button"
                  onClick={handleAddAward}
                  variant="outline"
                  className="border-[#1F222B] text-white shrink-0 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Adicionar
                </Button>
              </div>

              {formData.awards_targeted?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-[#0B0B0D] border border-[#1F222B] rounded-lg">
                  {formData.awards_targeted.map((award, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded bg-[#111217] border border-[#1F222B] text-xs text-white flex items-center gap-1.5"
                    >
                      {award}
                      <button
                        type="button"
                        onClick={() => handleRemoveAward(idx)}
                        className="text-red-400 hover:text-red-300 ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-white mb-1.5 block">Link do Game Manual (Parte 1)</Label>
                <Input
                  value={formData.game_manual_a}
                  onChange={(e) => setFormData({ ...formData, game_manual_a: e.target.value })}
                  placeholder="https://..."
                  className="bg-[#0B0B0D] border-[#1F222B] text-white text-xs"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-white mb-1.5 block">Link do Game Manual (Parte 2)</Label>
                <Input
                  value={formData.game_manual_b}
                  onChange={(e) => setFormData({ ...formData, game_manual_b: e.target.value })}
                  placeholder="https://..."
                  className="bg-[#0B0B0D] border-[#1F222B] text-white text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-white mb-1.5 block">Notas Técnicas Adicionais</Label>
              <Textarea
                value={formData.custom_description}
                onChange={(e) => setFormData({ ...formData, custom_description: e.target.value })}
                placeholder="Observações complementares sobre a temporada..."
                rows={2}
                className="bg-[#0B0B0D] border-[#1F222B] text-white resize-none text-xs"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-[#1F222B]">
              <Button
                type="button"
                variant="outline"
                onClick={closeEditModal}
                disabled={saveSeasonMutation.isPending}
                className="border-[#1F222B] text-[#B8BDC7] hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saveSeasonMutation.isPending}
                className="bg-[#E10600] hover:bg-[#E10600]/90 text-white font-medium"
              >
                {saveSeasonMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Configurações
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
