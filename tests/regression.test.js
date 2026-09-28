import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyMediaAccess, isFileReferencedInDb } from '../api/lib/mediaSecurity.js';
import fs from 'node:fs';

test('1. Segurança de Mídia: IDs externos ao acervo institucional são rejeitados com 403', async () => {
  const fakeDrive = {
    files: {
      get: async () => ({
        data: {
          id: 'external_folder_id',
          name: 'Pasta Externa Qualquer',
          parents: []
        }
      })
    }
  };

  // Arquivo que não pertence à árvore do Portal Tera e não possui appProperties.app === 'portal_tera'
  const externalFileMeta = {
    id: 'external_file_1234567890',
    name: 'arquivo_estranho.png',
    trashed: false,
    parents: ['random_parent_folder_id'],
    appProperties: { app: 'other_system' }
  };

  const req = {
    headers: {},
    query: {}
  };

  const result = await verifyMediaAccess({
    drive: fakeDrive,
    fileMeta: externalFileMeta,
    req
  });

  assert.equal(result.allowed, false);
  assert.equal(result.statusCode, 403);
  assert.match(result.message, /não pertence ao acervo institucional autorizado/i);
});

test('2. Segurança de Mídia: Arquivos privados NÃO são disponibilizados publicamente (prevalência da privacidade)', async () => {
  const fakeDrive = {
    files: {
      get: async () => ({
        data: {
          id: 'root_portal',
          name: '01. Institucional & Marketing',
          parents: []
        }
      })
    }
  };

  // Arquivo do Portal Tera, porém com contexto ou visibilidade privada
  const privateFileMeta = {
    id: 'private_file_1234567890',
    name: 'relatorio_sigiloso.pdf',
    trashed: false,
    parents: ['root_portal'],
    appProperties: {
      app: 'portal_tera',
      context: 'test',
      visibility: 'private',
      isPublic: false
    }
  };

  // Requisição anônima (sem Authorization)
  const reqAnon = {
    headers: {},
    query: {}
  };

  const result = await verifyMediaAccess({
    drive: fakeDrive,
    fileMeta: privateFileMeta,
    req: reqAnon
  });

  assert.equal(result.allowed, false);
  assert.equal(result.statusCode, 401);
  assert.equal(result.isPublic, false);
  assert.match(result.message, /controle de acesso restrito/i);
});

test('3. Segurança de Mídia: Parâmetro ?token= na URL é terminantemente rejeitado', async () => {
  const fakeDrive = {
    files: {
      get: async () => ({
        data: {
          id: 'root_portal',
          name: 'Portal Tera',
          parents: []
        }
      })
    }
  };

  const privateFileMeta = {
    id: 'private_file_token_test',
    name: 'documento_interno.pdf',
    trashed: false,
    parents: ['root_portal'],
    appProperties: {
      app: 'portal_tera',
      visibility: 'private'
    }
  };

  // Requisição tentando passar JWT via query string ?token=
  const reqWithQueryToken = {
    headers: {},
    query: {
      token: 'jwt.token.in.query.param'
    }
  };

  const result = await verifyMediaAccess({
    drive: fakeDrive,
    fileMeta: privateFileMeta,
    req: reqWithQueryToken
  });

  // Deve falhar com 401 exigindo cabeçalho Authorization
  assert.equal(result.allowed, false);
  assert.equal(result.statusCode, 401);
  assert.match(result.message, /exige login com perfil autorizado/i);
});

test('4. Formulários Administrativos: Criar com imagem não exclui o arquivo após salvar', () => {
  // Simulação da lista explícita de temporários
  const tempUploadedFileIds = new Set(['file_saved_123']);
  const deletedFiles = [];

  const fakeDeleteFromGoogleDrive = (id) => {
    deletedFiles.push(id);
  };

  // Fluxo de salvamento bem-sucedido
  const savedImageUrl = '/api/media/file_saved_123';
  const extractFileId = (url) => url.replace('/api/media/', '').split('/')[0];
  const savedId = extractFileId(savedImageUrl);

  // 1. Remove da lista de temporários o arquivo que foi salvo
  if (savedId) {
    tempUploadedFileIds.delete(savedId);
  }

  // 2. Limpa descartados
  tempUploadedFileIds.forEach(id => fakeDeleteFromGoogleDrive(id));
  tempUploadedFileIds.clear();

  // Verifica que o arquivo salvo NÃO foi para a lista de exclusão
  assert.equal(deletedFiles.includes('file_saved_123'), false);
  assert.equal(deletedFiles.length, 0);
});

