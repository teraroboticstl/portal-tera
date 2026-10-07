import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Volume2, BarChart3, ExternalLink } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import FllMissionsManagement from './FllMissionsManagement';
import FllAudiosManagement from './FllAudiosManagement';
import FllSimulationsManagement from './FllSimulationsManagement';
import { ANALYTICS_MISSIONS } from '@/lib/fllIndustryRules';
import industryAssets from '@/lib/fllIndustryAssets.json';

const SEASONS = [
  { id: 'bioglow', label: 'Bioglow · 2026–2027', season_theme: 'BIOGLOW', season_year: 2026, rules_version: 'bioglow-2026-2027-v1', route: '/SimuladorFLL' },
  { id: 'industria', label: 'Desafios da Indústria · Interclasse 2026', season_theme: 'DESAFIOS DA INDÚSTRIA', season_year: 2026, rules_version: 'industria-interclasse-2026-v11', route: '/SimuladorIndustria' },
];

function initialSection() {
  const previous = new URLSearchParams(window.location.search).get('tab');
  if (previous === 'fll_audios') return 'audios';
  if (previous === 'fll_simulations') return 'simulations';
  return 'missions';
}

export default function FllSimulatorsManagement({ user }) {
  const [seasonId, setSeasonId] = useState('bioglow');
  const [section, setSection] = useState(initialSection);
  const season = SEASONS.find(item => item.id === seasonId);
  return <section className="space-y-6">
    <div className="rounded-xl border border-[#1F222B] bg-[#111217] p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><span className="text-xs font-bold text-red-400">CATEGORIA FLL</span><h2 className="text-2xl font-bold mt-1">Simuladores FLL</h2><p className="text-sm text-gray-400 mt-2">Organize missões, áudios e análises de rounds por temporada.</p></div>
        <Link to={season.route} className="inline-flex items-center gap-2 text-sm rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10"><ExternalLink className="w-4 h-4" />Abrir simulador</Link>
      </div>
      <label className="block text-sm max-w-xl">Temporada<select className="block w-full mt-2 rounded-lg border border-white/20 bg-[#0B0B0D] p-3 text-white" value={seasonId} onChange={e=>setSeasonId(e.target.value)}>{SEASONS.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <p className="text-xs text-gray-400">Os recursos e registros abaixo pertencem a {season.label}.</p>
    </div>
    <Tabs value={section} onValueChange={setSection}>
      <TabsList className="bg-[#111217] border border-[#1F222B] w-full sm:w-auto mb-5">
        <TabsTrigger value="missions" className="flex-1 data-[state=active]:bg-[#E10600]"><Bot className="w-4 h-4 mr-2" />Missões</TabsTrigger>
        <TabsTrigger value="audios" className="flex-1 data-[state=active]:bg-[#E10600]"><Volume2 className="w-4 h-4 mr-2" />Áudios</TabsTrigger>
        <TabsTrigger value="simulations" className="flex-1 data-[state=active]:bg-[#E10600]"><BarChart3 className="w-4 h-4 mr-2" />Simulações</TabsTrigger>
      </TabsList>
      <TabsContent value="missions">{seasonId==='bioglow' ? <FllMissionsManagement key={seasonId} seasonTheme={season.season_theme} /> : <div className="space-y-4"><h3 className="text-xl font-bold">Missões · Desafios da Indústria</h3><p className="text-sm text-gray-400">Regras do arquivo original V11 do Interclasse. As missões e pontuações são preservadas no simulador desta temporada.</p><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{ANALYTICS_MISSIONS.map(([code,label,max])=><div key={code} className="rounded-xl border border-white/10 p-4"><h4 className="font-bold">{label}</h4><p className="text-sm text-red-400 mt-2">Máximo: {max} pts</p></div>)}</div></div>}</TabsContent>
      <TabsContent value="audios">{seasonId==='bioglow' ? <FllAudiosManagement key={seasonId} user={user} seasonTheme={season.season_theme} /> : <div className="space-y-4"><h3 className="text-xl font-bold">Áudios · Desafios da Indústria</h3><p className="text-sm text-gray-400">Arquivos originais do Interclasse V11, preservados junto ao simulador. O alerta desta temporada é reproduzido aos 30 segundos.</p>{[['Início do round',industryAssets.start],['Alerta dos 30 segundos',industryAssets.alert],['Término do round',industryAssets.end]].map(([label,url])=><div key={url} className="rounded-xl border border-white/10 p-4"><h4 className="font-bold mb-3">{label}</h4><audio controls preload="none" src={url} className="w-full max-w-lg" /></div>)}</div>}</TabsContent>
      <TabsContent value="simulations"><FllSimulationsManagement key={seasonId} scope={season} /></TabsContent>
    </Tabs>
  </section>;
}
