import { validateUserAuth, createScopedUserSupabaseClient, supabaseServer } from '../_lib/supabaseServer.js';
import { getGoogleDriveClient } from '../_lib/googleDrive.js';
import { 
  getActiveFllSeasonData, 
  getFllAudioConfig,
  SLOT_CANONICAL_MAP,
  VALID_SLOTS,
  getCachedAudioBytes,
  cacheAudioBytes
} from '../_lib/fllAudioStorage.js';

/**
 * Endpoint unificado para recursos FLL (Temporadas, Missões e Áudios)
 * Rotas suportadas:
 *   - GET  /api/fll/season       (Consulta dados da temporada FLL ativa)
 *   - POST /api/fll/season       (Atualização administrativa merge-safe)
 *   - GET  /api/fll/audio        (Streaming binário dos áudios oficiais FLL)
 *   - GET  /api/fll/config       (Consulta slots de áudio configurados)
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Identificar ação solicitada: 'season', 'audio' ou 'config'
  let action = req.query?.action;
  if (!action) {
    const parts = req.url.split('?')[0].split('/').filter(Boolean);
    action = parts[parts.length - 1];
  }

  // =========================================================================
  // DOMÍNIO 1: TEMPORADA E MISSÕES FLL (season)
  // =========================================================================
  if (action === 'season') {
    // -----------------------------------------------------------------------
    // GET: Público - Consulta a temporada FLL ativa no Supabase
    // -----------------------------------------------------------------------
    if (req.method === 'GET') {
      try {
        const preferredTheme = req.query?.season || null;
        const seasonData = await getActiveFllSeasonData(preferredTheme);
        return res.status(200).json({
          success: true,
          data: seasonData
        });
      } catch (err) {
        console.error('[API /api/fll/season GET] Erro ao carregar dados:', err);
        return res.status(500).json({
          error: 'Falha ao consultar temporada FLL ativa no Supabase',
          message: err.message
        });
      }
    }

    // -----------------------------------------------------------------------
    // POST: Exclusivo para administradores autenticados
    // -----------------------------------------------------------------------
    if (req.method === 'POST') {
      try {
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

        if (!authenticatedUser?.profile?.is_admin) {
          return res.status(403).json({
            error: 'Acesso negado',
            message: 'Apenas administradores podem atualizar temporadas ou missões FLL.'
          });
        }

        const token = authHeader.replace(/^Bearer\s+/i, '').trim();
        const client = createScopedUserSupabaseClient(token) || supabaseServer;

        const body = req.body || {};
        const { 
          action: postSubAction, 
          program = 'FLL', 
          season: seasonTheme = 'BIOGLOW',
          missionCode,
          missionTitle,
          fileId,
          imageUrl,
          imageAlt,
          slot,
          audioMetadata
        } = body;

        if (program !== 'FLL') {
          return res.status(400).json({ error: 'Endpoint exclusivo para o programa FLL.' });
        }

        // Resolver temporada alvo no Supabase
        let targetSeason = null;
        if (seasonTheme) {
          const { data, error } = await client
            .from('seasons')
            .select('*')
            .eq('program', 'FLL')
            .eq('theme', seasonTheme)
            .maybeSingle();

          if (!error && data) {
            targetSeason = data;
          }
        }

        if (!targetSeason) {
          const { data: latestSeason, error: latestErr } = await client
            .from('seasons')
            .select('*')
            .eq('program', 'FLL')
            .order('year', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!latestErr && latestSeason) {
            targetSeason = latestSeason;
          }
        }

        // Se ainda não existir registro físico para FLL no Supabase, criar atomicamente
        if (!targetSeason) {
          const initialDesc = JSON.stringify({
            fll_missions: {},
            fll_audios: { round_start: null, countdown_beep: null, round_end: null }
          });
          const { data: created, error: insertErr } = await client
            .from('seasons')
            .insert({
              program: 'FLL',
              year: 2026,
              theme: seasonTheme || 'BIOGLOW',
              description: initialDesc
            })
            .select()
            .single();

          if (insertErr) {
            throw new Error(`Falha ao criar registro inicial no Supabase: ${insertErr.message}`);
          }
          if (!created) {
            throw new Error('Registro inicial não foi retornado pelo Supabase.');
          }
          targetSeason = created;
        }

        // Fazer parse seguro e preservação rigorosa de description
        let parsedDesc = {};
        if (targetSeason.description) {
          try {
            parsedDesc = typeof targetSeason.description === 'string'
              ? JSON.parse(targetSeason.description)
              : targetSeason.description;
          } catch {
            parsedDesc = { custom_description: targetSeason.description };
          }
        }

        parsedDesc.fll_missions = parsedDesc.fll_missions || {};
        parsedDesc.fll_audios = parsedDesc.fll_audios || {};

        // 1. Atualizar imagem de uma missão (MERGE SEGURO)
        if (postSubAction === 'update_mission') {
          if (!missionCode) {
            return res.status(400).json({ error: 'missionCode obrigatório.' });
          }

          const existingMission = parsedDesc.fll_missions[missionCode] || {};
          parsedDesc.fll_missions[missionCode] = {
            ...existingMission,
            code: missionCode,
            title: missionTitle || existingMission.title || missionCode,
            fileId: fileId || existingMission.fileId || '',
            imageUrl: imageUrl || (fileId ? `/api/media/${fileId}` : existingMission.imageUrl) || '',
            imageAlt: imageAlt || existingMission.imageAlt || `Missão ${missionCode}`,
            updated_at: new Date().toISOString()
          };
        }

        // 2. Remover imagem de uma missão (MERGE SEGURO)
        else if (postSubAction === 'remove_mission_image') {
          if (!missionCode) {
            return res.status(400).json({ error: 'missionCode obrigatório.' });
          }
          if (parsedDesc.fll_missions[missionCode]) {
            parsedDesc.fll_missions[missionCode] = {
              ...parsedDesc.fll_missions[missionCode],
              fileId: '',
              imageUrl: '',
              updated_at: new Date().toISOString()
            };
          }
        }

        // 3. Atualizar slot de áudio (MERGE SEGURO)
        else if (postSubAction === 'update_audio') {
          const canonicalSlot = SLOT_CANONICAL_MAP[slot] || slot;
          if (!canonicalSlot || !['round_start', 'countdown_beep', 'round_end'].includes(canonicalSlot)) {
            return res.status(400).json({ error: `Slot de áudio inválido: ${slot}` });
          }

          parsedDesc.fll_audios[canonicalSlot] = {
            slot: canonicalSlot,
            fileId: fileId || '',
            name: audioMetadata?.name || '',
            mimeType: audioMetadata?.mimeType || 'audio/mpeg',
            size: audioMetadata?.size || 0,
            sha256: audioMetadata?.sha256 || '',
            updated_at: new Date().toISOString()
          };
        }

        // 4. Remover slot de áudio (MERGE SEGURO)
        else if (postSubAction === 'remove_audio') {
          const canonicalSlot = SLOT_CANONICAL_MAP[slot] || slot;
          if (canonicalSlot && parsedDesc.fll_audios[canonicalSlot]) {
            parsedDesc.fll_audios[canonicalSlot] = null;
          }
        }

        // 5. Definir temporada ativa FLL
        else if (postSubAction === 'set_active_season') {
          parsedDesc.is_fll_active = true;
          parsedDesc.active_updated_at = new Date().toISOString();
        }

        else {
          return res.status(400).json({ error: `Ação inválida: ${postSubAction}` });
        }

        // Persistir no Supabase com MERGE SEGURO do campo description
        const updatedDescriptionJson = JSON.stringify(parsedDesc);
        const { data: updatedRecord, error: updateErr } = await client
          .from('seasons')
          .update({
            description: updatedDescriptionJson,
            updated_at: new Date().toISOString()
          })
          .eq('id', targetSeason.id)
          .select()
          .single();

        if (updateErr) {
          console.error('[API /api/fll/season POST] Falha ao atualizar Supabase:', updateErr);
          return res.status(500).json({
            error: 'Falha ao persistir alterações na temporada FLL no Supabase',
            message: updateErr.message
          });
        }

        return res.status(200).json({
          success: true,
          data: {
            ...updatedRecord,
            description: parsedDesc,
            fll_missions: parsedDesc.fll_missions,
            fll_audios: parsedDesc.fll_audios
          }
        });

      } catch (err) {
        console.error('[API /api/fll/season POST] Erro inesperado:', err);
        return res.status(500).json({
          error: 'Falha interna durante a atualização da temporada FLL',
          message: err.message
        });
      }
    }

    return res.status(405).json({ error: 'Método não permitido.' });
  }

  // =========================================================================
  // DOMÍNIO 2: STREAMING DE ÁUDIO OFICIAL FLL (audio)
  // =========================================================================
  if (action === 'audio') {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return res.status(405).json({ error: 'Método não permitido.' });
    }

    try {
      const rawSlot = req.query?.slot || req.url.split('/').pop().split('?')[0];
      const seasonTheme = req.query?.season || null;
      const canonicalSlot = SLOT_CANONICAL_MAP[rawSlot] || rawSlot;

      if (!VALID_SLOTS.includes(canonicalSlot)) {
        return res.status(400).json({
          error: `Slot inválido: "${rawSlot}". Slots permitidos: ${VALID_SLOTS.join(', ')}.`
        });
      }

      // 1. Obter metadados do áudio da fonte única da verdade (Supabase)
      const config = await getFllAudioConfig(seasonTheme);
      const audioInfo = config[canonicalSlot];

      if (!audioInfo || !audioInfo.fileId) {
        return res.status(404).json({
          error: `Áudio não configurado para o slot "${canonicalSlot}".`,
          slot: canonicalSlot
        });
      }

      const fileId = audioInfo.fileId;

      // 2. Verificar cache local de bytes em memória/disco
      let audioBytes = getCachedAudioBytes(fileId);

      // 3. Se não estiver em cache, baixar diretamente do Google Drive institucional
      if (!audioBytes) {
        let drive;
        try {
          drive = getGoogleDriveClient();
        } catch (driveErr) {
          return res.status(503).json({
            error: 'Google Drive não configurado no servidor',
            message: driveErr.message
          });
        }

        const driveRes = await drive.files.get(
          { fileId, alt: 'media' },
          { responseType: 'arraybuffer' }
        );

        audioBytes = Buffer.from(driveRes.data);
        cacheAudioBytes(fileId, audioBytes);
      }

      // 4. Headers HTTP para reprodução de áudio web
      const mimeType = audioInfo.mimeType || 'audio/mpeg';
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', audioBytes.length);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

      if (audioInfo.sha256) {
        res.setHeader('ETag', `"${audioInfo.sha256}"`);
      }

      if (req.method === 'HEAD') {
        return res.status(200).end();
      }

      return res.status(200).end(audioBytes);

    } catch (err) {
      console.error('[API /api/fll/audio] Erro ao transmitir áudio:', err);
      return res.status(500).json({
        error: 'Falha ao transmitir áudio oficial FLL',
        message: err.message
      });
    }
  }

  // =========================================================================
  // DOMÍNIO 3: CONFIGURAÇÃO DE SLOTS DE ÁUDIO (config)
  // =========================================================================
  if (action === 'config') {
    if (req.method !== 'GET') {
      return res.status(405).json({
        error: 'Método não permitido',
        message: 'Para alterar áudios da temporada FLL, utilize o endpoint autenticado POST /api/fll/season.'
      });
    }

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

  return res.status(404).json({ error: `Ação FLL desconhecida: "${action}". Ações válidas: season, audio, config.` });
}
