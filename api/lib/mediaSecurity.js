import { getRootFolderId } from './googleDrive.js';
import { supabaseServer, validateUserAuth } from './supabaseServer.js';

// Cache em memória para verificações de pastas e registros públicos (evita sobrecarga no Drive e Supabase)
const folderClassificationCache = new Map(); // folderId -> { isPublic: boolean, isPrivate: boolean, isPortal: boolean, name: string, expiresAt: number }
const publicRecordCache = new Map(); // fileId -> { isPublic: boolean, expiresAt: number }
const dbReferencesCache = new Map(); // fileId -> { isReferenced: boolean, entities: string[], expiresAt: number }
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos de cache

// Nomes de pastas reconhecidas públicas do Portal Tera
const KNOWN_PUBLIC_FOLDER_NAMES = new Set([
  '01. Institucional & Marketing',
  'Patrocinadores',
  'Destaques e Banners',
  'Memorial Histórico',
  '02. Produtos (TeraShop)',
  '03. Projetos Sociais',
  '04. Torneios & Eventos',
  'Galeria de Eventos',
  'TIR',
  'Robôs'
]);

// Nomes de pastas reconhecidamente restritas/privadas do Portal Tera
const KNOWN_PRIVATE_FOLDER_NAMES = new Set([
  '99. Testes do Sistema',
  '05. Engenharia & Temporadas',
  '99. Outros Arquivos'
]);

/**
 * Verifica se um fileId está ativamente referenciado em tabelas do Supabase.
 * Regra FAIL-CLOSED: Qualquer erro em qualquer consulta resulta em estado conclusivo=false e bloqueio.
 * Nunca converte erro de banco em "arquivo não referenciado".
 * @param {string} fileId
 * @returns {Promise<{ isReferenced: boolean | null, conclusive: boolean, entities: string[], error: string | null }>}
 */
export async function isFileReferencedInDb(fileId) {
  if (!fileId) {
    return { isReferenced: false, conclusive: true, entities: [], error: null };
  }

  const now = Date.now();
  const cached = dbReferencesCache.get(fileId);
  if (cached && cached.expiresAt > now && cached.conclusive) {
    return cached;
  }

  try {
    const searchPattern = `%${fileId}%`;

    // Consulta em TODAS as tabelas e estruturas que utilizam mídia no Portal Tera:
    // - products (image_url: TEXT)
    // - projects (image_url: TEXT, links: JSONB com links->>extra_images)
    // - sponsors (logo_url: TEXT)
    // - event_galleries (cover_image: TEXT)
    // - event_medias (media_url: TEXT)
    // - tir_fotos (url: TEXT)
    // - robots (images: TEXT[], specs: JSONB)
    // - tournament_memorials (images: TEXT[])
    const [
      productsRes,
      projectsRes,
      sponsorsRes,
      galleriesRes,
      mediasRes,
      tirRes,
      robotsRes,
      memorialsRes
    ] = await Promise.all([
      supabaseServer.from('products').select('id', { head: true, count: 'exact' }).ilike('image_url', searchPattern),
      supabaseServer.from('projects').select('id', { head: true, count: 'exact' }).or(`image_url.ilike.${searchPattern},links->>extra_images.ilike.${searchPattern}`),
      supabaseServer.from('sponsors').select('id', { head: true, count: 'exact' }).ilike('logo_url', searchPattern),
      supabaseServer.from('event_galleries').select('id', { head: true, count: 'exact' }).ilike('cover_image', searchPattern),
      supabaseServer.from('event_medias').select('id', { head: true, count: 'exact' }).ilike('media_url', searchPattern),
      supabaseServer.from('tir_fotos').select('id', { head: true, count: 'exact' }).ilike('url', searchPattern),
      supabaseServer.from('robots').select('id, images, specs'),
      supabaseServer.from('tournament_memorials').select('id, images')
    ]);

    // FAIL-CLOSED: Verificação explícita do result.error de cada consulta individual
    const queryChecks = [
      { name: 'produtos', res: productsRes },
      { name: 'projetos', res: projectsRes },
      { name: 'patrocinadores', res: sponsorsRes },
      { name: 'galerias de eventos', res: galleriesRes },
      { name: 'mídias de eventos', res: mediasRes },
      { name: 'fotos TIR', res: tirRes },
      { name: 'robôs', res: robotsRes },
      { name: 'memoriais de torneio', res: memorialsRes }
    ];

    for (const check of queryChecks) {
      if (check.res?.error) {
        console.error(`[mediaSecurity] Erro na consulta de ${check.name} para o arquivo ${fileId}:`, check.res.error);
        return {
          isReferenced: null,
          conclusive: false,
          error: `Falha ao consultar ${check.name}: ${check.res.error.message || 'Erro no banco de dados'}`,
          entities: []
        };
      }
    }

    const entities = [];
    if (productsRes?.count && productsRes.count > 0) entities.push('produtos');
    if (projectsRes?.count && projectsRes.count > 0) entities.push('projetos');
    if (sponsorsRes?.count && sponsorsRes.count > 0) entities.push('patrocinadores');
    if (galleriesRes?.count && galleriesRes.count > 0) entities.push('galerias de eventos');
    if (mediasRes?.count && mediasRes.count > 0) entities.push('mídias de eventos');
    if (tirRes?.count && tirRes.count > 0) entities.push('fotos TIR');

    // Validação de array TEXT[] e JSONB em robôs
    const hasRobotRef = Array.isArray(robotsRes?.data) && robotsRes.data.some(r => {
      const inImages = Array.isArray(r.images) && r.images.some(img => typeof img === 'string' && img.includes(fileId));
      const inSpecs = r.specs && JSON.stringify(r.specs).includes(fileId);
      return inImages || inSpecs;
    });
    if (hasRobotRef) entities.push('robôs');

    // Validação de array TEXT[] em memoriais de torneio
    const hasMemorialRef = Array.isArray(memorialsRes?.data) && memorialsRes.data.some(m => {
      return Array.isArray(m.images) && m.images.some(img => typeof img === 'string' && img.includes(fileId));
    });
    if (hasMemorialRef) entities.push('memoriais de torneio');

    const result = {
      isReferenced: entities.length > 0,
      conclusive: true,
      entities,
      error: null,
      expiresAt: now + CACHE_TTL_MS
    };

    dbReferencesCache.set(fileId, result);
    return result;
  } catch (err) {
    console.error(`[mediaSecurity] Exceção na verificação de integridade para ${fileId}:`, err.message);
    // FAIL-CLOSED: Retorna estado de erro inconclusivo, nunca ausência de vínculo
    return {
      isReferenced: null,
      conclusive: false,
      error: err.message || 'Erro inesperado ao verificar referências no banco de dados',
      entities: []
    };
  }
}

