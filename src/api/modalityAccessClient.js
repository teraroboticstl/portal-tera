export function createModalityAccessClient(client) {
  async function request(actor, target, name, args) {
    try {
      const before = await client.auth.getUser();
      if (!actor || before.error || before.data?.user?.id !== actor) throw new Error();
      const {data,error} = await client.rpc(name,args);
      const after = await client.auth.getUser();
      if (error || after.error || after.data?.user?.id !== actor || data?.user_id !== target
        || !Number.isSafeInteger(data.revision) || data.revision<0 || !Array.isArray(data.modalities)
        || data.modalities.some(x=>!['FLL','FTC','FRC','OBR'].includes(x))) throw new Error();
      return data;
    } catch {throw new Error('Não foi possível confirmar as modalidades. Atualize antes de tentar novamente.');}
  }
  return {
    read:(actor,target)=>request(actor,target,'portal_modality_user',{p_user:target}),
    set(actor,target,modalities,revision) {
      if (!Array.isArray(modalities) || modalities.some(x=>!['FLL','FTC','FRC','OBR'].includes(x))
        || !Number.isSafeInteger(revision) || revision<0) return Promise.reject(new Error('Modalidades inválidas.'));
      return request(actor,target,'portal_modality_set',{p_user:target,p_modalities:modalities,p_revision:revision});
    }
  };
}
