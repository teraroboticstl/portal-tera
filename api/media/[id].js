import { getGoogleDriveClient } from '../lib/googleDrive.js';
import { verifyMediaAccess, isFileReferencedInDb, invalidateFileDbCache } from '../lib/mediaSecurity.js';
import { validateUserAuth } from '../lib/supabaseServer.js';

/**
 * Endpoint de streaming controlado e seguro de arquivos do Google Drive
 * Rota: GET/HEAD/DELETE /api/media/[id]
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Obter o ID do arquivo dos query params do Vercel ou URL
  const fileId = req.query?.id || req.url.split('/').pop().split('?')[0];

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

  // Suporte a exclusão de arquivos (exclusivo para administradores autenticados via Authorization header)
  if (req.method === 'DELETE') {
    // Rejeição estrita de token via query param (?token=)
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
      console.error(`[API /api/media/${fileId}] Erro ao excluir:`, delErr);
      const status = delErr.message?.includes('Token') || delErr.message?.includes('Autenticação') ? 401 : 500;
      return res.status(status).json({
        error: 'Falha ao excluir arquivo',
        message: delErr.message
      });
    }
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

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
          console.error('[Google Drive Stream] Erro de transmissão:', err);
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
    console.error(`[API /api/media/${fileId}] Erro ao buscar arquivo:`, error);
    const status = error.code === 404 ? 404 : 500;
    if (!res.headersSent) {
      return res.status(status).json({
        error: 'Arquivo não encontrado ou inacessível no Google Drive',
        message: error.message
      });
    }
  }
}
