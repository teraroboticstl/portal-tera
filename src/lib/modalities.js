export const MODALITIES = ['OBR', 'FLL', 'FTC', 'FRC'];
export const OBR_CATEGORIES = ['OBR Resgate Nível 1', 'OBR Resgate Nível 2', 'OBR Artística Nível 1', 'OBR Artística Nível 2'];
export const RECORD_PROGRAMS = [...MODALITIES, ...OBR_CATEGORIES];
export const OBR_MANUALS_URL = 'https://obr.robocup.org.br/documentos-e-manuais/';
export function normalizeModalities(values) {
  if (!Array.isArray(values)) return [];
  if (values.includes('all')) return ['all'];
  return MODALITIES.filter(value => values.includes(value));
}
export function projectModalities(project) {
  return normalizeModalities(project?.modalities ?? project?.links?.modalities);
}
export function projectCategories(project) {
  const values = project?.obr_categories ?? project?.links?.obr_categories;
  return Array.isArray(values) ? OBR_CATEGORIES.filter(value => values.includes(value)) : [];
}
export function matchesProject(project, filter = 'all') {
  if (filter === 'all') return true;
  const values = projectModalities(project);
  if (filter === 'unassigned') return values.length === 0;
  if (values.includes('all')) return true;
  if (OBR_CATEGORIES.includes(filter)) {
    return values.includes('OBR') && (projectCategories(project).length === 0 || projectCategories(project).includes(filter));
  }
  return values.includes(filter);
}
export function matchesProgram(value, filter) {
  return filter === 'all' || value === filter || (filter === 'OBR' && OBR_CATEGORIES.includes(value));
}
export function initialProgram(search) {
  const value = new URLSearchParams(search).get('program');
  return [...RECORD_PROGRAMS, 'Geral'].includes(value) ? value : 'all';
}
export function mergeProjectLinks(links, payload) {
  const result = { ...(links && typeof links === 'object' && !Array.isArray(links) ? links : {}) };
  if (payload.modalities !== undefined) result.modalities = normalizeModalities(payload.modalities);
  if (payload.obr_categories !== undefined) result.obr_categories = projectCategories(payload);
  return result;
}
