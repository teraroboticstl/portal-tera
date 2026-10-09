import React from 'react';
import ReactMarkdown from 'react-markdown';
import {youtubeId} from '@/lib/avaRules';
import {remarkYoutubeLinks} from '@/lib/avaYoutubeMarkdown';
import AvaYoutube from './AvaYoutube';

export default function AvaText({text}) {
  return <ReactMarkdown remarkPlugins={[remarkYoutubeLinks]} components={{
    a:({href,children})=>youtubeId(href)?<AvaYoutube value={href} />:<a href={href}>{children}</a>,
  }}>{text}</ReactMarkdown>;
}
