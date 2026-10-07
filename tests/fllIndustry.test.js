import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash,randomBytes} from 'node:crypto';
import {INITIAL_STATE,MISSIONS,normalizeState,calculateScores,RULES_VERSION,SEASON_THEME} from '../src/lib/fllIndustryRules.js';
import {INITIAL_ROUND_STATE,calculateScores as calculateBioglowScores} from '../src/lib/fllBioglowRules.js';
const original=vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('fixtures/industry-v11-original.txt',import.meta.url),'utf8')+';globalThis.reference=input=>{state=input;discsRemaining=input.discsRemaining;valuesScore=input.valuesScore;inspBonus=input.inspBonus;return calcTotal();};',original);
test('V11: dez mil combinações mantêm exatamente a pontuação do HTML original',()=>{
 let seed=12345;const random=max=>{seed=(seed*1664525+1013904223)>>>0;return seed%max;};
 for(let index=0;index<10000;index++){
 const state={...INITIAL_STATE,discsRemaining:random(7),valuesScore:[20,40,60][random(3)],inspBonus:Boolean(random(2))};
 for(const m of MISSIONS)for(const it of m.items)state[it.key]=it.type==='counter'?random(it.max+1):Boolean(random(2));
 const normalized=normalizeState(state),score=calculateScores(normalized),expected=original.reference(normalized);
 assert.equal(score.total,expected.total);assert.equal(score.missions,expected.missions);assert.equal(score.breakdown.precision,expected.discs);assert.equal(score.breakdown.values,expected.vals);assert.equal(score.breakdown.inspection,expected.insp);
 }
});
test('V11: máximo 600, início 90 e valores originais',()=>{
 assert.equal(calculateScores(INITIAL_STATE).total,90);
 const maximum={...INITIAL_STATE,valuesScore:60,inspBonus:true};
 for(const m of MISSIONS)for(const it of m.items)maximum[it.key]=it.type==='counter'?it.max:it.type==='toggle';
 assert.equal(calculateScores(maximum).total,600);
 maximum.m8_derrubou=true;assert.equal(calculateScores(maximum).breakdown.m08,0);assert.equal(calculateScores(maximum).total,570);
});
test('dependências em cadeia e limites impedem bônus indevidos',()=>{
 const value=normalizeState({...INITIAL_STATE,m1_caminhao:true,m1_bonus:true,m11_aviao:true,m11_hangar:true});
 assert.equal(value.m1_bonus,false);assert.equal(value.m1_caminhao,false);assert.equal(value.m11_hangar,false);
 for(const state of [{m13_el:9},{valuesScore:0},{discsRemaining:7},{elapsedSeconds:151},{m1_insumos:1.5},{inspBonus:'true'}])assert.throws(()=>normalizeState({...INITIAL_STATE,...state},{strict:true}));
});
test('logo e os três áudios preservam os bytes do anexo',()=>{
 const assets=JSON.parse(fs.readFileSync(new URL('../src/lib/fllIndustryAssets.json',import.meta.url),'utf8'));
 const expected=["a73ea6dd587297175b16683b9e99b993a6d4a5a8d38fa0d3813e20b90710b447","fa2e8d085475f65f6523e17efa86c2b98b96a56aed7fc55a75ab0492d84d20ef","5704fba1e6f620f486f6bf9045b12b092543b7d80d09dde35590d7bfb7d5b4f6","7a9660d8433c78c0a3be73a82dd6b98457dc976da8dcdd06c08aaaf1c6d14a20"];
 Object.values(assets).forEach((value,index)=>assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../public'+value,import.meta.url))).digest('hex'),expected[index]));
});
const serverSource=fs.readFileSync(new URL('../api/_lib/fllSimulations.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
function server(){const context=vm.createContext({createHash,randomBytes,Buffer,INITIAL_ROUND_STATE,calculateScores:calculateBioglowScores,normalizeIndustryState:normalizeState,calculateIndustryScores:calculateScores,INDUSTRY_VERSION:RULES_VERSION,INDUSTRY_THEME:SEASON_THEME});vm.runInContext(serverSource+';globalThis.build=buildSimulationRecord;',context);return context.build;}
const body={simulator:'industria',requestId:'12345678-1234-4123-8123-123456789abc',state:{...INITIAL_STATE,teamName:'Equipe V11'},email:'teste@example.invalid'};
test('API recalcula V11 e mantém contato fora do snapshot público',()=>{
 const record=server()({...body,score:999,state:{...body.state,privateEmail:'vazamento'}},null,{id:null,theme:SEASON_THEME,year:2026});
 assert.equal(record.score,90);assert.equal(record.rules_version,RULES_VERSION);assert.equal(record.state_snapshot.privateEmail,undefined);assert.equal(record.user_id,null);
 assert.equal(record.payload_hash,server()({...body,share:true},null,{id:null,theme:SEASON_THEME,year:2026}).payload_hash);
});
test('V11 visitante exige equipe/email e portfólio exige login',()=>{
 for(const payload of [{...body,email:''},{...body,state:{...body.state,teamName:''}},{...body,portfolio:true}])assert.throws(()=>server()(payload,null,{id:null,theme:SEASON_THEME,year:2026}));
 const record=server()({...body,portfolio:true,iterationTitle:'Iteração industrial'}, {id:'authenticated'}, {id:null,theme:SEASON_THEME,year:2026});assert.equal(record.user_id,'authenticated');assert.equal(record.is_portfolio,true);
});
