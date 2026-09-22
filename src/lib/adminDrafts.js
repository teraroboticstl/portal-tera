/**
 * Gerenciador de rascunhos em sessionStorage para formulários do Painel Admin
 * Garante que formulários permaneçam abertos e com dados preenchidos durante
 * alternância de abas e recarregamentos (F5) na mesma sessão do navegador.
 */

const DRAFT_PREFIX = 'portal_tera_admin_draft_';

/**
 * Salva o rascunho de um formulário no sessionStorage
 * @param {string} entity - Identificador da entidade ('products', 'robots', 'projects', 'sponsors')
 * @param {object} draft - Objeto contendo { isOpen, mode: 'create'|'edit', recordId, data }
 */
export function saveAdminDraft(entity, draft) {
  if (typeof window === 'undefined' || !window.sessionStorage) return;

  try {
    if (!draft || !draft.isOpen) {
      clearAdminDraft(entity);
      return;
    }

    const payload = {
      isOpen: Boolean(draft.isOpen),
      mode: draft.mode === 'edit' ? 'edit' : 'create',
      recordId: draft.recordId || null,
      data: draft.data || {},
      updatedAt: Date.now()
    };

    window.sessionStorage.setItem(`${DRAFT_PREFIX}${entity}`, JSON.stringify(payload));
  } catch (err) {
    console.warn(`[adminDrafts] Erro ao salvar rascunho de ${entity}:`, err);
  }
}

/**
 * Carrega o rascunho de um formulário do sessionStorage
 * @param {string} entity - Identificador da entidade
 * @returns {object|null} - Dados do rascunho ou null se inexistente
 */
export function loadAdminDraft(entity) {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;

  try {
    const raw = window.sessionStorage.getItem(`${DRAFT_PREFIX}${entity}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.isOpen) {
      return null;
    }

    return {
      isOpen: Boolean(parsed.isOpen),
      mode: parsed.mode === 'edit' ? 'edit' : 'create',
      recordId: parsed.recordId || null,
      data: parsed.data || {}
    };
  } catch (err) {
    console.warn(`[adminDrafts] Erro ao carregar rascunho de ${entity}:`, err);
    return null;
  }
}

/**
 * Limpa o rascunho de um formulário do sessionStorage
 * @param {string} entity - Identificador da entidade
 */
export function clearAdminDraft(entity) {
  if (typeof window === 'undefined' || !window.sessionStorage) return;

  try {
    window.sessionStorage.removeItem(`${DRAFT_PREFIX}${entity}`);
  } catch (err) {
    console.warn(`[adminDrafts] Erro ao limpar rascunho de ${entity}:`, err);
  }
}
