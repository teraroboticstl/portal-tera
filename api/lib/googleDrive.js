import { google } from 'googleapis';
import { Readable } from 'stream';

const ROOT_FOLDER_NAME = 'Portal Tera - Arquivos do Sistema';

/**
 * Cria ou retorna o cliente oficial do Google Drive v3 autenticado com OAuth2 offline
 */
export function getGoogleDriveClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    const missing = [];
    if (!clientId) missing.push('GOOGLE_CLIENT_ID');
    if (!clientSecret) missing.push('GOOGLE_CLIENT_SECRET');
    if (!refreshToken) missing.push('GOOGLE_REFRESH_TOKEN');

    throw new Error(
      `Credenciais do Google Drive não configuradas no servidor. Variáveis pendentes: ${missing.join(', ')}.`
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    process.env.GOOGLE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob'
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

/**
 * Localiza ou cria uma pasta sob um diretório pai no Google Drive
 * @param {object} drive - Instância do google.drive
 * @param {string} folderName - Nome da pasta
 * @param {string} parentId - ID da pasta pai (ou 'root')
 */
export async function ensureFolder(drive, folderName, parentId = 'root') {
  // Limpar aspas simples para query de busca segura
  const safeName = folderName.replace(/'/g, "\\'");
  const query = `name = '${safeName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  const listRes = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive'
  });

  if (listRes.data.files && listRes.data.files.length > 0) {
    return listRes.data.files[0].id;
  }

  // Se não existir, criar a pasta
  const createRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    },
    fields: 'id, name'
  });

  return createRes.data.id;
}

/**
 * Localiza a pasta raiz do Portal Tera ou utiliza a configurada em GOOGLE_DRIVE_ROOT_FOLDER_ID
 */
export async function getRootFolderId(drive) {
  if (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID && process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID.trim()) {
    return process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID.trim();
  }

  // Se não foi informada a variável, garante a existência de 'Portal Tera - Arquivos do Sistema' na raiz
  return await ensureFolder(drive, ROOT_FOLDER_NAME, 'root');
}

/**
 * Resolve a hierarquia de pastas com base no contexto do upload
 * @param {object} drive - Instância do Google Drive
 * @param {string} context - Contexto (products, projects, robots, etc.)
 * @param {object} extraMeta - Dados extras como temporada, programa, etc.
 */
export async function resolveTargetFolder(drive, context, extraMeta = {}) {
  const rootId = await getRootFolderId(drive);

  const contextMap = {
    'products': ['02. Produtos (TeraShop)'],
    'projects': ['03. Projetos Sociais'],
    'robots': ['05. Engenharia & Temporadas', 'Robôs'],
    'sponsors': ['01. Institucional & Marketing', 'Patrocinadores'],
    'featured-news': ['01. Institucional & Marketing', 'Destaques e Banners'],
    'events': ['04. Torneios & Eventos', 'Galeria de Eventos'],
    'memorial': ['01. Institucional & Marketing', 'Memorial Histórico'],
    'tir': ['04. Torneios & Eventos', 'TIR'],
    'test': ['99. Testes do Sistema']
  };

  if (context === 'seasons') {
    const seasonTag = (extraMeta.season || extraMeta.season_tag || 'Geral').toString().trim();
    const program = (extraMeta.program || 'Geral').toString().trim().toUpperCase();
    const sub = extraMeta.subfolder || 'Geral';
    return await ensureFolderPath(drive, rootId, [
      '05. Engenharia & Temporadas',
      `Temporada ${seasonTag}`,
      program,
      sub
    ]);
  }

  const pathParts = contextMap[context] || ['99. Outros Arquivos'];
  return await ensureFolderPath(drive, rootId, pathParts);
}

/**
 * Cria recursivamente o caminho de pastas solicitado
 */
async function ensureFolderPath(drive, startParentId, parts) {
  let currentParentId = startParentId;
  for (const part of parts) {
    if (!part) continue;
    currentParentId = await ensureFolder(drive, part, currentParentId);
  }
  return currentParentId;
}

/**
 * Sanitiza o nome do arquivo prevenindo caracteres perigosos e colisões
 */
export function sanitizeFileName(originalName = 'arquivo') {
  const lastDot = originalName.lastIndexOf('.');
  const ext = lastDot !== -1 ? originalName.substring(lastDot).toLowerCase() : '';
  const base = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;

  const cleanBase = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9_-]/g, '_') // caracteres especiais viram _
    .replace(/_{2,}/g, '_')
    .substring(0, 50);

  const randomHash = Math.random().toString(36).substring(2, 8);
  const timestamp = Date.now();

  return `${cleanBase || 'arquivo'}_${timestamp}_${randomHash}${ext}`;
}

/**
 * Faz o upload de um Buffer para o Google Drive
 */
export async function uploadBufferToDrive({
  drive,
  buffer,
  fileName,
  mimeType,
  folderId,
  isPublic = true
}) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  const fileMetadata = {
    name: fileName,
    parents: [folderId]
  };

  const media = {
    mimeType,
    body: stream
  };

  const uploadRes = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, name, mimeType, size, webViewLink, webContentLink, parents'
  });

  const file = uploadRes.data;

  // Se o arquivo for público (fotos do site, logos, produtos), adiciona permissão de leitura para "anyone"
  if (isPublic) {
    try {
      await drive.permissions.create({
        fileId: file.id,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });
    } catch (permErr) {
      console.warn('[Google Drive] Aviso ao conceder permissão pública ao arquivo:', permErr.message);
    }
  }

  return file;
}
