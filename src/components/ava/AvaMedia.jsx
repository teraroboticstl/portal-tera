import React, {useEffect,useState} from 'react';
import {avaMediaBlob} from '@/api/avaClient';
export default function AvaMedia({fileId,type='image',title='Material do módulo'}) {
  const [url,setUrl]=useState(''),[error,setError]=useState('');
  useEffect(()=>{let live=true,objectUrl;setUrl('');setError('');avaMediaBlob(fileId).then(blob=>{if(live){objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);}}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};},[fileId]);
  if(error)return <p role="alert" className="text-red-300">{error}</p>;
  if(!url)return <p role="status" className="text-gray-400">Carregando material protegido…</p>;
  return <div className="space-y-3">{type==='pdf'?<iframe title={title} src={url} className="w-full h-[65vh] rounded-lg bg-white" />:<img src={url} alt={title} className="w-full max-h-96 object-contain rounded-lg" />}<a href={url} download={title} className="text-red-300 underline">Baixar material</a></div>;
}
