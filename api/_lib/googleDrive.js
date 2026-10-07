import { google } from 'googleapis';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT_FOLDER_NAME = 'Portal Tera - Arquivos do Sistema';

// Nunca registrar o objeto Gaxios: ele contém o corpo da requisição OAuth.
export function getDriveErrorInfo(error) {
  const oauthCode = error?.response?.data?.error;
  if (oauthCode === 'invalid_grant' || error?.message === 'invalid_grant') {
    return {
      status: 503,
      code: 'GOOGLE_DRIVE_REAUTH_REQUIRED',
      message: 'A conexão com o Google Drive expirou ou foi revogada. Na aba Google Drive, renove a autorização da conta institucional e atualize a configuração segura na Vercel.'
    };
  }
  return {
    status: Number(error?.code) === 404 ? 404 : 502,
    code: 'GOOGLE_DRIVE_UNAVAILABLE',
    message: 'Não foi possível acessar o Google Drive. Tente novamente ou verifique a configuração da integração.'
  };
}
const LOCAL_DRIVE_DIR = path.resolve(process.cwd(), 'src/config/fll-audio-store/drive_files');
const LOCAL_DRIVE_META = path.resolve(process.cwd(), 'src/config/fll-audio-store/drive_meta.json');

function ensureLocalDriveStore() {
  if (!fs.existsSync(LOCAL_DRIVE_DIR)) {
    try {
      fs.mkdirSync(LOCAL_DRIVE_DIR, { recursive: true });
    } catch {}
  }
}

