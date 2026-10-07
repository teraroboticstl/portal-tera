export const CONTENT_TYPES = ['text','video','pdf','image','checklist','activity','quiz'];
export function youtubeId(value) {
  if (/^[\w-]{11}$/.test(value || '')) return value;
  try {
    const url=new URL(value);
    if(url.protocol!=='https:')return null;
    const id=url.hostname==='youtu.be' ? url.pathname.slice(1) : ['youtube.com','www.youtube.com','m.youtube.com'].includes(url.hostname) ? url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})/)?.[1] : '';
    return /^[\w-]{11}$/.test(id || '') ? id : null;
  } catch { return null; }
}
export function safeHttps(value) {
  try {const url=new URL(value); return url.protocol==='https:' && !url.username && !url.password ? url.href : null;} catch {return null;}
}
export function validateContents(contents) {
  if(!Array.isArray(contents) || contents.length>50)throw new Error('Use no máximo 50 blocos.');
  const ids=new Set();
  for(const block of contents) {
    if(!block.id || ids.has(block.id) || !CONTENT_TYPES.includes(block.type))throw new Error('Tipo ou identificador de bloco inválido.');
    ids.add(block.id);
    if(block.type==='video' && !youtubeId(block.youtube_id))throw new Error('Informe um vídeo válido do YouTube.');
    if(['text','activity'].includes(block.type) && !String(block.text || '').trim())throw new Error('Informe o texto ou enunciado.');
    if(['pdf','image'].includes(block.type) && !block.file_id)throw new Error('Envie o material para o Drive.');
    if(block.type==='checklist' && (!Array.isArray(block.items) || !block.items.length || block.items.length>50 || block.items.some(x=>!String(x).trim())))throw new Error('Informe os itens do checklist.');
    if(block.type==='quiz') {
      if(!Array.isArray(block.questions) || !block.questions.length || block.questions.length>50 || !Number.isInteger(block.min_score) || block.min_score<1 || block.min_score>100 || !Number.isInteger(block.max_attempts) || block.max_attempts<1 || block.max_attempts>100)throw new Error('Revise a nota mínima e as tentativas do quiz.');
      for(const question of block.questions)if(!question.prompt?.trim() || !Array.isArray(question.options) || question.options.length<2 || question.options.length>8 || question.options.some(x=>!x?.trim()) || !Number.isInteger(question.correct) || question.correct<0 || question.correct>=question.options.length)throw new Error('Revise as questões, alternativas e gabaritos.');
    }
  }
  return contents;
}
export function nextModule(modules,progress,trackId) {
  const items=modules.filter(m=>m.track_id===trackId).sort((a,b)=>a.position-b.position);
  return items.find(m=>!progress.some(p=>p.module_id===m.id && p.version===m.version && p.completed_at)) || items[0];
}
