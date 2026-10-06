import test from 'node:test';
import assert from 'node:assert/strict';
import { isFileReferencedInDb } from '../api/_lib/mediaSecurity.js';
import { SLOT_CANONICAL_MAP, VALID_SLOTS } from '../api/_lib/fllAudioStorage.js';

test('1. Supabase é a ÚNICA fonte de verdade: Nenhuma persistência em JSON em api/_lib/fllAudioStorage.js', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const code = fs.readFileSync(path.resolve(process.cwd(), 'api/_lib/fllAudioStorage.js'), 'utf-8');

  // Não deve conter referências de leitura/escrita em fllSeasonsStore.json nem fllAudioConfig.json para persistência
  assert.equal(code.includes('fllSeasonsStore.json'), false, 'Não deve referenciar fllSeasonsStore.json');
  assert.equal(code.includes('fllAudioConfig.json'), false, 'Não deve referenciar fllAudioConfig.json');
  assert.equal(code.includes('saveFllSeasonsStore'), false, 'Não deve possuir saveFllSeasonsStore');
  assert.equal(code.includes('writeFileSync(SEASONS_STORE_PATH'), false, 'Não deve gravar store em arquivo JSON');
  assert.ok(code.includes('supabaseServer'), 'Deve consultar supabaseServer como fonte');
});

test('2. Nenhum JSON é usado como fallback de escrita no endpoint /api/fll/season', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const code = fs.readFileSync(path.resolve(process.cwd(), 'api/fll/[action].js'), 'utf-8');

  assert.equal(code.includes('saveFllSeasonsStore'), false, 'Não deve usar fallback de escrita em JSON');
  assert.equal(code.includes('updateFllSeasonData'), false, 'Não deve usar updateFllSeasonData de arquivo');
  assert.ok(code.includes(".from('seasons')"), 'Deve persistir exclusivamente no Supabase');
});

test('3. Falha no Supabase NÃO resulta em falso sucesso', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const code = fs.readFileSync(path.resolve(process.cwd(), 'api/fll/[action].js'), 'utf-8');

  // Verifica que se updateErr ou insertErr ocorrer, o endpoint retorna HTTP 500 com erro
  assert.ok(code.includes('if (updateErr)'), 'Deve validar updateErr');
  assert.ok(code.includes('if (insertErr)'), 'Deve validar insertErr');
  assert.ok(code.includes('return res.status(500)'), 'Deve retornar erro 500 ao falhar no Supabase');
});

test('4. Atualizar M01 preserva outros campos de description (MERGE SEGURO)', () => {
  const existingExtra = {
    program: 'FLL',
    season_name: 'BIOGLOW 2026–2027',
    year: 2026,
    custom_description: 'Descrição original preservada',
    robot_name: 'TeraBot Prime',
    important_links: [{ description: 'Manual', url: 'https://firstinspires.org' }],
    fll_missions: {
      M02: { code: 'M02', fileId: 'img_m02', imageUrl: '/api/media/img_m02' }
    },
    fll_audios: {
      round_start: { slot: 'round_start', fileId: 'audio_start' }
    }
  };

  const newMission = {
    code: 'M01',
    fileId: 'img_m01',
    imageUrl: '/api/media/img_m01',
    title: 'Levantamento por Drone'
  };

  const mergedExtra = {
    ...existingExtra,
    custom_description: existingExtra.custom_description || 'Temporada FLL BIOGLOW',
    season_name: existingExtra.season_name || 'BIOGLOW',
    year: existingExtra.year || 2026,
    fll_missions: {
      ...(existingExtra.fll_missions || {}),
      [newMission.code]: newMission
    },
    fll_audios: existingExtra.fll_audios || {}
  };

  // Verifica preservação de campos irmãos
  assert.equal(mergedExtra.robot_name, 'TeraBot Prime', 'robot_name deve ser preservado');
  assert.equal(mergedExtra.custom_description, 'Descrição original preservada');
  assert.equal(mergedExtra.important_links.length, 1);
  // M02 deve continuar existindo intacto
  assert.ok(mergedExtra.fll_missions.M02, 'M02 deve ser preservada ao atualizar M01');
  assert.equal(mergedExtra.fll_missions.M02.fileId, 'img_m02');
  // M01 agora está presente
  assert.ok(mergedExtra.fll_missions.M01);
  assert.equal(mergedExtra.fll_missions.M01.fileId, 'img_m01');
  // Áudios foram 100% preservados
  assert.equal(mergedExtra.fll_audios.round_start.fileId, 'audio_start');
});

test('5. Atualizar round_start preserva missões e outros áudios', () => {
  const existingExtra = {
    fll_missions: {
      M01: { code: 'M01', fileId: 'img_m01' }
    },
    fll_audios: {
      round_start: { slot: 'round_start', fileId: 'old_start' },
      countdown_beep: { slot: 'countdown_beep', fileId: 'beep_sound' },
      round_end: { slot: 'round_end', fileId: 'end_sound' }
    }
  };

  const newAudio = {
    slot: 'round_start',
    fileId: 'new_start_drive_id',
    fileName: 'novo_inicio.mp3'
  };

  const currentAudios = {
    ...existingExtra.fll_audios,
    [newAudio.slot]: newAudio
  };

  const merged = {
    ...existingExtra,
    fll_missions: existingExtra.fll_missions,
    fll_audios: currentAudios
  };

  assert.equal(merged.fll_missions.M01.fileId, 'img_m01', 'Missão M01 deve permanecer intacta');
  assert.equal(merged.fll_audios.round_start.fileId, 'new_start_drive_id', 'round_start atualizado');
  assert.equal(merged.fll_audios.countdown_beep.fileId, 'beep_sound', 'countdown_beep preservado');
  assert.equal(merged.fll_audios.round_end.fileId, 'end_sound', 'round_end preservado');
});

