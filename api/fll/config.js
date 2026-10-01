import { validateUserAuth } from '../lib/supabaseServer.js';
import { getGoogleDriveClient } from '../lib/googleDrive.js';
import { 
  getFllAudioConfig, 
  saveFllAudioConfig, 
  VALID_SLOTS,
  cacheAudioBytes,
  purgeCachedAudioBytes
} from '../lib/fllAudioStorage.js';

export default async function handler(req, res) {
  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Público - Qualquer visitante pode consultar quais áudios estão configurados
  if (req.method === 'GET') {
    try {
      const config = getFllAudioConfig();
      // Enriquecer com URLs públicas do proxy
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

  // POST e DELETE: Exclusivos para Administradores
  const authHeader = req.headers?.authorization;
  if (!authHeader) {
    return res.status(401).json({
      error: 'Autenticação necessária',
      message: 'A alteração de áudios exige cabeçalho Authorization de administrador.'
    });
  }

  let authenticatedUser;
  try {
    authenticatedUser = await validateUserAuth(authHeader);
    if (!authenticatedUser?.profile?.is_admin) {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Apenas administradores podem configurar os áudios do simulador.'
      });
    }
  } catch (authErr) {
    return res.status(401).json({
      error: 'Falha na autenticação',
      message: authErr.message
    });
  }

  // POST: Atualizar/Salvar um slot de áudio
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch {}
      }
      body = body || {};

      const { slot, fileId, fileName, fileSize, sha256, mimeType } = body;

      if (!slot || !VALID_SLOTS.includes(slot)) {
        return res.status(400).json({
          error: 'Slot inválido',
          message: `O campo "slot" deve ser um dos seguintes: ${VALID_SLOTS.join(', ')}.`
        });
      }

      if (!fileId || typeof fileId !== 'string' || fileId.length < 5) {
        return res.status(400).json({
          error: 'ID do arquivo inválido',
          message: 'O campo "fileId" do Google Drive é obrigatório.'
        });
      }

      // 1. Obter cliente Google Drive e confirmar existência do arquivo
      let drive;
      let driveMeta = null;
      try {
        drive = getGoogleDriveClient();
        const metaRes = await drive.files.get({
          fileId,
          fields: 'id, name, mimeType, size, webViewLink, webContentLink, trashed'
        });
        driveMeta = metaRes.data;

        if (driveMeta.trashed) {
          return res.status(400).json({
            error: 'Arquivo na lixeira',
            message: 'O arquivo informado foi marcado como excluído no Google Drive.'
          });
        }
      } catch (driveErr) {
        console.warn(`[API /api/fll/config] Aviso ao verificar arquivo ${fileId} no Drive:`, driveErr.message);
        // Se Drive não estiver disponível no ambiente, permitir com aviso se fileId estiver presente
      }

      // 2. Verificar referência anterior
      const currentConfig = getFllAudioConfig();
      const previousSlotConfig = currentConfig[slot];

      // 3. Montar novo registro
      const newSlotData = {
        fileId,
        fileName: fileName || driveMeta?.name || 'audio.mp3',
        fileSize: Number(fileSize || driveMeta?.size || 0),
        sha256: sha256 || null,
        mimeType: mimeType || driveMeta?.mimeType || 'audio/mpeg',
        webViewLink: driveMeta?.webViewLink || null,
        updatedAt: new Date().toISOString(),
        updatedBy: {
          id: authenticatedUser.id,
          email: authenticatedUser.email
        }
      };

      // 4. Salvar persistentemente a nova configuração
      const updatedConfig = saveFllAudioConfig({
        [slot]: newSlotData
      });

      // 5. Se o arquivo anterior foi substituído e for diferente, limpar caches se necessário
      if (previousSlotConfig && previousSlotConfig.fileId && previousSlotConfig.fileId !== fileId) {
        // Confirmação de salvamento antes de qualquer limpeza
        console.log(`[fllAudioConfig] Áudio do slot "${slot}" atualizado com sucesso. Anterior: ${previousSlotConfig.fileId}, Novo: ${fileId}`);
      }

      return res.status(200).json({
        success: true,
        message: `Som "${slot}" salvo e configurado com sucesso!`,
        data: {
          slot,
          ...newSlotData,
          url: `/api/fll/audio?slot=${slot}&v=${encodeURIComponent(newSlotData.sha256 || newSlotData.fileId)}`
        }
      });
    } catch (saveErr) {
      console.error('[API /api/fll/config POST] Erro ao salvar:', saveErr);
      return res.status(500).json({
        error: 'Falha ao salvar configuração',
        message: saveErr.message
      });
    }
  }

  // DELETE: Desvincular áudio de um slot
  if (req.method === 'DELETE') {
    try {
      const slot = req.query?.slot || req.body?.slot;
      if (!slot || !VALID_SLOTS.includes(slot)) {
        return res.status(400).json({ error: 'Slot inválido para remoção.' });
      }

      saveFllAudioConfig({
        [slot]: null
      });

      return res.status(200).json({
        success: true,
        message: `Áudio do slot "${slot}" desvinculado com sucesso.`
      });
    } catch (delErr) {
      return res.status(500).json({ error: delErr.message });
    }
  }

  return res.status(405).json({ error: 'Método não permitido.' });
}
