import { requestDeadline } from './requestDeadline.js';
import { supabase } from './supabaseClient.js';

/**
 * Cliente de upload para o Google Drive institucional através do endpoint seguro
 * @param {object} params
 * @param {File} params.file - Arquivo a ser enviado
 * @param {string} [params.context='test'] - Contexto (products, projects, robots, etc.)
 * @param {string} [params.season] - Temporada (opcional)
 * @param {string} [params.program] - Programa FLL/FTC/FRC (opcional)
 * @param {string} [params.subfolder] - Subpasta (opcional)
 * @param {string} [params.recordId] - ID do registro no banco (opcional)
 * @returns {Promise<{ provider: string, fileId: string, name: string, mimeType: string, size: number, context: string, folderId: string, webViewLink: string, directUrl: string, downloadUrl: string }>}
 */
export async function uploadToGoogleDrive(params = {}) {
  const {
    file,
    context = 'test',
    season = params.extraMeta?.season || params.extraMeta?.season_name || params.extraMeta?.theme,
    program = params.extraMeta?.program,
    subfolder = params.extraMeta?.subfolder,
    recordId = params.extraMeta?.recordId || params.extraMeta?.missionCode
  } = params;

  if (!file) {
    throw new Error('Nenhum arquivo fornecido para upload.');
  }

  if(file.size>4*1024*1024)throw new Error('Envio direto limitado a 4 MB. Para vídeos maiores, use o campo de link do Drive com acesso restrito à equipe.');
  return requestDeadline(async signal => {
  // 1. Obter o token JWT da sessão atual do Supabase Auth
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Usuário não autenticado. Faça login para realizar uploads.');
  }

  // 2. Montar o FormData
  const formData = new FormData();
  formData.append('file', file);
  formData.append('context', context);
  if (season) formData.append('season', season);
  if (program) formData.append('program', program);
  if (subfolder) formData.append('subfolder', subfolder);
  if (recordId) formData.append('recordId', recordId);

  // 3. Chamar o endpoint server-side
  const response = await fetch('/api/media/upload', {
    signal,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  let result;
  try {
    result = await response.json();
  } catch {
    if (response.status === 413) {
      throw new Error('O arquivo excede o limite de envio do servidor. Selecione um arquivo menor.');
    }
    throw new Error('O servidor não conseguiu processar o upload. Tente novamente.');
  }

  if (!response.ok) {
    const errorMsg = result.message || result.error || 'Falha ao processar upload no servidor.';
    const details = result.details ? ` (${result.details})` : '';
    throw Object.assign(new Error(`${errorMsg}${details}`),{code:result.error,status:response.status});
  }

  return result.data;
  },90000);
}

/**
 * Obtém a URL de autorização OAuth da conta institucional (apenas administradores)
 */
export async function getGoogleAuthUrl() {
  return requestDeadline(async signal => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Usuário não autenticado.');
  }

  const response = await fetch('/api/auth/google/url', {
    signal,
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Falha ao obter URL de autorização.');
  }

  return result;
  });
}

/**
 * Remove um arquivo do Google Drive institucional através do endpoint seguro
 * @param {string} fileId - ID do arquivo no Google Drive
 */
export async function deleteFromGoogleDrive(fileId) {
  if (!fileId) return;

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Usuário não autenticado.');
  }

  const response = await fetch(`/api/media/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || result.message || 'Falha ao remover arquivo do Google Drive.');
  }

  return result;
}
