import { supabase } from './supabaseClient.js';

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
 * Carrega a associação completa de imagens de missões FLL
 * Prioriza dados do Supabase e mescla com cache local para resiliência
 */
export async function fetchFllMissionImages() {
  const localMap = getLocalMissionImages();

  try {
    const { data, error } = await supabase
      .from('fll_missions')
      .select('id, mission_code, mission_number, title, image_url, image_alt')
      .order('mission_number', { ascending: true });

    if (error) {
      console.warn('[FLL Missions] Consulta no Supabase retornou aviso (usando cache):', error.message);
      return localMap;
    }

    if (Array.isArray(data) && data.length > 0) {
      const dbMap = { ...localMap };
      data.forEach(item => {
        const code = item.mission_code || (item.mission_number === 0 ? 'INSPEÇÃO' : `M${String(item.mission_number).padStart(2, '0')}`);
        if (code) {
          dbMap[code] = {
            id: item.id,
            imageUrl: item.image_url || '',
            imageAlt: item.image_alt || '',
            title: item.title || ''
          };
        }
      });

      saveLocalMissionImages(dbMap);
      return dbMap;
    }
  } catch (err) {
    console.warn('[FLL Missions] Exceção na busca remota de imagens de missões:', err);
  }

  return localMap;
}

/**
 * Salva ou atualiza a referência da imagem de uma missão no Supabase e no cache local
 */
export async function persistMissionImage({ code, imageUrl, imageAlt, title, maxScore }) {
  const missionInfo = BIOGLOW_MISSIONS_CATALOG.find(m => m.code === code) || {};
  const currentLocal = getLocalMissionImages();

  const nextEntry = {
    imageUrl: imageUrl || '',
    imageAlt: imageAlt || '',
    title: title || missionInfo.title || code
  };

  currentLocal[code] = {
    ...currentLocal[code],
    ...nextEntry
  };
  saveLocalMissionImages(currentLocal);

  try {
    // 1. Verificar se registro da missão já existe no Supabase
    const { data: existing } = await supabase
      .from('fll_missions')
      .select('id')
      .or(`mission_code.eq.${code},mission_number.eq.${missionInfo.number ?? -1}`)
      .limit(1);

    const payload = {
      mission_code: code,
      mission_number: missionInfo.number ?? 0,
      title: title || missionInfo.title || code,
      max_score: maxScore ?? missionInfo.maxScore ?? 0,
      image_url: imageUrl || null,
      image_alt: imageAlt || null,
      season: 'BIOGLOW'
    };

    if (existing && existing.length > 0) {
      const { data: updated, error: updateErr } = await supabase
        .from('fll_missions')
        .update(payload)
        .eq('id', existing[0].id)
        .select();

      if (updateErr) throw updateErr;
      if (updated && updated[0]) {
        currentLocal[code].id = updated[0].id;
        saveLocalMissionImages(currentLocal);
      }
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('fll_missions')
        .insert([payload])
        .select();

      if (insertErr) throw insertErr;
      if (inserted && inserted[0]) {
        currentLocal[code].id = inserted[0].id;
        saveLocalMissionImages(currentLocal);
      }
    }
  } catch (dbErr) {
    console.warn('[FLL Missions] Falha ao persistir no Supabase (salvo localmente):', dbErr.message);
  }

  return currentLocal;
}

/**
 * Desvincula a imagem de uma missão sem excluir do Google Drive
 */
export async function removeMissionImageAssociation(code) {
  return persistMissionImage({
    code,
    imageUrl: '',
    imageAlt: ''
  });
}
