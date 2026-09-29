/**
 * Lógica oficial de pontuação e validações do Robot Game
 * FIRST LEGO League Challenge BIOGLOW 2026–2027 (Founders Edition)
 * 
 * Regras estritas:
 * - Validação de dependências e bônus condicionais
 * - Prevenção de estados ilegais e pontuações duplicadas
 * - Cálculo puro, determinístico e testável
 */

export const PRECISION_TABLE = {
  6: 50,
  5: 50,
  4: 35,
  3: 25,
  2: 15,
  1: 10,
  0: 0
};

export const MAX_POSSIBLE_SCORE = 530;

export const INITIAL_ROUND_STATE = {
  teamName: '',
  roundName: 'Round 1',
  inspectionSmallArea: false, // 20 pts

  // M01 Drone Survey (Levantamento por Drone) - max 30 pts
  m01_droneLaunched: false, // 20 pts
  m01_lidarBonus: false,    // 10 pts (condicional: drone deve ter decolado)

  // M02 Exploding Seeds (Sementes Explosivas) - max 30 pts
  m02_seedsReleased: 0,     // 0 a 3 sementes (10 pts cada)

  // M03 Flip the Rock (Virar a Rocha) - max 30 pts
  m03_flagDown: false,      // 20 pts
  m03_rockResetBonus: false,// 10 pts (condicional: bandeira deve estar abaixada)

  // M04 Lucky Leaves (Folhas da Sorte) - max 30 pts
  m04_leavesRemoved: 0,     // 0, 1 (10 pts) ou 2 (30 pts = 10 + 20 bonus)
  m04_katydidDisplaced: false, // penalidade: se esperança fora do habitat -> 0 pts
  m04_touchingEquipment: false, // restrição do robô

  // M05 Reaching Roots (Raízes em Expansão) - max 20 pts (alternativas exclusivas)
  m05_rootState: 'none',    // 'none' (0), 'partial' (10) ou 'complete' (20)
  m05_touchingEquipment: false,

  // M06 Leafcutter Frenzy (Frenesi das Saúvas) - max 30 pts
  m06_antInNest: false,     // Requisito obrigatório para contar folhas
  m06_leafFragments: 0,     // 0 a 3 fragmentos (10 pts cada se formiga no ninho)
  m06_katydidDisplaced: false, // se esperança fora do habitat -> 0 pts
  m06_touchingEquipment: false,

  // M07 Humongous Fungus (Fungo Gigante) - max 40 pts
  m07_myceliumExtended: false, // 20 pts
  m07_connections: 0,          // 0, 1 ou 2 conexões com raízes opostas (10 pts cada, condicional)
  m07_touchingEquipment: false,

  // M08 Tangled (Cipó Emaranhado) - max 30 pts
  m08_vineTouchingMat: false, // 30 pts

  // M09 Research Platform (Plataforma de Pesquisa) - max 30 pts
  m09_cameraTrapDeployed: false, // 10 pts
  m09_platformRaised: false,      // 10 pts
  m09_seedOffTree: false,         // 10 pts

  // M10 Fragile Microhabitats (Micro-habitats Frágeis) - max 20 pts
  m10_spiderUndisturbed: false, // 10 pts
  m10_snailUndisturbed: false,  // 10 pts
  m10_touchingEquipment: false,

  // M11 Window to the Past (Janela para o Passado) - max 20 pts
  m11_rootCoverDown: false, // 20 pts

  // M12 Forest Elder (Guardião da Floresta) - max 30 pts
  m12_caneRaised: false,     // 20 pts
  m12_supportTieAround: false, // 10 pts
  m12_touchingEquipment: false,

  // M13 Keystone Species (Espécie-Chave) - max 30 pts
  m13_speciesDeliveredAndTreesRaised: false, // 30 pts

  // M14 Seeds of Renewal (Sementes da Renovação) - max 50 pts
  m14_seedsInStation: 0,    // 0 a 5 sementes (5 pts cada)
  m14_seedsTouchingMat: 0,  // 0 a 5 sementes (+5 pts cada, <= m14_seedsInStation)

  // M15 Biocentric Architecture (Arquitetura Biocêntrica) - max 40 pts
  m15_nestingCanopy: false,   // 10 pts
  m15_gardenSkylight: false,  // 10 pts
  m15_compostHatch: false,    // 10 pts
  m15_ecologicalBonus: 'none', // 'none' (0), 'canopy' (10 se canopy ok), 'skylight' (10 se skylight ok), 'compost' (10 se compost ok)
  m15_touchingEquipment: false,

  // M16 Precision Tokens (Fichas de Precisão) - max 50 pts
  m16_precisionTokens: 6 // 6 fichas (50), 5 (50), 4 (35), 3 (25), 2 (15), 1 (10), 0 (0)
};

/**
 * Calcula a pontuação detalhada de uma simulação de round
 * Retorna o total geral e os subtotais por missão
 */
