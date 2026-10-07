export const MISSIONS=[
  {id:1,name:"Central de Suprimentos",max:60,optional:false,items:[
    {label:"Insumos carregados no caminhão",type:"counter",max:3,pts:10,key:"m1_insumos"},
    {label:"Caminhão retirado da área de carregamento",type:"toggle",pts:20,key:"m1_caminhao",requires:(state)=>state['m1_insumos']>=1},
    {label:"Bônus: caminhão no estoque (+10 como transporte)",type:"toggle",pts:10,key:"m1_bonus",requires:(state)=>state['m1_caminhao']===true},
  ]},
  {id:2,name:"Doca de descarga aérea",max:30,optional:false,items:[
    {label:"Alavanca acionada",type:"toggle",pts:20,key:"m2_alavanca"},
    {label:"Carga sem tocar na estrutura/avião",type:"toggle",pts:10,key:"m2_carga",requires:(state)=>state['m2_alavanca']===true},
  ]},
  {id:3,name:"Carregamento e expedição",max:20,optional:false,items:[
    {label:"Caminhão liberado",type:"toggle",pts:10,key:"m3_lib"},
    {label:"Caminhão estacionado no estoque (+10 como transporte)",type:"toggle",pts:10,key:"m3_est",requires:(state)=>state['m3_lib']===true},
  ]},
  {id:4,name:"Reparo de unidade operacional",max:30,optional:false,items:[
    {label:"Alavanca girada 180°",type:"toggle",pts:30,key:"m4_alavanca"},
  ]},
  {id:5,name:"Helicóptero de abastecimento",max:30,optional:false,items:[
    {label:"Carga liberada pelo helicóptero",type:"toggle",pts:20,key:"m5_lib"},
    {label:"Carga recebida da equipe vizinha",type:"toggle",pts:10,key:"m5_recebe"},
  ]},
  {id:6,name:"Estação de armazenamento",max:40,optional:false,items:[
    {label:"Módulos armazenados na estação",type:"counter",max:3,pts:10,key:"m6_mod"},
    {label:"Módulo escondido retirado/afastado",type:"toggle",pts:10,key:"m6_esc"},
  ]},
  {id:7,name:"Turbina de geração industrial",max:60,optional:false,items:[
    {label:"Módulos liberados sem tocar a turbina",type:"counter",max:3,pts:20,key:"m7_mod"},
  ]},
  {id:8,name:"Segurança no trabalho",max:30,optional:true,zeroable:true,items:[
    {label:"Robô estacionado dentro da área",type:"toggle",pts:20,key:"m8_park"},
    {label:"Placa de vaga ocupada movida",type:"toggle",pts:10,key:"m8_placa",requires:(state)=>state['m8_park']===true},
    {label:"Estrutura de proteção derrubada — ZERA A MISSÃO",type:"danger-toggle",pts:0,key:"m8_derrubou"},
  ]},
  {id:9,name:"Linha de produção",max:50,optional:false,items:[
    {label:"Módulos inseridos na linha",type:"counter",max:3,pts:10,key:"m9_mod"},
    {label:"Carrinho de carga liberado",type:"toggle",pts:20,key:"m9_carrinho",requires:(state)=>state['m9_mod']>=1},
  ]},
  {id:10,name:"Movimentação operacional",max:40,optional:false,items:[
    {label:"Trilhos completados",type:"toggle",pts:20,key:"m10_trilhos"},
    {label:"Composição no final dos trilhos (trava acionada)",type:"toggle",pts:20,key:"m10_comp",requires:(state)=>state['m10_trilhos']===true},
  ]},
  {id:11,name:"Fluxo logístico aéreo",max:20,optional:false,items:[
    {label:"Mecanismo acionado",type:"toggle",pts:0,key:"m11_mec"},
    {label:"Avião liberado afastado do mecanismo",type:"toggle",pts:10,key:"m11_aviao",requires:(state)=>state['m11_mec']===true},
    {label:"Avião na área de estoque do hangar (+10 como transporte)",type:"toggle",pts:10,key:"m11_hangar",requires:(state)=>state['m11_aviao']===true},
  ]},
  {id:12,name:"Fluxo logístico rodoviário",max:20,optional:false,items:[
    {label:"Mecanismo acionado",type:"toggle",pts:0,key:"m12_mec"},
    {label:"Caminhão liberado afastado do mecanismo",type:"toggle",pts:10,key:"m12_cam",requires:(state)=>state['m12_mec']===true},
    {label:"Caminhão na doca de estoque (+10 como transporte)",type:"toggle",pts:10,key:"m12_doca",requires:(state)=>state['m12_cam']===true},
  ]},
  {id:13,name:"Estoque",max:40,optional:false,
   note:"Meios de transporte já pontuam +10 nas missões 1, 3, 11 e 12. Carga da M2 conta aqui se estiver no estoque.",
   items:[
    {label:"Elementos na área de estoque (exceto transportes)",type:"counter",max:8,pts:5,key:"m13_el"},
  ]},
];


