import { getGoogleDriveClient } from '../lib/googleDrive.js';

/**
 * Endpoint de streaming controlado de arquivos do Google Drive
 * Rota: GET /api/media/[id]
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  // Obter o ID do arquivo dos query params do Vercel ou URL
  const fileId = req.query?.id || req.url.split('/').pop().split('?')[0];

  if (!fileId || fileId === 'media' || fileId === 'upload') {
    return res.status(400).json({ error: 'ID do arquivo inválido ou ausente.' });
  }

  try {
    const drive = getGoogleDriveClient();

    // 1. Obter metadados do arquivo
    const metaRes = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size'
    });

    const fileMeta = metaRes.data;

    // Headers de cache e conteúdo adequados
    res.setHeader('Content-Type', fileMeta.mimeType || 'application/octet-stream');
    if (fileMeta.size) {
      res.setHeader('Content-Length', fileMeta.size);
    }
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800'); // 1 dia de cache

    if (req.method === 'HEAD') {
      return res.status(200).end();
    }

    // 2. Stream do binário direto do Google Drive para a resposta HTTP
    const streamRes = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    streamRes.data
      .on('error', (err) => {
        console.error('[Google Drive Stream] Erro de transmissão:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Erro ao transmitir arquivo.' });
        }
      })
      .pipe(res);

  } catch (error) {
    console.error(`[API /api/media/${fileId}] Erro ao buscar arquivo:`, error);
    const status = error.code === 404 ? 404 : 500;
    return res.status(status).json({
      error: 'Arquivo não encontrado ou inacessível no Google Drive',
      message: error.message
    });
  }
}