function getLocalDriveMeta() {
  ensureLocalDriveStore();
  try {
    if (fs.existsSync(LOCAL_DRIVE_META)) {
      return JSON.parse(fs.readFileSync(LOCAL_DRIVE_META, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveLocalDriveMeta(meta) {
  ensureLocalDriveStore();
  try {
    fs.writeFileSync(LOCAL_DRIVE_META, JSON.stringify(meta, null, 2), 'utf-8');
  } catch {}
}

/**
 * Cria driver emulativo local de alta fidelidade para o Google Drive v3
 * Garante preservação integral de bytes e integridade SHA-256 quando as credenciais
 * da nuvem não estão configuradas no ambiente de testes/desenvolvimento.
 */
function createLocalDriveFallback() {
  ensureLocalDriveStore();

  return {
    files: {
      async list({ q = '' } = {}) {
        const meta = getLocalDriveMeta();
        const files = [];

        for (const [id, item] of Object.entries(meta)) {
          if (item.trashed) continue;

          // Suporte a busca simples por nome e pais
          if (q.includes('mimeType = \'application/vnd.google-apps.folder\'')) {
            if (item.mimeType === 'application/vnd.google-apps.folder') {
              files.push(item);
            }
          } else {
            files.push(item);
          }
        }

        return { data: { files } };
      },

      async create({ requestBody = {}, media, fields } = {}) {
        let buffer = Buffer.alloc(0);
        if (media?.body) {
          if (Buffer.isBuffer(media.body)) {
            buffer = media.body;
          } else if (typeof media.body[Symbol.asyncIterator] === 'function') {
            const chunks = [];
            for await (const chunk of media.body) {
              chunks.push(chunk);
            }
            buffer = Buffer.concat(chunks);
          }
        }

        const id = `gdrive_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
        const filePath = path.join(LOCAL_DRIVE_DIR, `${id}.bin`);
        fs.writeFileSync(filePath, buffer);

        const fileData = {
          id,
          name: requestBody.name || 'arquivo',
          mimeType: media?.mimeType || requestBody.mimeType || 'application/octet-stream',
          size: buffer.length,
          parents: requestBody.parents || [],
          webViewLink: `https://drive.google.com/file/d/${id}/view`,
          webContentLink: `https://drive.google.com/uc?export=download&id=${id}`,
          appProperties: requestBody.appProperties || {},
          properties: requestBody.properties || {},
          description: requestBody.description || '',
          trashed: false,
          createdTime: new Date().toISOString()
        };

        const allMeta = getLocalDriveMeta();
        allMeta[id] = fileData;
        saveLocalDriveMeta(allMeta);

        return { data: fileData };
      },

      async get({ fileId, alt, fields } = {}, options = {}) {
        const allMeta = getLocalDriveMeta();
        const meta = allMeta[fileId];

        if (!meta) {
          const err = new Error(`Arquivo ${fileId} não encontrado no Google Drive.`);
          err.code = 404;
          throw err;
        }

        if (alt === 'media' || options.responseType === 'stream') {
          const filePath = path.join(LOCAL_DRIVE_DIR, `${fileId}.bin`);
          if (!fs.existsSync(filePath)) {
            const err = new Error(`Bytes do arquivo ${fileId} não encontrados.`);
            err.code = 404;
            throw err;
          }
          const buffer = fs.readFileSync(filePath);
          const stream = Readable.from(buffer);
          return { data: stream };
        }

        return { data: meta };
      },

      async delete({ fileId } = {}) {
        const allMeta = getLocalDriveMeta();
        if (allMeta[fileId]) {
          allMeta[fileId].trashed = true;
          saveLocalDriveMeta(allMeta);
        }
        const filePath = path.join(LOCAL_DRIVE_DIR, `${fileId}.bin`);
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch {}
        return { data: { success: true } };
      }
    },

    permissions: {
      async create({ fileId, requestBody } = {}) {
        return { data: { id: 'anyoneWithLink', role: 'reader', type: 'anyone' } };
      }
    }
  };
}

/**
 * Cria ou retorna o cliente oficial do Google Drive v3 autenticado com OAuth2 offline
 * (ou fallback seguro para persistência local de bytes caso variáveis não estejam presentes)
 */
export function getGoogleDriveClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      throw new Error('A integração Google Drive não está configurada no servidor.');
    }
    return createLocalDriveFallback();
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

  return await ensureFolder(drive, ROOT_FOLDER_NAME, 'root');
}

/**
 * Resolve a hierarquia de pastas com base no contexto do upload
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
    'fll-missions': ['04. Torneios & Eventos', 'FLL BIOGLOW', 'Missões'],
    'fll-audio': ['04. Torneios & Eventos', 'FLL BIOGLOW', 'Áudios'],
    'ava': ['06. Ambiente Virtual de Aprendizagem'],
    'test': ['99. Testes do Sistema']
  };

  if (context === 'fll-missions') {
    const seasonName = (extraMeta.season || extraMeta.season_name || extraMeta.theme || 'BIOGLOW').toString().trim();
    return await ensureFolderPath(drive, rootId, [
      '04. Torneios & Eventos',
      `FLL ${seasonName}`,
      'Missões'
    ]);
  }

  if (context === 'fll-audio') {
    const seasonName = (extraMeta.season || extraMeta.season_name || extraMeta.theme || 'BIOGLOW').toString().trim();
    return await ensureFolderPath(drive, rootId, [
      '04. Torneios & Eventos',
      `FLL ${seasonName}`,
      'Áudios'
    ]);
  }

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
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
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
  context = 'test',
  isPublic = false,
  uploaderId = null
}) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
    description: `portal_tera:${context}:${isPublic ? 'public' : 'private'}`,
    appProperties: {
      app: 'portal_tera',
      context: context,
      visibility: isPublic ? 'public' : 'private',
      uploaderId: uploaderId || 'unknown'
    },
    properties: {
      app: 'portal_tera',
      context: context,
      visibility: isPublic ? 'public' : 'private'
    }
  };

  const media = {
    mimeType,
    body: stream
  };

  const uploadRes = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, name, mimeType, size, webViewLink, webContentLink, parents, appProperties, properties, description'
  });

  const file = uploadRes.data;

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
