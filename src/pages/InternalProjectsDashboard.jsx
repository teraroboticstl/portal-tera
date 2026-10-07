import React, {useState} from 'react';
import {Navigate,useLocation} from 'react-router-dom';
import {useQuery,useMutation,useQueryClient} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
import {Plus,Leaf} from 'lucide-react';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {toast} from 'sonner';
import ProtectedRoute from '@/components/internal/ProtectedRoute';
import InternalPageLayout from '@/components/internal/InternalPageLayout';
const ESG_THEME_CONFIG = {
  'Resíduos':   { emoji: '♻️', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  'Energia':    { emoji: '⚡', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  'Consumo':    { emoji: '🌊', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  'Pessoas':    { emoji: '👥', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  'Governança': { emoji: '🏛️', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
};

const EFFORT_CONFIG = {
  alto:  { label: 'Alto',  color: 'text-red-400' },
  médio: { label: 'Médio', color: 'text-yellow-400' },
  baixo: { label: 'Baixo', color: 'text-green-400' },
};


const EMPTY_ESG={title:'',description:'',theme:'Resíduos',effort:'médio',horizon:'médio prazo'};
function ESGContent({user}){
 const qc=useQueryClient();
  // ── ESG state
  const [showESGForm, setShowESGForm] = useState(false);
  const [editingESG, setEditingESG] = useState(null);
  const [esgForm, setEsgForm] = useState(EMPTY_ESG);
  const [esgThemeFilter, setEsgThemeFilter] = useState('all');

  const { data: esgItems = [] } = useQuery({
    queryKey: ['esg-initiatives'],
    queryFn: () => base44.entities.ESGInitiative.list('-created_date'),
  });

  const createESG = useMutation({ mutationFn: d => base44.entities.ESGInitiative.create(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['esg-initiatives'] }); toast.success('Iniciativa criada!'); setShowESGForm(false); } });
  const updateESG = useMutation({ mutationFn: ({ id, data }) => base44.entities.ESGInitiative.update(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['esg-initiatives'] }); toast.success('Atualizado!'); setShowESGForm(false); setEditingESG(null); } });
  const deleteESG = useMutation({ mutationFn: id => base44.entities.ESGInitiative.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['esg-initiatives'] }); toast.success('Removido!'); } });

  const filteredESG = esgThemeFilter === 'all' ? esgItems : esgItems.filter(e => e.theme === esgThemeFilter);
  const coveredThemes = new Set(esgItems.map(e => e.theme)).size;

  const openESGNew = () => { setEsgForm(EMPTY_ESG); setEditingESG(null); setShowESGForm(true); };
  const openESGEdit = (e) => { setEsgForm({ ...EMPTY_ESG, ...e }); setEditingESG(e); setShowESGForm(true); };
  const saveESG = () => {
    if (!esgForm.title.trim()) { toast.error('Informe o título'); return; }
    if (editingESG) updateESG.mutate({ id: editingESG.id, data: esgForm });
    else createESG.mutate(esgForm);
  };


 const fe=(f,v)=>setEsgForm(p=>({...p,[f]:v}));
 return <InternalPageLayout user={user} currentPage="InternalESG" title="Sustentabilidade (ESG)">
 <div className="max-w-4xl space-y-5">          <div className="space-y-5">

            {/* ESG metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Total de Iniciativas', value: esgItems.length },
                { label: 'Temas Cobertos', value: coveredThemes },
                { label: 'Curto Prazo', value: esgItems.filter(e => e.horizon === 'curto prazo').length },
              ].map(m => (
                <div key={m.label} className="bg-[#111217] border border-[#1F222B] rounded-xl p-5 flex items-center gap-3">
                  <Leaf className="w-7 h-7 text-green-400 shrink-0" />
                  <div>
                    <p className="text-2xl font-black text-white">{m.value}</p>
                    <p className="text-xs text-[#B8BDC7]">{m.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Theme filters + New */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setEsgThemeFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${esgThemeFilter === 'all' ? 'bg-[#E10600] text-white border-[#E10600]' : 'border-[#1F222B] text-[#B8BDC7] hover:text-white'}`}>
                  Todos
                </button>
                {Object.entries(ESG_THEME_CONFIG).map(([theme, cfg]) => (
                  <button key={theme} onClick={() => setEsgThemeFilter(theme)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${esgThemeFilter === theme ? 'bg-[#E10600] text-white border-[#E10600]' : 'border-[#1F222B] text-[#B8BDC7] hover:text-white'}`}>
                    {cfg.emoji} {theme}
                  </button>
                ))}
              </div>
              <button onClick={openESGNew}
                className="flex items-center gap-2 px-4 py-2 border border-[#1F222B] rounded-lg text-sm text-white hover:border-[#E10600] transition-colors">
                <Plus className="w-4 h-4" /> Nova Iniciativa
              </button>
            </div>

            {/* ESG inline form */}
            {showESGForm && (
              <div className="bg-[#111217] border border-[#1F222B] rounded-xl p-5 space-y-3">
                <p className="text-sm font-semibold text-white">{editingESG ? 'Editar Iniciativa' : 'Nova Iniciativa ESG'}</p>
                <input value={esgForm.title} onChange={e => fe('title', e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0B0B0D] border border-[#1F222B] rounded-lg text-white text-sm placeholder:text-[#B8BDC7] focus:outline-none focus:border-[#E10600]"
                  placeholder="Título da iniciativa" />
                <textarea value={esgForm.description} onChange={e => fe('description', e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0B0B0D] border border-[#1F222B] rounded-lg text-white text-sm placeholder:text-[#B8BDC7] focus:outline-none focus:border-[#E10600] min-h-[70px] resize-none"
                  placeholder="Descrição (opcional)" />
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Tema', key: 'theme', options: Object.keys(ESG_THEME_CONFIG) },
                    { label: 'Esforço', key: 'effort', options: ['alto', 'médio', 'baixo'] },
                    { label: 'Prazo', key: 'horizon', options: ['curto prazo', 'médio prazo', 'longo prazo'] },
                  ].map(s => (
                    <Select key={s.key} value={esgForm[s.key]} onValueChange={v => fe(s.key, v)}>
                      <SelectTrigger className="bg-[#0B0B0D] border-[#1F222B] text-white h-10 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#111217] border-[#1F222B] text-white [&_*]:text-white">
                        {s.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={saveESG} className="py-2.5 bg-[#1F222B] hover:bg-[#2a2d38] text-white text-sm font-medium rounded-lg transition-colors">Salvar</button>
                  <button onClick={() => { setShowESGForm(false); setEditingESG(null); }} className="py-2.5 bg-[#1F222B] hover:bg-[#2a2d38] text-white text-sm font-medium rounded-lg transition-colors">Cancelar</button>
                </div>
              </div>
            )}
    <div className="grid md:grid-cols-2 gap-4">
      {!filteredESG.length ? <p className="text-gray-400">Nenhuma iniciativa cadastrada.</p> : filteredESG.map(e => {
        const theme=ESG_THEME_CONFIG[e.theme] || {emoji:'🌱',color:'bg-green-500/20 text-green-400'};
        const effort=EFFORT_CONFIG[e.effort] || EFFORT_CONFIG.médio;
        return <article key={e.id} className="bg-[#111217] border border-[#1F222B] rounded-xl p-4">
          <div className="flex justify-between gap-3 mb-3"><span className={'px-2 py-1 rounded-full text-xs '+theme.color}>{theme.emoji} {e.theme}</span>
            <div className="flex gap-3"><button onClick={()=>openESGEdit(e)}>Editar</button><button aria-label={'Excluir iniciativa '+e.title} onClick={()=>deleteESG.mutate(e.id)}>✕</button></div>
          </div>
          <h2 className="font-semibold mb-2">{e.title}</h2><p className="text-gray-400 whitespace-pre-wrap">{e.description}</p>
          <div className="flex flex-wrap gap-3 text-xs mt-3"><span className={effort.color}>⚡ Esforço {effort.label}</span><span className="text-gray-400">🕐 {e.horizon}</span></div>
        </article>;
      })}
    </div></div></div></InternalPageLayout>;
}
export function InternalESG(){return <ProtectedRoute requireApproved><ESGContent /></ProtectedRoute>;}
export default function InternalProjectsDashboard(){
 const location=useLocation();
 return <ProtectedRoute requireApproved><Navigate replace to={'/InternalSocialProjects'+location.search} /></ProtectedRoute>;
}