/**
 * Invalida o cache de referências no banco para um arquivo
 */
export function invalidateFileDbCache(fileId) {
  if (fileId) {
    publicRecordCache.delete(fileId);
    dbReferencesCache.delete(fileId);
  }
}

/**
 * Verifica se um fileId está associado a registros públicos ativos nas tabelas do Supabase
 * @param {string} fileId
 * @returns {Promise<boolean>}
 */
export async function isFileInPublicRecords(fileId) {
  if (!fileId) return false;

  const now = Date.now();
  const cached = publicRecordCache.get(fileId);
  if (cached && cached.expiresAt > now) {
    return cached.isPublic;
  }

  try {
    const searchPattern = `%${fileId}%`;

    const [
      products,
      projects,
      sponsors,
      galleries,
      eventMedias,
      tir,
      robots,
      memorials
    ] = await Promise.all([
      supabaseServer.from('products').select('id', { head: true, count: 'exact' }).ilike('image_url', searchPattern),
      supabaseServer.from('projects').select('id', { head: true, count: 'exact' }).or(`image_url.ilike.${searchPattern},links->>extra_images.ilike.${searchPattern}`),
      supabaseServer.from('sponsors').select('id', { head: true, count: 'exact' }).ilike('logo_url', searchPattern),
      supabaseServer.from('event_galleries').select('id', { head: true, count: 'exact' }).eq('is_public', true).ilike('cover_image', searchPattern),
      supabaseServer.from('event_medias').select('id', { head: true, count: 'exact' }).eq('is_public', true).ilike('media_url', searchPattern),
      supabaseServer.from('tir_fotos').select('id', { head: true, count: 'exact' }).ilike('url', searchPattern),
      supabaseServer.from('robots').select('id, images, specs'),
      supabaseServer.from('tournament_memorials').select('id, images')
    ]);

    const hasRobotPublic = Array.isArray(robots?.data) && robots.data.some(r => {
      const inImages = Array.isArray(r.images) && r.images.some(img => typeof img === 'string' && img.includes(fileId));
      const inSpecs = r.specs && JSON.stringify(r.specs).includes(fileId);
      return inImages || inSpecs;
    });

    const hasMemorialPublic = Array.isArray(memorials?.data) && memorials.data.some(m => {
      return Array.isArray(m.images) && m.images.some(img => typeof img === 'string' && img.includes(fileId));
    });

    const isPublic = Boolean(
      (products?.count && products.count > 0) ||
      (projects?.count && projects.count > 0) ||
      (sponsors?.count && sponsors.count > 0) ||
      (galleries?.count && galleries.count > 0) ||
      (eventMedias?.count && eventMedias.count > 0) ||
      (tir?.count && tir.count > 0) ||
      hasRobotPublic ||
      hasMemorialPublic
    );

    publicRecordCache.set(fileId, { isPublic, expiresAt: now + CACHE_TTL_MS });
    return isPublic;
  } catch (err) {
    console.warn(`[mediaSecurity] Falha na consulta de registros públicos para ${fileId}:`, err.message);
    return false;
  }
}

