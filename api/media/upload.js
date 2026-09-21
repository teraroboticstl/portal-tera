import { validateUserAuth, validateUploadPermission } from '../lib/supabaseServer.js';
import { getGoogleDriveClient, resolveTargetFolder, sanitizeFileName, uploadBufferToDrive } from '../lib/googleDrive.js';
import { parseMultipart } from '../lib/multipart.js';

// Mime types permitidos
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'video/quicktime'
]);

// Contextos permitidos
const ALLOWED_CONTEXTS = new Set([
  'products',
  'projects',
  'robots',
  'sponsors',
  'featured-news',
  'events',
  'memorial',
  'tir',
  'seasons',
  'attachments',
  'test'
]);

/**
 * Endpoint central de upload para o Google Drive institucional
 * Rota: POST /api/media/upload
 */
export default async function handler(req, res) {
  // CORS & Pre-flight
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  try {
    // 1. Autenticação e validação do usuário no Supabase Auth server-side
    const authHeader = req.headers.authorization;
    let authenticatedUser;
    try {
      authenticatedUser = await validateUserAuth(authHeader);
    } catch (authErr) {
      return res.status(401).json({
        error: 'Autenticação requerida',
        message: authErr.message
      });
    }

    // 2. Parse da requisição multipart/form-data
    let parsed;
    try {
      parsed = await parseMultipart(req);
    } catch (parseErr) {
      return res.status(400).json({
        error: 'Erro no arquivo enviado',
        message: parseErr.message
      });
    }

    const { fields, file } = parsed;

    if (!file || !file.buffer || file.buffer.length === 0) {
      return res.status(400).json({
        error: 'Nenhum arquivo recebido na requisição.'
      });
    }

    // 3. Validação do contexto
    const context = (fields.context || 'test').toLowerCase().trim();
    if (!ALLOWED_CONTEXTS.has(context)) {
      return res.status(400).json({
        error: `Contexto "${context}" inválido. Permitidos: ${Array.from(ALLOWED_CONTEXTS).join(', ')}.`
      });
    }

    // 4. Validação de permissões baseada no contexto e na role do usuário
    try {
      validateUploadPermission(authenticatedUser, context);
    } catch (permErr) {
      return res.status(403).json({
        error: 'Acesso negado',
        message: permErr.message
      });
    }

    // 5. Validação de MIME type
    if (!ALLOWED_MIME_TYPES.has(file.mimeType)) {
      return res.status(400).json({
        error: `Tipo de arquivo "${file.mimeType}" não suportado.`,
        allowed: Array.from(ALLOWED_MIME_TYPES)
      });
    }

    // 6. Validação de tamanho máximo específico por tipo
    const isVideo = file.mimeType.startsWith('video/');
    const maxSizeBytes = isVideo ? 100 * 1024 * 1024 : 15 * 1024 * 1024; // 100MB vídeos, 15MB imagens/docs

    if (file.size > maxSizeBytes) {
      const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
      return res.status(400).json({
        error: `Arquivo excede o tamanho máximo permitido de ${maxMb}MB para esta categoria.`
      });
    }

    // 7. Obtenção do cliente Google Drive autenticado
    let drive;
    try {
      drive = getGoogleDriveClient();
    } catch (driveConfigErr) {
      return res.status(503).json({
        error: 'Google Drive não configurado no servidor',
        message: driveConfigErr.message,
        details: 'Configure as variáveis GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REFRESH_TOKEN no ambiente da Vercel.'
      });
    }

    // 8. Resolução da pasta de destino no Google Drive sob a pasta raiz institucional
    const extraMeta = {
      season: fields.season || fields.season_tag,
      program: fields.program,
      subfolder: fields.subfolder,
      recordId: fields.recordId
    };

    const targetFolderId = await resolveTargetFolder(drive, context, extraMeta);

    // 9. Sanitização do nome do arquivo
    const safeFileName = sanitizeFileName(file.filename);

    // 10. Upload do buffer para o Google Drive institucional (conta teraroboticstl@gmail.com)
    const uploadedFile = await uploadBufferToDrive({
      drive,
      buffer: file.buffer,
      fileName: safeFileName,
      mimeType: file.mimeType,
      folderId: targetFolderId,
      isPublic: true // Permissão de visualização pública para renderização web
    });

    // 11. Resposta com metadados estruturados
    const metadata = {
      provider: 'google_drive',
      fileId: uploadedFile.id,
      name: uploadedFile.name,
      mimeType: uploadedFile.mimeType,
      size: file.size,
      context: context,
      folderId: targetFolderId,
      webViewLink: uploadedFile.webViewLink || `https://drive.google.com/file/d/${uploadedFile.id}/view`,
      directUrl: `/api/media/${uploadedFile.id}`,
      downloadUrl: uploadedFile.webContentLink || `https://drive.google.com/uc?export=download&id=${uploadedFile.id}`,
      uploaded_by: {
        id: authenticatedUser.id,
        email: authenticatedUser.email,
        name: authenticatedUser.profile?.full_name || authenticatedUser.email
      },
      created_at: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      data: metadata
    });

  } catch (error) {
    console.error('[API /api/media/upload] Erro inesperado:', error);
    return res.status(500).json({
      error: 'Falha interna durante o processamento do upload',
      message: error.message || 'Erro desconhecido'
    });
  }
}
