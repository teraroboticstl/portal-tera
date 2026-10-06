import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  BIOGLOW_MISSIONS_CATALOG,
  FLL_MISSION_STORAGE_KEY,
  getLocalMissionImages,
  saveLocalMissionImages,
  persistMissionImage,
  removeMissionImageAssociation
} from '../src/api/fllMissionsClient.js';

describe('Integração de Imagens das Missões FLL BIOGLOW com Google Drive e Portal Tera', () => {

  it('1. Catálogo oficial de missões possui 17 itens com código, títulos e descrições acessíveis padrão em português', () => {
    assert.equal(BIOGLOW_MISSIONS_CATALOG.length, 17);
    const codes = BIOGLOW_MISSIONS_CATALOG.map(m => m.code);
    assert.ok(codes.includes('INSPEÇÃO'));
    for (let i = 1; i <= 16; i++) {
      const code = `M${String(i).padStart(2, '0')}`;
      assert.ok(codes.includes(code), `Missão ${code} deve estar presente`);
    }

    // Valida títulos e textos alternativos padrão em português
    BIOGLOW_MISSIONS_CATALOG.forEach(mission => {
      assert.ok(mission.title && mission.title.length > 3, `Título válido para ${mission.code}`);
      assert.ok(mission.defaultAlt && mission.defaultAlt.length > 10, `Alt text descritivo em português para ${mission.code}`);
      assert.ok(typeof mission.maxScore === 'number' && mission.maxScore > 0, `Pontuação máxima definida para ${mission.code}`);
    });
  });

  it('2. Resolução de pastas do Google Drive direciona missões FLL para estrutura institucional oficial', async () => {
    const googleDriveCode = fs.readFileSync(path.resolve('./api/_lib/googleDrive.js'), 'utf-8');
    assert.match(
      googleDriveCode,
      /'fll-missions':\s*\[\s*'04\.\s*Torneios & Eventos',\s*'FLL BIOGLOW',\s*'Missões'\s*\]/,
      'fll-missions deve resolver para 04. Torneios & Eventos / FLL BIOGLOW / Missões'
    );
  });

  it('3. api/media/[id].js inclui fll-missions em ALLOWED_CONTEXTS e PUBLIC_CONTEXTS para entrega sem login', () => {
    const uploadCode = fs.readFileSync(path.resolve('./api/media/[id].js'), 'utf-8');
    assert.ok(uploadCode.includes("'fll-missions'"), 'media/[id].js deve listar fll-missions');
    
    // Verificar que fll-missions está dentro de PUBLIC_CONTEXTS
    const publicContextsMatch = uploadCode.match(/const\s+PUBLIC_CONTEXTS\s*=\s*new\s+Set\(\[([\s\S]*?)\]\);/);
    assert.ok(publicContextsMatch, 'PUBLIC_CONTEXTS deve existir no upload');
    assert.ok(publicContextsMatch[1].includes("'fll-missions'"), 'PUBLIC_CONTEXTS deve conter fll-missions');
  });

  it('4. api/_lib/mediaSecurity.js reconhece pastas da FLL como públicas e consulta seasons no Supabase', () => {
    const securityCode = fs.readFileSync(path.resolve('./api/_lib/mediaSecurity.js'), 'utf-8');
    assert.ok(securityCode.includes("'04. Torneios & Eventos'"), 'mediaSecurity deve reconhecer 04. Torneios & Eventos');
    assert.ok(securityCode.includes("from('seasons')"), 'mediaSecurity deve verificar registros em seasons');
  });

  it('5. Validação de formato e tamanho de arquivos segue os padrões da TeraShop (15MB e tipos de imagem)', () => {
    const adminComponent = fs.readFileSync(path.resolve('./src/components/admin/FllMissionsManagement.jsx'), 'utf-8');
    assert.ok(adminComponent.includes('15 * 1024 * 1024'), 'Tamanho máximo de 15MB validado');
    assert.ok(adminComponent.includes('image/jpeg'), 'Suporta JPG');
    assert.ok(adminComponent.includes('image/png'), 'Suporta PNG');
    assert.ok(adminComponent.includes('image/webp'), 'Suporta WEBP');
  });

  it('6. Remoção de associação desvincula imagem sem solicitar exclusão do Google Drive', async () => {
    const clientCode = fs.readFileSync(path.resolve('./src/api/fllMissionsClient.js'), 'utf-8');
    assert.ok(clientCode.includes('removeMissionImageAssociation'), 'removeMissionImageAssociation existe');
    
    // Não deve conter chamada de delete para o Drive dentro da remoção de associação da missão
    assert.ok(!clientCode.includes('drive.files.delete'), 'Desvinculação de missão não pode excluir arquivo do Google Drive');
  });

  it('7. BioglowMissionCard implementa ampliação (lightbox), proporção contida (object-contain) e tratamento de falha discreto', () => {
    const cardCode = fs.readFileSync(path.resolve('./src/components/fll/BioglowMissionCard.jsx'), 'utf-8');
    assert.ok(cardCode.includes('object-contain'), 'Preserva proporção da imagem com object-contain');
    assert.ok(cardCode.includes('isEnlarged'), 'Possui controle de ampliação / lightbox');
    assert.ok(cardCode.includes('imageError'), 'Trata erro de carregamento');
    assert.ok(cardCode.includes('ImageOff'), 'Exibe indicação discreta em falha sem interferir no card');
    assert.ok(cardCode.includes('aria-label') || cardCode.includes('role="button"'), 'Acessibilidade garantida no trigger de imagem');
  });

  it('8. SimuladorFLL passa imageUrl e imageAlt para todos os cards de missões', () => {
    const pageCode = fs.readFileSync(path.resolve('./src/pages/SimuladorFLL.jsx'), 'utf-8');
    assert.ok(pageCode.includes("fetchActiveFllSeason"), 'Carrega dados da temporada e missões');
    assert.ok(pageCode.includes("imageUrl={missionImages['INSPEÇÃO']?.imageUrl}"), 'Passa imageUrl para Inspeção');
    assert.ok(pageCode.includes("imageUrl={missionImages['M01']?.imageUrl}"), 'Passa imageUrl para M01');
    assert.ok(pageCode.includes("imageUrl={missionImages['M16']?.imageUrl}"), 'Passa imageUrl para M16');
  });

  it('9. Tabela de Critérios & Pontuações é colapsável com botão de expandir/ocultar', () => {
    const pageCode = fs.readFileSync(path.resolve('./src/pages/SimuladorFLL.jsx'), 'utf-8');
    assert.ok(pageCode.includes("showCriteriaTable"), 'Possui estado showCriteriaTable');
    assert.ok(pageCode.includes("setShowCriteriaTable"), 'Possui alternador setShowCriteriaTable');
    assert.ok(pageCode.includes("aria-expanded={showCriteriaTable}"), 'Acessibilidade com aria-expanded');
    assert.ok(pageCode.includes("Expandir Tabela"), 'Rótulo para expandir tabela');
    assert.ok(pageCode.includes("Ocultar Tabela"), 'Rótulo para ocultar tabela');
  });

  it('10. Cabeçalho unificado é compacto, fixo (sticky top-14), e reúne título, controles, cronômetro e pontuação', () => {
    const headerCode = fs.readFileSync(path.resolve('./src/components/fll/BioglowScoreHeader.jsx'), 'utf-8');
    assert.ok(headerCode.includes('sticky top-14'), 'Cabeçalho posicionado abaixo da navbar fixa do Portal Tera (top-14)');
    assert.ok(headerCode.includes('SIMULADOR DE ROUND'), 'Contém título SIMULADOR DE ROUND');
    assert.ok(headerCode.includes('| FLL BIOGLOW'), 'Contém subtítulo | FLL BIOGLOW');
    assert.ok(headerCode.includes('Iniciar') && headerCode.includes('Pausar') && headerCode.includes('Retomar'), 'Controle Iniciar -> Pausar -> Retomar');
    assert.ok(headerCode.includes('Zerar'), 'Botão Zerar presente');
    assert.ok(headerCode.includes('Salvar'), 'Botão Salvar presente');
    assert.ok(headerCode.includes('Compartilhar'), 'Botão Compartilhar presente');
    assert.ok(headerCode.includes('Pontos'), 'Identificação de Pontos na pontuação');
    assert.ok(headerCode.includes('formattedTime'), 'Exibe cronômetro formatado');
  });

});