export function calculateScores(state = {}) {
  const s = { ...INITIAL_ROUND_STATE, ...state };

  // Inspeção
  const inspectionScore = s.inspectionSmallArea ? 20 : 0;

  // M01 Drone Survey
  let m01 = 0;
  if (s.m01_droneLaunched) {
    m01 += 20;
    if (s.m01_lidarBonus) {
      m01 += 10;
    }
  }

  // M02 Exploding Seeds
  const m02Clamped = Math.min(3, Math.max(0, Number(s.m02_seedsReleased) || 0));
  const m02 = m02Clamped * 10;

  // M03 Flip the Rock
  let m03 = 0;
  if (s.m03_flagDown) {
    m03 += 20;
    if (s.m03_rockResetBonus) {
      m03 += 10;
    }
  }

  // M04 Lucky Leaves
  let m04 = 0;
  if (!s.m04_touchingEquipment && !s.m04_katydidDisplaced) {
    const leaves = Number(s.m04_leavesRemoved) || 0;
    if (leaves === 1) {
      m04 = 10;
    } else if (leaves >= 2) {
      m04 = 30; // 10 base + 20 bônus
    }
  }

  // M05 Reaching Roots
  let m05 = 0;
  if (!s.m05_touchingEquipment) {
    if (s.m05_rootState === 'partial') m05 = 10;
    else if (s.m05_rootState === 'complete') m05 = 20;
  }

  // M06 Leafcutter Frenzy
  let m06 = 0;
  if (!s.m06_touchingEquipment && !s.m06_katydidDisplaced) {
    if (s.m06_antInNest) {
      const fragments = Math.min(3, Math.max(0, Number(s.m06_leafFragments) || 0));
      m06 = fragments * 10;
    }
  }

  // M07 Humongous Fungus
  let m07 = 0;
  if (!s.m07_touchingEquipment && s.m07_myceliumExtended) {
    m07 += 20;
    const connections = Math.min(2, Math.max(0, Number(s.m07_connections) || 0));
    m07 += connections * 10;
  }

  // M08 Tangled
  const m08 = s.m08_vineTouchingMat ? 30 : 0;

  // M09 Research Platform
  let m09 = 0;
  if (s.m09_cameraTrapDeployed) m09 += 10;
  if (s.m09_platformRaised) m09 += 10;
  if (s.m09_seedOffTree) m09 += 10;

  // M10 Fragile Microhabitats
  let m10 = 0;
  if (!s.m10_touchingEquipment) {
    if (s.m10_spiderUndisturbed) m10 += 10;
    if (s.m10_snailUndisturbed) m10 += 10;
  }

  // M11 Window to the Past
  const m11 = s.m11_rootCoverDown ? 20 : 0;

  // M12 Forest Elder
  let m12 = 0;
  if (!s.m12_touchingEquipment) {
    if (s.m12_caneRaised) m12 += 20;
    if (s.m12_supportTieAround) m12 += 10;
  }

  // M13 Keystone Species
  const m13 = s.m13_speciesDeliveredAndTreesRaised ? 30 : 0;

  // M14 Seeds of Renewal
  const seedsInStation = Math.min(5, Math.max(0, Number(s.m14_seedsInStation) || 0));
  const seedsTouchingMat = Math.min(seedsInStation, Math.max(0, Number(s.m14_seedsTouchingMat) || 0));
  const m14 = (seedsInStation * 5) + (seedsTouchingMat * 5);

  // M15 Biocentric Architecture
  let m15 = 0;
  if (!s.m15_touchingEquipment) {
    if (s.m15_nestingCanopy) m15 += 10;
    if (s.m15_gardenSkylight) m15 += 10;
    if (s.m15_compostHatch) m15 += 10;

    // Bônus ecológico condicional à conclusão da respectiva estrutura
    if (s.m15_ecologicalBonus === 'canopy' && s.m15_nestingCanopy) {
      m15 += 10;
    } else if (s.m15_ecologicalBonus === 'skylight' && s.m15_gardenSkylight) {
      m15 += 10;
    } else if (s.m15_ecologicalBonus === 'compost' && s.m15_compostHatch) {
      m15 += 10;
    }
  }

  // M16 Precision Tokens
  const tokens = Math.min(6, Math.max(0, Number(s.m16_precisionTokens) ?? 6));
  const m16 = PRECISION_TABLE[tokens] ?? 0;

  const total = (
    inspectionScore +
    m01 +
    m02 +
    m03 +
    m04 +
    m05 +
    m06 +
    m07 +
    m08 +
    m09 +
    m10 +
    m11 +
    m12 +
    m13 +
    m14 +
    m15 +
    m16
  );

  return {
    total,
    breakdown: {
      inspection: inspectionScore,
      m01,
      m02,
      m03,
      m04,
      m05,
      m06,
      m07,
      m08,
      m09,
      m10,
      m11,
      m12,
      m13,
      m14,
      m15,
      m16
    }
  };
}

/**
 * Codifica o estado para compartilhamento via URL ou texto
 */
export function encodeRoundState(state) {
  try {
    const minState = {};
    for (const [key, val] of Object.entries(state)) {
      if (val !== INITIAL_ROUND_STATE[key]) {
        minState[key] = val;
      }
    }
    const jsonStr = JSON.stringify(minState);
    return encodeURIComponent(btoa(unescape(encodeURIComponent(jsonStr))));
  } catch {
    return '';
  }
}

/**
 * Decodifica o estado a partir do código compartilhado
 */
export function decodeRoundState(encoded) {
  if (!encoded) return { ...INITIAL_ROUND_STATE };
  try {
    const jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(encoded))));
    const parsed = JSON.parse(jsonStr);
    return { ...INITIAL_ROUND_STATE, ...parsed };
  } catch {
    return { ...INITIAL_ROUND_STATE };
  }
}
