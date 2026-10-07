import React from 'react';
import {Link,useLocation} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {ModalityBadges} from '@/components/common/ModalityFields';
import SafeImage from '@/components/common/SafeImage';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function ProjectDetail(){
 const params=new URLSearchParams(useLocation().search),id=params.get('id'),title=params.get('project');
 const {data:project,isLoading,isError}=useQuery({
  queryKey:['projects','detail',id,title],
  queryFn:async()=>{
   if(id){const rows=await base44.entities.Project.filter({id,status:'active'});return rows[0]||null;}
   const rows=await base44.entities.Project.filter({status:'active'},'-created_date');
   return rows.find(p=>p.title?.toLocaleLowerCase('pt-BR')===title?.toLocaleLowerCase('pt-BR'))||null;
  },enabled:Boolean(id||title)
 });
 const externalLink=(()=>{try{const url=new URL(project?.link,window.location.origin);return project?.link && ['https:','http:'].includes(url.protocol)?url.href:null;}catch{return null;}})();
 return <div className="max-w-6xl mx-auto px-4 py-12 space-y-8">
  <Link className="text-blue-400 hover:underline" to="/Projects">← Projetos Sociais</Link>
  {isLoading?<LoadingSpinner />:isError?<p role="alert">Não foi possível carregar o projeto. Tente novamente.</p>:!project?<p>Projeto não encontrado ou indisponível para consulta pública.</p>:<>
   <header className="space-y-4"><h1 className="text-3xl md:text-5xl font-bold">{project.title}</h1><ModalityBadges project={project} />{project.date_period&&<p className="text-gray-400">{project.date_period}</p>}<div className="flex flex-wrap gap-2">{(Array.isArray(project.tags)?project.tags:[]).map(tag=><span key={tag} className="bg-[#1F222B] px-3 py-1 rounded-full text-sm">{tag}</span>)}</div></header>
   <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{project.description}</p>
   {Array.isArray(project.images)&&project.images.length>0&&<section aria-label="Fotos do projeto" className="grid sm:grid-cols-2 gap-5">{project.images.map((url,index)=><SafeImage key={url+index} src={url} alt={project.title+' — foto '+(index+1)} allowEnlarge containerClassName="aspect-video" rounded="rounded-xl" />)}</section>}
   {externalLink&&<a className="inline-block text-blue-400 hover:underline" href={externalLink} target="_blank" rel="noopener noreferrer">Saiba mais sobre o projeto ↗</a>}
  </>}
 </div>;
}
