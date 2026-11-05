import React from 'react';
import PortalMedia from '@/components/common/PortalMedia';
import { isMediaAddress as allowed } from '@/api/privateMedia';
export default function RecordAttachments({record}) {
 return <section className="space-y-3 min-w-0">
  {(record.evidence_images || []).filter(allowed).map((src,i)=><PortalMedia key={src+i} src={src} alt={`Evidência ${i+1}`} className="w-full max-h-72 object-contain rounded-lg" />)}
  {(record.video_urls || []).filter(allowed).map((src,i)=>src.startsWith('/api/media/') || /\.(mp4|webm|mov)(\?|$)/i.test(src)?<PortalMedia key={src+i} type="video" src={src} className="w-full max-h-72 rounded-lg" />:<a key={src+i} href={src} target="_blank" rel="noopener noreferrer" className="block break-all text-red-300 underline">Abrir vídeo {i+1}</a>)}
  {(record.evidence_links || []).filter(allowed).map((src,i)=><PortalMedia key={src+i} type="link" src={src} className="block break-all text-red-300 underline" />)}
 </section>;
}