export const RULES_VERSION='industria-interclasse-2026-v11';
export const SEASON_THEME='DESAFIOS DA INDÚSTRIA';
export const DISC_SCORES=[0,10,15,25,35,50,50];
export const VALUES_OPTIONS=[{pts:20,lbl:'Inicial'},{pts:40,lbl:'Em desenvolvimento'},{pts:60,lbl:'Plenamente demonstrado'}];
export const MAX_POSSIBLE_SCORE=600;
export const INITIAL_STATE={teamName:'',roundName:'Round 1',elapsedSeconds:0,discsRemaining:6,valuesScore:40,inspBonus:false,...Object.fromEntries(MISSIONS.flatMap(m=>m.items.map(it=>[it.key,it.type==='counter'?0:false])))};
export const isLocked=(it,state)=>Boolean(it.requires && !it.requires(state));
export function normalizeState(input,{strict=false,requireTeam=false}={}) {
 if(!input || typeof input!=='object' || Array.isArray(input))throw new Error('Respostas da simulação inválidas.');
 const result={};
 const maxima={elapsedSeconds:150,discsRemaining:6,...Object.fromEntries(MISSIONS.flatMap(m=>m.items.filter(it=>it.type==='counter').map(it=>[it.key,it.max])))};
 for(const [key,fallback] of Object.entries(INITIAL_STATE)) {
  let value=input[key]??fallback;
  const valid=typeof value===typeof fallback && (typeof value!=='number' || Number.isInteger(value) && value>=0 && (key==='valuesScore' ? [20,40,60].includes(value) : value<=maxima[key])) && (typeof value!=='string' || value.length<=120);
  if(!valid){if(strict)throw new Error('Resposta inválida: '+key);value=fallback;}
  result[key]=typeof value==='string'?value.trim():value;
 }
 if(requireTeam && !result.teamName)throw new Error('Informe o nome da equipe.');
 result.roundName||='Round 1';
 // Cascade in rule order, including the M11/M12 transport chains.
 for(const m of MISSIONS)for(const it of m.items)if(it.type==='toggle' && isLocked(it,result))result[it.key]=false;
 return result;
}
export function calculateScores(input) {
 const state=normalizeState(input),breakdown={};
 for(const m of MISSIONS)breakdown['m'+String(m.id).padStart(2,'0')]=m.zeroable && state.m8_derrubou ? 0 : m.items.reduce((sum,it)=>sum+(it.type==='counter'?state[it.key]*it.pts:it.type==='toggle' && state[it.key] && !isLocked(it,state)?it.pts:0),0);
 breakdown.precision=DISC_SCORES[state.discsRemaining];breakdown.values=state.valuesScore;breakdown.inspection=state.inspBonus?20:0;
 return {total:Object.values(breakdown).reduce((a,b)=>a+b,0),breakdown,missions:MISSIONS.reduce((sum,m)=>sum+breakdown['m'+String(m.id).padStart(2,'0')],0)};
}
export const ANALYTICS_MISSIONS=[...MISSIONS.map(m=>['m'+String(m.id).padStart(2,'0'),'M'+String(m.id).padStart(2,'0')+' '+m.name,m.max]),['precision','Precisão',50],['values','Valores',60],['inspection','Inspeção',20]];
