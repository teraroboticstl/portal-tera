import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Trophy, Clock, Edit2, Plus, 
  ExternalLink, Save, Loader2, Award, 
  CheckCircle2, Trash2, Calendar, Link as LinkIcon,
  Bot, AlertTriangle, Layers, FileText
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Badge from '@/components/common/Badge';
import { loadAdminDraft, saveAdminDraft, clearAdminDraft } from '@/lib/adminDrafts';

export const PROGRAM_OPTIONS = ['OBR', 'FLL', 'FTC', 'FRC'];

const PROGRAM_BADGE_STYLES = {
  FRC: 'bg-red-500/15 text-red-400 border-red-500/30',
  FTC: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  FLL: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  OBR: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

/**
 * Validação segura de URL (somente http ou https)
 */
export function isValidHttpUrl(string) {
  if (!string || typeof string !== 'string') return false;
  try {
    const url = new URL(string.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Helper de contagem regressiva: identifica a próxima competição relevante
 * 1. Regional / Estadual (se ainda não ocorreu)
 * 2. Nacional (se informado e ainda não ocorreu)
 * 3. Internacional (se informado e ainda não ocorreu)
 * Se todas já ocorreram, não gera contagem regressiva negativa.
 */
export function calculateNextCompetition(season) {
  if (!season) return null;
  const now = Date.now();
  const stages = [
    { key: 'regional', label: 'Regional / Estadual', dateStr: season.regional_date || season.competition_date },
    { key: 'national', label: 'Nacional', dateStr: season.national_date },
    { key: 'international', label: 'Internacional', dateStr: season.international_date },
  ];

  const available = stages.filter(s => Boolean(s.dateStr));
  if (available.length === 0) return null;

  // 1. Procura a primeira competição futura disponível
  for (const stage of available) {
    const stageTime = new Date(stage.dateStr).getTime();
    if (stageTime > now) {
      return {
        label: stage.label,
        dateStr: stage.dateStr,
        targetTime: stageTime,
        diff: stageTime - now,
        isPassed: false
      };
    }
  }

  // 2. Se todas já ocorreram, pega a última e marca como concluída (diff = 0)
  const lastStage = available[available.length - 1];
  return {
    label: lastStage.label,
    dateStr: lastStage.dateStr,
    targetTime: new Date(lastStage.dateStr).getTime(),
    diff: 0,
    isPassed: true
  };
}

/**
 * Subcomponente de Contagem Regressiva para a próxima competição da temporada
 */
function SeasonCountdownWidget({ season }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: false, label: '' });

  useEffect(() => {
    const updateCountdown = () => {
      const nextComp = calculateNextCompetition(season);
      if (!nextComp) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: false, label: '' });
        return;
      }

      if (nextComp.isPassed) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isPassed: true,
          label: nextComp.label,
          dateStr: nextComp.dateStr
        });
        return;
      }

      const diff = nextComp.targetTime - Date.now();
      if (diff <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isPassed: true,
          label: nextComp.label,
          dateStr: nextComp.dateStr
        });
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        isPassed: false,
        label: nextComp.label,
        dateStr: nextComp.dateStr
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [season]);

  const nextComp = calculateNextCompetition(season);
  if (!nextComp) {
    return (
      <div className="bg-[#0B0B0D] border border-[#1F222B] rounded-xl p-4 text-center">
        <p className="text-xs text-[#B8BDC7]">
          Nenhuma data de competição cadastrada para contagem regressiva.
        </p>
      </div>
    );
  }

  if (timeLeft.isPassed) {
    return (
      <div className="bg-[#0B0B0D] border border-[#1F222B] rounded-xl p-4 text-center">
        <p className="text-emerald-400 font-bold text-sm">Competições Concluídas / Em Andamento</p>
        <p className="text-xs text-[#B8BDC7] mt-1">
          Última etapa: {timeLeft.label} ({timeLeft.dateStr ? new Date(timeLeft.dateStr).toLocaleDateString('pt-BR') : ''})
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-[#B8BDC7]">
        <span className="font-medium text-white flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#E10600]" />
          Próxima: {timeLeft.label}
        </span>
        <span>{timeLeft.dateStr ? new Date(timeLeft.dateStr).toLocaleDateString('pt-BR') : ''}</span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-[#0B0B0D] border border-[#1F222B] rounded-xl p-2.5">
          <p className="text-xl font-mono font-bold text-white">{timeLeft.days}</p>
          <p className="text-[10px] text-[#B8BDC7] uppercase font-semibold mt-0.5">Dias</p>
        </div>
        <div className="bg-[#0B0B0D] border border-[#1F222B] rounded-xl p-2.5">
          <p className="text-xl font-mono font-bold text-white">{timeLeft.hours}</p>
          <p className="text-[10px] text-[#B8BDC7] uppercase font-semibold mt-0.5">Horas</p>
        </div>
        <div className="bg-[#0B0B0D] border border-[#1F222B] rounded-xl p-2.5">
          <p className="text-xl font-mono font-bold text-white">{timeLeft.minutes}</p>
          <p className="text-[10px] text-[#B8BDC7] uppercase font-semibold mt-0.5">Min</p>
        </div>
        <div className="bg-[#0B0B0D] border border-[#1F222B] rounded-xl p-2.5">
          <p className="text-xl font-mono font-bold text-[#E10600]">{timeLeft.seconds}</p>
          <p className="text-[10px] text-[#B8BDC7] uppercase font-semibold mt-0.5">Seg</p>
        </div>
      </div>
    </div>
  );
}

export default function TournamentSettings() {
  const queryClient = useQueryClient();
  const savedDraft = loadAdminDraft('tournament');

  const [activeTabProgram, setActiveTabProgram] = useState('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(Boolean(savedDraft?.isOpen));
  const [editingSeasonId, setEditingSeasonId] = useState(savedDraft?.recordId || null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  const defaultFormData = {
    program: 'FRC',
    season_name: '',
    year: new Date().getFullYear(),
    kickoff_date: '',
    regional_date: '',
    national_date: '',
    international_date: '',
    robot_name: '',
    robot_weight: '',
    team_objectives: '',
    awards_targeted: [],
    important_links: [],
    custom_description: ''
  };

  const [formData, setFormData] = useState(() => ({
    ...defaultFormData,
    ...(savedDraft?.data || {})
  }));

  // Estados locais para inputs secundários do formulário
  const [newAward, setNewAward] = useState('');
  const [linkDesc, setLinkDesc] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [editingLinkIndex, setEditingLinkIndex] = useState(null);

  // Consulta de temporadas cadastradas
  const { data: seasons = [], isLoading } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => base44.entities.Season.list('-year'),
  });

  // Salva rascunho de forma transparente durante preenchimento
  useEffect(() => {
    if (isModalOpen) {
      saveAdminDraft('tournament', {
        isOpen: true,
        mode: editingSeasonId ? 'edit' : 'create',
        recordId: editingSeasonId,
        data: formData
      });
    }
  }, [isModalOpen, editingSeasonId, formData]);

  // Filtragem de temporadas pela modalidade selecionada
  const filteredSeasons = useMemo(() => {
    if (activeTabProgram === 'TODOS') return seasons;
    return seasons.filter(s => (s.program || 'FRC') === activeTabProgram);
  }, [seasons, activeTabProgram]);

  // Temporada ativa (mais recente por ano)
  const activeSeason = seasons && seasons.length > 0 ? seasons[0] : null;

  // Abertura do modal para CREATE
  const handleOpenCreateModal = () => {
    setEditingSeasonId(null);
    setFormData({
      ...defaultFormData,
      program: activeTabProgram !== 'TODOS' ? activeTabProgram : 'FRC',
      year: new Date().getFullYear()
    });
    setNewAward('');
    setLinkDesc('');
    setLinkUrl('');
    setEditingLinkIndex(null);
    setIsModalOpen(true);
  };

  // Abertura do modal para EDIT
  const handleOpenEditModal = (season) => {
    setEditingSeasonId(season.id);

    // Recupera links importantes existentes com fallback retrocompatível de manuais legados
    let links = Array.isArray(season.important_links) ? [...season.important_links] : [];
    if (links.length === 0) {
      if (season.game_manual_a) {
        links.push({ description: 'Game Manual (Parte 1)', url: season.game_manual_a });
      }
      if (season.game_manual_b) {
        links.push({ description: 'Game Manual (Parte 2)', url: season.game_manual_b });
      }
    }

    setFormData({
      program: season.program || 'FRC',
      season_name: season.season_name || season.theme || '',
      year: season.year || new Date().getFullYear(),
      kickoff_date: season.kickoff_date ? season.kickoff_date.split('T')[0] : '',
      regional_date: season.regional_date ? season.regional_date.split('T')[0] : (season.competition_date ? season.competition_date.split('T')[0] : ''),
      national_date: season.national_date ? season.national_date.split('T')[0] : '',
      international_date: season.international_date ? season.international_date.split('T')[0] : '',
      robot_name: season.robot_name || '',
      robot_weight: (season.robot_weight !== undefined && season.robot_weight !== null) ? String(season.robot_weight) : '',
      team_objectives: season.team_objectives || '',
      awards_targeted: Array.isArray(season.awards_targeted) ? [...season.awards_targeted] : [],
      important_links: links,
      custom_description: season.custom_description || (season.description && !season.description.startsWith('{') ? season.description : '')
    });

    setNewAward('');
    setLinkDesc('');
    setLinkUrl('');
    setEditingLinkIndex(null);
    setIsModalOpen(true);
  };

  // Fechamento manual com cancelamento
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSeasonId(null);
    clearAdminDraft('tournament');
  };

  // Mutação para Salvar (CREATE ou UPDATE)
  const saveSeasonMutation = useMutation({
    mutationFn: async (dataToSave) => {
      const isUpdate = Boolean(editingSeasonId);

      const payload = {
        program: dataToSave.program || 'FRC',
        season_name: dataToSave.season_name.trim(),
        theme: dataToSave.season_name.trim(),
        game_name: dataToSave.season_name.trim(),
        year: parseInt(dataToSave.year, 10),
        kickoff_date: dataToSave.kickoff_date || null,
        regional_date: dataToSave.regional_date || null,
        national_date: dataToSave.national_date || null,
        international_date: dataToSave.international_date || null,
        competition_date: dataToSave.regional_date || dataToSave.national_date || dataToSave.international_date || null,
        robot_name: dataToSave.robot_name ? dataToSave.robot_name.trim() : '',
        robot_weight: (dataToSave.robot_weight !== '' && dataToSave.robot_weight !== null) ? parseFloat(dataToSave.robot_weight) : null,
        team_objectives: dataToSave.team_objectives ? dataToSave.team_objectives.trim() : '',
        awards_targeted: Array.isArray(dataToSave.awards_targeted) ? dataToSave.awards_targeted : [],
        important_links: Array.isArray(dataToSave.important_links) ? dataToSave.important_links : [],
        custom_description: dataToSave.custom_description ? dataToSave.custom_description.trim() : ''
      };

      if (isUpdate) {
        return await base44.entities.Season.update(editingSeasonId, payload);
      } else {
        return await base44.entities.Season.create(payload);
      }
    },
    onSuccess: (savedRecord) => {
      // Somente limpa o rascunho após confirmação bem-sucedida do Supabase
      clearAdminDraft('tournament');
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      setIsModalOpen(false);
      setEditingSeasonId(null);
      toast.success(
        editingSeasonId
          ? 'Temporada atualizada com sucesso!'
          : 'Nova temporada cadastrada com sucesso!'
      );
    },
    onError: (err) => {
      console.error('[TournamentSettings] Erro ao salvar temporada:', err);
      // O rascunho e os dados do formulário permanecem intactos para o usuário não perder dados
      const msg = err?.message || 'Verifique sua conexão e privilégios de administrador.';
      if (msg.includes('unique') || msg.includes('23505') || msg.includes('seasons_year_key')) {
        toast.error('Já existe uma temporada cadastrada para este ano. Se desejar alterar, edite o registro correspondente.');
      } else {
        toast.error('Falha ao salvar temporada: ' + msg);
      }
    }
  });

  // Mutação para Excluir temporada
  const deleteSeasonMutation = useMutation({
    mutationFn: async (seasonId) => {
      return await base44.entities.Season.delete(seasonId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      setDeleteCandidate(null);
      toast.success('Temporada excluída com sucesso.');
    },
    onError: (err) => {
      console.error('[TournamentSettings] Erro ao excluir temporada:', err);
      toast.error('Falha ao excluir temporada: ' + (err.message || 'Verifique as permissões.'));
    }
  });

  // Manipulação de Prêmios Almejados
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

  // Manipulação de Links Importantes
  const handleSaveLink = () => {
    const desc = linkDesc.trim();
    const url = linkUrl.trim();

    if (!desc) {
      toast.error('A descrição do link é obrigatória.');
      return;
    }

    if (!isValidHttpUrl(url)) {
      toast.error('Informe uma URL válida começando com http:// ou https://');
      return;
    }

    if (editingLinkIndex !== null) {
      // Edição de link existente
      setFormData(prev => {
        const nextLinks = [...(prev.important_links || [])];
        nextLinks[editingLinkIndex] = { description: desc, url };
        return { ...prev, important_links: nextLinks };
      });
      setEditingLinkIndex(null);
      toast.success('Link atualizado na lista.');
    } else {
      // Adição de novo link
      setFormData(prev => ({
        ...prev,
        important_links: [...(prev.important_links || []), { description: desc, url }]
      }));
      toast.success('Link adicionado à lista.');
    }

    setLinkDesc('');
    setLinkUrl('');
  };

  const handleEditLink = (index) => {
    const targetLink = formData.important_links[index];
    if (!targetLink) return;
    setLinkDesc(targetLink.description || '');
    setLinkUrl(targetLink.url || '');
    setEditingLinkIndex(index);
  };

  const handleCancelEditLink = () => {
    setLinkDesc('');
    setLinkUrl('');
    setEditingLinkIndex(null);
  };

  const handleRemoveLink = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      important_links: (prev.important_links || []).filter((_, idx) => idx !== indexToRemove)
    }));
    if (editingLinkIndex === indexToRemove) {
      handleCancelEditLink();
    }
  };

  // Submissão do Formulário
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.program) {
      toast.error('Selecione a modalidade / programa da temporada.');
      return;
    }

    if (!formData.season_name?.trim()) {
      toast.error('O campo "Temporada / Desafio" é obrigatório.');
      return;
    }

    const parsedYear = parseInt(formData.year, 10);
    if (!parsedYear || isNaN(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
      toast.error('Informe um ano válido para a temporada (ex: 2026).');
      return;
    }

    // Validação de unicidade no par (program, year)
    const targetProg = (formData.program || 'FRC').trim().toUpperCase();
    const duplicate = seasons.find(
      s => (s.program || 'FRC').toUpperCase() === targetProg &&
           Number(s.year) === parsedYear &&
           s.id !== editingSeasonId
    );
    if (duplicate) {
      toast.error(`Já existe uma temporada cadastrada para ${targetProg} no ano ${parsedYear}. Para alterá-la, edite o registro correspondente.`);
      return;
    }

    saveSeasonMutation.mutate(formData);
  };

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
            Gerencie as modalidades (OBR, FLL, FTC, FRC), metas, etapas competitivas e manuais oficiais.
          </p>
        </div>

        <Button
          onClick={handleOpenCreateModal}
          className="bg-[#E10600] hover:bg-[#E10600]/90 text-white font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Cadastrar Nova Temporada
        </Button>
      </div>

      {/* Seletor de Modalidades / Abas */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#1F222B] pb-3">
        {['TODOS', ...PROGRAM_OPTIONS].map(prog => (
          <button
            key={prog}
            onClick={() => setActiveTabProgram(prog)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTabProgram === prog
                ? 'bg-[#E10600] text-white shadow-lg shadow-[#E10600]/20'
                : 'bg-[#111217] text-[#B8BDC7] hover:text-white hover:bg-[#1F222B] border border-[#1F222B]'
            }`}
          >
            {prog === 'TODOS' ? 'Todas as Modalidades' : prog}
          </button>
        ))}
      </div>

      {/* Lista de Temporadas Cadastradas */}
      {filteredSeasons.length === 0 ? (
        <div className="text-center py-16 bg-[#111217] border border-[#1F222B] rounded-2xl p-8">
          <Trophy className="w-12 h-12 text-[#1F222B] mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">
            {activeTabProgram === 'TODOS'
              ? 'Nenhuma temporada cadastrada'
              : `Nenhuma temporada cadastrada para ${activeTabProgram}`}
          </h3>
          <p className="text-sm text-[#B8BDC7] mb-4">
            Cadastre a temporada para configurar as datas das competições, metas do robô e manuais.
          </p>
          <Button onClick={handleOpenCreateModal} className="bg-[#E10600] hover:bg-[#E10600]/90 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Cadastrar Temporada Agora
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredSeasons.map((season) => {
            const prog = season.program || 'FRC';
            const badgeStyle = PROGRAM_BADGE_STYLES[prog] || PROGRAM_BADGE_STYLES.FRC;
            const importantLinks = Array.isArray(season.important_links) ? season.important_links : [];

            return (
              <div 
                key={season.id}
                className="bg-[#111217] border border-[#1F222B] rounded-2xl p-6 relative overflow-hidden transition-all hover:border-[#2A2E3B]"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#E10600]/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  {/* Informações Principais da Temporada */}
                  <div className="space-y-4 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border ${badgeStyle}`}>
                        {prog}
                      </span>
                      <span className="text-xs font-mono font-bold text-white bg-[#1F222B] px-2.5 py-0.5 rounded border border-[#2A2E3B]">
                        {season.year}
                      </span>
                      {activeSeason?.id === season.id && (
                        <Badge variant="success">Mais Recente</Badge>
                      )}
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold text-white">
                        {season.season_name || season.theme || 'Temporada Sem Nome'}
                      </h3>
                      {season.game_name && season.game_name !== (season.season_name || season.theme) && (
                        <p className="text-sm text-[#B8BDC7] mt-0.5">
                          Desafio: <strong className="text-white">{season.game_name}</strong>
                        </p>
                      )}
                    </div>

                    {/* Grade de Calendário e Robô */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 my-2 border-y border-[#1F222B]">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-[#B8BDC7]">Lançamento</p>
                        <p className="text-xs font-semibold text-white mt-1">
                          {season.kickoff_date ? new Date(season.kickoff_date).toLocaleDateString('pt-BR') : 'Não definido'}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-[#B8BDC7]">Regional / Estadual</p>
                        <p className="text-xs font-semibold text-white mt-1">
                          {season.regional_date ? new Date(season.regional_date).toLocaleDateString('pt-BR') : (season.competition_date ? new Date(season.competition_date).toLocaleDateString('pt-BR') : 'Não definido')}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-[#B8BDC7]">Nacional</p>
                        <p className="text-xs font-semibold text-white mt-1">
                          {season.national_date ? new Date(season.national_date).toLocaleDateString('pt-BR') : 'Não definido'}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-[#B8BDC7]">Internacional</p>
                        <p className="text-xs font-semibold text-white mt-1">
                          {season.international_date ? new Date(season.international_date).toLocaleDateString('pt-BR') : 'Não definido'}
                        </p>
                      </div>
                    </div>

                    {/* Dados do Robô */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#B8BDC7]">
                      <span className="flex items-center gap-1.5 text-white">
                        <Bot className="w-3.5 h-3.5 text-[#E10600]" />
                        Robô: <strong className="text-white">{season.robot_name || 'Em projeto'}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Peso: <strong className="text-white">{(season.robot_weight !== undefined && season.robot_weight !== null && season.robot_weight !== '') ? `${season.robot_weight} kg` : 'Não definido'}</strong>
                      </span>
                    </div>

                    {/* Objetivos da Equipe */}
                    {season.team_objectives && (
                      <div className="bg-[#0B0B0D] p-3 rounded-lg border border-[#1F222B] text-xs">
                        <p className="text-[10px] font-semibold text-[#B8BDC7] uppercase tracking-wider mb-1">
                          Objetivos da Equipe
                        </p>
                        <p className="text-zinc-300 leading-relaxed">
                          {season.team_objectives}
                        </p>
                      </div>
                    )}

                    {/* Prêmios Almejados */}
                    {Array.isArray(season.awards_targeted) && season.awards_targeted.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold text-[#B8BDC7] uppercase tracking-wider flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-[#E10600]" />
                          Prêmios Almejados
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {season.awards_targeted.map((award, i) => (
                            <span 
                              key={i} 
                              className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E10600]/10 border border-[#E10600]/30 text-white flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3 text-[#E10600]" />
                              {award}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Links Importantes Cadastrados */}
                    {importantLinks.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-[#1F222B]">
                        <p className="text-[10px] font-semibold text-[#B8BDC7] uppercase tracking-wider flex items-center gap-1.5">
                          <LinkIcon className="w-3.5 h-3.5 text-[#E10600]" />
                          Links Importantes & Manuais
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {importantLinks.map((link, idx) => (
                            <a
                              key={idx}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => {
                                e.preventDefault();
                                window.open(link.url, '_blank', 'noopener,noreferrer');
                              }}
                              className="inline-flex items-center gap-1 text-xs text-[#E10600] hover:underline bg-[#0B0B0D] px-2.5 py-1 rounded-md border border-[#1F222B] cursor-pointer"
                            >
                              <FileText className="w-3 h-3" />
                              {link.description}
                              <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-70" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notas Técnicas Adicionais */}
                    {season.custom_description && (
                      <div className="text-xs text-zinc-400 italic bg-[#0B0B0D]/60 p-2.5 rounded-lg border border-[#1F222B]">
                        Nota: {season.custom_description}
                      </div>
                    )}
                  </div>

                  {/* Coluna Lateral: Countdown + Ações */}
                  <div className="w-full lg:w-72 shrink-0 space-y-4">
                    {/* Widget Countdown */}
                    <SeasonCountdownWidget season={season} />

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleOpenEditModal(season)}
                        className="flex-1 bg-white text-zinc-900 hover:bg-zinc-100 hover:text-black text-xs font-semibold"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                        Editar Temporada
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteCandidate(season)}
                        className="border-[#1F222B] text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Completo de Edição / Criação da Temporada */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) handleCloseModal(); }}>
        <DialogContent className="bg-[#111217] border-[#1F222B] max-w-3xl max-h-[90vh] overflow-y-auto text-white p-6 sm:p-8">
          <DialogHeader className="border-b border-[#1F222B] pb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <Trophy className="w-5 h-5 text-[#E10600]" />
              {editingSeasonId ? 'Editar Configurações da Temporada' : 'Cadastrar Nova Temporada'}
            </DialogTitle>
            <DialogDescription className="text-sm text-[#B8BDC7]">
              Preencha os dados oficiais de modalidade, calendário e robô. As informações alimentam a área interna e contagens regressivas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            {/* SEÇÃO 1: DADOS DA TEMPORADA */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#E10600] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Dados da Temporada
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* PROGRAMA / MODALIDADE */}
                <div>
                  <Label className="text-xs font-medium text-white mb-1.5 block">
                    Programa / Modalidade *
                  </Label>
                  <Select
                    value={formData.program}
                    onValueChange={(val) => setFormData({ ...formData, program: val })}
                  >
                    <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B] text-white">
                      <SelectValue placeholder="Selecione o programa" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111217] border-[#1F222B] text-white">
                      {PROGRAM_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt} className="focus:bg-[#1F222B]">
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* TEMPORADA / DESAFIO */}
                <div className="sm:col-span-2">
                  <Label className="text-xs font-medium text-white mb-1.5 block">
                    Temporada / Desafio *
                  </Label>
                  <Input
                    value={formData.season_name}
                    onChange={(e) => setFormData({ ...formData, season_name: e.target.value })}
                    placeholder="Ex: 2026 REBUILT, FIRST AGE 2025-2026, OBR 2026"
                    className="bg-[#0B0B0D] border-[#1F222B] text-white"
                    required
                  />
                </div>
              </div>

              {/* ANO */}
              <div className="w-full sm:w-1/3">
                <Label className="text-xs font-medium text-white mb-1.5 block">
                  Ano *
                </Label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  placeholder="2026"
                  className="bg-[#0B0B0D] border-[#1F222B] text-white"
                  required
                />
              </div>
            </div>

            {/* SEÇÃO 2: CALENDÁRIO */}
            <div className="space-y-3 pt-3 border-t border-[#1F222B]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#E10600] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Calendário
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs font-medium text-white mb-1.5 block">Data do Lançamento</Label>
                  <Input
                    type="date"
                    value={formData.kickoff_date}
                    onChange={(e) => setFormData({ ...formData, kickoff_date: e.target.value })}
                    className="bg-[#0B0B0D] border-[#1F222B] text-white text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium text-white mb-1.5 block">Data do Regional / Estadual</Label>
                  <Input
                    type="date"
                    value={formData.regional_date}
                    onChange={(e) => setFormData({ ...formData, regional_date: e.target.value })}
                    className="bg-[#0B0B0D] border-[#1F222B] text-white text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium text-white mb-1.5 block">Data do Nacional</Label>
                  <Input
                    type="date"
                    value={formData.national_date}
                    onChange={(e) => setFormData({ ...formData, national_date: e.target.value })}
                    className="bg-[#0B0B0D] border-[#1F222B] text-white text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium text-white mb-1.5 block">Data do Internacional</Label>
                  <Input
                    type="date"
                    value={formData.international_date}
                    onChange={(e) => setFormData({ ...formData, international_date: e.target.value })}
                    className="bg-[#0B0B0D] border-[#1F222B] text-white text-xs"
                  />
                </div>
              </div>
              <p className="text-[11px] text-[#B8BDC7]">
                * Datas de competição são opcionais. A contagem regressiva utilizará a próxima data futura informada.
              </p>
            </div>

            {/* SEÇÃO 3: DADOS DO ROBÔ */}
            <div className="space-y-3 pt-3 border-t border-[#1F222B]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#E10600] flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5" />
                Robô
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-white mb-1.5 block">Nome do Robô</Label>
                  <Input
                    value={formData.robot_name}
                    onChange={(e) => setFormData({ ...formData, robot_name: e.target.value })}
                    placeholder="Ex: Cerberus v3, Titan..."
                    className="bg-[#0B0B0D] border-[#1F222B] text-white"
                  />
                </div>

                <div>
                  <Label className="text-xs font-medium text-white mb-1.5 block">Peso do Robô (kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.robot_weight}
                    onChange={(e) => setFormData({ ...formData, robot_weight: e.target.value })}
                    placeholder="Ex: 54.5"
                    className="bg-[#0B0B0D] border-[#1F222B] text-white"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 4: PLANEJAMENTO (OBJETIVOS E PRÊMIOS) */}
            <div className="space-y-4 pt-3 border-t border-[#1F222B]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#E10600] flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" />
                Planejamento
              </h4>

              <div>
                <Label className="text-xs font-medium text-white mb-1.5 block">Objetivos da Equipe</Label>
                <Textarea
                  value={formData.team_objectives}
                  onChange={(e) => setFormData({ ...formData, team_objectives: e.target.value })}
                  placeholder="Ex: Conquistar o Prêmio Impacto, alcançar alianças finais do Regional..."
                  rows={2}
                  className="bg-[#0B0B0D] border-[#1F222B] text-white resize-none text-xs"
                />
              </div>

              {/* Prêmios Almejados com botão estilizado e acessível */}
              <div>
                <Label className="text-xs font-medium text-white mb-1.5 block">Prêmios Almejados</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newAward}
                    onChange={(e) => setNewAward(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAward(); } }}
                    placeholder="Ex: Impact Award, Engineering Inspiration, Dean's List..."
                    className="bg-[#0B0B0D] border-[#1F222B] text-white text-xs"
                    aria-label="Digitar prêmio almejado"
                  />
                  <Button
                    type="button"
                    onClick={handleAddAward}
                    className="bg-[#1F222B] hover:bg-[#2A2E3B] text-white border border-[#2A2E3B] shrink-0 text-xs px-3"
                    aria-label="Adicionar prêmio almejado"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Adicionar
                  </Button>
                </div>

                {formData.awards_targeted?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2.5 bg-[#0B0B0D] border border-[#1F222B] rounded-lg">
                    {formData.awards_targeted.map((award, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded bg-[#111217] border border-[#1F222B] text-xs text-white flex items-center gap-1.5"
                      >
                        {award}
                        <button
                          type="button"
                          onClick={() => handleRemoveAward(idx)}
                          className="text-red-400 hover:text-red-300 ml-1 text-sm leading-none font-bold"
                          title="Remover prêmio"
                          aria-label={`Remover ${award}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SEÇÃO 5: LINKS IMPORTANTES (MANUAIS E OUTROS) */}
            <div className="space-y-4 pt-3 border-t border-[#1F222B]">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#E10600] flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5" />
                  Links Importantes (Manuais e outros)
                </h4>
                {editingLinkIndex !== null && (
                  <span className="text-[11px] text-amber-400">Editando link existente</span>
                )}
              </div>

              {/* Formulário de Adicionar / Editar Link */}
              <div className="bg-[#0B0B0D] p-3 rounded-xl border border-[#1F222B] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-white mb-1 block">Descrição do Link</Label>
                    <Input
                      value={linkDesc}
                      onChange={(e) => setLinkDesc(e.target.value)}
                      placeholder="Ex: Game Manual Parte 1, Regulamento..."
                      className="bg-[#111217] border-[#1F222B] text-white text-xs"
                      aria-label="Descrição do link"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-white mb-1 block">URL (Link)</Label>
                    <Input
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="bg-[#111217] border-[#1F222B] text-white text-xs"
                      aria-label="URL do link"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  {editingLinkIndex !== null && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEditLink}
                      className="border-[#1F222B] text-[#B8BDC7] text-xs h-8"
                    >
                      Cancelar Edição
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveLink}
                    className="bg-[#E10600] hover:bg-[#E10600]/90 text-white text-xs h-8"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    {editingLinkIndex !== null ? 'Salvar Alteração do Link' : 'Adicionar Link'}
                  </Button>
                </div>
              </div>

              {/* Lista de Links Cadastrados */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-[#B8BDC7]">Links cadastrados:</p>
                {(!formData.important_links || formData.important_links.length === 0) ? (
                  <p className="text-xs text-zinc-500 italic p-3 bg-[#0B0B0D] border border-[#1F222B] rounded-lg">
                    Nenhum link adicionado. Adicione manuais, regulamentos ou sites oficiais da temporada acima.
                  </p>
                ) : (
                  <div className="divide-y divide-[#1F222B] bg-[#0B0B0D] border border-[#1F222B] rounded-xl overflow-hidden">
                    {formData.important_links.map((link, idx) => (
                      <div 
                        key={idx} 
                        className="p-3 flex items-center justify-between gap-3 hover:bg-[#111217] transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              e.preventDefault();
                              window.open(link.url, '_blank', 'noopener,noreferrer');
                            }}
                            className="text-white hover:text-[#E10600] text-xs font-semibold flex items-center gap-1.5 truncate group cursor-pointer"
                            title={`Abrir ${link.url} em nova aba`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#E10600]" />
                            <span className="truncate underline decoration-zinc-700 group-hover:decoration-[#E10600]">{link.description}</span>
                            <ExternalLink className="w-3 h-3 text-[#B8BDC7] group-hover:text-[#E10600] shrink-0" />
                          </a>
                          <span className="text-[10px] text-[#B8BDC7] truncate block mt-0.5 opacity-80">
                            {link.url}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditLink(idx)}
                            className="text-zinc-300 hover:text-white hover:bg-[#1F222B] text-xs h-7 px-2"
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Editar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveLink(idx)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs h-7 px-2"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Remover
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SEÇÃO 6: NOTAS TÉCNICAS */}
            <div className="space-y-3 pt-3 border-t border-[#1F222B]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#E10600] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Notas Técnicas Adicionais
              </h4>

              <div>
                <Textarea
                  value={formData.custom_description}
                  onChange={(e) => setFormData({ ...formData, custom_description: e.target.value })}
                  placeholder="Observações complementares, lembretes de engenharia ou regras especiais..."
                  rows={2}
                  className="bg-[#0B0B0D] border-[#1F222B] text-white resize-none text-xs"
                />
              </div>
            </div>

            {/* BOTÕES DE AÇÃO DO FORMULÁRIO */}
            <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-[#1F222B]">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
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

      {/* Modal de Confirmação para Excluir Temporada */}
      <Dialog open={Boolean(deleteCandidate)} onOpenChange={(open) => { if (!open) setDeleteCandidate(null); }}>
        <DialogContent className="bg-[#111217] border-[#1F222B] max-w-md text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              Excluir Temporada
            </DialogTitle>
            <DialogDescription className="text-sm text-[#B8BDC7]">
              Tem certeza que deseja excluir a temporada <strong className="text-white">"{deleteCandidate?.season_name || deleteCandidate?.theme}"</strong> ({deleteCandidate?.program} {deleteCandidate?.year})? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteCandidate(null)}
              disabled={deleteSeasonMutation.isPending}
              className="border-[#1F222B] text-[#B8BDC7] hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => deleteSeasonMutation.mutate(deleteCandidate.id)}
              disabled={deleteSeasonMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteSeasonMutation.isPending ? 'Excluindo...' : 'Confirmar Exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
