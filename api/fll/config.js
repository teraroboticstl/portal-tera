import { validateUserAuth } from '../lib/supabaseServer.js';
import { 
  getFllAudioConfig, 
  VALID_SLOTS 
} from '../lib/fllAudioStorage.js';

/**
 * Endpoint legado para consulta das configurações de áudio
 * Rota: GET /api/fll/config (ou /api/fll/audio/config)
 * NOTA: Para atualizações, utilize o endpoint oficial e persistente /api/fll/season
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Público - Consulta configurações de áudio no Supabase
  if (req.method === 'GET') {
    try {
      const season = req.query?.season || null;
      const config = await getFllAudioConfig(season);
      
      const enriched = {};
      for (const slot of VALID_SLOTS) {
        const item = config[slot];
        if (item && item.fileId) {
          enriched[slot] = {
            ...item,
            url: `/api/fll/audio?slot=${slot}&v=${encodeURIComponent(item.sha256 || item.fileId)}`
          };
        } else {
          enriched[slot] = null;
        }
      }

      return res.status(200).json({
        success: true,
        data: enriched
      });
    } catch (err) {
      console.error('[API /api/fll/config GET] Erro:', err);
      return res.status(500).json({ error: 'Erro ao carregar configurações de áudio' });
    }
  }

  return res.status(405).json({
    error: 'Método não permitido',
    message: 'Para alterar áudios da temporada FLL, utilize o endpoint autenticado /api/fll/season.'
  });
}
