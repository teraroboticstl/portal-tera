import { getGoogleDriveClient } from '../lib/googleDrive.js';
import { 
  getFllAudioConfig, 
  VALID_SLOTS, 
  SLOT_CANONICAL_MAP,
  getCachedAudioBytes, 
  cacheAudioBytes 
} from '../lib/fllAudioStorage.js';

/**
 * Rota pública segura para entrega dos áudios oficiais do simulador FLL a partir do Google Drive
 * FONTE DE METADADOS: Supabase (public.seasons.description.fll_audios)
 * Rota: GET /api/fll/audio?slot=round_start|countdown_beep|round_end&season=BIOGLOW
 */
export default async function handler(req, res) {
  // CORS & cabeçalhos de controle
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  // Obter slot e temporada solicitados
  const rawSlot = req.query?.slot || req.query?.type || (req.url.split('?')[0].split('/').pop());
  const slot = SLOT_CANONICAL_MAP[rawSlot] || rawSlot;
  const requestedSeason = req.query?.season || req.query?.theme || null;
  
  if (!rawSlot || !VALID_SLOTS.includes(rawSlot)) {
    return res.status(400).json({
      error: 'Slot inválido',
      message: `O parâmetro slot deve ser um de: round_start, countdown_beep, round_end (ou aliases: start, beep, end).`
    });
  }

  // 1. Obter a configuração persistente do slot vinculada à temporada FLL a partir do Supabase
  const config = await getFllAudioConfig(requestedSeason);
  const slotData = config[slot] || config[rawSlot];

  if (!slotData || !slotData.fileId) {
    return res.status(404).json({
      error: 'Áudio não configurado',
      message: `Nenhum arquivo de áudio foi configurado no Supabase para o slot "${slot}".`
    });
  }

  const { fileId, sha256 } = slotData;

  // 2. Verificar se os bytes originais já estão em cache local transitório da instância
  const cachedBuffer = getCachedAudioBytes(fileId);
  if (cachedBuffer) {
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', cachedBuffer.length);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    if (sha256) {
      res.setHeader('X-Audio-SHA256', sha256);
    }

    if (req.method === 'HEAD') {
      return res.status(200).end();
    }

    // Suporte a Range Request (navegadores móveis e desktop)
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : cachedBuffer.length - 1;
      const chunksize = (end - start) + 1;
      const chunk = cachedBuffer.subarray(start, end + 1);

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${cachedBuffer.length}`);
      res.setHeader('Content-Length', chunksize);
      return res.end(chunk);
    }

    return res.status(200).end(cachedBuffer);
  }

  // 3. Se não estiver em cache local transitório, buscar diretamente no Google Drive institucional
  let drive;
  try {
    drive = getGoogleDriveClient();
  } catch (driveErr) {
    console.error(`[API /api/fll/audio] Erro ao conectar ao Google Drive:`, driveErr.message);
    return res.status(503).json({
      error: 'Google Drive inacessível no servidor',
      message: driveErr.message
    });
  }

  try {
    // Buscar metadados do arquivo
    const metaRes = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, trashed'
    });

    const fileMeta = metaRes.data;
    if (fileMeta.trashed) {
      return res.status(404).json({
        error: 'Arquivo excluído',
        message: 'O arquivo configurado foi movido para a lixeira do Google Drive.'
      });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    if (fileMeta.size) {
      res.setHeader('Content-Length', fileMeta.size);
    }
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    if (sha256) {
      res.setHeader('X-Audio-SHA256', sha256);
    }

    if (req.method === 'HEAD') {
      return res.status(200).end();
    }

    // Obter o stream binário direto do Google Drive
    const streamRes = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    const chunks = [];
    streamRes.data.on('data', (chunk) => {
      chunks.push(chunk);
    });

    streamRes.data.on('end', () => {
      try {
        const fullBuffer = Buffer.concat(chunks);
        cacheAudioBytes(fileId, fullBuffer);
      } catch {}
    });

    streamRes.data.on('error', (err) => {
      console.error('[Google Drive Audio Stream] Erro de transmissão:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erro ao transmitir áudio do Google Drive' });
      }
    });

    streamRes.data.pipe(res);

  } catch (err) {
    console.error(`[API /api/fll/audio] Falha ao recuperar áudio ${fileId}:`, err);
    if (!res.headersSent) {
      res.status(err.code === 404 ? 404 : 500).json({
        error: 'Falha ao recuperar áudio do Google Drive',
        message: err.message
      });
    }
  }
}
