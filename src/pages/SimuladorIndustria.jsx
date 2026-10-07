import React, {useEffect, useRef, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {useAuth} from '@/lib/AuthContext';
import FllSimulationSaveDialog from '@/components/fll/FllSimulationSaveDialog';
import {saveFllSimulation,listFllSimulations,fetchSharedSimulation} from '@/api/fllSimulationsClient';
import {MISSIONS,INITIAL_STATE,DISC_SCORES,VALUES_OPTIONS,RULES_VERSION,normalizeState,calculateScores,isLocked} from '@/lib/fllIndustryRules';
import assets from '@/lib/fllIndustryAssets.json';
import './SimuladorIndustria.css';

const CURRENT='fll_industria_v11_current',HISTORY='fll_industria_v11_saved';
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const format=seconds=>`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
const signature=state=>JSON.stringify(Object.keys(INITIAL_STATE).map(key=>state[key]));
const historyEntry=row=>({...row,round:Number(String(row.round_name).match(/\d+/)?.[0])||1,total:row.score,mission:MISSIONS.reduce((sum,m)=>sum+(row.breakdown?.['m'+String(m.id).padStart(2,'0')]||0),0),discos:row.state_snapshot.discsRemaining,tempo:row.state_snapshot.elapsedSeconds});

export default function SimuladorIndustria(){
 const {user,isLoadingAuth}=useAuth();
 const [params]=useSearchParams();
 const [state,setState]=useState(()=>{try{return normalizeState(read(CURRENT,INITIAL_STATE));}catch{return {...INITIAL_STATE};}});
 const [rounds,setRounds]=useState(()=>{const value=read(HISTORY,[]);return Array.isArray(value)?value:[];});
 const [remote,setRemote]=useState([]),[intent,setIntent]=useState(null),[share,setShare]=useState(null);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[reset,setReset]=useState(false);
 const [remaining,setRemaining]=useState(150),[running,setRunning]=useState(false),[muted,setMuted]=useState(false);
 const timer=useRef(null),player=useRef(null),left=useRef(150),requests=useRef(new Map()),lastSaved=useRef(null),sessionIdentity=useRef(user?.id||null);
 const {total,breakdown,missions}=calculateScores(state);
 const sharedToken=params.get('simulation');
 function stopAudio(){if(player.current){player.current.pause();player.current.currentTime=0;}}
 function play(slot){
  if(muted)return;
  player.current ||= new Audio();
  player.current.pause();player.current.src=assets[slot];player.current.currentTime=0;
  player.current.play().catch(()=>setNotice('O navegador bloqueou o áudio. Ative o som e inicie novamente.'));
 }
 function stopTimer(){clearInterval(timer.current);timer.current=null;setRunning(false);stopAudio();}
 function resetTimer(){stopTimer();left.current=150;setRemaining(150);setState(old=>({...old,elapsedSeconds:0}));}
 function toggleTimer(){
  if(running){stopTimer();return;}
  if(left.current===0)return;
  if(left.current===150)play('start');
  setRunning(true);
  timer.current=setInterval(()=>{
   left.current=Math.max(0,left.current-1);setRemaining(left.current);
   setState(old=>({...old,elapsedSeconds:150-left.current}));
   if(left.current===30)play('alert');
   if(left.current===0){clearInterval(timer.current);timer.current=null;setRunning(false);stopAudio();play('end');}
  },1000);
 }
 useEffect(()=>()=>{clearInterval(timer.current);if(player.current)player.current.pause();},[]);
 useEffect(()=>{try{localStorage.setItem(CURRENT,JSON.stringify(state));}catch{/* Keep an in-memory draft when storage is unavailable. */}},[state]);
 useEffect(()=>{try{localStorage.setItem(HISTORY,JSON.stringify(rounds));}catch{/* Cloud records remain saved. */}},[rounds]);
 useEffect(()=>{
  let cancelled=false;setRemote([]);requests.current.clear();lastSaved.current=null;sessionIdentity.current=user?.id||null;
  if(user && !isLoadingAuth)listFllSimulations(false,'industria').then(result=>{if(!cancelled)setRemote(result.simulations.map(historyEntry));}).catch(err=>{if(!cancelled)setError(err.message);});
  return()=>{cancelled=true;};
 },[user?.id,isLoadingAuth]);
 useEffect(()=>{
  if(!sharedToken)return;
  let cancelled=false;
  fetchSharedSimulation(sharedToken).then(({simulation})=>{
   if(simulation.rules_version!==RULES_VERSION)throw new Error('Este link pertence a outro simulador.');
   if(!cancelled){const loaded=normalizeState(simulation.state_snapshot);stopTimer();setState(loaded);left.current=150-loaded.elapsedSeconds;setRemaining(left.current);setNotice('Round compartilhado carregado.');}
  }).catch(err=>{if(!cancelled)setError(err.message);});
  return()=>{cancelled=true;};
 },[sharedToken]);
 function change(key,value){setState(old=>{const next=normalizeState({...old,[key]:value});if(typeof value==='string')next[key]=value;return next;});lastSaved.current=null;}
 const history=[...remote,...rounds.filter(row=>!user || !row.user_id)].filter((row,index,list)=>list.findIndex(item=>item.id===row.id)===index).sort((a,b)=>b.total-a.total);
 function beginSave(sharing){if(isLoadingAuth)return;if(running)stopTimer();setError('');setIntent({sharing,snapshot:{...state}});}
 async function persist(payload){
  const savingIdentity=user?.id||null;
  const fingerprint=JSON.stringify({state:signature(normalizeState(payload.state)),email:savingIdentity?'':payload.email.trim().toLowerCase(),portfolio:payload.portfolio,title:payload.iterationTitle,notes:payload.notes,user:savingIdentity});
  if(!requests.current.has(fingerprint))requests.current.set(fingerprint,crypto.randomUUID());
  const body={...payload,simulator:'industria',requestId:requests.current.get(fingerprint)};
  const {simulation}=await saveFllSimulation({...body,share:intent.sharing});
  if(sessionIdentity.current!==savingIdentity)throw new Error('A conta mudou durante o salvamento. Consulte o histórico ao entrar novamente.');
  const entry=historyEntry(simulation);setState(normalizeState(simulation.state_snapshot));
  if(user)setRemote(old=>[entry,...old.filter(row=>row.id!==entry.id)]);
  else setRounds(old=>[entry,...old.filter(row=>row.id!==entry.id)].slice(0,60));
  lastSaved.current={body,state:simulation.state_snapshot};
  if(intent.sharing)setShare(simulation);
  setIntent(null);setNotice('Round salvo no Supabase'+(simulation.is_portfolio?' e registrado no portfólio da temporada.':'.'));
 }
 async function openShare(){
  if(lastSaved.current && signature(state)===signature(lastSaved.current.state)){
   try{const {simulation}=await saveFllSimulation({...lastSaved.current.body,share:true});setShare(simulation);}catch(err){setError(err.message);}
  }else beginSave(true);
 }
 function exportCSV(){
  const csv='Round,Total,Missao,Discos,Tempo\n'+history.map(row=>[row.round,row.total,row.mission,row.discos,format(row.tempo)].join(',')).join('\n');
  const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='simulacoes-industria-2026.csv';link.click();URL.revokeObjectURL(url);
 }
 const shareURL=share?`${window.location.origin}/SimuladorIndustria?simulation=${share.share_token}`:'';
 const shareText=share?`Desafios da Indústria · Interclasse 2026\nEquipe: ${share.team_name}\n${share.round_name}: ${share.score} / 600 pontos\n`+Object.entries(share.breakdown).map(([code,points])=>`${code}: ${points} pts`).join('\n')+'\n'+shareURL:'';
 async function copy(text){try{await navigator.clipboard.writeText(text);setNotice('Copiado para compartilhar.');}catch{setError('Não foi possível copiar automaticamente. Selecione e copie o texto do resumo.');}}
 function toggleMute(){const next=!muted;setMuted(next);if(next)stopAudio();}
 const Toggle=({checked,disabled,onClick,label,danger=false})=><button type="button" role="switch" aria-label={label} aria-checked={checked} disabled={disabled} className={'toggle'+(checked?(danger?' on-danger':' on'):'')+(disabled?' locked':'')} onClick={onClick}/>;
 const timerText=running?'⏸ Pausar':remaining<150 && remaining>0?'▶ Continuar':'▶ Iniciar';
 const TimerButtons=()=><><button className="timer-btn t-start" disabled={remaining===0} onClick={toggleTimer}>{timerText}</button><button className="timer-btn t-reset" onClick={resetTimer}>↺ Resetar</button><button className="reset-btn" onClick={()=>beginSave(false)}>Salvar Simulação</button><button className="reset-btn" onClick={exportCSV}>Exportar CSV</button><button className="reset-btn" onClick={openShare}>Compartilhar</button><button className="reset-btn" onClick={toggleMute}>{muted?'Ativar som':'Silenciar'}</button></>;
 const timerClass='timer-digits'+(remaining===0?' end':remaining<=30?' warn':'');
 const avg=key=>history.length?history.reduce((sum,row)=>sum+row[key],0)/history.length:0;
 return <div className="industry-simulator"><div className="page">
  <div className="title-bar"><div className="title-wrap" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:24}}><div><h1>Desafios da Indústria</h1><p>Torneio Interclasse de Robótica 2026 · SESI Três Lagoas</p></div><img className="title-logo" src={assets.logo} alt="Logo Desafios da Indústria" style={{height:120,width:'auto',maxWidth:'100%',objectFit:'contain'}}/></div></div>
  <div className="identity"><label>Nome da equipe<input maxLength={120} value={state.teamName} onChange={e=>change('teamName',e.target.value)}/></label><label>Identificação do round<input maxLength={120} value={state.roundName} onChange={e=>change('roundName',e.target.value)}/></label></div>
  <div className="controls-bar"><div className="timer-block" id="top-bar-block" style={{width:'100%'}}><div className={timerClass}>{format(remaining)}</div><div className="timer-ctrl" id="top-timer-ctrl"><TimerButtons/></div><div className="timer-status">{remaining===0?'Fim do round!':running?'Em andamento':remaining<150?'Pausado':'Pronto'}</div><div className="top-score-block"><div className="score-hero"><div className="total">{total}</div><div className="slabel">pontos</div></div><button className="reset-btn" onClick={()=>setReset(true)}>↺ Reiniciar tudo</button></div></div></div>
  {error && <p role="alert" className="error">{error}</p>}{notice && <p role="status" className="status-note">{notice}</p>}
  <div className="row2"><div className="panel"><h3>Inspeção de equipamentos</h3><div className="insp-row"><label>Robô cabe em 1 base com altura ≤30 cm? · +20 pts</label><Toggle label="Inspeção de equipamentos" checked={state.inspBonus} onClick={()=>change('inspBonus',!state.inspBonus)}/></div></div><div className="panel"><h3>Discos de precisão</h3><div className="disc-row">{DISC_SCORES.map((pts,index)=><button key={index} className={'disc'+(index<=state.discsRemaining?' active':'')} aria-label={`${index} discos de precisão · ${pts} pontos`} aria-pressed={index===state.discsRemaining} onClick={()=>change('discsRemaining',index)}>{index}</button>)}</div><div className="disc-score">{state.discsRemaining===6?'Sem interrupções — máximo':`${state.discsRemaining} disco${state.discsRemaining!==1?'s':''} → ${breakdown.precision} pts`}</div></div></div>
  <div className="row3"><div className="panel"><h3>Valores</h3><div className="values-btn-row">{VALUES_OPTIONS.map(value=><button key={value.pts} className={'val-btn'+(value.pts===state.valuesScore?' active':'')} aria-pressed={value.pts===state.valuesScore} onClick={()=>change('valuesScore',value.pts)}><div className="pts">{value.pts}</div><div className="lbl">{value.lbl}</div></button>)}</div></div></div>
  <div className="section-title">Missões</div><div className="missions-grid">{MISSIONS.map(m=>{
   const zeroed=m.zeroable && state.m8_derrubou;
   return <article key={m.id} className={'mission-card'+(m.optional?' optional':'')+(zeroed?' zeroed':'')}><div className="mission-header"><div className="mission-num">{m.id}</div><div><h2 className="mission-name">{m.name}{m.optional && <small> (opcional · última)</small>}</h2><div className="mission-max">Máx. {m.max} pts</div></div></div>{m.note && <div className="info-note">{m.note}</div>}<div className="mission-items">{m.items.map(it=>{const locked=isLocked(it,state);return <div key={it.key} className="item-row"><span className={'item-label'+(locked?' disabled':'')}>{it.type==='danger-toggle'?'⚠ ':''}{it.label}{locked && <small> (bloqueado)</small>}</span><div className="item-controls">{it.type==='counter'?<><div className="counter"><button aria-label={`Diminuir ${it.label}`} disabled={state[it.key]===0} onClick={()=>change(it.key,state[it.key]-1)}>−</button><span>{state[it.key]}</span><button aria-label={`Aumentar ${it.label}`} disabled={state[it.key]===it.max} onClick={()=>change(it.key,state[it.key]+1)}>+</button></div><span className="item-pts">{state[it.key]*it.pts} pts</span></>:<><Toggle label={it.label} danger={it.type==='danger-toggle'} checked={state[it.key]} disabled={locked} onClick={()=>change(it.key,!state[it.key])}/>{it.type==='toggle' && <span className="item-pts">{it.pts?'+'+it.pts:'—'}</span>}</>}</div></div>;})}</div>{zeroed && <div className="zeroed-overlay">✕ Missão zerada — estrutura derrubada</div>}<div className="mission-subtotal"><span className={zeroed?'zeroed':''}>{breakdown['m'+String(m.id).padStart(2,'0')]} pts</span></div></article>;
  })}</div>
  <div className="panel" style={{marginTop:20}}><h3>Resumo das Simulações</h3><p className="status-note">Resultados salvos no Supabase. A remoção abaixo oculta a cópia deste navegador; a administração pode mover o registro para a lixeira do portal.</p><div className="history-wrap"><table id="simTable"><thead><tr>{['Round','Total','Missões','Precisão','Tempo','Ação'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{history.map((row,index)=><tr key={row.id} style={index===0?{background:'rgba(255,215,0,.15)',fontWeight:700}:undefined}><td><button className="reset-btn" onClick={()=>{const loaded=normalizeState(row.state_snapshot);stopTimer();setState(loaded);left.current=150-loaded.elapsedSeconds;setRemaining(left.current);lastSaved.current=null;}}>{row.round_name}</button></td><td>{row.total}</td><td>{row.mission}</td><td>{row.discos}</td><td>{format(row.tempo)}</td><td>{!row.user_id && <button className="btn-delete" aria-label={`Ocultar ${row.round_name} deste navegador`} onClick={()=>setRounds(old=>old.filter(item=>item.id!==row.id))}>✕</button>}</td></tr>)}</tbody><tfoot><tr><td>MÉDIA</td><td>{Math.round(avg('total'))}</td><td>{Math.round(avg('mission'))}</td><td>{avg('discos').toFixed(1)}</td><td>{format(Math.round(avg('tempo')))}</td><td/></tr></tfoot></table></div>{!history.length && <p className="status-note">Nenhuma simulação salva nesta temporada.</p>}</div>
  <div className="final-bar"><div><div className="lbl">Pontuação total do round</div><div className="breakdown">{[['Missões',missions],['Precisão',breakdown.precision],['Valores',breakdown.values],['Inspeção',breakdown.inspection]].map(([label,pts])=><span key={label} className="breakdown-item">{label}: <span>{pts}</span></span>)}</div></div><div className="score">{total}</div></div>
  <div id="bottom-bar" className="timer-block" style={{marginTop:'1.2rem',justifyContent:'space-between',flexWrap:'wrap',gap:16}}><div id="bottom-bar-btns" className="dialog-controls"><TimerButtons/></div><div className={timerClass} id="timer-digits-bottom">{format(remaining)}</div></div>
  {intent && <FllSimulationSaveDialog user={user} snapshot={intent.snapshot} sharing={intent.sharing} onClose={()=>setIntent(null)} onSave={persist}/>}
  {reset && <div className="share-overlay"><div role="dialog" aria-modal="true" aria-label="Reiniciar simulação" className="panel share-panel"><h3>Reiniciar tudo?</h3><p>As missões e o cronômetro voltarão aos valores iniciais. Os resultados já salvos no Supabase serão preservados.</p><div className="dialog-controls"><button className="reset-btn" onClick={()=>setReset(false)}>Cancelar</button><button className="timer-btn t-start" onClick={()=>{resetTimer();setState({...INITIAL_STATE});lastSaved.current=null;setReset(false);}}>Reiniciar simulação</button></div></div></div>}
  {share && <div className="share-overlay"><div role="dialog" aria-modal="true" aria-label="Compartilhar simulação" className="panel share-panel"><h3>Compartilhar simulação</h3><textarea readOnly aria-label="Resumo da simulação" value={shareText}/><div className="dialog-controls"><button className="reset-btn" onClick={()=>copy(shareURL)}>Copiar link</button><button className="reset-btn" onClick={()=>copy(shareText)}>Copiar resumo</button><a className="timer-btn t-start" target="_blank" rel="noopener noreferrer" href={'https://wa.me/?text='+encodeURIComponent(shareText)}>Compartilhar via WhatsApp</a><button className="reset-btn" onClick={()=>setShare(null)}>Fechar</button></div><p className="status-note">Somente equipe, respostas e pontuação são compartilhadas. E-mail e observações privadas ficam protegidos.</p></div></div>}
 </div></div>;
}
