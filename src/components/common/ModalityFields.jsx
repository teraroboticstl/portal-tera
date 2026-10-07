import React from 'react';
import { MODALITIES, OBR_CATEGORIES, projectModalities, projectCategories } from '@/lib/modalities';

export function ModalityBadges({ project }) {
  const values = projectModalities(project);
  const labels = values.includes('all') ? ['Todas as modalidades'] : values;
  return <div className="flex flex-wrap gap-2 my-3">{(labels.length ? labels : ['Modalidades não informadas']).map(label => <span key={label} className="px-2 py-1 text-xs rounded bg-blue-500/15 text-blue-300">{label}</span>)}{values.includes('OBR') && projectCategories(project).map(label => <span key={label} className="px-2 py-1 text-xs rounded bg-white/5 text-gray-300">{label.replace('OBR ', '')}</span>)}</div>;
}

export default function ModalityFields({ value = [], categories = [], onChange, onCategoriesChange }) {
  const all = value.includes('all');
  return <fieldset className="space-y-3 border border-[#1F222B] rounded-xl p-4"><legend className="text-sm px-2">Modalidades vinculadas ao projeto</legend>
    <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={all} onChange={e => { onChange(e.target.checked ? ['all'] : []); onCategoriesChange([]); }} />Todas as modalidades</label>
    <div className="flex flex-wrap gap-4">{MODALITIES.map(m => <label key={m} className="flex gap-2 items-center text-sm"><input type="checkbox" checked={all || value.includes(m)} disabled={all} onChange={e => { onChange(e.target.checked ? [...value, m] : value.filter(v => v !== m)); if (m === 'OBR' && !e.target.checked) onCategoriesChange([]); }} />{m}</label>)}</div>
    {!all && value.includes('OBR') && <fieldset className="space-y-2"><legend className="text-sm mb-2">Subcategorias OBR — sem seleção, inclui todas</legend><div className="grid sm:grid-cols-2 gap-2">{OBR_CATEGORIES.map(c => <label key={c} className="flex gap-2 items-center text-sm"><input type="checkbox" checked={categories.includes(c)} onChange={e => onCategoriesChange(e.target.checked ? [...categories, c] : categories.filter(v => v !== c))} />{c.replace('OBR ', '')}</label>)}</div></fieldset>}
    <p className="text-xs text-gray-400">Selecione uma ou várias modalidades. Projetos antigos permanecem sem vínculo até serem classificados.</p>
  </fieldset>;
}

export function ModalityFilter({ value, onChange }) {
  return <label className="block text-sm">Filtrar por modalidade<select className="block w-full mt-2 bg-[#111217] border border-[#1F222B] rounded-lg p-3 text-white" value={value} onChange={e => onChange(e.target.value)}><option value="all">Todas as modalidades / projetos</option>{MODALITIES.map(m => <option key={m}>{m}</option>)}{OBR_CATEGORIES.map(c => <option key={c}>{c}</option>)}<option value="unassigned">Sem vínculo informado</option></select></label>;
}
