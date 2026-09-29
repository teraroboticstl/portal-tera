import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_ROUND_STATE,
  calculateScores,
  MAX_POSSIBLE_SCORE,
  PRECISION_TABLE,
  encodeRoundState,
  decodeRoundState
} from '../src/lib/fllBioglowRules.js';

test('FLL BIOGLOW: Estado inicial deve pontuar apenas fichas de precisão completas (50 pts)', () => {
  const { total, breakdown } = calculateScores(INITIAL_ROUND_STATE);
  assert.equal(total, 50, 'Estado inicial com 6 fichas de precisão deve somar exatamente 50 pontos');
  assert.equal(breakdown.m16, 50);
  assert.equal(breakdown.m01, 0);
  assert.equal(breakdown.inspection, 0);
});

test('FLL BIOGLOW: Pontuação Máxima Absoluta confirmada nas regras oficiais (530 pts)', () => {
  const maxState = {
    inspectionSmallArea: true, // 20
    m01_droneLaunched: true,    // 20
    m01_lidarBonus: true,       // 10 -> 30
    m02_seedsReleased: 3,       // 30
    m03_flagDown: true,         // 20
    m03_rockResetBonus: true,   // 10 -> 30
    m04_leavesRemoved: 2,       // 30
    m04_katydidDisplaced: false,
    m04_touchingEquipment: false,
    m05_rootState: 'complete',  // 20
    m05_touchingEquipment: false,
    m06_antInNest: true,        // 30
    m06_leafFragments: 3,
    m06_katydidDisplaced: false,
    m06_touchingEquipment: false,
    m07_myceliumExtended: true, // 20
    m07_connections: 2,         // 20 -> 40
    m07_touchingEquipment: false,
    m08_vineTouchingMat: true,  // 30
    m09_cameraTrapDeployed: true,// 10
    m09_platformRaised: true,    // 10
    m09_seedOffTree: true,       // 10 -> 30
    m10_spiderUndisturbed: true, // 10
    m10_snailUndisturbed: true,  // 10 -> 20
    m10_touchingEquipment: false,
    m11_rootCoverDown: true,    // 20
    m12_caneRaised: true,        // 20
    m12_supportTieAround: true,  // 10 -> 30
    m12_touchingEquipment: false,
    m13_speciesDeliveredAndTreesRaised: true, // 30
    m14_seedsInStation: 5,       // 25
    m14_seedsTouchingMat: 5,     // 25 -> 50
    m15_nestingCanopy: true,     // 10
    m15_gardenSkylight: true,    // 10
    m15_compostHatch: true,      // 10
    m15_ecologicalBonus: 'canopy', // 10 -> 40
    m15_touchingEquipment: false,
    m16_precisionTokens: 6       // 50
  };

  const { total, breakdown } = calculateScores(maxState);
  assert.equal(total, MAX_POSSIBLE_SCORE, `A pontuação máxima deve ser ${MAX_POSSIBLE_SCORE}`);
  assert.equal(total, 530);
});

test('M01: Bônus LiDAR depende estritamente do drone decolado', () => {
  // Drone não decolou, mas tentou marcar LiDAR bonus
  const stateNoLaunch = { ...INITIAL_ROUND_STATE, m01_droneLaunched: false, m01_lidarBonus: true };
  assert.equal(calculateScores(stateNoLaunch).breakdown.m01, 0, 'Sem drone decolado, m01 deve ser 0');

  // Drone decolou sem bônus
  const stateLaunchOnly = { ...INITIAL_ROUND_STATE, m01_droneLaunched: true, m01_lidarBonus: false };
  assert.equal(calculateScores(stateLaunchOnly).breakdown.m01, 20);

  // Drone decolou com bônus
  const stateBoth = { ...INITIAL_ROUND_STATE, m01_droneLaunched: true, m01_lidarBonus: true };
  assert.equal(calculateScores(stateBoth).breakdown.m01, 30);
});

