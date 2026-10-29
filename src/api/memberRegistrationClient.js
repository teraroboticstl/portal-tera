export function createMemberRegistrationClient(client) {
  async function request(name, expectedUser, args) {
    try {
      const before = await client.auth.getUser();
      if (before.error || !expectedUser || before.data?.user?.id !== expectedUser) throw new Error();
      const result = await client.rpc(name, args);
      const after = await client.auth.getUser();
      if (result.error || after.error || after.data?.user?.id !== expectedUser || result.data?.actor !== expectedUser
        || typeof result.data.enabled !== 'boolean' || typeof result.data.required !== 'boolean'
        || !Number.isInteger(result.data.completed_version)
        || (result.data.enabled && !result.data.required && result.data.completed_version < 1)) throw new Error();
      return { actor: expectedUser, enabled: result.data.enabled, required: result.data.required,
        preferred_name: typeof result.data.preferred_name === 'string' ? result.data.preferred_name.slice(0, 80) : '' };
    } catch { throw new Error('Não foi possível confirmar seu recadastro. Tente novamente ou contate a liderança.'); }
  }
  return {
    status: id => request('member_registration_status', id),
    complete: (id, data) => request('member_registration_complete', id, { p_data: data }),
  };
}
