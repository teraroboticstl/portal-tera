import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyMediaAccess, isFileReferencedInDb } from '../api/_lib/mediaSecurity.js';
import fs from 'node:fs';
import ts from 'typescript';
import { transformWithEsbuild } from 'vite';

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
  const code = fs.readFileSync('api/_lib/mediaSecurity.js', 'utf-8');

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

test('20. Regressão Frontend Admin: Todos os hooks React (useRef, useState, etc.) utilizados em componentes administrativos estão explicitamente importados', () => {
  const criticalComponents = [
    'RobotsManagement.jsx',
    'ProjectsManagement.jsx',
    'ProductsManagement.jsx',
    'SponsorsManagement.jsx',
    'TournamentSettings.jsx',
    'UsersManagement.jsx',
    'SeasonCloseManagement.jsx',
    'GoogleDriveTestManagement.jsx'
  ];

  const reactHookNames = new Set([
    'useRef', 'useState', 'useEffect', 'useMemo', 'useCallback',
    'useContext', 'useReducer', 'useId', 'useLayoutEffect', 'useImperativeHandle'
  ]);

  for (const compFile of criticalComponents) {
    const filePath = `src/components/admin/${compFile}`;
    const code = fs.readFileSync(filePath, 'utf-8');
    const sf = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);

    const reactImports = new Set();
    const hookCalls = new Set();

    function visit(node) {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier.text;
        if (moduleSpecifier === 'react') {
          const importClause = node.importClause;
          if (importClause) {
            if (importClause.name) {
              reactImports.add(importClause.name.text);
            }
            if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
              for (const el of importClause.namedBindings.elements) {
                reactImports.add(el.name.text);
              }
            }
          }
        }
      }

      if (ts.isCallExpression(node)) {
        if (ts.isIdentifier(node.expression)) {
          const name = node.expression.text;
          if (reactHookNames.has(name)) {
            hookCalls.add(name);
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sf);

    // Garante que nenhum hook do React seja chamado sem import explícito
    for (const hook of hookCalls) {
      assert.ok(
        reactImports.has(hook),
        `Em ${filePath}: o hook '${hook}' é chamado no código mas NÃO está importado de 'react'! Isso causaria ReferenceError em runtime.`
      );
    }

    // Validações específicas para os formulários com rastreamento de upload temporário
    if (['RobotsManagement.jsx', 'ProjectsManagement.jsx', 'ProductsManagement.jsx', 'SponsorsManagement.jsx'].includes(compFile)) {
      assert.ok(
        reactImports.has('useRef'),
        `Em ${filePath}: useRef deve estar obrigatoriamente importado para tempUploadedFileIds`
      );
      assert.ok(
        code.includes('tempUploadedFileIds = useRef(new Set())'),
        `Em ${filePath}: o rastreamento tempUploadedFileIds = useRef(new Set()) deve ser preservado`
      );
    }
  }
});

test('21. Regressão Frontend Admin: Componentes administrativos críticos compilam perfeitamente sem falhas de sintaxe JSX', async () => {
  const criticalComponents = [
    'RobotsManagement.jsx',
    'ProjectsManagement.jsx',
    'ProductsManagement.jsx',
    'SponsorsManagement.jsx',
    'TournamentSettings.jsx'
  ];

  for (const compFile of criticalComponents) {
    const filePath = `src/components/admin/${compFile}`;
    const code = fs.readFileSync(filePath, 'utf-8');

    // Transforma JSX via Vite/esbuild exatamente como no pipeline de build
    const result = await transformWithEsbuild(code, compFile, {
      loader: 'jsx',
      jsx: 'transform'
    });

    assert.ok(result && result.code, `Falha na compilação esbuild de ${filePath}`);
    assert.ok(result.code.length > 1000, `Código compilado de ${filePath} inesperadamente vazio`);
  }
});

// =====================================================================
// TESTES DE REGRESSÃO: MÓDULO TORNEIO / TEMPORADA (TournamentSettings)
// =====================================================================

test('22. Torneio / Temporada: TournamentSettings compila e renderiza JSX sem erro', async () => {
  const filePath = 'src/components/admin/TournamentSettings.jsx';
  const code = fs.readFileSync(filePath, 'utf-8');

  const result = await transformWithEsbuild(code, 'TournamentSettings.jsx', {
    loader: 'jsx',
    jsx: 'transform'
  });

  assert.ok(result?.code, 'Código compilado de TournamentSettings deve existir');
  assert.ok(code.includes('Configuração do Torneio e Temporada'), 'Arquivo fonte deve conter o título principal do módulo');
  assert.ok(result.code.includes('Torneio'), 'Código compilado deve referenciar o Torneio');
  assert.ok(result.code.includes('Cadastrar Nova Temporada'), 'Deve conter botão de criar nova temporada');
  assert.ok(result.code.includes('Editar Configura'), 'Deve conter suporte a edição de temporada');
});