/**
 * Avalia se uma pasta do Google Drive pertence à hierarquia do Portal Tera e se é pública ou privada
 * @param {object} drive - Cliente do Google Drive
 * @param {string} folderId - ID da pasta
 * @param {string} rootFolderId - ID da pasta raiz do Portal Tera
 */
async function classifyFolder(drive, folderId, rootFolderId) {
  if (!folderId) return { isPublic: false, isPrivate: false, isPortal: false, name: '' };
  if (folderId === rootFolderId) {
    return { isPublic: false, isPrivate: false, isPortal: true, name: 'root' };
  }

  const now = Date.now();
  const cached = folderClassificationCache.get(folderId);
  if (cached && cached.expiresAt > now) {
    return cached;
  }

  try {
    const res = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, parents'
    });
    const folder = res.data;
    const folderName = folder.name || '';

    // Classificação preliminar da pasta atual
    let isKnownPublic = KNOWN_PUBLIC_FOLDER_NAMES.has(folderName);
    let isExplicitPrivate = KNOWN_PRIVATE_FOLDER_NAMES.has(folderName) || folderName.startsWith('Temporada ');

    // Verificar ascendência até rootFolderId
    let isPortal = false;
    let parentIsPrivate = false;
    const parents = folder.parents || [];
    if (parents.includes(rootFolderId)) {
      isPortal = true;
    } else if (parents.length > 0) {
      // Checar pai recursivamente
      const parentClassification = await classifyFolder(drive, parents[0], rootFolderId);
      isPortal = parentClassification.isPortal;
      if (parentClassification.isPrivate) {
        parentIsPrivate = true;
      }
      if (parentClassification.isPublic && !isExplicitPrivate && !parentIsPrivate) {
        isKnownPublic = true;
      }
    }

    const isPrivate = isExplicitPrivate || parentIsPrivate;
    const classification = {
      isPublic: isPortal && isKnownPublic && !isPrivate,
      isPrivate,
      isPortal,
      name: folderName,
      expiresAt: now + CACHE_TTL_MS
    };

    folderClassificationCache.set(folderId, classification);
    return classification;
  } catch (err) {
    console.warn(`[mediaSecurity] Falha ao inspecionar pasta ${folderId}:`, err.message);
    return { isPublic: false, isPrivate: false, isPortal: false, name: '' };
  }
}

/**
 * Validador central de segurança para o streaming e acesso a arquivos
 * Regras mandatórias:
 *  1) O arquivo deve comprovadamente pertencer ao acervo do Portal Tera (rejeita arquivos externos com 403).
 *  2) A classificação privada prevalece SEMPRE sobre qualquer classificação pública.
 *  3) Mídias autenticadas exigem cabeçalho Authorization (Bearer <token>). O parâmetro ?token= é terminantemente rejeitado.
 *  4) Imagens efetivamente públicas podem ser transmitidas sem autenticação para renderização em <img>.
 *
 * @param {object} params
 * @param {object} params.drive - Instância do Google Drive v3
 * @param {object} params.fileMeta - Metadados obtidos de drive.files.get
 * @param {object} params.req - Objeto da requisição HTTP (para headers)
 * @returns {Promise<{ allowed: boolean, statusCode: number, error?: string, message?: string, isPublic: boolean, user?: object }>}
 */
