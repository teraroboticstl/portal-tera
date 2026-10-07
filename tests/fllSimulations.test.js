import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash,randomBytes} from 'node:crypto';
import {INITIAL_ROUND_STATE,calculateScores} from '../src/lib/fllBioglowRules.js';
const source=fs.readFileSync(new URL('../api/_lib/fllSimulations.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
function harness({user=null,authFails=false,rpcError=null,rows=[]}={}) {
  const operations=[];
  const db={from:table=>{
    const query={select(fields){operations.push(['select',table,fields]);return query;},eq(key,value){operations.push(['eq',key,value]);return query;},order(){return query;},limit(){return query;},maybeSingle:async()=>({data:rows[0] || null,error:null}),then(resolve){return Promise.resolve({data:rows,error:null}).then(resolve);}};return query;
  },rpc:async(name,{p_record})=>{operations.push(['rpc',p_record]);return {data:{...p_record,id:'saved',created_at:'now'},error:rpcError};}};
  const context=vm.createContext({createHash,randomBytes,Buffer,INITIAL_ROUND_STATE,calculateScores,supabaseServer:db,validateUserAuth:async()=>{if(authFails)throw Error('bad JWT');return user;},createScopedUserSupabaseClient:()=>db});
  vm.runInContext(source+';globalThis.subject={buildSimulationRecord,handleFllSimulations};',context);
  return {...context.subject,operations};
}
const body={requestId:'12345678-1234-4123-8123-123456789abc',state:{...INITIAL_ROUND_STATE,teamName:'Equipe teste'},email:'round-test@example.invalid'};
const season={id:'12345678-1234-4123-8123-123456789abc',theme:'BIOGLOW',year:2026};
test('compartilhamento reutiliza resultado mesmo quando JSONB reordena respostas',()=>{
 const page=fs.readFileSync(new URL('../src/pages/SimuladorFLL.jsx',import.meta.url),'utf8');
 const block=page.slice(page.indexOf('const stateSignature'),page.indexOf('export default function'));
 const context=vm.createContext({INITIAL_ROUND_STATE});
 vm.runInContext(block+';globalThis.signature=stateSignature;',context);
 const reordered=Object.fromEntries(Object.entries(body.state).reverse());
 assert.equal(context.signature(body.state),context.signature(reordered));
 assert.notEqual(context.signature(body.state),context.signature({...reordered,inspectionSmallArea:true}));
});
async function call(h,request){const res={code:0,setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};await h.handleFllSimulations({headers:{},query:{},...request},res,async()=>season);return res;}
test('recalcula pontuação, elimina campos adicionais e não aceita identidade declarada',()=>{
 const record=harness().buildSimulationRecord({...body,score:530,user_id:'admin',state:{...body.state,email:'private',inspectionSmallArea:true}},null,season);
 assert.equal(record.score,calculateScores({...body.state,inspectionSmallArea:true}).total);
 assert.equal(record.user_id,null);assert.equal(record.state_snapshot.email,undefined);
});
test('visitante exige e-mail, equipe e não pode criar portfólio',()=>{
 const h=harness();for(const payload of [{...body,email:''},{...body,state:{...body.state,teamName:''}},{...body,portfolio:true}])assert.throws(()=>h.buildSimulationRecord(payload,null,season));
});
test('quantidades fora da regra e opções desconhecidas não são gravadas',()=>{
 const h=harness();for(const state of [{...body.state,m16_precisionTokens:7},{...body.state,m05_rootState:'invented'},{...body.state,m02_seedsReleased:1.5}])assert.throws(()=>h.buildSimulationRecord({...body,state},null,season));
});
test('mesmo salvamento preserva hash ao habilitar compartilhamento',()=>{
 const h=harness(),a=h.buildSimulationRecord(body,null,season),b=h.buildSimulationRecord({...body,share:true},null,season);
 assert.equal(a.payload_hash,b.payload_hash);assert.match(b.share_token,/^[a-f0-9]{64}$/);
});
test('JWT inválido não rebaixa usuário para visitante e não grava',async()=>{
 const h=harness({authFails:true});const res=await call(h,{method:'POST',headers:{authorization:'Bearer invalid'},body});assert.equal(res.code,401);assert.equal(h.operations.length,0);
});
test('consulta do usuário limita os registros ao ID autenticado',async()=>{
 const h=harness({user:{id:'verified',profile:{is_admin:true}}});assert.equal((await call(h,{method:'GET',headers:{authorization:'Bearer verified'}})).code,200);assert.ok(h.operations.some(op=>op[0]==='eq'&&op[1]==='user_id'&&op[2]==='verified'));
});
test('visitante não consulta histórico nem dados administrativos',async()=>{
 const h=harness();assert.equal((await call(h,{method:'GET',query:{scope:'admin'}})).code,401);assert.equal(h.operations.length,0);
});
test('link público projeta somente resultado, sem contato ou observações',async()=>{
 const h=harness({rows:[{id:'public'}]});assert.equal((await call(h,{method:'GET',query:{share:'a'.repeat(64)}})).code,200);
 const projection=h.operations.find(op=>op[0]==='select')[2];for(const field of ['email','contact_id','user_id','notes','iteration_title'])assert.ok(!projection.split(',').includes(field));
});
test('falha transacional e limite não informam sucesso',async()=>{
 for(const [message,code] of [['database error',503],['SIMULATION_RATE_LIMIT',429],['SIMULATION_CONFLICT',409]]) {const h=harness({rpcError:{message}});assert.equal((await call(h,{method:'POST',body})).code,code);}
});
