import {Link} from 'react-router-dom';
import {BarChart3,ArrowUpRight} from 'lucide-react';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
import {usePageVisibility} from '@/lib/usePageVisibility';
import {BI_PAGES,BI_METRICS} from '@/lib/teraBi';
import {biButton} from '@/components/bi/BiVisuals';

function BiHome({user}) {
  const access=usePageVisibility();
  const ready=access.isFetchedAfterMount&&!access.isError&&access.snapshot?.actor===user.id;
  const boards=ready?Object.keys(BI_PAGES).filter(program=>access.canShowModality(program)&&access.canShow(BI_PAGES[program])):[];
  return <InternalPageLayout user={user} currentPage="InternalTeraBI" title="TERA BI"><div className="space-y-6 pb-20 text-white">
    <header className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-950/50 to-[#111217] p-5 sm:p-7"><p className="text-xs font-bold tracking-[.2em] text-red-400">INTELIGÊNCIA DA EQUIPE</p><h1 className="mt-3 text-3xl font-bold flex items-center gap-3"><BarChart3 aria-hidden="true"/>TERA BI</h1><p className="mt-3 text-gray-300">Todos os seus painéis em um só lugar. Escolha uma modalidade para acompanhar scouting, indicadores e evolução.</p><p className="mt-3 text-sm text-gray-400">O acesso a cada painel continua seguindo suas modalidades autorizadas e a visibilidade definida pela administração.</p></header>
    {access.isError?<div role="alert" className="rounded-xl border border-red-500/40 p-5"><p>Não foi possível conferir os painéis disponíveis.</p><button className={biButton+' mt-3'} onClick={()=>access.refetch()}>Tentar novamente</button></div>:!ready?<p role="status">Conferindo os painéis autorizados…</p>:<>
      <section className="grid gap-4 md:grid-cols-3" aria-label="Painéis disponíveis">{boards.map(program=><Link key={program} to={`/Internal${program}BI`} className="min-w-0 rounded-2xl border border-white/15 bg-[#111217] p-5 transition-colors hover:border-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500"><div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-bold">{program}</h2><ArrowUpRight className="text-red-400" aria-hidden="true"/></div><p className="mt-3 text-sm text-gray-300">{BI_METRICS[program]}</p><span className="mt-5 inline-block text-sm text-red-400">Abrir painel {program}</span></Link>)}</section>
      {!boards.length&&<p className="rounded-xl border border-white/15 p-5 text-gray-300">Nenhum painel FRC, FTC ou FLL está disponível para sua conta no momento. Consulte o administrador para conferir as modalidades liberadas e a visibilidade das páginas.</p>}
    </>}
    <Link className={biButton} to="/TeraDataExperience">Explorar os dados públicos da Tera <ArrowUpRight size={17}/></Link>
  </div></InternalPageLayout>;
}
export default function InternalTeraBiHome(){return <ProtectedRoute requireApproved><BiHome/></ProtectedRoute>;}