export async function verifyMediaAccess({ drive, fileMeta, req }) {
  // 1. Arquivo na lixeira
  if (fileMeta.trashed) {
    return {
      allowed: false,
      statusCode: 404,
      error: 'Arquivo não encontrado',
      message: 'O arquivo solicitado foi excluído.',
      isPublic: false
    };
  }

  // 2. Comprovação de pertinência ao acervo do Portal Tera
  // appProperties é restrito e seguro (apenas nossa aplicação pode ler/gravar)
  const appTag = fileMeta.appProperties?.app;
  const isTaggedPortalTera = appTag === 'portal_tera';

  // Verificar hierarquia de pastas no Drive institucional
  let rootFolderId = null;
  try {
    rootFolderId = await getRootFolderId(drive);
  } catch (err) {
    console.warn('[mediaSecurity] Falha ao obter rootFolderId:', err.message);
  }

  let folderIsPortal = false;
  let folderIsPublic = false;
  let folderIsPrivate = false;

  const parents = fileMeta.parents || [];
  if (parents.length > 0 && rootFolderId) {
    const parentFolderId = parents[0];
    const classification = await classifyFolder(drive, parentFolderId, rootFolderId);
    folderIsPortal = classification.isPortal;
    folderIsPublic = classification.isPublic;
    folderIsPrivate = classification.isPrivate;
  }

  const belongsToPortalTera = isTaggedPortalTera || folderIsPortal;

  // Se o arquivo NÃO pertence comprovadamente ao acervo do Portal Tera, rejeita com 403
  if (!belongsToPortalTera) {
    return {
      allowed: false,
      statusCode: 403,
      error: 'Acesso negado',
      message: 'O arquivo solicitado não pertence ao acervo institucional autorizado do Portal Tera.',
      isPublic: false
    };
  }

  // 3. Avaliação de privacidade: A CLASSIFICAÇÃO PRIVADA DEVE PREVALECER SOBRE QUALQUER CLASSIFICAÇÃO PÚBLICA
  const visibilityTag = fileMeta.appProperties?.visibility || fileMeta.properties?.visibility;
  const contextTag = fileMeta.appProperties?.context || fileMeta.properties?.context;
  const isExplicitPublicFlag = fileMeta.appProperties?.isPublic === 'true' || fileMeta.appProperties?.isPublic === true;
  const isExplicitPrivateFlag = fileMeta.appProperties?.isPublic === 'false' || fileMeta.appProperties?.isPublic === false;

  const isPrivateContext = ['test', 'seasons', 'admin', 'internal', 'engineering'].includes(contextTag);
  const isMarkedPrivate = visibilityTag === 'private' || isExplicitPrivateFlag || isPrivateContext || folderIsPrivate;

  // Se o arquivo for classificado como PRIVADO por qualquer um dos critérios, a privacidade prevalece incondicionalmente
  if (isMarkedPrivate) {
    return handlePrivateAccess({ fileMeta, req });
  }

  // 4. Se não for privado, verificar se é comprovadamente PÚBLICO
  // Critério A: Está ativamente referenciado em tabelas públicas do Supabase (products, projects, robots, sponsors, etc.)
  const existsInPublicDb = await isFileInPublicRecords(fileMeta.id);
  if (existsInPublicDb) {
    return { allowed: true, statusCode: 200, isPublic: true };
  }

  // Critério B: Está marcado como público na aplicação E localizado em pasta pública do Portal Tera
  if (folderIsPortal && folderIsPublic && (visibilityTag === 'public' || isExplicitPublicFlag)) {
    return { allowed: true, statusCode: 200, isPublic: true };
  }

  // 5. Se não foi comprovado como público, trata como mídia interna/privada exigindo autenticação
  return handlePrivateAccess({ fileMeta, req });
}

/**
 * Valida o acesso a mídias privadas exigindo cabeçalho Authorization
 */
async function handlePrivateAccess({ fileMeta, req }) {
  // O parâmetro ?token= foi removido por segurança. Aceita estritamente o cabeçalho Authorization.
  const authHeader = req.headers?.authorization;

  if (!authHeader) {
    return {
      allowed: false,
      statusCode: 401,
      error: 'Autenticação necessária',
      message: 'Este arquivo possui controle de acesso restrito e exige login com perfil autorizado.',
      isPublic: false
    };
  }

  try {
    const authenticatedUser = await validateUserAuth(authHeader);

    // Validação de perfil aprovado
    const isApproved = authenticatedUser.profile?.status === 'approved' || authenticatedUser.profile?.is_admin;
    if (!isApproved) {
      return {
        allowed: false,
        statusCode: 403,
        error: 'Acesso negado',
        message: 'Seu cadastro ainda aguarda aprovação para visualizar mídias internas.',
        isPublic: false
      };
    }

    // Se for contexto de testes do sistema, exige perfil de administrador
    const isTestFile = (fileMeta.appProperties?.context === 'test');
    if (isTestFile && !authenticatedUser.profile?.is_admin) {
      return {
        allowed: false,
        statusCode: 403,
        error: 'Acesso restrito',
        message: 'Apenas administradores podem acessar arquivos de teste do sistema.',
        isPublic: false
      };
    }

    return {
      allowed: true,
      statusCode: 200,
      isPublic: false,
      user: authenticatedUser
    };
  } catch (authErr) {
    return {
      allowed: false,
      statusCode: 401,
      error: 'Autenticação inválida',
      message: authErr.message || 'Token de acesso expirado ou inválido.',
      isPublic: false
    };
  }
}