test('M03: Bônus de retorno da rocha depende da bandeira de pesquisa abaixada', () => {
  const stateRockOnly = { ...INITIAL_ROUND_STATE, m03_flagDown: false, m03_rockResetBonus: true };
  assert.equal(calculateScores(stateRockOnly).breakdown.m03, 0);

  const stateFlagOnly = { ...INITIAL_ROUND_STATE, m03_flagDown: true, m03_rockResetBonus: false };
  assert.equal(calculateScores(stateFlagOnly).breakdown.m03, 20);

  const stateBoth = { ...INITIAL_ROUND_STATE, m03_flagDown: true, m03_rockResetBonus: true };
  assert.equal(calculateScores(stateBoth).breakdown.m03, 30);
});

test('M04: Regras de folhas, bônus da esperança (katydid) e restrição do robô', () => {
  // 1 folha
  assert.equal(calculateScores({ m04_leavesRemoved: 1 }).breakdown.m04, 10);
  // 2 folhas (inclui bônus)
  assert.equal(calculateScores({ m04_leavesRemoved: 2 }).breakdown.m04, 30);
  // Katydid fora do habitat zera toda a missão
  assert.equal(calculateScores({ m04_leavesRemoved: 2, m04_katydidDisplaced: true }).breakdown.m04, 0);
  // Robô tocando ao final zera a missão
  assert.equal(calculateScores({ m04_leavesRemoved: 2, m04_touchingEquipment: true }).breakdown.m04, 0);
});

test('M05: Alternativas mutuamente exclusivas de expansão da raiz', () => {
  assert.equal(calculateScores({ m05_rootState: 'none' }).breakdown.m05, 0);
  assert.equal(calculateScores({ m05_rootState: 'partial' }).breakdown.m05, 10);
  assert.equal(calculateScores({ m05_rootState: 'complete' }).breakdown.m05, 20);
  assert.equal(calculateScores({ m05_rootState: 'complete', m05_touchingEquipment: true }).breakdown.m05, 0);
});

test('M06: Contagem de folhas depende estritamente da formiga tocando o ninho', () => {
  // 3 fragmentos, mas formiga NÃO está no ninho -> 0 pts
  assert.equal(calculateScores({ m06_antInNest: false, m06_leafFragments: 3 }).breakdown.m06, 0);
  // Formiga no ninho com 0 fragmentos -> 0 pts
  assert.equal(calculateScores({ m06_antInNest: true, m06_leafFragments: 0 }).breakdown.m06, 0);
  // Formiga no ninho com 2 fragmentos -> 20 pts
  assert.equal(calculateScores({ m06_antInNest: true, m06_leafFragments: 2 }).breakdown.m06, 20);
  // Formiga no ninho com 3 fragmentos -> 30 pts
  assert.equal(calculateScores({ m06_antInNest: true, m06_leafFragments: 3 }).breakdown.m06, 30);
  // Esperança fora do habitat zera M06
  assert.equal(calculateScores({ m06_antInNest: true, m06_leafFragments: 3, m06_katydidDisplaced: true }).breakdown.m06, 0);
});

test('M07: Bônus de conexão requer micélio completamente estendido', () => {
  // Conexões selecionadas mas micélio não estendido -> 0 pts
  assert.equal(calculateScores({ m07_myceliumExtended: false, m07_connections: 2 }).breakdown.m07, 0);
  // Micélio estendido sem conexões -> 20 pts
  assert.equal(calculateScores({ m07_myceliumExtended: true, m07_connections: 0 }).breakdown.m07, 20);
  // Micélio estendido com 1 conexão -> 30 pts
  assert.equal(calculateScores({ m07_myceliumExtended: true, m07_connections: 1 }).breakdown.m07, 30);
  // Micélio estendido com 2 conexões -> 40 pts
  assert.equal(calculateScores({ m07_myceliumExtended: true, m07_connections: 2 }).breakdown.m07, 40);
  // Robô tocando -> 0 pts
  assert.equal(calculateScores({ m07_myceliumExtended: true, m07_connections: 2, m07_touchingEquipment: true }).breakdown.m07, 0);
});