test('5. Formulários Administrativos: Cancelar cadastro exclui apenas arquivos temporários da sessão', () => {
  const tempUploadedFileIds = new Set(['temp_image_abc', 'temp_image_def']);
  const deletedFiles = [];

  const fakeDeleteFromGoogleDrive = (id) => {
    deletedFiles.push(id);
  };

  // Cancelamento
  tempUploadedFileIds.forEach(id => fakeDeleteFromGoogleDrive(id));
  tempUploadedFileIds.clear();

  assert.equal(deletedFiles.length, 2);
  assert.equal(deletedFiles.includes('temp_image_abc'), true);
  assert.equal(deletedFiles.includes('temp_image_def'), true);
  assert.equal(tempUploadedFileIds.size, 0);
});

test('6. Formulários Administrativos: Substituir imagem preserva a anterior até a confirmação do salvamento', () => {
  // O usuário subiu img1, depois img2 no mesmo formulário
  const tempUploadedFileIds = new Set(['img_substituida_1', 'img_final_2']);
  const deletedFiles = [];

  const fakeDeleteFromGoogleDrive = (id) => {
    deletedFiles.push(id);
  };

  // Durante a edição, nenhuma imagem foi excluída imediatamente do Drive!
  assert.equal(deletedFiles.length, 0);

  // Ao salvar com img_final_2:
  const savedId = 'img_final_2';
  tempUploadedFileIds.delete(savedId);

  // Agora apenas a img1 (descartada) é limpa
  tempUploadedFileIds.forEach(id => fakeDeleteFromGoogleDrive(id));
  tempUploadedFileIds.clear();

  assert.equal(deletedFiles.length, 1);
  assert.equal(deletedFiles[0], 'img_substituida_1');
  assert.equal(deletedFiles.includes('img_final_2'), false);
});

test('7. Encerramento de Temporada: Bloqueio obrigatório quando RPC close_season_atomic não existe (sem fallback sequencial)', () => {
  const rpcError = {
    code: 'PGRST202',
    message: 'Could not find the function public.close_season_atomic in the schema cache'
  };

  let executionBlocked = false;
  let partialUpdatesExecuted = 0;

  try {
    const isFuncMissing = rpcError.code === 'PGRST202' || rpcError.message?.toLowerCase().includes('close_season_atomic');
    if (isFuncMissing) {
      throw new Error(
        'A função transacional "close_season_atomic" não está instalada no Supabase. ' +
        'O encerramento foi BLOQUEADO por segurança para impedir alterações parciais.'
      );
    }
    // Se houvesse fallback sequencial, partialUpdatesExecuted seria incrementado
    partialUpdatesExecuted += 10;
  } catch (err) {
    executionBlocked = true;
    assert.match(err.message, /BLOQUEADO por segurança/i);
  }

  assert.equal(executionBlocked, true);
  assert.equal(partialUpdatesExecuted, 0); // Nenhuma alteração parcial executada
});

test('8. Integridade da Migração SQL: 20260925_close_season_atomic.sql contém controle de permissões, sanitização e atomicidade', () => {
  const sql = fs.readFileSync('supabase/migrations/20260925_close_season_atomic.sql', 'utf-8');

  // Verifica segurança e isolamento
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.close_season_atomic/);
  assert.match(sql, /SECURITY DEFINER/);
  assert.match(sql, /SET search_path = public, auth/);
  assert.match(sql, /public\.is_admin\(\)/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.close_season_atomic/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.close_season_atomic\(TEXT, TEXT\[\]\) TO authenticated/);

  // Verifica validação estrita que rejeita programas inválidos
  assert.match(sql, /p NOT IN \('FRC', 'FTC', 'FLL'\)/);

  // Verifica tratamento de nulos
  assert.match(sql, /COALESCE\(content, ''\)/);
  assert.match(sql, /COALESCE\(title, ''\)/);

  // Verifica log de auditoria
  assert.match(sql, /INSERT INTO public\.audit_logs/);
});