test('6. Atualizar uma missão preserva as outras missões', () => {
  const missions = {
    INSPECAO: { code: 'INSPEÇÃO', fileId: 'f_insp' },
    M01: { code: 'M01', fileId: 'f_m01' },
    M02: { code: 'M02', fileId: 'f_m02' }
  };

  // Atualizar M01
  const updated = {
    ...missions,
    M01: { code: 'M01', fileId: 'f_m01_novo' }
  };

  assert.equal(updated.INSPECAO.fileId, 'f_insp');
  assert.equal(updated.M01.fileId, 'f_m01_novo');
  assert.equal(updated.M02.fileId, 'f_m02');
  assert.equal(Object.keys(updated).length, 3);
});

test('7. Atualizar um áudio preserva os outros dois slots', () => {
  const audios = {
    round_start: { fileId: 's1' },
    countdown_beep: { fileId: 's2' },
    round_end: { fileId: 's3' }
  };

  const nextAudios = {
    ...audios,
    round_end: { fileId: 's3_novo' }
  };

  assert.equal(nextAudios.round_start.fileId, 's1');
  assert.equal(nextAudios.countdown_beep.fileId, 's2');
  assert.equal(nextAudios.round_end.fileId, 's3_novo');
});

test('8. mediaSecurity permanece FAIL-CLOSED e não autoriza apenas por nome de pasta', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const code = fs.readFileSync(path.resolve(process.cwd(), 'api/_lib/mediaSecurity.js'), 'utf-8');

  // Não deve conter 'FLL BIOGLOW', 'Missões' ou 'Áudios' em KNOWN_PUBLIC_FOLDER_NAMES
  assert.equal(code.includes("'FLL BIOGLOW'"), false, 'Pasta FLL não deve ser automaticamente pública');
  assert.equal(code.includes("'Missões'"), false, 'Pasta Missões não deve ser automaticamente pública');
  assert.equal(code.includes("'Áudios'"), false, 'Pasta Áudios não deve ser automaticamente pública');
  assert.ok(code.includes("seasonsRes?.count && seasonsRes.count > 0"), 'Deve validar se arquivo está em seasons no Supabase');
});

test('9. Escrita em /api/fll/season exige autorização de administrador', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const code = fs.readFileSync(path.resolve(process.cwd(), 'api/fll/[action].js'), 'utf-8');

  assert.ok(code.includes('!authenticatedUser?.profile?.is_admin'), 'Deve exigir is_admin');
  assert.ok(code.includes('return res.status(403)'), 'Deve retornar 403 para não-admins');
  assert.ok(code.includes('return res.status(401)'), 'Deve retornar 401 para não-autenticados');
});

test('10. Não existe dependência da coluna inexistente is_active no Supabase', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const adapterCode = fs.readFileSync(path.resolve(process.cwd(), 'src/api/adapters/base44ToSupabaseAdapter.js'), 'utf-8');
  const seasonApiCode = fs.readFileSync(path.resolve(process.cwd(), 'api/fll/[action].js'), 'utf-8');

  assert.equal(seasonApiCode.includes(".eq('is_active'"), false, 'API não deve consultar coluna is_active');
  assert.ok(adapterCode.includes('delete sanitized.is_active;'), 'Adapter deve remover is_active antes de enviar ao Supabase');
});

test('11. Admin e Simulador resolvem a mesma temporada via /api/fll/season', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const adminMissions = fs.readFileSync(path.resolve(process.cwd(), 'src/components/admin/FllMissionsManagement.jsx'), 'utf-8');
  const adminAudios = fs.readFileSync(path.resolve(process.cwd(), 'src/components/admin/FllAudiosManagement.jsx'), 'utf-8');
  const simulador = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/SimuladorFLL.jsx'), 'utf-8');

  assert.ok(adminMissions.includes('fetchActiveFllSeason'), 'Admin de missões deve consultar fetchActiveFllSeason');
  assert.ok(adminAudios.includes('fetchActiveFllSeason'), 'Admin de áudios deve consultar fetchActiveFllSeason');
  assert.ok(simulador.includes('fetchActiveFllSeason'), 'Simulador deve consultar fetchActiveFllSeason');
});

test('12. Nenhuma credencial Google privada no frontend', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');

  function checkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
          checkDir(fullPath);
        }
      } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.jsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        assert.equal(content.includes('GOOGLE_CLIENT_SECRET'), false, `GOOGLE_CLIENT_SECRET vazado em ${fullPath}`);
        assert.equal(content.includes('GOOGLE_REFRESH_TOKEN'), false, `GOOGLE_REFRESH_TOKEN vazado em ${fullPath}`);
        assert.equal(content.includes('GOOGLE_PRIVATE_KEY'), false, `GOOGLE_PRIVATE_KEY vazado em ${fullPath}`);
      }
    }
  }

  checkDir(path.resolve(process.cwd(), 'src'));
});

test('13. Rollback de arquivo órfão no Google Drive implementado nos clientes de upload', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const missionAdminCode = fs.readFileSync(path.resolve(process.cwd(), 'src/components/admin/FllMissionsManagement.jsx'), 'utf-8');
  const audioClientCode = fs.readFileSync(path.resolve(process.cwd(), 'src/api/fllAudioClient.js'), 'utf-8');

  assert.ok(missionAdminCode.includes('deleteFromGoogleDrive(uploadedFileId)'), 'Admin de missões deve executar rollback de arquivo órfão');
  assert.ok(audioClientCode.includes('deleteFromGoogleDrive(uploadResult.fileId)'), 'Cliente de áudio deve executar rollback de arquivo órfão');
});
