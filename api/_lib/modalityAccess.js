// Input is the server-verified identity, never a browser-supplied profile.
export function canUseProgram(profile, program) {
  if (!profile?.portal_internal && !profile?.is_admin) return false;
  if (profile.is_admin || profile.all_modalities || profile.modality_access_enabled !== true) return true;
  const value=String(program || 'Geral').trim().toUpperCase();
  const mode=value.startsWith('OBR ')?'OBR':value;
  return mode==='GERAL' || profile.allowed_modalities?.includes(mode)===true;
}
