import { validateUserAuth, createScopedUserSupabaseClient } from '../lib/supabaseServer.js';
import { supabaseServer } from '../lib/supabaseServer.js';
import { 
  getActiveFllSeasonData, 
  SLOT_CANONICAL_MAP 
} from '../lib/fllAudioStorage.js';

/**
 * Endpoint central de consulta e persistência da Temporada FLL e suas mídias oficiais (Missões e Áudios).
 * FONTE DE VERDADE ÚNICA: Supabase (public.seasons).
 * Rota: GET, POST, OPTIONS /api/fll/season
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