test('M14: Relação estrita entre os dois contadores de sementes', () => {
  // 3 sementes na estação, 2 tocando o tapete -> 3*5 + 2*5 = 25 pts
  assert.equal(calculateScores({ m14_seedsInStation: 3, m14_seedsTouchingMat: 2 }).breakdown.m14, 25);
  // Se tocandoTapete for maior que contidasNaEstação, deve ser limitado ao número de contidas
  assert.equal(calculateScores({ m14_seedsInStation: 2, m14_seedsTouchingMat: 4 }).breakdown.m14, 20); // 2*5 + 2*5 = 20
});

test('M15: Bônus ecológico condicional à conclusão da respectiva estrutura', () => {
  // Bônus selecionado 'canopy', mas canopy NÃO erguido -> não ganha bônus
  assert.equal(calculateScores({ m15_nestingCanopy: false, m15_ecologicalBonus: 'canopy' }).breakdown.m15, 0);
  // Bônus 'canopy' e canopy erguido -> 10 + 10 = 20 pts
  assert.equal(calculateScores({ m15_nestingCanopy: true, m15_ecologicalBonus: 'canopy' }).breakdown.m15, 20);
  // Todas as 3 estruturas erguidas + bônus de uma delas -> 10 + 10 + 10 + 10 = 40 pts
  assert.equal(calculateScores({
    m15_nestingCanopy: true,
    m15_gardenSkylight: true,
    m15_compostHatch: true,
    m15_ecologicalBonus: 'compost'
  }).breakdown.m15, 40);
});

test('M16: Tabela exata de fichas de precisão', () => {
  assert.equal(calculateScores({ m16_precisionTokens: 6 }).breakdown.m16, 50);
  assert.equal(calculateScores({ m16_precisionTokens: 5 }).breakdown.m16, 50);
  assert.equal(calculateScores({ m16_precisionTokens: 4 }).breakdown.m16, 35);
  assert.equal(calculateScores({ m16_precisionTokens: 3 }).breakdown.m16, 25);
  assert.equal(calculateScores({ m16_precisionTokens: 2 }).breakdown.m16, 15);
  assert.equal(calculateScores({ m16_precisionTokens: 1 }).breakdown.m16, 10);
  assert.equal(calculateScores({ m16_precisionTokens: 0 }).breakdown.m16, 0);
});

test('Compartilhamento: Codificação e decodificação reproduzem exatamente o estado e a pontuação', () => {
  const originalState = {
    teamName: 'Tera Robotics Alpha',
    roundName: 'Round Oficial 2',
    inspectionSmallArea: true,
    m01_droneLaunched: true,
    m01_lidarBonus: true,
    m02_seedsReleased: 2,
    m05_rootState: 'complete',
    m06_antInNest: true,
    m06_leafFragments: 3,
    m14_seedsInStation: 4,
    m14_seedsTouchingMat: 4,
    m16_precisionTokens: 4
  };

  const encoded = encodeRoundState(originalState);
  assert.ok(encoded && encoded.length > 0, 'Deve gerar string codificada válida');

  const restored = decodeRoundState(encoded);
  assert.equal(restored.teamName, originalState.teamName);
  assert.equal(restored.roundName, originalState.roundName);
  assert.equal(restored.m01_droneLaunched, true);
  assert.equal(restored.m01_lidarBonus, true);
  assert.equal(restored.m02_seedsReleased, 2);
  assert.equal(restored.m05_rootState, 'complete');

  const scoreOriginal = calculateScores(originalState);
  const scoreRestored = calculateScores(restored);
  assert.equal(scoreRestored.total, scoreOriginal.total);
});
