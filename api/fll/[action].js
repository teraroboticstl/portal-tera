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
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Range, Content-Type');

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
    // GET: Consulta pública da temporada FLL ativa (ou solicitada por theme) e suas mídias oficiais no Supabase
    if (req.method === 'GET') {
      try {
        const requestedSeason = req.query?.season || req.query?.theme || null;
        const seasonData = await getActiveFllSeasonData(requestedSeason);

        // Enriquecer dados de áudios com URLs diretas de streaming
        const enrichedAudios = {};
        const rawAudios = seasonData.fll_audios || {};
        for (const slotKey of ['round_start', 'countdown_beep', 'round_end']) {
          const item = rawAudios[slotKey] || null;
          if (item && item.fileId) {
            enrichedAudios[slotKey] = {
              ...item,
              url: `/api/fll/audio?slot=${slotKey}&season=${encodeURIComponent(seasonData.theme)}&v=${encodeURIComponent(item.sha256 || item.fileId)}`
            };
          } else {
            enrichedAudios[slotKey] = null;
          }
        }
        // Aliases legados (start, beep, end)
        enrichedAudios.start = enrichedAudios.round_start;
        enrichedAudios.beep = enrichedAudios.countdown_beep;
        enrichedAudios.end = enrichedAudios.round_end;

        return res.status(200).json({
          success: true,
          data: {
            ...seasonData,
            fll_audios: enrichedAudios
          }
        });
      } catch (err) {
        console.error('[API /api/fll/season GET] Erro:', err);
        return res.status(500).json({ error: 'Erro ao carregar dados da temporada FLL', message: err.message });
      }
    }

    // POST: Exclusivo para administradores autenticados com token JWT
    if (req.method === 'POST') {
      const authHeader = req.headers?.authorization;
      if (!authHeader) {
        return res.status(401).json({
          error: 'Autenticação necessária',
          message: 'A persistência de mídias de temporada exige autenticação de administrador.'
        });
      }

      let authenticatedUser;
      let userToken;
      try {
        authenticatedUser = await validateUserAuth(authHeader);
        if (!authenticatedUser?.profile?.is_admin) {
          return res.status(403).json({
            error: 'Acesso negado',
            message: 'Apenas administradores podem atualizar missões e áudios da temporada FLL.'
          });
        }
        userToken = authHeader.replace(/^Bearer\s+/i, '').trim();
      } catch (authErr) {
        return res.status(401).json({ error: 'Falha na autenticação', message: authErr.message });
      }

      try {
        let body = req.body;
        if (typeof body === 'string') {
          try { body = JSON.parse(body); } catch {}
        }
        body = body || {};

        // Aceitar também o formato introduzido pela consolidação, sem mudar o frontend.
        const actionAliases = {
          update_mission: 'save_mission',
          remove_mission_image: 'remove_mission_image',
          update_audio: 'save_audio'
        };
        if (actionAliases[body.action]) {
          body = {
            ...body,
            action: actionAliases[body.action],
            data: body.data || {
              code: body.missionCode,
              title: body.missionTitle,
              fileId: body.fileId,
              imageUrl: body.imageUrl,
              imageAlt: body.imageAlt,
              slot: body.slot,
              fileName: body.audioMetadata?.name,
              fileSize: body.audioMetadata?.size,
              sha256: body.audioMetadata?.sha256,
              mimeType: body.audioMetadata?.mimeType
            }
          };
        } else if (body.action === 'remove_audio' && !body.data) {
          body = { ...body, data: { slot: body.slot } };
        }

        const { action, season, program = 'FLL', data: payloadData = {} } = body;

        // 1. Validação estrita do programa
        if (program !== 'FLL') {
          return res.status(400).json({
            error: 'Programa inválido',
            message: 'Este endpoint é exclusivo para a modalidade FLL.'
          });
        }

        // 2. Validação da temporada alvo
        const targetTheme = (season || 'BIOGLOW').trim().toUpperCase();
        if (!targetTheme || targetTheme.length < 2 || targetTheme.length > 50) {
          return res.status(400).json({
            error: 'Identificador de temporada inválido',
            message: 'O nome/tema da temporada deve ter entre 2 e 50 caracteres.'
          });
        }

        // 3. Cliente Supabase do usuário autenticado (fonte canônica de dados)
        const client = createScopedUserSupabaseClient(userToken);

        // Buscar registro existente da temporada FLL correspondente no Supabase
        const { data: existingSeasons, error: selectErr } = await client
          .from('seasons')
          .select('*')
          .eq('program', 'FLL')
          .ilike('theme', targetTheme)
          .order('year', { ascending: false })
          .limit(1);

        if (selectErr) {
          console.error('[API /api/fll/season POST] Erro ao consultar Supabase:', selectErr);
          return res.status(500).json({
            error: 'Falha ao consultar registro no Supabase',
            message: selectErr.message
          });
        }

        const existingRecord = existingSeasons && existingSeasons.length > 0 ? existingSeasons[0] : null;

        // Decodificar metadados existentes com MERGE SEGURO (NUNCA destrói datas, links, manuais, notas)
        let existingExtra = {};
        if (existingRecord?.description && typeof existingRecord.description === 'string' && existingRecord.description.startsWith('{')) {
          try {
            existingExtra = JSON.parse(existingRecord.description);
          } catch {}
        }

        let currentMissions = { ...(existingExtra.fll_missions || {}) };
        let currentAudios = { ...(existingExtra.fll_audios || {}) };

        // Execução da ação com validações estritas
        if (action === 'save_mission') {
          const { code, fileId, imageUrl, imageAlt, title, maxScore } = payloadData;
          if (!code || typeof code !== 'string' || code.trim().length === 0) {
            return res.status(400).json({ error: 'Código estável da missão é obrigatório (ex: M01, INSPEÇÃO).' });
          }
          const cleanCode = code.trim().toUpperCase();

          if (!fileId && !imageUrl) {
            return res.status(400).json({ error: 'Identificador do arquivo (fileId) ou URL é obrigatório.' });
          }

          const missionEntry = {
            code: cleanCode,
            fileId: fileId || null,
            imageUrl: imageUrl || `/api/media/${fileId}`,
            imageAlt: imageAlt || `Modelo ilustrativo da missão ${cleanCode}`,
            title: title || cleanCode,
            maxScore: maxScore ?? 0,
            updatedAt: new Date().toISOString(),
            updatedBy: authenticatedUser.email
          };

          // Preserva todas as demais missões já cadastradas
          currentMissions[cleanCode] = missionEntry;

        } else if (action === 'remove_mission') {
          const { code } = payloadData;
          if (!code) {
            return res.status(400).json({ error: 'Código da missão obrigatório.' });
          }
          const cleanCode = code.trim().toUpperCase();
          delete currentMissions[cleanCode];

        } else if (action === 'remove_mission_image') {
          const { code } = payloadData;
          if (!code) return res.status(400).json({ error: 'Código da missão obrigatório.' });
          const cleanCode = code.trim().toUpperCase();
          if (currentMissions[cleanCode]) {
            currentMissions[cleanCode] = {
              ...currentMissions[cleanCode], fileId: '', imageUrl: '',
              updated_at: new Date().toISOString()
            };
          }

        } else if (action === 'save_audio') {
          const { slot, fileId, fileName, fileSize, sha256, mimeType } = payloadData;
          const canonicalSlot = SLOT_CANONICAL_MAP[slot] || slot;

          if (!['round_start', 'countdown_beep', 'round_end'].includes(canonicalSlot)) {
            return res.status(400).json({
              error: 'Slot de áudio inválido',
              message: 'O slot deve ser um de: round_start, countdown_beep, round_end.'
            });
          }

          if (!fileId || typeof fileId !== 'string' || fileId.length < 5) {
            return res.status(400).json({ error: 'fileId válido do Google Drive é obrigatório.' });
          }

          const audioEntry = {
            slot: canonicalSlot,
            fileId,
            fileName: fileName || 'audio.mp3',
            fileSize: Number(fileSize || 0),
            sha256: sha256 || null,
            mimeType: mimeType || 'audio/mpeg',
            updatedAt: new Date().toISOString(),
            updatedBy: authenticatedUser.email
          };

          // Preserva os outros 2 slots de áudio
          currentAudios[canonicalSlot] = audioEntry;

        } else if (action === 'remove_audio') {
          const { slot } = payloadData;
          const canonicalSlot = SLOT_CANONICAL_MAP[slot] || slot;
          if (!['round_start', 'countdown_beep', 'round_end'].includes(canonicalSlot)) {
            return res.status(400).json({ error: 'Slot de áudio inválido.' });
          }
          currentAudios[canonicalSlot] = null;

        } else if (action === 'set_active_season') {
          existingExtra.is_fll_active = true;
          existingExtra.active_updated_at = new Date().toISOString();
        } else {
          return res.status(400).json({ error: `Ação "${action}" inválida ou não reconhecida.` });
        }

        // MERGE SEGURO: Preservar absolutamente todos os campos de existingExtra
        const mergedExtra = {
          ...existingExtra,
          custom_description: existingExtra.custom_description || `Temporada FLL ${targetTheme}`,
          season_name: existingExtra.season_name || targetTheme,
          year: existingRecord?.year || existingExtra.year || 2026,
          fll_missions: currentMissions,
          fll_audios: currentAudios
        };

        const finalDescriptionJson = JSON.stringify(mergedExtra);

        let savedRecord = null;

        if (existingRecord) {
          // UPDATE no registro existente no Supabase
          const { data: updated, error: updateErr } = await client
            .from('seasons')
            .update({
              description: finalDescriptionJson,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingRecord.id)
            .select()
            .single();

          if (updateErr) {
            console.error('[API /api/fll/season POST] Falha ao atualizar Supabase:', updateErr);
            return res.status(500).json({
              error: 'Falha ao persistir alterações no Supabase',
              message: updateErr.message
            });
          }
          savedRecord = updated;
        } else {
          // INSERT de novo registro FLL no Supabase
          const { data: inserted, error: insertErr } = await client
            .from('seasons')
            .insert([{
              program: 'FLL',
              year: 2026,
              theme: targetTheme,
              description: finalDescriptionJson
            }])
            .select()
            .single();

          if (insertErr) {
            console.error('[API /api/fll/season POST] Falha ao inserir registro no Supabase:', insertErr);
            return res.status(500).json({
              error: 'Falha ao criar registro de temporada no Supabase',
              message: insertErr.message
            });
          }
          savedRecord = inserted;
        }

        const responseData = {
          id: savedRecord.id,
          program: savedRecord.program,
          year: savedRecord.year,
          theme: savedRecord.theme,
          season_name: mergedExtra.season_name,
          description: mergedExtra.custom_description,
          fll_missions: currentMissions,
          fll_audios: currentAudios
        };

        return res.status(200).json({
          success: true,
          message: 'Mídias e metadados da temporada FLL persistidos com sucesso no Supabase!',
          data: responseData
        });
      } catch (saveErr) {
        console.error('[API /api/fll/season POST] Exceção:', saveErr);
        return res.status(500).json({
          error: 'Erro interno ao processar requisição',
          message: saveErr.message
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
      const rawSlot = req.query?.slot || req.query?.type || req.url.split('/').pop().split('?')[0];
      const seasonTheme = req.query?.season || req.query?.theme || null;
      const canonicalSlot = SLOT_CANONICAL_MAP[rawSlot] || rawSlot;

      if (!VALID_SLOTS.includes(canonicalSlot)) {
        return res.status(400).json({
          error: `Slot inválido: "${rawSlot}". Slots permitidos: ${VALID_SLOTS.join(', ')}.`
        });
      }

      // 1. Obter metadados do áudio da fonte única da verdade (Supabase)
      const config = await getFllAudioConfig(seasonTheme);
      const audioInfo = config[canonicalSlot] || config[rawSlot];

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
        res.setHeader('X-Audio-SHA256', audioInfo.sha256);
      }

      if (req.method === 'HEAD') {
        return res.status(200).end();
      }

      // Preservar requisições parciais usadas pelos players de áudio.
      const range = req.headers.range;
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        let start = match?.[1] ? Number(match[1]) : 0;
        let end = match?.[2] ? Number(match[2]) : audioBytes.length - 1;
        if (match && !match[1] && match[2]) {
          start = Math.max(0, audioBytes.length - Number(match[2]));
          end = audioBytes.length - 1;
        }
        if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) ||
            !Number.isSafeInteger(end) || start > end || start >= audioBytes.length) {
          res.setHeader('Content-Range', `bytes */${audioBytes.length}`);
          res.setHeader('Content-Length', 0);
          return res.status(416).end();
        }
        end = Math.min(end, audioBytes.length - 1);
        const chunk = audioBytes.subarray(start, end + 1);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${audioBytes.length}`);
        res.setHeader('Content-Length', chunk.length);
        return res.status(206).end(chunk);
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
