import { 
  fetchActiveFllSeason, 
  persistFllMissionImage, 
  removeFllMissionImage, 
  getLocalActiveFllSeason 
} from './fllSeasonClient.js';

export const FLL_MISSION_STORAGE_KEY = 'fll_bioglow_mission_images_v1';

export const BIOGLOW_MISSIONS_CATALOG = [
  { code: 'INSPEÇÃO', number: 0, title: 'Inspeção do Robô', maxScore: 20, defaultAlt: 'Área pequena de inspeção com robô completo, anexos e garras.' },
  { code: 'M01', number: 1, title: 'Levantamento por Drone', maxScore: 30, defaultAlt: 'Drone de monitoramento florestal desencaixado e mapa LiDAR virado.' },
  { code: 'M02', number: 2, title: 'Sementes Explosivas', maxScore: 30, defaultAlt: 'Haste seca e sementes liberadas para dispersão florestal.' },
  { code: 'M03', number: 3, title: 'Virar a Rocha', maxScore: 30, defaultAlt: 'Rocha do habitat virada com a bandeira de pesquisa abaixada.' },
  { code: 'M04', number: 4, title: 'Folhas da Sorte', maxScore: 30, defaultAlt: 'Ninho com folhas removidas e o inseto esperança preservado.' },
  { code: 'M05', number: 5, title: 'Raízes em Expansão', maxScore: 20, defaultAlt: 'Raiz da árvore estendida completamente sobre a floresta.' },
  { code: 'M06', number: 6, title: 'Frenesi das Saúvas', maxScore: 30, defaultAlt: 'Formigueiro com fragmentos de folhas transportados pelas saúvas.' },
  { code: 'M07', number: 7, title: 'Fungo Gigante', maxScore: 40, defaultAlt: 'Fungo bioluminescente estendido e conectado às raízes opostas.' },
  { code: 'M08', number: 8, title: 'Cipó Emaranhado', maxScore: 30, defaultAlt: 'Cipó da copa desenrolado tocando o tapete da mesa.' },
  { code: 'M09', number: 9, title: 'Plataforma de Pesquisa', maxScore: 30, defaultAlt: 'Câmera instalada na copa e plataforma de observação elevada.' },
  { code: 'M10', number: 10, title: 'Micro-habitats Frágeis', maxScore: 20, defaultAlt: 'Habitats do caracol e da aranha preservados intocados.' },
  { code: 'M11', number: 11, title: 'Janela para o Passado', maxScore: 20, defaultAlt: 'Cobertura geológica abaixada sobre a raiz da árvore milenar.' },
  { code: 'M12', number: 12, title: 'Guardião da Floresta', maxScore: 30, defaultAlt: 'Bengala de sustentação erguida apoiando a árvore guardiã.' },
  { code: 'M13', number: 13, title: 'Espécie-Chave', maxScore: 30, defaultAlt: 'Espécie animal na plataforma de restauração com árvores jovens erguidas.' },
  { code: 'M14', number: 14, title: 'Sementes da Renovação', maxScore: 50, defaultAlt: 'Estação de sementes com unidades dispersas no solo fértil.' },
  { code: 'M15', number: 15, title: 'Arquitetura Biocêntrica', maxScore: 40, defaultAlt: 'Módulos de dossel, clarabóia e composteira com bônus da doca.' },
  { code: 'M16', number: 16, title: 'Fichas de Precisão', maxScore: 50, defaultAlt: 'Fichas de precisão preservadas intactas na área técnica.' }
];

/**
 * Lê o cache local do navegador para respostas síncronas e offline
 */
export function getLocalMissionImages() {
  try {
    const activeSeason = getLocalActiveFllSeason();
    if (activeSeason && activeSeason.fll_missions && Object.keys(activeSeason.fll_missions).length > 0) {
      return activeSeason.fll_missions;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(FLL_MISSION_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (err) {
    console.warn('[FLL Missions] Falha ao ler cache local de imagens:', err);
  }
  return {};
}

/**
 * Salva no cache local do navegador
 */
export function saveLocalMissionImages(data) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(FLL_MISSION_STORAGE_KEY, JSON.stringify(data));
    }
  } catch (err) {
    console.warn('[FLL Missions] Falha ao gravar cache local de imagens:', err);
  }
}

/**
 * Carrega a associação completa de imagens de missões da temporada FLL ativa
 */
export async function fetchFllMissionImages(seasonTheme = null) {
  const localMap = getLocalMissionImages();
  try {
    const seasonData = await fetchActiveFllSeason(seasonTheme);
    if (seasonData && seasonData.fll_missions) {
      saveLocalMissionImages(seasonData.fll_missions);
      return seasonData.fll_missions;
    }
  } catch (err) {
    console.warn('[FLL Missions] Falha na busca remota de imagens de missões (usando cache local):', err);
  }
  return localMap;
}

/**
 * Salva ou atualiza a referência da imagem de uma missão vinculada à temporada FLL
 */
export async function persistMissionImage({ code, fileId, imageUrl, imageAlt, title, maxScore, season = 'BIOGLOW' }) {
  const missionInfo = BIOGLOW_MISSIONS_CATALOG.find(m => m.code === code) || {};
  const currentLocal = { ...getLocalMissionImages() };

  // Se não foi fornecido fileId mas temos imageUrl no formato /api/media/[id]
  let effectiveFileId = fileId;
  if (!effectiveFileId && imageUrl && imageUrl.includes('/api/media/')) {
    effectiveFileId = imageUrl.split('/api/media/')[1]?.split('?')[0];
  }

  const updatedSeason = await persistFllMissionImage({
    season,
    code,
    fileId: effectiveFileId,
    imageUrl: imageUrl || (effectiveFileId ? `/api/media/${effectiveFileId}` : ''),
    imageAlt: imageAlt || missionInfo.defaultAlt || `Modelo da missão ${code}`,
    title: title || missionInfo.title || code,
    maxScore: maxScore ?? missionInfo.maxScore ?? 0
  });

  const nextMissions = updatedSeason?.fll_missions || currentLocal;
  saveLocalMissionImages(nextMissions);
  return nextMissions;
}

/**
 * Desvincula a imagem de uma missão sem excluir do Google Drive
 */
export async function removeMissionImageAssociation(code, season = 'BIOGLOW') {
  const updatedSeason = await removeFllMissionImage({ season, code });
  const nextMissions = updatedSeason?.fll_missions || {};
  saveLocalMissionImages(nextMissions);
  return nextMissions;
}