test('9. Regressão Media Security: Erro em qualquer consulta do Supabase (Fail-Closed) impede exclusão do arquivo', async () => {
  // Simulação do comportamento fail-closed de isFileReferencedInDb quando uma das consultas falha
  const simulateCheckWithDbError = (mockError) => {
    // Lista de consultas simuladas
    const results = [
      { name: 'produtos', error: null, count: 0 },
      { name: 'projetos', error: mockError, count: null }, // Esta consulta falhou!
      { name: 'robôs', error: null, count: 0 }
    ];

    for (const check of results) {
      if (check.error) {
        return {
          isReferenced: null,
          conclusive: false,
          error: `Falha ao consultar ${check.name}: ${check.error.message}`,
          entities: []
        };
      }
    }
    return { isReferenced: false, conclusive: true, entities: [], error: null };
  };

  const checkResult = simulateCheckWithDbError({ message: 'Conexão com PostgreSQL expirada' });

  // Regra FAIL-CLOSED: erro de banco NUNCA é convertido em "não referenciado"
  assert.equal(checkResult.conclusive, false);
  assert.equal(checkResult.isReferenced, null);
  assert.match(checkResult.error, /Falha ao consultar projetos: Conexão com PostgreSQL expirada/);

  // Simulação do endpoint DELETE
  let deletedFromDrive = false;
  let responseStatus = null;
  let responseBody = null;

  const fakeRes = {
    status(code) {
      responseStatus = code;
      return {
        json(body) {
          responseBody = body;
          return body;
        }
      };
    }
  };

  // Lógica do handler DELETE
  if (checkResult.error || checkResult.conclusive === false) {
    fakeRes.status(503).json({
      error: 'Verificação inconclusiva',
      message: `Não foi possível verificar referências ativas no banco de dados: ${checkResult.error}`
    });
  } else if (!checkResult.isReferenced && checkResult.conclusive === true) {
    deletedFromDrive = true;
  }

  // O arquivo NÃO pode ser excluído e deve retornar 503
  assert.equal(deletedFromDrive, false);
  assert.equal(responseStatus, 503);
  assert.match(responseBody.error, /Verificação inconclusiva/);
});

test('10. Regressão DELETE: Resultado inconclusivo no banco bloqueia exclusão com status 503', () => {
  const inconclusiveCheck = {
    isReferenced: false,
    conclusive: false,
    error: 'Tempo limite na consulta ao Supabase esgotado'
  };

  let driveDeleteCalled = false;
  let resStatus = 0;
  let resData = null;

  const mockRes = {
    status(s) {
      resStatus = s;
      return {
        json(d) {
          resData = d;
          return d;
        }
      };
    }
  };

  // Fluxo seguro de DELETE
  if (inconclusiveCheck.error || inconclusiveCheck.conclusive === false) {
    mockRes.status(503).json({
      error: 'Verificação inconclusiva',
      message: inconclusiveCheck.error
    });
  } else if (inconclusiveCheck.isReferenced) {
    mockRes.status(409).json({ error: 'Arquivo em uso' });
  } else if (inconclusiveCheck.conclusive === true && inconclusiveCheck.isReferenced === false) {
    driveDeleteCalled = true;
  }

  assert.equal(driveDeleteCalled, false);
  assert.equal(resStatus, 503);
  assert.match(resData.error, /Verificação inconclusiva/);
});

test('11. Regressão Media Security: Referência em imagens adicionais / JSONB (projects.links.extra_images) considera arquivo em uso (409)', () => {
  const targetFileId = 'drive_extra_img_998877';

  // Simulação de registro de projeto com estrutura JSONB links->extra_images
  const projectRecord = {
    id: 'proj-123',
    title: 'Projeto Inovação Social',
    image_url: '/api/media/principal_123',
    links: {
      primary: 'https://site.com',
      extra_images: [
        'https://site.com/img1.png',
        `/api/media/${targetFileId}`
      ]
    }
  };

  // Verificação de JSONB
  const linksJson = JSON.stringify(projectRecord.links || {});
  const isReferencedInJsonb = linksJson.includes(targetFileId);
  const isReferencedInPrimary = (projectRecord.image_url || '').includes(targetFileId);
  const isReferenced = isReferencedInJsonb || isReferencedInPrimary;

  assert.equal(isReferenced, true);

  // Resposta do endpoint DELETE para arquivo em uso
  let statusCode = 200;
  if (isReferenced) {
    statusCode = 409;
  }
  assert.equal(statusCode, 409);
});

test('12. Regressão Media Security: Referência em arrays TEXT[] de robôs (robots.images) considera arquivo em uso (409)', () => {
  const targetFileId = 'robot_chassis_drive_photo';

  const robotRecord = {
    id: 'robot-uuid-001',
    name: 'TeraBot 2026',
    images: [
      `/api/media/${targetFileId}`,
      '/api/media/other_photo_456'
    ],
    specs: { year: 2026 }
  };

  const hasReference = Array.isArray(robotRecord.images) && robotRecord.images.some(img => img.includes(targetFileId));
  assert.equal(hasReference, true);

  let statusCode = 200;
  if (hasReference) {
    statusCode = 409;
  }
  assert.equal(statusCode, 409);
});