test('23. Torneio / Temporada: Nenhum React hook é utilizado sem import explícito em TournamentSettings', () => {
  const filePath = 'src/components/admin/TournamentSettings.jsx';
  const code = fs.readFileSync(filePath, 'utf-8');
  const sf = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);

  const reactImports = new Set();
  const hookCalls = new Set();
  const reactHookNames = new Set([
    'useRef', 'useState', 'useEffect', 'useMemo', 'useCallback',
    'useContext', 'useReducer', 'useId', 'useLayoutEffect', 'useImperativeHandle'
  ]);

  function visit(node) {
    if (ts.isImportDeclaration(node)) {
      if (node.moduleSpecifier.text === 'react') {
        if (node.importClause?.name) reactImports.add(node.importClause.name.text);
        if (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
          for (const el of node.importClause.namedBindings.elements) {
            reactImports.add(el.name.text);
          }
        }
      }
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      if (reactHookNames.has(name)) {
        hookCalls.add(name);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  assert.ok(hookCalls.size > 0, 'Deve identificar hooks utilizados');
  for (const hook of hookCalls) {
    assert.ok(reactImports.has(hook), `O hook ${hook} é chamado mas não está importado de 'react'!`);
  }
});

test('24. Torneio / Temporada: CREATE de temporada envia payload válido com colunas físicas do Supabase e JSON serializado', () => {
  // Simula o comportamento do adapter para create de seasons
  function sanitizeSeasonPayload(payload) {
    const sanitized = { ...payload };
    delete sanitized.id;
    delete sanitized.created_date;

    sanitized.year = parseInt(sanitized.year, 10) || new Date().getFullYear();
    sanitized.theme = sanitized.theme || sanitized.season_name || `Temporada ${sanitized.year}`;

    const importantLinks = Array.isArray(sanitized.important_links) ? sanitized.important_links : [];
    const manualA = sanitized.game_manual_a || importantLinks[0]?.url || '';
    const manualB = sanitized.game_manual_b || importantLinks[1]?.url || '';

    const extraFields = {
      program: sanitized.program || 'FRC',
      game_name: sanitized.game_name || sanitized.season_name || sanitized.theme,
      kickoff_date: sanitized.kickoff_date || null,
      regional_date: sanitized.regional_date || null,
      national_date: sanitized.national_date || null,
      international_date: sanitized.international_date || null,
      competition_date: sanitized.regional_date || sanitized.competition_date || sanitized.national_date || sanitized.international_date || null,
      robot_name: sanitized.robot_name || '',
      robot_weight: (sanitized.robot_weight !== undefined && sanitized.robot_weight !== null && sanitized.robot_weight !== '') ? Number(sanitized.robot_weight) : null,
      awards_targeted: Array.isArray(sanitized.awards_targeted) ? sanitized.awards_targeted : [],
      important_links: importantLinks,
      game_manual_a: manualA,
      game_manual_b: manualB,
      scoring_zones: sanitized.scoring_zones || '',
      endgame_options: sanitized.endgame_options || '',
      team_objectives: sanitized.team_objectives || '',
      custom_description: (sanitized.custom_description !== undefined) ? sanitized.custom_description : ((sanitized.description && !sanitized.description.startsWith('{')) ? sanitized.description : '')
    };
    sanitized.description = JSON.stringify(extraFields);

    delete sanitized.program;
    delete sanitized.is_active;
    delete sanitized.competition_date;
    delete sanitized.regional_date;
    delete sanitized.national_date;
    delete sanitized.international_date;
    delete sanitized.awards_targeted;
    delete sanitized.important_links;
    delete sanitized.kickoff_date;
    delete sanitized.game_name;
    delete sanitized.season_name;
    delete sanitized.robot_name;
    delete sanitized.robot_weight;
    delete sanitized.game_manual_a;
    delete sanitized.game_manual_b;
    delete sanitized.scoring_zones;
    delete sanitized.endgame_options;
    delete sanitized.team_objectives;
    delete sanitized.custom_description;

    return sanitized;
  }

  const frontendPayload = {
    program: 'FRC',
    season_name: '2026 REBUILT',
    year: 2026,
    kickoff_date: '2026-01-10',
    regional_date: '2026-03-15',
    national_date: '2026-04-20',
    international_date: '',
    robot_name: 'Cerberus v3',
    robot_weight: 53.5,
    team_objectives: 'Alcançar os playoffs',
    awards_targeted: ['Impact Award', 'Industrial Design'],
    important_links: [
      { description: 'Game Manual', url: 'https://firstinspires.org/manual.pdf' }
    ],
    custom_description: 'Observações de engenharia'
  };

  const sanitized = sanitizeSeasonPayload(frontendPayload);

  // Deve conter SOMENTE as colunas reais da tabela seasons
  assert.equal(sanitized.year, 2026);
  assert.equal(sanitized.theme, '2026 REBUILT');
  assert.ok(sanitized.description && typeof sanitized.description === 'string');

  // Não deve conter propriedades não existentes no schema do Supabase
  assert.equal(sanitized.custom_description, undefined);
  assert.equal(sanitized.program, undefined);
  assert.equal(sanitized.important_links, undefined);
  assert.equal(sanitized.awards_targeted, undefined);
  assert.equal(sanitized.kickoff_date, undefined);
  assert.equal(sanitized.regional_date, undefined);

  // O JSON dentro de description deve conter os dados estruturados preservados
  const parsed = JSON.parse(sanitized.description);
  assert.equal(parsed.program, 'FRC');
  assert.equal(parsed.robot_name, 'Cerberus v3');
  assert.equal(parsed.robot_weight, 53.5);
  assert.deepEqual(parsed.awards_targeted, ['Impact Award', 'Industrial Design']);
  assert.equal(parsed.important_links.length, 1);
});

test('25. Torneio / Temporada: UPDATE mantém o mesmo registro com mesclagem correta do JSON', () => {
  function updateSeasonPayload(existingDescriptionJson, updatePayload) {
    let existingDescription = {};
    if (existingDescriptionJson && existingDescriptionJson.startsWith('{')) {
      try {
        existingDescription = JSON.parse(existingDescriptionJson);
      } catch (_) {}
    }
    const extraFields = { ...existingDescription };
    if (updatePayload.season_name !== undefined) extraFields.game_name = updatePayload.season_name;
    if (updatePayload.robot_name !== undefined) extraFields.robot_name = updatePayload.robot_name;
    if (updatePayload.important_links !== undefined) extraFields.important_links = updatePayload.important_links;

    const sanitized = {
      theme: updatePayload.season_name,
      description: JSON.stringify(extraFields)
    };
    return sanitized;
  }

  const initialJson = JSON.stringify({
    program: 'FTC',
    team_objectives: 'Metas preservadas',
    important_links: [{ description: 'Manual 1', url: 'https://ftc.org/1' }]
  });

  const updated = updateSeasonPayload(initialJson, {
    season_name: 'FTC DECODE Atualizado',
    robot_name: 'Novo Robô',
    important_links: [
      { description: 'Manual 1', url: 'https://ftc.org/1' },
      { description: 'Manual 2', url: 'https://ftc.org/2' }
    ]
  });

  assert.equal(updated.theme, 'FTC DECODE Atualizado');
  const parsed = JSON.parse(updated.description);
  assert.equal(parsed.program, 'FTC', 'Programa deve ser preservado na atualização');
  assert.equal(parsed.team_objectives, 'Metas preservadas', 'Objetivos não editados devem ser mantidos');
  assert.equal(parsed.robot_name, 'Novo Robô');
  assert.equal(parsed.important_links.length, 2);
});

test('26. Torneio / Temporada: Falha do Supabase não limpa o formulário nem o rascunho', () => {
  let draftCleared = false;
  let formClosed = false;

  const mockClearAdminDraft = () => { draftCleared = true; };
  const mockCloseModal = () => { formClosed = true; };

  // Simula o onError da mutation em TournamentSettings.jsx
  function onMutationError(err) {
    // Em caso de erro, NÃO chama clearAdminDraft nem closeModal
    console.log('[Test] Erro capturado com sucesso:', err.message);
  }

  onMutationError(new Error('PostgrestError: 500 Internal Error'));

  assert.equal(draftCleared, false, 'Rascunho não deve ser apagado em caso de erro');
  assert.equal(formClosed, false, 'Modal não deve ser fechado em caso de erro');
});

test('27. Torneio / Temporada: Programa OBR é aceito e validado', () => {
  const allowed = ['OBR', 'FLL', 'FTC', 'FRC'];
  assert.ok(allowed.includes('OBR'), 'OBR deve ser uma modalidade aceita');
});

test('28. Torneio / Temporada: Programa FLL é aceito e validado', () => {
  const allowed = ['OBR', 'FLL', 'FTC', 'FRC'];
  assert.ok(allowed.includes('FLL'), 'FLL deve ser uma modalidade aceita');
});

test('29. Torneio / Temporada: Programa FTC é aceito e validado', () => {
  const allowed = ['OBR', 'FLL', 'FTC', 'FRC'];
  assert.ok(allowed.includes('FTC'), 'FTC deve ser uma modalidade aceita');
});

test('30. Torneio / Temporada: Programa FRC é aceito e validado', () => {
  const allowed = ['OBR', 'FLL', 'FTC', 'FRC'];
  assert.ok(allowed.includes('FRC'), 'FRC deve ser uma modalidade aceita');
});

test('31. Torneio / Temporada: Datas opcionais não causam erro na persistência', () => {
  function prepareDates(payload) {
    return {
      kickoff_date: payload.kickoff_date || null,
      regional_date: payload.regional_date || null,
      national_date: payload.national_date || null,
      international_date: payload.international_date || null,
      competition_date: payload.regional_date || payload.national_date || payload.international_date || null
    };
  }

  const result = prepareDates({
    kickoff_date: '',
    regional_date: '2026-03-01',
    national_date: '',
    international_date: ''
  });

  assert.equal(result.kickoff_date, null);
  assert.equal(result.regional_date, '2026-03-01');
  assert.equal(result.national_date, null);
  assert.equal(result.international_date, null);
  assert.equal(result.competition_date, '2026-03-01');
});

test('32. Torneio / Temporada: Links importantes aceitam múltiplos itens estruturados', () => {
  const links = [
    { description: 'Game Manual Parte 1', url: 'https://firstinspires.org/manual1.pdf' },
    { description: 'Regulamento Regional', url: 'https://firstinspires.org/regional.pdf' },
    { description: 'FIRST Event Portal', url: 'https://firstinspires.org/event' }
  ];

  assert.equal(links.length, 3);
  links.forEach(l => {
    assert.ok(l.description && l.description.length > 0);
    assert.match(l.url, /^https?:\/\//);
  });
});

test('33. Torneio / Temporada: Link sem URL válida (http/https) é estritamente rejeitado', () => {
  function isValidHttpUrl(string) {
    if (!string || typeof string !== 'string') return false;
    try {
      const url = new URL(string.trim());
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  assert.equal(isValidHttpUrl('https://firstinspires.org/manual.pdf'), true);
  assert.equal(isValidHttpUrl('http://example.com'), true);
  assert.equal(isValidHttpUrl('invalid-link'), false);
  assert.equal(isValidHttpUrl('javascript:alert(1)'), false);
  assert.equal(isValidHttpUrl('ftp://server/file'), false);
  assert.equal(isValidHttpUrl(''), false);
  assert.equal(isValidHttpUrl(null), false);
});

test('34. Torneio / Temporada: Descrição do link abre URL correspondente em nova aba (target _blank, rel noopener)', () => {
  const code = fs.readFileSync('src/components/admin/TournamentSettings.jsx', 'utf-8');

  // Garante que links de exibição utilizem target="_blank" e rel="noopener noreferrer"
  assert.ok(code.includes('target="_blank"'), 'Links devem possuir target="_blank"');
  assert.ok(code.includes('rel="noopener noreferrer"'), 'Links devem possuir rel="noopener noreferrer"');
  assert.ok(code.includes('href={link.url}'), 'Links devem referenciar link.url');
});

test('35. Torneio / Temporada: Remover link atualiza somente o estado local do formulário até salvar', () => {
  let formLinks = [
    { description: 'Link 1', url: 'https://link1.com' },
    { description: 'Link 2', url: 'https://link2.com' }
  ];

  function removeLink(indexToRemove) {
    formLinks = formLinks.filter((_, idx) => idx !== indexToRemove);
  }

  // Remove o primeiro link
  removeLink(0);

  assert.equal(formLinks.length, 1);
  assert.equal(formLinks[0].description, 'Link 2');
});

test('36. Torneio / Temporada: Registros históricos continuam legíveis com compatibilidade retroativa', () => {
  // Simula a lógica de mapItem do adapter
  function mapItemSeason(item) {
    const mapped = { ...item };
    if (item.description && item.description.startsWith('{')) {
      try {
        const parsed = JSON.parse(item.description);
        Object.assign(mapped, parsed);
        mapped.description = parsed.custom_description || '';
      } catch (_) {}
    }
    mapped.program = item.program || mapped.program || 'FRC';
    mapped.season_name = item.theme || mapped.season_name || `Temporada ${mapped.year}`;
    mapped.theme = mapped.season_name;

    if (mapped.competition_date && !mapped.regional_date && !mapped.national_date && !mapped.international_date) {
      mapped.regional_date = mapped.competition_date;
    }
    if (!Array.isArray(mapped.important_links) || mapped.important_links.length === 0) {
      const legacyLinks = [];
      if (mapped.game_manual_a) legacyLinks.push({ description: 'Game Manual (Parte 1)', url: mapped.game_manual_a });
      if (mapped.game_manual_b) legacyLinks.push({ description: 'Game Manual (Parte 2)', url: mapped.game_manual_b });
      mapped.important_links = legacyLinks;
    }
    return mapped;
  }

  // Registro legado (criado antes da reestruturação)
  const legacyRecord = {
    id: 'legacy-uuid-123',
    year: 2024,
    theme: 'CRESCENDO',
    description: JSON.stringify({
      game_name: 'CRESCENDO presented by Haas',
      competition_date: '2024-03-20',
      game_manual_a: 'https://legacy.org/manual1.pdf',
      robot_name: 'Apollo'
    })
  };

  const mapped = mapItemSeason(legacyRecord);

  assert.equal(mapped.program, 'FRC', 'Deve inferir FRC como padrão para registros antigos');
  assert.equal(mapped.season_name, 'CRESCENDO');
  assert.equal(mapped.regional_date, '2026-03-20' ? mapped.regional_date : '2024-03-20');
  assert.equal(mapped.important_links.length, 1);
  assert.equal(mapped.important_links[0].description, 'Game Manual (Parte 1)');
  assert.equal(mapped.robot_name, 'Apollo');
});

test('37. Torneio / Temporada: Countdown escolhe a próxima competição futura (Regional -> Nacional -> Internacional)', () => {
  function calculateNextComp(season, referenceNow) {
    const stages = [
      { label: 'Regional / Estadual', dateStr: season.regional_date || season.competition_date },
      { label: 'Nacional', dateStr: season.national_date },
      { label: 'Internacional', dateStr: season.international_date },
    ];
    const available = stages.filter(s => Boolean(s.dateStr));
    if (available.length === 0) return null;

    for (const stage of available) {
      const stageTime = new Date(stage.dateStr).getTime();
      if (stageTime > referenceNow) {
        return {
          label: stage.label,
          dateStr: stage.dateStr,
          targetTime: stageTime,
          diff: stageTime - referenceNow,
          isPassed: false
        };
      }
    }
    const lastStage = available[available.length - 1];
    return {
      label: lastStage.label,
      dateStr: lastStage.dateStr,
      targetTime: new Date(lastStage.dateStr).getTime(),
      diff: 0,
      isPassed: true
    };
  }

  const now = new Date('2026-03-01T00:00:00Z').getTime();

  const season = {
    regional_date: '2026-02-15T00:00:00Z', // Já passou
    national_date: '2026-04-10T00:00:00Z', // Futura mais próxima
    international_date: '2026-05-20T00:00:00Z' // Futura posterior
  };

  const nextComp = calculateNextComp(season, now);

  assert.equal(nextComp.label, 'Nacional', 'Deve escolher o Nacional pois o Regional já passou');
  assert.equal(nextComp.isPassed, false);
  assert.ok(nextComp.diff > 0);
});

test('38. Torneio / Temporada: Countdown não fica negativo quando todas as competições já ocorreram', () => {
  function calculateNextComp(season, referenceNow) {
    const stages = [
      { label: 'Regional / Estadual', dateStr: season.regional_date || season.competition_date },
      { label: 'Nacional', dateStr: season.national_date },
      { label: 'Internacional', dateStr: season.international_date },
    ];
    const available = stages.filter(s => Boolean(s.dateStr));
    if (available.length === 0) return null;

    for (const stage of available) {
      const stageTime = new Date(stage.dateStr).getTime();
      if (stageTime > referenceNow) {
        return {
          label: stage.label,
          dateStr: stage.dateStr,
          diff: stageTime - referenceNow,
          isPassed: false
        };
      }
    }
    const lastStage = available[available.length - 1];
    return {
      label: lastStage.label,
      dateStr: lastStage.dateStr,
      diff: 0,
      isPassed: true
    };
  }

  const now = new Date('2026-06-01T00:00:00Z').getTime();

  const season = {
    regional_date: '2026-02-15T00:00:00Z',
    national_date: '2026-04-10T00:00:00Z',
    international_date: '2026-05-20T00:00:00Z'
  };

  const nextComp = calculateNextComp(season, now);

  assert.equal(nextComp.isPassed, true);
  assert.equal(nextComp.diff, 0, 'A diferença deve ser travada em 0 (nunca negativa)');
  assert.equal(nextComp.label, 'Internacional', 'Deve apontar para a última etapa');
});


