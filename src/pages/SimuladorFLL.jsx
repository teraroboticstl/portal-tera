import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bookmark,
  Share2,
  Check,
  AlertTriangle,
  Copy,
  ExternalLink,
  Trash2,
  BookOpen,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from '@/components/ui/use-toast';
import BioglowScoreHeader from '@/components/fll/BioglowScoreHeader';
import BioglowMissionCard from '@/components/fll/BioglowMissionCard';
import {
  BioglowToggle,
  BioglowRadioGroup,
  BioglowCounter
} from '@/components/fll/BioglowControls';
import {
  INITIAL_ROUND_STATE,
  calculateScores,
  MAX_POSSIBLE_SCORE,
  PRECISION_TABLE,
  encodeRoundState,
  decodeRoundState
} from '@/lib/fllBioglowRules';
import { fetchActiveFllSeason } from '@/api/fllSeasonClient';

const STORAGE_KEY_CURRENT = 'fll_bioglow_current_state';
const STORAGE_KEY_SAVED = 'fll_bioglow_saved_rounds';

export default function SimuladorFLL() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSeason, setActiveSeason] = useState({
    theme: 'BIOGLOW',
    year: 2026,
    season_name: 'BIOGLOW 2026–2027'
  });
  const [missionImages, setMissionImages] = useState({});
  const [showCriteriaTable, setShowCriteriaTable] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);

  // Carrega as imagens persistidas das missões e temporada ativa (Google Drive / Supabase)
  useEffect(() => {
    let isMounted = true;
    fetchActiveFllSeason().then((seasonData) => {
      if (isMounted && seasonData) {
        setActiveSeason({
          id: seasonData.id,
          theme: seasonData.theme || 'BIOGLOW',
          year: seasonData.year || 2026,
          season_name: seasonData.season_name || 'BIOGLOW 2026–2027'
        });
        if (seasonData.fll_missions) {
          setMissionImages(seasonData.fll_missions);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Estado do formulário da rodada
  const [state, setState] = useState(() => {
    // 1. Tenta carregar via query param ?state=...
    const urlEncoded = searchParams.get('state');
    if (urlEncoded) {
      const decoded = decodeRoundState(urlEncoded);
      return decoded;
    }
    // 2. Tenta carregar do localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return { ...INITIAL_ROUND_STATE };
  });

  // Lista de rounds salvos no navegador
  const [savedRounds, setSavedRounds] = useState(() => {
    try {
      const list = localStorage.getItem(STORAGE_KEY_SAVED);
      return list ? JSON.parse(list) : [];
    } catch {
      return [];
    }
  });

  // Modais
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Cálculo reativo de pontuação
  const { total, breakdown } = calculateScores(state);

  // Sincroniza estado atual no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  // Sincroniza lista de rounds salvos
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(savedRounds));
    } catch {
      // ignore
    }
  }, [savedRounds]);

  const updateField = (key, value) => {
    setState(prev => {
      const next = { ...prev, [key]: value };

      // Validações contextuais de dependência imediata
      if (key === 'm01_droneLaunched' && !value) {
        next.m01_lidarBonus = false;
      }
      if (key === 'm03_flagDown' && !value) {
        next.m03_rockResetBonus = false;
      }
      if (key === 'm06_antInNest' && !value) {
        next.m06_leafFragments = 0;
      }
      if (key === 'm07_myceliumExtended' && !value) {
        next.m07_connections = 0;
      }
      if (key === 'm14_seedsInStation') {
        if (next.m14_seedsTouchingMat > value) {
          next.m14_seedsTouchingMat = value;
        }
      }
      return next;
    });
  };

  const handleReset = () => {
    setState({ ...INITIAL_ROUND_STATE });
    setShowResetConfirm(false);
    setResetTrigger(prev => prev + 1);
    toast({
      title: "Simulação reiniciada",
      description: "Todas as missões e o cronômetro foram redefinidos para os valores iniciais."
    });
  };

  const handleSaveRound = () => {
    const newEntry = {
      id: Date.now().toString(),
      savedAt: new Date().toISOString(),
      teamName: state.teamName || 'Equipe sem nome',
      roundName: state.roundName || 'Round 1',
      score: total,
      stateSnapshot: { ...state }
    };

    setSavedRounds(prev => [newEntry, ...prev.slice(0, 19)]);
    toast({
      title: "Round salvo com sucesso!",
      description: `${newEntry.teamName} - ${newEntry.roundName}: ${total} pontos gravados no navegador.`
    });
  };

  const handleLoadRound = (savedItem) => {
    setState({ ...savedItem.stateSnapshot });
    toast({
      title: "Round carregado",
      description: `Restaurada pontuação de ${savedItem.score} pts (${savedItem.teamName}).`
    });
  };

  const handleDeleteSavedRound = (id) => {
    setSavedRounds(prev => prev.filter(item => item.id !== id));
  };

  // Geração de link e texto de compartilhamento
  const encodedState = encodeRoundState(state);
  const shareableUrl = `${window.location.origin}/SimuladorFLL?state=${encodedState}`;

  const generateSummaryText = () => {
    const active = [];
    if (breakdown.inspection > 0) active.push(`• Inspeção: ${breakdown.inspection} pts`);
    if (breakdown.m01 > 0) active.push(`• M01 Drone Survey: ${breakdown.m01} pts`);
    if (breakdown.m02 > 0) active.push(`• M02 Exploding Seeds: ${breakdown.m02} pts`);
    if (breakdown.m03 > 0) active.push(`• M03 Flip the Rock: ${breakdown.m03} pts`);
    if (breakdown.m04 > 0) active.push(`• M04 Lucky Leaves: ${breakdown.m04} pts`);
    if (breakdown.m05 > 0) active.push(`• M05 Reaching Roots: ${breakdown.m05} pts`);
    if (breakdown.m06 > 0) active.push(`• M06 Leafcutter Frenzy: ${breakdown.m06} pts`);
    if (breakdown.m07 > 0) active.push(`• M07 Humongous Fungus: ${breakdown.m07} pts`);
    if (breakdown.m08 > 0) active.push(`• M08 Tangled: ${breakdown.m08} pts`);
    if (breakdown.m09 > 0) active.push(`• M09 Research Platform: ${breakdown.m09} pts`);
    if (breakdown.m10 > 0) active.push(`• M10 Fragile Microhabitats: ${breakdown.m10} pts`);
    if (breakdown.m11 > 0) active.push(`• M11 Window to the Past: ${breakdown.m11} pts`);
    if (breakdown.m12 > 0) active.push(`• M12 Forest Elder: ${breakdown.m12} pts`);
    if (breakdown.m13 > 0) active.push(`• M13 Keystone Species: ${breakdown.m13} pts`);
    if (breakdown.m14 > 0) active.push(`• M14 Seeds of Renewal: ${breakdown.m14} pts`);
    if (breakdown.m15 > 0) active.push(`• M15 Biocentric Architecture: ${breakdown.m15} pts`);
    if (breakdown.m16 > 0) active.push(`• M16 Fichas de Precisão (${state.m16_precisionTokens} un): ${breakdown.m16} pts`);

    return `🏆 FLL BIOGLOW 2026-2027 | Simulador de Round\n` +
      `Equipe: ${state.teamName || 'Não informada'}\n` +
      `Identificação: ${state.roundName || 'Treino'}\n` +
      `Placar Total: ${total} / ${MAX_POSSIBLE_SCORE} pontos\n\n` +
      `Missões pontuadas:\n` +
      (active.length > 0 ? active.join('\n') : 'Nenhuma missão pontuada.') +
      `\n\nSimulado no Portal Tera:\n${shareableUrl}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
      toast({ title: "Link copiado!", description: "URL gerada com a pontuação e opções salvas." });
    } catch {
      toast({ title: "Erro ao copiar", description: "Copie manualmente da barra de endereço.", variant: "destructive" });
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generateSummaryText());
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
      toast({ title: "Resumo copiado!", description: "Pronto para colar no WhatsApp ou Discord." });
    } catch {
      toast({ title: "Erro ao copiar", description: "Tente novamente.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white selection:bg-[#E10600] selection:text-white">
      {/* Barra de Placar, Controles e Cronômetro Fixa no Topo */}
      <BioglowScoreHeader
        score={total}
        seasonTheme={activeSeason.theme}
        resetTrigger={resetTrigger}
        onResetClick={() => setShowResetConfirm(true)}
        onSaveClick={handleSaveRound}
        onShareClick={() => setShowShareModal(true)}
      />

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 space-y-6">

        {/* Identificação da Equipe e Round (Opcional) */}
        <section className="bg-[#111217] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1">
              <label htmlFor="team-name" className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider font-mono">
                Nome ou Número da Equipe (Opcional)
              </label>
              <input
                id="team-name"
                type="text"
                placeholder="Ex: Tera Robotics 5532"
                value={state.teamName}
                onChange={(e) => updateField('teamName', e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-black/40 border border-white/15 focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] text-sm text-white placeholder-gray-500 transition-all outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="round-name" className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider font-mono">
                Identificação do Round (Opcional)
              </label>
              <input
                id="round-name"
                type="text"
                placeholder="Ex: Treino 1, Round Oficial 2"
                value={state.roundName}
                onChange={(e) => updateField('roundName', e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-black/40 border border-white/15 focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] text-sm text-white placeholder-gray-500 transition-all outline-none"
              />
            </div>
          </div>
        </section>

        {/* Grade de Missões */}
        <section className="space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Missões do Robot Game
              </h2>
              <p className="text-xs sm:text-sm text-gray-400">
                Inspeção do Robô, M01 a M15 e Fichas de Precisão M16
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Inspeção do Robô */}
            <BioglowMissionCard
              code="INSPEÇÃO"
              title="Inspeção do Robô"
              subtotal={breakdown.inspection}
              maxPoints={20}
              imageUrl={missionImages['INSPEÇÃO']?.imageUrl}
              imageAlt={missionImages['INSPEÇÃO']?.imageAlt}
              description="Avaliação de tamanho do robô e acessórios antes do início da partida."
              requirements={[
                "Todo o Robô (robô, anexos, garras e peças adicionais) cabe completamente dentro do espaço pequeno de inspeção (Small Inspection Area)."
              ]}
              restrictions={[
                "A verificação ocorre antes do início dos 2min30s da partida."
              ]}
            >
              <BioglowToggle
                label="Todo o Robô (robô, anexos, garras e peças adicionais) coube na área pequena de inspeção"
                checked={state.inspectionSmallArea}
                onChange={(val) => updateField('inspectionSmallArea', val)}
                pointsText="+20 pts"
              />
            </BioglowMissionCard>

            {/* M01 Drone Survey */}
            <BioglowMissionCard
              code="M01"
              title="Levantamento por Drone (Drone Survey)"
              subtotal={breakdown.m01}
              maxPoints={30}
              imageUrl={missionImages['M01']?.imageUrl}
              imageAlt={missionImages['M01']?.imageAlt}
              description="Lançar o drone de monitoramento da copa da floresta e acionar o mapa LiDAR."
              requirements={[
                "O drone não está mais tocando o tapete da competição: 20 pts."
              ]}
              bonuses={[
                "O mapa LiDAR está completamente virado e seu marcador de varredura está pelo menos parcialmente dentro da área de levantamento: +10 pts."
              ]}
              restrictions={[
                "O bônus do mapa LiDAR requer que o drone tenha sido decolado."
              ]}
            >
              <BioglowToggle
                label="O drone não está mais tocando o tapete"
                checked={state.m01_droneLaunched}
                onChange={(val) => updateField('m01_droneLaunched', val)}
                pointsText="+20 pts"
              />
              <BioglowToggle
                label="Mapa LiDAR virado com marcador na área de levantamento"
                checked={state.m01_lidarBonus}
                disabled={!state.m01_droneLaunched}
                disabledReason="Requer que o drone tenha sido lançado (sem tocar o tapete)."
                onChange={(val) => updateField('m01_lidarBonus', val)}
                pointsText="+10 pts (Bônus)"
              />
            </BioglowMissionCard>

            {/* M02 Exploding Seeds */}
            <BioglowMissionCard
              code="M02"
              title="Sementes Explosivas (Exploding Seeds)"
              subtotal={breakdown.m02}
              maxPoints={30}
              imageUrl={missionImages['M02']?.imageUrl}
              imageAlt={missionImages['M02']?.imageAlt}
              description="Liberar as sementes da haste seca para dispersão natural."
              requirements={[
                "10 pontos para cada semente que não estiver mais tocando a haste modelo ao término da partida."
              ]}
            >
              <BioglowCounter
                label="Sementes liberadas da haste"
                value={state.m02_seedsReleased}
                min={0}
                max={3}
                pointsPerUnit={10}
                unitLabel="sementes"
                onChange={(val) => updateField('m02_seedsReleased', val)}
              />
            </BioglowMissionCard>

            {/* M03 Flip the Rock */}
            <BioglowMissionCard
              code="M03"
              title="Virar a Rocha (Flip the Rock)"
              subtotal={breakdown.m03}
              maxPoints={30}
              imageUrl={missionImages['M03']?.imageUrl}
              imageAlt={missionImages['M03']?.imageAlt}
              description="Abaixar a bandeira de pesquisa para registrar os espécimes e restaurar o habitat."
              requirements={[
                "A bandeira de pesquisa está abaixada ao final do round: 20 pts."
              ]}
              bonuses={[
                "A rocha foi retornada à sua posição original de partida: +10 pts."
              ]}
              restrictions={[
                "O bônus de reposicionamento da rocha requer que a bandeira de pesquisa esteja abaixada."
              ]}
            >
              <BioglowToggle
                label="A bandeira de pesquisa está abaixada"
                checked={state.m03_flagDown}
                onChange={(val) => updateField('m03_flagDown', val)}
                pointsText="+20 pts"
              />
              <BioglowToggle
                label="A rocha retornou à sua posição inicial de partida"
                checked={state.m03_rockResetBonus}
                disabled={!state.m03_flagDown}
                disabledReason="Requer que a bandeira de pesquisa esteja abaixada."
                onChange={(val) => updateField('m03_rockResetBonus', val)}
                pointsText="+10 pts (Bônus)"
              />
            </BioglowMissionCard>

            {/* M04 Lucky Leaves */}
            <BioglowMissionCard
              code="M04"
              title="Folhas da Sorte (Lucky Leaves)"
              subtotal={breakdown.m04}
              maxPoints={30}
              imageUrl={missionImages['M04']?.imageUrl}
              imageAlt={missionImages['M04']?.imageAlt}
              description="Remover folhas sem perturbar o inseto esperança (katydid)."
              requirements={[
                "1 folha completamente removida sem tocar o ninho: 10 pts.",
                "2 folhas completamente removidas com a esperança na posição inicial: 30 pts (10 base + 20 bônus)."
              ]}
              restrictions={[
                "Se a esperança estiver completamente fora do habitat de folhas: 0 pontos na missão.",
                "Restrição de Robô: O modelo não pode estar tocando o Robô ao final do round."
              ]}
            >
              <BioglowRadioGroup
                label="Folhas removidas do ninho:"
                value={state.m04_leavesRemoved}
                options={[
                  { value: 0, label: 'Nenhuma (0)', points: 0 },
                  { value: 1, label: '1 Folha', points: 10 },
                  { value: 2, label: '2 Folhas (Bônus)', points: 30 },
                ]}
                onChange={(val) => updateField('m04_leavesRemoved', Number(val))}
              />

              <div className="pt-2 border-t border-white/5 space-y-2">
                <BioglowToggle
                  label="Esperança (katydid) deslocada para fora do habitat (Penalidade)"
                  checked={state.m04_katydidDisplaced}
                  onChange={(val) => updateField('m04_katydidDisplaced', val)}
                  pointsText="Zera M04"
                />
                <BioglowToggle
                  label="Robô tocando o modelo ao final da partida"
                  checked={state.m04_touchingEquipment}
                  onChange={(val) => updateField('m04_touchingEquipment', val)}
                  pointsText="Zera M04"
                />
              </div>
            </BioglowMissionCard>

            {/* M05 Reaching Roots */}
            <BioglowMissionCard
              code="M05"
              title="Raízes em Expansão (Reaching Roots)"
              subtotal={breakdown.m05}
              maxPoints={20}
              imageUrl={missionImages['M05']?.imageUrl}
              imageAlt={missionImages['M05']?.imageAlt}
              description="Estender a raiz da planta cruzando a fronteira para encontrar simbiose."
              requirements={[
                "Raiz parcialmente estendida: 10 pts.",
                "Raiz completamente estendida: 20 pts."
              ]}
              restrictions={[
                "As opções de extensão são mutuamente exclusivas.",
                "Restrição do Robô: O modelo não pode estar tocando o Robô ao término."
              ]}
            >
              <BioglowRadioGroup
                label="Estado de extensão da raiz da planta:"
                value={state.m05_rootState}
                options={[
                  { value: 'none', label: 'Não estendida', points: 0 },
                  { value: 'partial', label: 'Parcialmente', points: 10 },
                  { value: 'complete', label: 'Completamente', points: 20 },
                ]}
                onChange={(val) => updateField('m05_rootState', val)}
              />

              <div className="pt-2 border-t border-white/5">
                <BioglowToggle
                  label="Robô tocando o modelo ao término da partida"
                  checked={state.m05_touchingEquipment}
                  onChange={(val) => updateField('m05_touchingEquipment', val)}
                  pointsText="Zera M05"
                />
              </div>
            </BioglowMissionCard>

            {/* M06 Leafcutter Frenzy */}
            <BioglowMissionCard
              code="M06"
              title="Frenesi das Saúvas (Leafcutter Frenzy)"
              subtotal={breakdown.m06}
              maxPoints={30}
              imageUrl={missionImages['M06']?.imageUrl}
              imageAlt={missionImages['M06']?.imageAlt}
              description="Guiar a formiga saúva de volta ao formigueiro com fragmentos de folhas."
              requirements={[
                "A formiga deve estar tocando o ninho.",
                "Cada fragmento de folha contido no ninho vale 10 pts (máximo de 3 fragmentos = 30 pts)."
              ]}
              restrictions={[
                "Se a formiga NÃO estiver tocando o ninho, os fragmentos de folhas não pontuam.",
                "Se a esperança estiver fora do habitat: 0 pontos."
              ]}
            >
              <BioglowToggle
                label="A formiga está tocando o ninho"
                checked={state.m06_antInNest}
                onChange={(val) => updateField('m06_antInNest', val)}
                pointsText="Condição ativa"
              />

              <BioglowCounter
                label="Fragmentos de folha contidos no ninho"
                value={state.m06_leafFragments}
                min={0}
                max={3}
                pointsPerUnit={10}
                unitLabel="fragmentos"
                disabled={!state.m06_antInNest}
                disabledReason="Requer que a formiga esteja tocando o ninho."
                onChange={(val) => updateField('m06_leafFragments', val)}
              />

              <div className="pt-2 border-t border-white/5 space-y-2">
                <BioglowToggle
                  label="Esperança (katydid) fora do habitat"
                  checked={state.m06_katydidDisplaced}
                  onChange={(val) => updateField('m06_katydidDisplaced', val)}
                  pointsText="Zera M06"
                />
                <BioglowToggle
                  label="Robô tocando o modelo ao final"
                  checked={state.m06_touchingEquipment}
                  onChange={(val) => updateField('m06_touchingEquipment', val)}
                  pointsText="Zera M06"
                />
              </div>
            </BioglowMissionCard>

            {/* M07 Humongous Fungus */}
            <BioglowMissionCard
              code="M07"
              title="Fungo Gigante (Humongous Fungus)"
              subtotal={breakdown.m07}
              maxPoints={40}
              imageUrl={missionImages['M07']?.imageUrl}
              imageAlt={missionImages['M07']?.imageAlt}
              description="Conectar a rede de micélio fúngico às raízes da mesa oposta."
              requirements={[
                "O micélio está completamente estendido: 20 pts."
              ]}
              bonuses={[
                "Conexões formadas entre o micélio completamente estendido e raízes da equipe oposta (M05): 10 pts cada (máx. 2 conexões = +20 pts)."
              ]}
              restrictions={[
                "O bônus de conexão requer micélio completamente estendido.",
                "Restrição do Robô: Não pode estar tocando Robô ao final."
              ]}
            >
              <BioglowToggle
                label="O micélio fúngico está completamente estendido"
                checked={state.m07_myceliumExtended}
                onChange={(val) => updateField('m07_myceliumExtended', val)}
                pointsText="+20 pts"
              />

              <BioglowCounter
                label="Conexões com raízes da equipe oposta"
                value={state.m07_connections}
                min={0}
                max={2}
                pointsPerUnit={10}
                unitLabel="conexões"
                disabled={!state.m07_myceliumExtended}
                disabledReason="Requer micélio completamente estendido."
                onChange={(val) => updateField('m07_connections', val)}
              />

              <div className="pt-2 border-t border-white/5">
                <BioglowToggle
                  label="Robô tocando o modelo ao término"
                  checked={state.m07_touchingEquipment}
                  onChange={(val) => updateField('m07_touchingEquipment', val)}
                  pointsText="Zera M07"
                />
              </div>
            </BioglowMissionCard>

            {/* M08 Tangled */}
            <BioglowMissionCard
              code="M08"
              title="Cipó Emaranhado (Tangled)"
              subtotal={breakdown.m08}
              maxPoints={30}
              imageUrl={missionImages['M08']?.imageUrl}
              imageAlt={missionImages['M08']?.imageAlt}
              description="Desenredar e derrubar o cipó sobre o tapete da floresta."
              requirements={[
                "O cipó está tocando o tapete ao término da partida: 30 pts."
              ]}
            >
              <BioglowToggle
                label="O cipó está tocando o tapete da mesa"
                checked={state.m08_vineTouchingMat}
                onChange={(val) => updateField('m08_vineTouchingMat', val)}
                pointsText="+30 pts"
              />
            </BioglowMissionCard>

            {/* M09 Research Platform */}
            <BioglowMissionCard
              code="M09"
              title="Plataforma de Pesquisa (Research Platform)"
              subtotal={breakdown.m09}
              maxPoints={30}
              imageUrl={missionImages['M09']?.imageUrl}
              imageAlt={missionImages['M09']?.imageAlt}
              description="Instalar equipamentos de pesquisa e coletar sementes na copa da árvore."
              requirements={[
                "Armadilha fotográfica acionada/instalada: +10 pts.",
                "Plataforma de pesquisa elevada: +10 pts.",
                "Semente não está mais tocando a árvore: +10 pts."
              ]}
            >
              <BioglowToggle
                label="Armadilha fotográfica (câmera) acionada"
                checked={state.m09_cameraTrapDeployed}
                onChange={(val) => updateField('m09_cameraTrapDeployed', val)}
                pointsText="+10 pts"
              />
              <BioglowToggle
                label="Plataforma de pesquisa elevada"
                checked={state.m09_platformRaised}
                onChange={(val) => updateField('m09_platformRaised', val)}
                pointsText="+10 pts"
              />
              <BioglowToggle
                label="Semente da árvore liberada (não toca mais a árvore)"
                checked={state.m09_seedOffTree}
                onChange={(val) => updateField('m09_seedOffTree', val)}
                pointsText="+10 pts"
              />
            </BioglowMissionCard>

            {/* M10 Fragile Microhabitats */}
            <BioglowMissionCard
              code="M10"
              title="Micro-habitats Frágeis (Fragile Microhabitats)"
              subtotal={breakdown.m10}
              maxPoints={20}
              imageUrl={missionImages['M10']?.imageUrl}
              imageAlt={missionImages['M10']?.imageAlt}
              description="Preservar habitats intocados e proteger espécimes sensíveis."
              requirements={[
                "O habitat da aranha está na posição inicial original: +10 pts.",
                "O habitat do caracol está na posição inicial original: +10 pts."
              ]}
              restrictions={[
                "Restrição do Robô: Não pode estar tocando o Robô ao final."
              ]}
            >
              <BioglowToggle
                label="Habitat da aranha intocado na posição original"
                checked={state.m10_spiderUndisturbed}
                onChange={(val) => updateField('m10_spiderUndisturbed', val)}
                pointsText="+10 pts"
              />
              <BioglowToggle
                label="Habitat do caracol intocado na posição original"
                checked={state.m10_snailUndisturbed}
                onChange={(val) => updateField('m10_snailUndisturbed', val)}
                pointsText="+10 pts"
              />
              <div className="pt-2 border-t border-white/5">
                <BioglowToggle
                  label="Robô tocando os micro-habitats ao final"
                  checked={state.m10_touchingEquipment}
                  onChange={(val) => updateField('m10_touchingEquipment', val)}
                  pointsText="Zera M10"
                />
              </div>
            </BioglowMissionCard>

            {/* M11 Window to the Past */}
            <BioglowMissionCard
              code="M11"
              title="Janela para o Passado (Window to the Past)"
              subtotal={breakdown.m11}
              maxPoints={20}
              imageUrl={missionImages['M11']?.imageUrl}
              imageAlt={missionImages['M11']?.imageAlt}
              description="Abrir a escavação arqueológica e revelar os registros fósseis."
              requirements={[
                "A cobertura da raiz está abaixada e tocando o tapete ao término da partida: 20 pts."
              ]}
            >
              <BioglowToggle
                label="A cobertura da raiz está abaixada tocando o tapete"
                checked={state.m11_rootCoverDown}
                onChange={(val) => updateField('m11_rootCoverDown', val)}
                pointsText="+20 pts"
              />
            </BioglowMissionCard>

            {/* M12 Forest Elder */}
            <BioglowMissionCard
              code="M12"
              title="Guardião da Floresta (Forest Elder)"
              subtotal={breakdown.m12}
              maxPoints={30}
              imageUrl={missionImages['M12']?.imageUrl}
              imageAlt={missionImages['M12']?.imageAlt}
              description="Apoiar e escorar a árvore antiga com suportes ecológicos."
              requirements={[
                "A haste/bengala de apoio está completamente erguida tocando a árvore: +20 pts.",
                "A amarração de sustentação está posicionada ao redor do poste: +10 pts."
              ]}
              restrictions={[
                "Restrição do Robô: O modelo não pode estar tocando o Robô ao final."
              ]}
            >
              <BioglowToggle
                label="Haste de apoio completamente erguida tocando a árvore"
                checked={state.m12_caneRaised}
                onChange={(val) => updateField('m12_caneRaised', val)}
                pointsText="+20 pts"
              />
              <BioglowToggle
                label="Amarração de sustentação ao redor do poste"
                checked={state.m12_supportTieAround}
                onChange={(val) => updateField('m12_supportTieAround', val)}
                pointsText="+10 pts"
              />
              <div className="pt-2 border-t border-white/5">
                <BioglowToggle
                  label="Robô tocando o modelo ao final"
                  checked={state.m12_touchingEquipment}
                  onChange={(val) => updateField('m12_touchingEquipment', val)}
                  pointsText="Zera M12"
                />
              </div>
            </BioglowMissionCard>

            {/* M13 Keystone Species */}
            <BioglowMissionCard
              code="M13"
              title="Espécie-Chave (Keystone Species)"
              subtotal={breakdown.m13}
              maxPoints={30}
              imageUrl={missionImages['M13']?.imageUrl}
              imageAlt={missionImages['M13']?.imageAlt}
              description="Entregar a espécie-chave desenvolvida pela equipe na plataforma de restauração."
              requirements={[
                "O modelo da espécie-chave está na plataforma de restauração E as árvores jovens estão erguidas: 30 pts."
              ]}
            >
              <BioglowToggle
                label="Espécie-chave na plataforma e árvores jovens erguidas"
                checked={state.m13_speciesDeliveredAndTreesRaised}
                onChange={(val) => updateField('m13_speciesDeliveredAndTreesRaised', val)}
                pointsText="+30 pts"
              />
            </BioglowMissionCard>

            {/* M14 Seeds of Renewal */}
            <BioglowMissionCard
              code="M14"
              title="Sementes da Renovação (Seeds of Renewal)"
              subtotal={breakdown.m14}
              maxPoints={50}
              imageUrl={missionImages['M14']?.imageUrl}
              imageAlt={missionImages['M14']?.imageAlt}
              description="Depositar sementes na estação de replantio e no solo fértil."
              requirements={[
                "Cada semente contida na estação de replantio: 5 pts (máximo 5 sementes).",
                "Bônus: Cada semente contida que também estiver tocando o tapete: +5 pts adicionais."
              ]}
              restrictions={[
                "O número de sementes tocando o tapete não pode ser maior que o total de sementes contidas na estação."
              ]}
            >
              <BioglowCounter
                label="Sementes contidas dentro da estação de replantio"
                value={state.m14_seedsInStation}
                min={0}
                max={5}
                pointsPerUnit={5}
                unitLabel="sementes"
                onChange={(val) => updateField('m14_seedsInStation', val)}
              />

              <BioglowCounter
                label="Dessas sementes, quantas também estão tocando o tapete"
                value={state.m14_seedsTouchingMat}
                min={0}
                max={state.m14_seedsInStation}
                pointsPerUnit={5}
                unitLabel="sementes no tapete"
                disabled={state.m14_seedsInStation === 0}
                disabledReason="Requer sementes contidas na estação."
                onChange={(val) => updateField('m14_seedsTouchingMat', val)}
              />
            </BioglowMissionCard>

            {/* M15 Biocentric Architecture */}
            <BioglowMissionCard
              code="M15"
              title="Arquitetura Biocêntrica (Biocentric Architecture)"
              subtotal={breakdown.m15}
              maxPoints={40}
              imageUrl={missionImages['M15']?.imageUrl}
              imageAlt={missionImages['M15']?.imageAlt}
              description="Adequar o edifício biocêntrico com dossel, clarabóia e composteira ecológica."
              requirements={[
                "Dossel de nidificação erguido: +10 pts.",
                "Clarabóia do jardim completamente encaixada: +10 pts.",
                "Escotilha de compostagem aberta tocando o tapete: +10 pts."
              ]}
              bonuses={[
                "Bônus Ecológico (+10 pts): se a necessidade ecológica da doca em que o modelo foi colocado foi atendida (Dossel na Mina, Clarabóia na Cidade, ou Composteira na Fazenda). Máximo de 1 bônus."
              ]}
              restrictions={[
                "O bônus ecológico requer que a estrutura correspondente tenha sido concluída.",
                "Restrição do Robô: Não pode estar tocando o Robô ao final."
              ]}
            >
              <BioglowToggle
                label="Dossel de nidificação erguido"
                checked={state.m15_nestingCanopy}
                onChange={(val) => updateField('m15_nestingCanopy', val)}
                pointsText="+10 pts"
              />
              <BioglowToggle
                label="Clarabóia do jardim completamente encaixada"
                checked={state.m15_gardenSkylight}
                onChange={(val) => updateField('m15_gardenSkylight', val)}
                pointsText="+10 pts"
              />
              <BioglowToggle
                label="Escotilha de compostagem aberta tocando o tapete"
                checked={state.m15_compostHatch}
                onChange={(val) => updateField('m15_compostHatch', val)}
                pointsText="+10 pts"
              />

              <div className="pt-2 border-t border-white/5 space-y-1.5">
                <p className="text-xs font-semibold text-red-400">
                  Bônus Ecológico da Doca (Máx. 1 bônus):
                </p>
                <BioglowRadioGroup
                  value={state.m15_ecologicalBonus}
                  options={[
                    { value: 'none', label: 'Sem bônus', points: 0 },
                    { value: 'canopy', label: 'Doca Mina (Dossel)', points: 10 },
                    { value: 'skylight', label: 'Doca Cidade (Clarabóia)', points: 10 },
                    { value: 'compost', label: 'Doca Fazenda (Compost.)', points: 10 },
                  ]}
                  onChange={(val) => updateField('m15_ecologicalBonus', val)}
                />
              </div>

              <div className="pt-2 border-t border-white/5">
                <BioglowToggle
                  label="Robô tocando o modelo ao final"
                  checked={state.m15_touchingEquipment}
                  onChange={(val) => updateField('m15_touchingEquipment', val)}
                  pointsText="Zera M15"
                />
              </div>
            </BioglowMissionCard>

            {/* M16 Precision Tokens */}
            <BioglowMissionCard
              code="M16"
              title="Fichas de Precisão (Precision Tokens)"
              subtotal={breakdown.m16}
              maxPoints={50}
              imageUrl={missionImages['M16']?.imageUrl}
              imageAlt={missionImages['M16']?.imageAlt}
              description="Fichas restantes no campo ao término da partida (penalidade por toques fora da base)."
              requirements={[
                "6 fichas: 50 pts",
                "5 fichas: 50 pts",
                "4 fichas: 35 pts",
                "3 fichas: 25 pts",
                "2 fichas: 15 pts",
                "1 ficha: 10 pts",
                "0 fichas: 0 pts"
              ]}
            >
              <div className="space-y-3">
                <BioglowCounter
                  label="Fichas de precisão restantes no campo"
                  value={state.m16_precisionTokens}
                  min={0}
                  max={6}
                  unitLabel="fichas restantes"
                  onChange={(val) => updateField('m16_precisionTokens', val)}
                />

                <div className="grid grid-cols-7 gap-1 bg-black/40 p-2 rounded-xl border border-white/10 text-center">
                  {[0, 1, 2, 3, 4, 5, 6].map((num) => {
                    const isSelected = state.m16_precisionTokens === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => updateField('m16_precisionTokens', num)}
                        className={`p-1 rounded-lg transition-all ${
                          isSelected
                            ? 'bg-[#E10600] text-white font-bold scale-105 shadow-sm'
                            : 'hover:bg-white/10 text-gray-400'
                        }`}
                      >
                        <span className="block text-[11px] font-mono">{num}</span>
                        <span className="block text-[10px] font-mono font-semibold">
                          {PRECISION_TABLE[num]}p
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </BioglowMissionCard>

          </div>
        </section>

        {/* Histórico de Simulações Salvas no Navegador */}
        {savedRounds.length > 0 && (
          <section className="bg-[#111217] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-[#E10600]" />
                  <span>Simulações Salvas no Navegador ({savedRounds.length})</span>
                </h3>
                <p className="text-xs text-gray-400">
                  Rounds armazenados localmente para consulta e comparação de estratégias
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSavedRounds([])}
                className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                Limpar Histórico
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedRounds.map((item) => (
                <div
                  key={item.id}
                  className="bg-black/40 border border-white/10 rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-[#E10600]/40 transition-all"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {item.teamName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {item.roundName} · {new Date(item.savedAt).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="font-mono text-sm font-extrabold text-[#E10600]">
                      {item.score} pts
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleLoadRound(item)}
                      className="h-8 px-2.5 text-xs bg-white/5 hover:bg-white/15 text-white border-white/10"
                    >
                      Carregar
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSavedRound(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                      title="Excluir simulação"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tabela de Referência Oficial e Resumo (Colapsável) */}
        <section className="bg-[#111217] border border-white/10 rounded-2xl overflow-hidden transition-all duration-300">
          <button
            type="button"
            onClick={() => setShowCriteriaTable(prev => !prev)}
            aria-expanded={showCriteriaTable}
            aria-controls="criteria-table-container"
            className="w-full p-5 sm:p-6 flex items-center justify-between gap-4 text-left hover:bg-white/[0.02] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E10600]"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#E10600]/10 border border-[#E10600]/20 text-[#E10600] shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>Tabela de Critérios & Pontuações FLL BIOGLOW 2026–2027</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {showCriteriaTable
                    ? 'Clique para recolher a tabela de referência de pontuações oficiais'
                    : 'Clique para expandir a tabela completa com critérios, bônus e pontuação máxima (530 pts)'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-gray-200">
                {showCriteriaTable ? 'Ocultar Tabela' : 'Expandir Tabela'}
              </span>
              <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-300">
                {showCriteriaTable ? (
                  <ChevronUp className="w-4 h-4 text-[#E10600]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#E10600]" />
                )}
              </div>
            </div>
          </button>

          {showCriteriaTable && (
            <div id="criteria-table-container" className="p-6 pt-0 space-y-4 border-t border-white/5 animate-in fade-in-0 duration-200">
              <div className="overflow-x-auto pt-4">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 font-mono uppercase text-[11px]">
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Missão</th>
                      <th className="py-2.5 px-3">Critérios Principais & Bônus</th>
                      <th className="py-2.5 px-3 text-right">Máximo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#E10600]">INSPEÇÃO</td>
                      <td className="py-2.5 px-3 font-medium text-white">Inspeção do Robô</td>
                      <td className="py-2.5 px-3">Robô completo na área pequena de inspeção</td>
                      <td className="py-2.5 px-3 font-mono text-right text-white font-bold">20 pts</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#E10600]">M01</td>
                      <td className="py-2.5 px-3 font-medium text-white">Levantamento por Drone</td>
                      <td className="py-2.5 px-3">Drone não toca o tapete (20) + Mapa LiDAR virado na área (10)</td>
                      <td className="py-2.5 px-3 font-mono text-right text-white font-bold">30 pts</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#E10600]">M02</td>
                      <td className="py-2.5 px-3 font-medium text-white">Sementes Explosivas</td>
                      <td className="py-2.5 px-3">Sementes não tocando a haste (10 pts cada, até 3)</td>
                      <td className="py-2.5 px-3 font-mono text-right text-white font-bold">30 pts</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#E10600]">M03</td>
                      <td className="py-2.5 px-3 font-medium text-white">Virar a Rocha</td>
                      <td className="py-2.5 px-3">Bandeira de pesquisa abaixada (20) + Rocha retornada (10)</td>
                      <td className="py-2.5 px-3 font-mono text-right text-white font-bold">30 pts</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#E10600]">M04</td>
                      <td className="py-2.5 px-3 font-medium text-white">Folhas da Sorte</td>
                      <td className="py-2.5 px-3">1 folha (10) ou 2 folhas com esperança na base (30)</td>
                      <td className="py-2.5 px-3 font-mono text-right text-white font-bold">30 pts</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#E10600]">M05</td>
                      <td className="py-2.5 px-3 font-medium text-white">Raízes em Expansão</td>
                      <td className="py-2.5 px-3">Raiz parcialmente estendida (10) ou completamente estendida (20)</td>
                      <td className="py-2.5 px-3 font-mono text-right text-white font-bold">20 pts</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#E10600]">M06</td>
                      <td className="py-2.5 px-3 font-medium text-white">Frenesi das Saúvas</td>
                      <td className="py-2.5 px-3">Formiga no ninho com fragmentos de folhas (10 pts cada, até 3)</td>
                      <td className="py-2.5 px-3 font-mono text-right text-white font-bold">30 pts</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#E10600]">M07</td>
                      <td className="py-2.5 px-3 font-medium text-white">Fungo Gigante</td>
                      <td className="py-2.5 px-3">Micélio estendido (20) + Conexões com raízes opostas (10 pts cada, até 2)</td>
                      <td className="py-2.5 px-3 font-mono text-right text-white font-bold">40 pts</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#E10600]">M08</td>
                      <td className="py-2.5 px-3 font-medium text-white">Cipó Emaranhado</td>
                      <td className="py-2.5 px-3">Cipó tocando o tapete ao final</td>
                      <td className="py-2.5 px-3 font-mono text-right text-white font-bold">30 pts</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#E10600]">M09</td>
                      <td className="py-2.5 px-3 font-medium text-white">Plataforma de Pesquisa</td>
                      <td className="py-2.5 px-3">Câmera instalada (10) + Plataforma erguida (10) + Semente fora da árvore (10)</td>
                      <td className="py-2.5 px-3 font-mono text-right text-white font-bold">30 pts</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#E10600]">M10</td>
                      <td className="py-2.5 px-3 font-medium text-white">Micro-habitats Frágeis</td>
                      <td className="py-2.5 px-3">Habitat da aranha intocado (10) + Habitat do caracol intocado (10)</td>
                      <td className="py-2.5 px-3 font-mono text-right text-white font-bold">20 pts</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#E10600]">M11</td>
                      <td className="py-2.5 px-3 font-medium text-white">Janela para o Passado</td>
                      <td className="py-2.5 px-3">Cobertura da raiz abaixada tocando o tapete</td>
                      <td className="py-2.5 px-3 font-mono text-right text-white font-bold">20 pts</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#E10600]">M12</td>
                      <td className="py-2.5 px-3 font-medium text-white">Guardião da Floresta</td>
                      <td className="py-2.5 px-3">Bengala erguida tocando a árvore (20) + Amarração ao redor do poste (10)</td>
                      <td className="py-2.5 px-3 font-mono text-right text-white font-bold">30 pts</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#E10600]">M13</td>
                      <td className="py-2.5 px-3 font-medium text-white">Espécie-Chave</td>
                      <td className="py-2.5 px-3">Espécie na plataforma de restauração E árvores jovens erguidas</td>
                      <td className="py-2.5 px-3 font-mono text-right text-white font-bold">30 pts</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#E10600]">M14</td>
                      <td className="py-2.5 px-3 font-medium text-white">Sementes da Renovação</td>
                      <td className="py-2.5 px-3">Sementes na estação (5 pts cada) + Sementes tocando o tapete (+5 pts cada)</td>
                      <td className="py-2.5 px-3 font-mono text-right text-white font-bold">50 pts</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#E10600]">M15</td>
                      <td className="py-2.5 px-3 font-medium text-white">Arquitetura Biocêntrica</td>
                      <td className="py-2.5 px-3">Dossel (10) + Clarabóia (10) + Composteira (10) + Bônus da Doca (10)</td>
                      <td className="py-2.5 px-3 font-mono text-right text-white font-bold">40 pts</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#E10600]">M16</td>
                      <td className="py-2.5 px-3 font-medium text-white">Fichas de Precisão</td>
                      <td className="py-2.5 px-3">6 ou 5 fichas (50), 4 fichas (35), 3 fichas (25), 2 fichas (15), 1 ficha (10)</td>
                      <td className="py-2.5 px-3 font-mono text-right text-white font-bold">50 pts</td>
                    </tr>
                    <tr className="bg-[#E10600]/15 font-bold">
                      <td colSpan={3} className="py-3 px-3 text-white">
                        TOTAL MÁXIMO TEÓRICO (Inspeção + M01 a M16)
                      </td>
                      <td className="py-3 px-3 font-mono text-right text-[#E10600] text-base">
                        530 pts
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="pt-3 border-t border-white/5 text-xs text-gray-400 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span>Fontes Oficiais: </span>
                  <a
                    href="https://www.firstinspires.org/resources/library/fll/season-materials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#E10600] hover:underline inline-flex items-center gap-1 ml-1"
                  >
                    <span>FIRST® LEGO® League Season Materials</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="mx-2">·</span>
                  <span>Revisão das Regras: 29 de Setembro de 2026</span>
                </div>
                <div>
                  <span>Referência funcional: Komurobo BIOGLOW Scoresheet</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Rodapé Institucional com Aviso Discreto */}
        <footer className="pt-6 pb-12 border-t border-white/10 text-center space-y-2">
          <p className="text-xs text-gray-400 leading-relaxed max-w-3xl mx-auto">
            O <strong>Simulador de Round BIOGLOW</strong> é uma ferramenta independente desenvolvida pela <strong>Tera Robotics</strong> para treino, simulação de placar e planejamento tático das equipes. As regras, critérios e decisões oficiais publicadas pela FIRST® e seus parceiros operacionais prevalecem em torneios e competições oficiais.
          </p>
          <p className="text-[11px] text-gray-500">
            FIRST® e FIRST® LEGO® League são marcas registradas da FIRST e LEGO Group.
          </p>
        </footer>

      </main>

      {/* Modal de Confirmação para Zerar Simulação */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#14151C] border border-white/15 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">
                  Zerar simulação do round?
                </h4>
                <p className="text-xs text-gray-400">
                  Esta ação redefinirá todas as missões para os valores iniciais.
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-300">
              A pontuação atual de <strong>{total} pontos</strong> será limpa. Se desejar mantê-la, você pode salvar a simulação antes de zerar.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowResetConfirm(false)}
                className="bg-white/5 hover:bg-white/10 text-gray-300 border-white/10"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleReset}
                className="bg-red-500 hover:bg-red-600 text-white font-bold"
              >
                Sim, Zerar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Compartilhamento do Resultado */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#14151C] border border-white/15 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E10600]/20 text-[#E10600] flex items-center justify-center flex-shrink-0">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">
                    Compartilhar Simulação
                  </h4>
                  <p className="text-xs text-gray-400">
                    Placar de {total} pts · {state.teamName || 'Equipe'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Opção 1: Copiar Link Direto */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 block">
                  Link Direto da Simulação (reproduz exatamente as escolhas):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareableUrl}
                    className="w-full h-10 px-3 rounded-lg bg-black/50 border border-white/10 text-xs text-gray-300 font-mono select-all truncate"
                  />
                  <Button
                    type="button"
                    onClick={handleCopyLink}
                    className="h-10 px-3 bg-[#E10600] hover:bg-[#c00500] text-white font-bold flex items-center gap-1.5 flex-shrink-0"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
                  </Button>
                </div>
              </div>

              {/* Opção 2: Copiar Resumo em Texto Formatado */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 block">
                  Resumo em Texto para WhatsApp / Discord:
                </label>
                <textarea
                  readOnly
                  rows={6}
                  value={generateSummaryText()}
                  className="w-full p-3 rounded-lg bg-black/50 border border-white/10 text-xs text-gray-300 font-mono select-all resize-none leading-relaxed"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyText}
                  className="w-full h-10 bg-white/5 hover:bg-white/10 text-white border-white/10 font-medium flex items-center justify-center gap-2"
                >
                  {copiedText ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedText ? 'Resumo Copiado para a Área de Transferência!' : 'Copiar Resumo Formatado'}</span>
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-white"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