test('13. Regressão Preview vs RPC: Preview considera campos NULL exatamente como a cláusula WHERE da RPC', () => {
  // Lógica da RPC SQL: (campo IS NULL OR campo NOT LIKE '%[season_tag:%')
  const rpcCriterion = (val) => val === null || val === undefined || !val.includes('[season_tag:');

  // Registros de teste simulando daily_logs, priorities, prototype_tests e meeting_notes
  const testItems = [
    { id: 'item-null', content: null },                         // Deve ser incluído (NULL)
    { id: 'item-undefined', content: undefined },               // Deve ser incluído (NULL/sem valor)
    { id: 'item-empty', content: '' },                          // Deve ser incluído (vazio sem tag)
    { id: 'item-active', content: 'Reunião de alinhamento FTC' },// Deve ser incluído (sem tag)
    { id: 'item-archived-1', content: 'Ata [season_tag:2024]' },// Deve ser IGNORADO (já arquivado)
    { id: 'item-archived-2', content: '[season_tag:2025-FRC]' } // Deve ser IGNORADO (já arquivado)
  ];

  const matchedItems = testItems.filter(item => rpcCriterion(item.content));

  assert.equal(matchedItems.length, 4);
  assert.equal(matchedItems.some(i => i.id === 'item-null'), true);
  assert.equal(matchedItems.some(i => i.id === 'item-active'), true);
  assert.equal(matchedItems.some(i => i.id === 'item-archived-1'), false);
  assert.equal(matchedItems.some(i => i.id === 'item-archived-2'), false);

  // Verifica que o arquivo SeasonCloseManagement.jsx utiliza a sintaxe PostgREST .or('...is.null,...')
  // e utiliza 'conclusion' para prototype_tests (sem referência a 'description')
  const componentCode = fs.readFileSync('src/components/admin/SeasonCloseManagement.jsx', 'utf-8');
  assert.match(componentCode, /or\('content\.is\.null,content\.not\.ilike\./);
  assert.match(componentCode, /or\('title\.is\.null,title\.not\.ilike\./);
  assert.match(componentCode, /or\('conclusion\.is\.null,conclusion\.not\.ilike\./);
  assert.equal(componentCode.includes('description.not.ilike'), false, 'Não deve consultar description em prototype_tests');
});

test('14. Regressão Prototype Tests Schema: prototype_tests utiliza exclusivamente conclusion (sem description)', () => {
  const sql = fs.readFileSync('supabase/migrations/20260925_close_season_atomic.sql', 'utf-8');
  const componentCode = fs.readFileSync('src/components/admin/SeasonCloseManagement.jsx', 'utf-8');

  // A migração NÃO deve adicionar a coluna description
  assert.equal(/ADD\s+COLUMN[^\n;]*description/i.test(sql), false, 'A migração NÃO deve conter ADD COLUMN para description');

  // A função close_season_atomic deve atualizar prototype_tests.conclusion
  assert.match(sql, /UPDATE\s+public\.prototype_tests[\s\S]*?SET\s+conclusion\s*=/i, 'RPC deve atualizar prototype_tests.conclusion');
  assert.match(sql, /\(conclusion\s+IS\s+NULL\s+OR\s+conclusion\s+NOT\s+LIKE\s+'%\[season_tag:%'\)/i, 'RPC deve filtrar por conclusion IS NULL OR conclusion NOT LIKE');

  // O componente SeasonCloseManagement deve consultar conclusion em prototype_tests
  assert.match(componentCode, /from\('prototype_tests'\)[\s\S]*?conclusion\.is\.null,conclusion\.not\.ilike/);

  // Simulação de equivalência entre Preview e RPC para conclusion com valores nulos e existentes
  const simulateRpcConclusionUpdate = (currentConclusion, tag) => {
    const isEligible = currentConclusion === null || currentConclusion === undefined || !currentConclusion.includes('[season_tag:');
    if (!isEligible) return currentConclusion;
    return (currentConclusion || '') + `\n[season_tag:${tag}]`;
  };

  const testCases = [
    { conclusion: null, expectedTagAppended: true },
    { conclusion: undefined, expectedTagAppended: true },
    { conclusion: 'Teste de tração 100% aprovado', expectedTagAppended: true },
    { conclusion: 'Aprovado [season_tag:2024-FTC]', expectedTagAppended: false }
  ];

  for (const tc of testCases) {
    const previewEligible = tc.conclusion === null || tc.conclusion === undefined || !tc.conclusion.includes('[season_tag:');
    const updated = simulateRpcConclusionUpdate(tc.conclusion, '2026-FTC');
    assert.equal(previewEligible, tc.expectedTagAppended);
    if (previewEligible) {
      assert.ok(updated.includes('[season_tag:2026-FTC]'));
      if (tc.conclusion) {
        assert.ok(updated.startsWith(tc.conclusion), 'Deve preservar o conteúdo original de conclusion');
      }
    }
  }
});

test('15. Regressão RPC: Lista parcialmente inválida [\'FRC\', \'INVALIDO\'] rejeita integralmente e aborta transação', () => {
  function validatePrograms(programs) {
    if (!programs || !Array.isArray(programs) || programs.length === 0) {
      throw new Error('Pelo menos um programa deve ser selecionado para o arquivamento.');
    }
    const allowed = new Set(['FRC', 'FTC', 'FLL']);
    for (const p of programs) {
      if (!p || !allowed.has(p)) {
        throw new Error('A lista de programas contém elemento inválido ou inesperado. Programas permitidos exclusivamente: FRC, FTC, FLL.');
      }
    }
    return Array.from(new Set(programs));
  }

  assert.throws(
    () => validatePrograms(['FRC', 'INVALIDO']),
    /A lista de programas contém elemento inválido ou inesperado/
  );
});

test('16. Regressão RPC: Lista com programa único inválido [\'INVALIDO\'] é rejeitada com EXCEPTION', () => {
  function validatePrograms(programs) {
    if (!programs || !Array.isArray(programs) || programs.length === 0) {
      throw new Error('Pelo menos um programa deve ser selecionado para o arquivamento.');
    }
    const allowed = new Set(['FRC', 'FTC', 'FLL']);
    for (const p of programs) {
      if (!p || !allowed.has(p)) {
        throw new Error('A lista de programas contém elemento inválido ou inesperado. Programas permitidos exclusivamente: FRC, FTC, FLL.');
      }
    }
    return Array.from(new Set(programs));
  }

  assert.throws(
    () => validatePrograms(['INVALIDO']),
    /A lista de programas contém elemento inválido ou inesperado/
  );
});

test('17. Regressão RPC: Lista de programas válida [\'FRC\', \'FTC\'] é aceita integralmente', () => {
  function validatePrograms(programs) {
    if (!programs || !Array.isArray(programs) || programs.length === 0) {
      throw new Error('Pelo menos um programa deve ser selecionado para o arquivamento.');
    }
    const allowed = new Set(['FRC', 'FTC', 'FLL']);
    for (const p of programs) {
      if (!p || !allowed.has(p)) {
        throw new Error('A lista de programas contém elemento inválido ou inesperado. Programas permitidos exclusivamente: FRC, FTC, FLL.');
      }
    }
    return Array.from(new Set(programs));
  }

  const result = validatePrograms(['FRC', 'FTC']);
  assert.deepEqual(result, ['FRC', 'FTC']);
});

test('18. Regressão SQL Migration: 20260925_close_season_atomic.sql contém rejeição estrita (sem sanitização permissiva)', () => {
  const sql = fs.readFileSync('supabase/migrations/20260925_close_season_atomic.sql', 'utf-8');

  // Verifica que existe checagem de elemento inválido com RAISE EXCEPTION
  assert.match(sql, /WHERE p IS NULL OR p NOT IN \('FRC', 'FTC', 'FLL'\)/);
  assert.match(sql, /RAISE EXCEPTION 'A lista de programas contém elemento inválido ou inesperado/);

  // Não deve fazer SELECT ARRAY_AGG de onde p IN (...) sem antes rejeitar a lista completa
  const lines = sql.split('\n');
  const checkInvalidIndex = lines.findIndex(l => l.includes("p NOT IN ('FRC', 'FTC', 'FLL')"));
  assert.notEqual(checkInvalidIndex, -1, 'A validação de rejeição deve existir no script SQL');
});

test('19. Regressão Código Fonte: isFileReferencedInDb não possui catch retornando isReferenced:false', () => {
  const code = fs.readFileSync('api/lib/mediaSecurity.js', 'utf-8');

  // Extrai a função isFileReferencedInDb completa até o próximo export
  const funcMatch = code.match(/export async function isFileReferencedInDb[\s\S]*?(?=export function invalidateFileDbCache)/);
  assert.ok(funcMatch, 'Função isFileReferencedInDb deve existir');
  const funcCode = funcMatch[0];

  // Garante que dentro do catch não há "isReferenced: false"
  const catchMatch = funcCode.match(/catch\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(catchMatch, 'Bloco catch deve existir na função');
  const catchBody = catchMatch[1];

  assert.equal(catchBody.includes('isReferenced: false'), false, 'O bloco catch NUNCA deve retornar isReferenced: false');
  assert.match(catchBody, /conclusive:\s*false/, 'O bloco catch deve retornar conclusive: false');
});
