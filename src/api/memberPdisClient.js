export function createMemberPdisClient(client) {
  return async function read(actor, { modality = null, all = false, after = null } = {}) {
    try {
      const before = await client.auth.getUser();
      if (!actor || before.error || before.data?.user?.id !== actor) throw new Error();
      const response = await client.rpc('member_pdis', { p_modality: modality, p_all: all, p_after: after });
      const afterAuth = await client.auth.getUser();
      const packet = response.data;
      if (response.error || afterAuth.error || afterAuth.data?.user?.id !== actor || packet?.actor !== actor
        || !Array.isArray(packet.items) || packet.items.length > 100 || typeof packet.has_more !== 'boolean'
        || (packet.has_more && (!packet.next_cursor || packet.next_cursor === after))) throw new Error();
      for (const row of packet.items) {
        if (!row.pdi || typeof row.cursor !== 'string' || (!all && row.pdi.participant_id !== actor)
          || (modality && row.pdi.modality !== modality)) throw new Error();
      }
      return packet;
    } catch { throw new Error('Não foi possível carregar os PDIs com suas permissões. Tente novamente.'); }
  };
}
