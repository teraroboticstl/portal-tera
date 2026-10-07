import crypto from 'crypto';
import { getDriveErrorInfo, getGoogleDriveClient, resolveTargetFolder, sanitizeFileName, uploadBufferToDrive } from '../_lib/googleDrive.js';
import { verifyMediaAccess, isFileReferencedInDb, invalidateFileDbCache } from '../_lib/mediaSecurity.js';
import { validateUserAuth, validateUploadPermission, supabaseServer } from '../_lib/supabaseServer.js';
import { parseMultipart } from '../_lib/multipart.js';
import { cacheAudioBytes } from '../_lib/fllAudioStorage.js';

// Mime types permitidos para upload
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav'
]);

// Contextos permitidos para upload
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
  'fll-missions',
  'fll-audio',
  'ava',
  'test'
]);

// Contextos estritamente públicos para vitrine web
const PUBLIC_CONTEXTS = new Set([
  'products',
  'projects',
  'robots',
  'sponsors',
  'featured-news',
  'events',
  'memorial',
  'tir',
  'fll-missions',
  'fll-audio'
]);

/**
 * Endpoint consolidado de Mídia do Portal Tera
 * Rotas e métodos suportados:
 *   - POST       /api/media/upload (ou /api/media)   -> Upload multipart seguro para o Google Drive
 *   - GET / HEAD /api/media/[id]                     -> Streaming controlado e seguro com cache
 *   - DELETE     /api/media/[id]                     -> Exclusão protegida por admin com FAIL-CLOSED
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // =========================================================================
  // OPERAÇÃO 1: UPLOAD DE MÍDIA (POST /api/media/upload)
  // =========================================================================
  if (req.method === 'POST') {
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

      if (context === 'ava' && !['application/pdf','image/jpeg','image/png','image/webp'].includes(file.mimeType)) return res.status(422).json({error:'O AVA aceita PDFs e imagens JPG, PNG ou WebP.'});
      if (context === 'ava' && (!fields.recordId || !/^[0-9a-f-]{36}$/i.test(fields.recordId))) return res.status(422).json({error:'Salve o módulo ou a trilha antes de enviar o material.'});
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
      const isPublic = PUBLIC_CONTEXTS.has(context);
      const fileSha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');

      // 10. Upload do buffer para o Google Drive institucional com metadados e tags de segurança
      let uploadedFile;
      try {
        uploadedFile = await uploadBufferToDrive({
          drive,
          buffer: file.buffer,
          fileName: safeFileName,
          mimeType: file.mimeType,
          folderId: targetFolderId,
          context,
          isPublic,
          uploaderId: authenticatedUser.id
        });
      } catch (uploadDriveErr) {
        console.error('[API /api/media upload] Erro no upload para o Google Drive:', getDriveErrorInfo(uploadDriveErr).code);
        const failure = getDriveErrorInfo(uploadDriveErr);
        return res.status(failure.status).json({ error: failure.code, message: failure.message });
      }

      // Se for áudio oficial do simulador FLL, cachear imediatamente os bytes originais idênticos
      if (context === 'fll-audio') {
        try {
          cacheAudioBytes(uploadedFile.id, file.buffer);
        } catch (cacheErr) {
          console.warn('[API /api/media upload] Aviso ao cachear áudio localmente:', cacheErr.message);
        }
      }

      if (context === 'ava') {
        const isCover = fields.subfolder === 'Capas';
        const {error} = await supabaseServer.rpc('ava_register_media',{p_actor:authenticatedUser.id,p_data:{file_id:uploadedFile.id,name:uploadedFile.name,mime_type:file.mimeType,size:file.size,folder_id:targetFolderId,module_id:isCover ? null : fields.recordId,track_id:isCover ? fields.recordId : null}});
        if (error) { try { await drive.files.delete({fileId:uploadedFile.id}); } catch {} return res.status(503).json({error:'Falha ao registrar material no AVA. Tente novamente.'}); }
      }
      // 11. Resposta com metadados estruturados (com salvaguarda contra arquivo órfão)
      try {
        const metadata = {
          provider: 'google_drive',
          fileId: uploadedFile.id,
          name: uploadedFile.name,
          mimeType: uploadedFile.mimeType,
          size: file.size,
          sha256: fileSha256,
          context: context,
          is_public: isPublic,
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
      } catch (postUploadErr) {
        // Se ocorrer falha após criação no Drive, limpar arquivo órfão para não poluir o armazenamento
        console.warn(`[Upload Cleanup] Removendo arquivo órfão ${uploadedFile.id} do Google Drive após falha no pós-processamento...`);
        try {
          await drive.files.delete({ fileId: uploadedFile.id });
        } catch (cleanErr) {
          console.warn(`[Upload Cleanup] Falha ao excluir arquivo órfão ${uploadedFile.id}:`, cleanErr.message);
        }
        throw postUploadErr;
      }

    } catch (error) {
      console.error('[API /api/media upload] Erro inesperado:', getDriveErrorInfo(error).code);
      const failure = getDriveErrorInfo(error);
      return res.status(failure.status).json({ error: failure.code, message: failure.message });
    }
  }

  // =========================================================================
  // EXTRAÇÃO E VALIDAÇÃO DO FILE ID (para GET, HEAD, DELETE)
  // =========================================================================
  const rawId = req.query?.id || req.url.split('/').pop().split('?')[0];
  const fileId = rawId?.trim();

  // Validação estrita do identificador do Google Drive
  const isValidFileId = typeof fileId === 'string' && /^[a-zA-Z0-9_-]{10,100}$/.test(fileId);

  if (!isValidFileId || fileId === 'media' || fileId === 'upload') {
    return res.status(400).json({ error: 'ID do arquivo inválido ou ausente.' });
  }

  let drive;
  try {
    drive = getGoogleDriveClient();
  } catch (driveErr) {
    console.error('[API /api/media] Erro de configuração do Google Drive:', driveErr.message);
    return res.status(503).json({
      error: 'Google Drive não configurado no servidor',
      message: driveErr.message
    });
  }

  // =========================================================================
  // OPERAÇÃO 2: EXCLUSÃO DE ARQUIVO (DELETE /api/media/[id])
  // =========================================================================
  if (req.method === 'DELETE') {
    const authHeader = req.headers?.authorization;
    if (!authHeader) {
      return res.status(401).json({
        error: 'Autenticação necessária',
        message: 'A exclusão de arquivos exige cabeçalho Authorization com token de administrador.'
      });
    }

    try {
      const user = await validateUserAuth(authHeader);
      if (!user.profile?.is_admin) {
        return res.status(403).json({
          error: 'Acesso negado',
          message: 'Apenas administradores podem excluir arquivos do Google Drive institucional.'
        });
      }

      // 1. Validar metadados do arquivo antes da exclusão
      const metaRes = await drive.files.get({
        fileId,
        fields: 'id, name, trashed, parents, appProperties, properties, description'
      });

      const fileMeta = metaRes.data;

      // 2. Impedir exclusão de arquivos que não pertençam comprovadamente ao Portal Tera
      const accessCheck = await verifyMediaAccess({ drive, fileMeta, req });
      if (!accessCheck.allowed && accessCheck.statusCode === 403) {
        return res.status(403).json({
          error: 'Acesso negado',
          message: 'Não é permitido excluir arquivos externos ao Portal Tera.'
        });
      }

      // 3. Verificar referências ativas no banco de dados com regra FAIL-CLOSED
      const refCheck = await isFileReferencedInDb(fileId);

      // Se indicar erro ou verificação inconclusiva: retornar 503 e NÃO excluir
      if (refCheck.error || refCheck.conclusive === false) {
        return res.status(503).json({
          error: 'Verificação inconclusiva',
          message: `Não foi possível verificar referências ativas no banco de dados: ${refCheck.error || 'consulta inconclusiva'}. Operação de exclusão cancelada por segurança.`
        });
      }

      // Se indicar referência ativa: retornar 409
      if (refCheck.isReferenced) {
        return res.status(409).json({
          error: 'Arquivo em uso',
          message: `Não é permitido excluir imagens já vinculadas a ${refCheck.entities.join(', ')} no banco de dados.`
        });
      }

      // Somente permitir exclusão quando a verificação tiver sido concluída com sucesso e confirmar ausência de referências
      if (refCheck.conclusive !== true || refCheck.isReferenced !== false) {
        return res.status(503).json({
          error: 'Verificação inconclusiva',
          message: 'A ausência de vínculos no banco de dados não pôde ser comprovada com segurança. Exclusão bloqueada.'
        });
      }

      // 4. Executar exclusão segura no Google Drive
      await drive.files.delete({ fileId });
      invalidateFileDbCache(fileId);

      return res.status(200).json({
        success: true,
        message: 'Arquivo excluído com sucesso do Google Drive institucional.',
        fileId
      });
    } catch (delErr) {
      console.error(`[API /api/media/${fileId}] Erro ao excluir:`, getDriveErrorInfo(delErr).code);
      const status = delErr.message?.includes('Token') || delErr.message?.includes('Autenticação') ? 401 : 500;
      return res.status(status).json({
        error: 'Falha ao excluir arquivo',
        message: delErr.message
      });
    }
  }

  // =========================================================================
  // OPERAÇÃO 3: STREAMING E HEAD DE ARQUIVO (GET / HEAD /api/media/[id])
  // =========================================================================
  if (req.method === 'GET' || req.method === 'HEAD') {
    try {
      // 1. Obter metadados do arquivo com campos de segurança e hierarquia
      const metaRes = await drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, trashed, parents, properties, appProperties, description'
      });

      const fileMeta = metaRes.data;

      // 2. Validação centralizada de segurança e permissão de acesso
      const access = await verifyMediaAccess({ drive, fileMeta, req });

      if (!access.allowed) {
        return res.status(access.statusCode || 403).json({
          error: access.error || 'Acesso negado',
          message: access.message || 'Arquivo não autorizado para visualização.'
        });
      }

      // 3. Headers de conteúdo e cache adequados
      res.setHeader('Content-Type', fileMeta.mimeType || 'application/octet-stream');
      if (fileMeta.size) {
        res.setHeader('Content-Length', fileMeta.size);
      }

      // Políticas de cache:
      // - Mídia pública: cache aberto para navegadores e tags <img>
      // - Mídia privada: não armazena em proxies públicos compartilhados
      if (access.isPublic) {
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800'); // 1 dia
      } else {
        res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      }

      if (req.method === 'HEAD') {
        return res.status(200).end();
      }

      // 4. Stream do binário direto do Google Drive para a resposta HTTP
      const streamRes = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      await new Promise((resolve, reject) => {
        streamRes.data
          .on('error', (err) => {
            console.error('[Google Drive Stream] Erro de transmissão:', getDriveErrorInfo(err).code);
            if (!res.headersSent) {
              res.status(500).json({ error: 'Erro ao transmitir arquivo.' });
            }
            reject(err);
          })
          .on('end', () => {
            resolve();
          });

        streamRes.data.pipe(res);
      });

    } catch (error) {
      console.error(`[API /api/media/${fileId}] Erro ao buscar arquivo:`, getDriveErrorInfo(error).code);
      const failure = getDriveErrorInfo(error);
      const status = failure.status;
      if (!res.headersSent) {
        return res.status(status).json({
          error: failure.code,
          message: failure.message
        });
      }
    }
    return;
  }

  return res.status(405).json({ error: 'Método não permitido.' });
}
