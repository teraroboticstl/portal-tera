import { INTERNAL_PAGES, visibilityKey } from '../lib/internalPageVisibility.js';

export function createPageVisibilityClient(client) {
  async function request(actor, name, args) {
    try {
      const before = await client.auth.getUser();
      if (!actor || before.error || before.data?.user?.id !== actor) throw new Error();
      const result = await client.rpc(name, args);
      const after = await client.auth.getUser();
      const data = result.data;
      if (result.error || after.error || after.data?.user?.id !== actor || data?.actor !== actor
        || typeof data.is_admin !== 'boolean') throw new Error();
      const pages = {};
      for (const [key] of INTERNAL_PAGES) {
        const row = data.pages?.[key];
        if (typeof row?.visible !== 'boolean' || !Number.isSafeInteger(row.revision) || row.revision < 0) throw new Error();
        pages[key] = { visible: row.visible, revision: row.revision };
      }
      return { actor, is_admin: data.is_admin, pages,
        all_modalities: data.all_modalities === true,
        modalities: Array.isArray(data.modalities) ? data.modalities.filter(x=>['FLL','FTC','FRC','OBR'].includes(x)) : [] };
    } catch { throw new Error('Não foi possível confirmar a visibilidade. Atualize e tente novamente; se persistir, contate o administrador.'); }
  }
  return {
    read: actor => request(actor, 'portal_page_visibility_snapshot'),
    set(actor, page, visible, revision) {
      if (!visibilityKey(page) || typeof visible !== 'boolean' || !Number.isSafeInteger(revision) || revision < 0)
        return Promise.reject(new Error('Configuração de página inválida.'));
      return request(actor, 'portal_page_visibility_set', { p_page: visibilityKey(page), p_visible: visible, p_revision: revision });
    },
  };
}
