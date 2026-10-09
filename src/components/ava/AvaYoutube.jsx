import React from 'react';
import {youtubeId} from '@/lib/avaRules';

export default function AvaYoutube({value,title='Vídeo da aula'}) {
  const id=youtubeId(value);
  if(!id)return <span role="alert">Link de vídeo inválido. Solicite a revisão do material.</span>;
  return <span className="block my-4 not-prose">
    <iframe className="aspect-video w-full rounded-lg border-0" src={`https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0`}
      title={title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
  </span>;
}
