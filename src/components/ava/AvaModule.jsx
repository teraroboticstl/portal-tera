import React,{useEffect,useState} from 'react';
import AvaText from './AvaText';
import AvaYoutube from './AvaYoutube';
import {avaRequest,avaMutate} from '@/api/avaClient';
import AvaMedia from './AvaMedia';
import {Button} from '@/components/ui/button';
export default function AvaModule({id,onBack,onRefresh}) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[answers,setAnswers]=useState({}),[notice,setNotice]=useState(''),[feedback,setFeedback]=useState([]);
  async function load(){try{const d=await avaRequest('module',id);setData(d);setAnswers(Object.fromEntries(Object.entries(d.progress?.blocks || {}).map(([k,v])=>[k,v.checks || v.answer || []])));}catch(e){setError(e.message);}}
  useEffect(()=>{load();},[id]);
  async function submit(block,value){setBusy(true);setError('');setNotice('');setFeedback([]);try{const r=await avaMutate('progress',{module_id:id,version:data.module.version,block_id:block.id,value});setNotice(block.type==='quiz'?`Nota: ${r.score}% · ${r.passed?'Aprovado':'Ainda não atingiu a nota mínima'}`:'Progresso salvo.');setFeedback(r.feedback || []);await load();onRefresh();}catch(e){setError(e.message);}finally{setBusy(false);}}
  if(!data)return <section className="p-6"><Button variant="outline" onClick={onBack}>Voltar à trilha</Button><p role="alert" className="mt-4">{error || 'Carregando módulo…'}</p></section>;
  return <section className="space-y-6"><Button variant="outline" onClick={onBack}>Voltar à trilha</Button><div><h1 className="text-3xl font-bold">{data.module.title}</h1><p className="text-gray-400 mt-2">{data.module.summary} · {data.module.duration_minutes} min</p>{data.progress?.completed_at && <p className="text-emerald-300 mt-3">Módulo concluído</p>}</div>{error && <p role="alert" className="text-red-300">{error}</p>}{notice && <p role="status" className="text-emerald-300">{notice}</p>}
    {feedback.filter(Boolean).map((text,index)=><p key={index} className="text-sm text-gray-300">Questão {index+1}: {text}</p>)}
    {data.module.contents.map(block=>{const p=data.progress?.blocks?.[block.id],value=answers[block.id];return <article key={block.id} className="rounded-xl border border-white/10 bg-[#111217] p-5 space-y-4"><div className="flex justify-between gap-3"><h2 className="text-xl font-bold">{block.title || block.type}</h2><span className="text-xs text-gray-400">{p?.done?'Concluído':block.required===false?'Opcional':'Obrigatório'}</span></div>
      {['text','activity'].includes(block.type) && <div className="prose prose-invert max-w-none"><AvaText text={block.text} /></div>}
      {block.type==='video' && <AvaYoutube value={block.youtube_id} title={block.title || 'Vídeo da aula'} />}
      {['pdf','image'].includes(block.type) && <AvaMedia fileId={block.file_id} type={block.type} title={block.title} />}
      {block.type==='checklist' && <div className="space-y-3">{block.items.map((item,index)=><label key={index} className="flex gap-3 items-start"><input type="checkbox" checked={value?.[index]===true} onChange={e=>{const v=block.items.map((_,i)=>value?.[i]===true);v[index]=e.target.checked;setAnswers(old=>({...old,[block.id]:v}));}} />{item}</label>)}</div>}
      {block.type==='activity' && <label className="block text-sm">Sua resposta<textarea className="ava-input min-h-32 mt-2" value={typeof value==='string'?value:''} onChange={e=>setAnswers(old=>({...old,[block.id]:e.target.value}))} maxLength={6000} /></label>}
      {block.type==='quiz' && <><p className="text-sm text-gray-400">Nota mínima {block.min_score}% · {data.attempts.filter(a=>a.block_id===block.id).length}/{block.max_attempts} tentativas utilizadas{p?.score!==undefined && ` · Melhor nota: ${p.score}%`}</p>{block.questions.map((q,i)=><fieldset key={i} className="border border-white/10 rounded-lg p-4"><legend className="px-2">{i+1}. {q.prompt}</legend>{q.options.map((option,j)=><label key={j} className="flex gap-2 items-start py-2"><input type="radio" name={`${block.id}-${i}`} checked={value?.[i]===j} onChange={()=>{const v=[...(value || [])];v[i]=j;setAnswers(old=>({...old,[block.id]:v}));}} />{option}</label>)}</fieldset>)}</>}
      <Button disabled={busy || (block.type==='quiz' && data.attempts.filter(a=>a.block_id===block.id).length>=block.max_attempts)} onClick={()=>submit(block,block.type==='quiz'?value || []:block.type==='checklist'?block.items.map((_,i)=>value?.[i]===true):block.type==='activity'?value || '':true)}>{busy?'Salvando…':block.type==='quiz'?'Enviar quiz':block.type==='activity'?'Enviar resposta':block.type==='checklist'?'Salvar checklist':block.type==='video'?'Marcar vídeo como concluído':'Marcar como lido'}</Button>
    </article>;})}
  </section>;
}
