import React from 'react';
import { base44 } from '@/api/base44Client';
import RecordAttachments from './RecordAttachments';

export default function MeetingAttachments({ form, setForm, uploading, setUploading, onError }) {
  async function upload(event) {
    const input = event.target, file = input.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(file.type) || file.size > 4 * 1024 * 1024) {
      onError('Selecione PNG, JPG, WebP ou PDF de até 4 MB.');
      input.value = '';
      return;
    }
    setUploading(true);
    onError('');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file, context: 'seasons', program: form.program });
      const field = file.type === 'application/pdf' ? 'evidence_links' : 'evidence_images';
      setForm(previous => ({ ...previous, [field]: [...(previous[field] || []), file_url] }));
    } catch {
      onError('Falha no envio. O arquivo não foi anexado; você pode salvar o texto sem ele ou tentar novamente.');
    } finally {
      setUploading(false);
      input.value = '';
    }
  }
  return <section className="space-y-3 min-w-0">
    <label className="block text-sm" htmlFor="meeting-attachments">Fotos e documentos opcionais (até 4 MB)</label>
    <input id="meeting-attachments" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={upload} disabled={uploading} className="block w-full min-w-0 text-sm" />
    {uploading && <p role="status">Enviando anexo…</p>}
    <RecordAttachments record={{ evidence_images: form.evidence_images, evidence_links: form.evidence_links }} />
    {['evidence_images', 'evidence_links'].map(field => (form[field] || []).map((url, index) => <button key={field + index} type="button" className="block text-sm text-red-300 underline" onClick={() => setForm(previous => ({ ...previous, [field]: previous[field].filter((_, i) => i !== index) }))}>Remover {field === 'evidence_images' ? 'foto' : 'documento'} {index + 1}</button>))}
  </section>;
}
