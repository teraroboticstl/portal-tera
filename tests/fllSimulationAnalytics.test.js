import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSimulations, filterSimulations, demonstrationRounds, seasonKey } from '../src/lib/fllSimulationAnalytics.js';
import { calculateScores } from '../src/lib/fllBioglowRules.js';
const row=(score,index,extra={})=>({id:String(index),score,created_at:`2026-10-0${index+1}T12:00:00Z`,team_name:'Tera',season_theme:'BIOGLOW',season_year:2026,rules_version:'v1',breakdown:{m01:score/10},is_tera:true,is_test:false,deleted_at:null,...extra});
test('progresso compara grupos sem sobreposição e média móvel conserva ordem cronológica',()=>{
 const rows=[100,120,140,180,200,220].map((score,i)=>row(score,i));const result=analyzeSimulations([...rows].reverse());
 assert.equal(result.teams[0].gain,80);assert.equal(result.teams[0].average,160);assert.equal(result.evolution[2].mean0,120);
 assert.equal(analyzeSimulations(rows.slice(0,5)).teams[0].gain,null);
 assert.equal(analyzeSimulations(rows,3,'m01').evolution[2].mean0,12);
});
test('filtros isolam Tera, outras equipes, temporada, testes, lixeira e período',()=>{
 const base=row(100,0),rows=[base,row(200,1,{is_tera:false,team_name:'Outra'}),row(300,2,{is_test:true}),row(400,3,{deleted_at:'2026-10-04'}),row(500,4,{rules_version:'v2'})];
 assert.equal(filterSimulations(rows,{season:seasonKey(base),group:'tera'}).length,1);
 assert.equal(filterSimulations(rows,{season:seasonKey(base),group:'others'})[0].score,200);
 assert.equal(filterSimulations(rows,{data:'test'})[0].score,300);
 assert.equal(filterSimulations(rows,{trash:true})[0].score,400);
 assert.equal(filterSimulations(rows,{from:'2026-10-02',to:'2026-10-02'})[0].score,200);
});
test('normaliza nomes e pondera média global por round, não por equipe',()=>{
 const result=analyzeSimulations([row(100,0),row(200,1,{team_name:' TERA '}),row(300,2,{team_name:'Outra'})]);
 assert.equal(result.teams.length,2);assert.equal(result.average,200);assert.equal(result.teams[0].average,150);
});
test('sem registros não inventa progresso ou pontuação',()=>{const result=analyzeSimulations([]);assert.equal(result.average,null);assert.deepEqual(result.evolution,[]);});
test('18 demonstrações contêm 6 tentativas por equipe e evolução calculada por regras reais',()=>{
 const demo=demonstrationRounds();assert.equal(demo.length,18);
 const rows=demo.map((state,i)=>row(calculateScores(state).total,i,{team_name:state.teamName,created_at:new Date(Date.UTC(2026,9,1,i)).toISOString(),breakdown:calculateScores(state).breakdown}));
 const result=analyzeSimulations(rows);assert.equal(result.teams.length,3);assert.ok(result.teams.every(team=>team.rounds.length===6&&team.gain>0));
});
