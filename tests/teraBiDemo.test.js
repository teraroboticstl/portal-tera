import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {transform} from 'sucrase';
import {FRC_BI_DEMO,biPresentation} from '../src/lib/teraBiDemo.js';
import * as metrics from '../src/lib/teraBi.js';

test('FRC demo is deterministic, immutable, separate from real scouting and disabled in other modalities',()=>{
  assert.equal(FRC_BI_DEMO.length,12);assert.equal(new Set(FRC_BI_DEMO.map(r=>r.team)).size,4);
  const summary=metrics.summarizeScouting(FRC_BI_DEMO);assert.equal(summary.best,120);assert.equal(summary.days.length,3);assert.equal(summary.average,1030/12);
  assert.ok(Object.isFrozen(FRC_BI_DEMO)&&FRC_BI_DEMO.every(Object.isFrozen));
  const empty={program:'FRC',rows:[]},real={program:'FRC',rows:[{value:999}]};
  assert.equal(biPresentation('FRC',empty).demo,true);
  assert.deepEqual(biPresentation('FRC',empty,false),{rows:[],demo:false});
  assert.equal(biPresentation('FRC',real).rows,real.rows);
  assert.equal(biPresentation('FRC',real,true).rows,FRC_BI_DEMO);
  assert.deepEqual(biPresentation('FRC',null,true),{rows:[],demo:false});
  assert.equal(biPresentation('FTC',{program:'FTC',rows:[]},true).demo,false);
  assert.equal(biPresentation('FLL',{program:'FLL',rows:[]},true).demo,false);
  assert.equal(biPresentation('FRC',{program:'FTC',rows:[]},true).demo,false);
});

test('actual FRC UI labels fictitious data, disables CSV and renders no samples while authorization is pending or failed',()=>{
  let query={data:{program:'FRC',actor:'actor',rows:[],boards:['FRC'],missions:[],updated_at:'2026-11-12'},isFetching:false,error:null};
  const module={exports:{}};
  const mocks={react:React,'react-router-dom':{Link:({children,to})=>React.createElement('a',{href:to},children)},
    '@tanstack/react-query':{useQuery:()=>query},'lucide-react':new Proxy({},{get:()=>()=>null}),
    '@/components/internal/ProtectedRoute':{__esModule:true,default:({children})=>React.cloneElement(children,{user:{id:'actor'}})},
    '@/components/internal/InternalPageLayout':{__esModule:true,default:({children})=>React.createElement('main',null,children)},
    '@/api/teraBiClient':{readTeraBi:()=>{throw Error('No source request in SSR');}},
    '@/lib/teraBi':metrics,'@/lib/teraBiDemo':{biPresentation},
    '@/components/bi/BiVisuals':{biButton:'',biControl:'',biNumber:String,BiKpi:({label,value})=>React.createElement('p',null,label+': '+value),BiChart:({title,data})=>React.createElement('section',null,title,JSON.stringify(data))}
  };
  vm.runInNewContext(transform(fs.readFileSync(new URL('../src/pages/InternalTeraBi.jsx',import.meta.url),'utf8'),{transforms:['jsx','imports']}).code,{React,module,exports:module.exports,require:name=>mocks[name]});
  const render=program=>renderToStaticMarkup(React.createElement(module.exports.default,{program}));
  const demo=render('FRC');assert.match(demo,/Demonstração FRC — dados fictícios/);assert.match(demo,/Equipe A \(demo\)/);assert.match(demo,/Observações: 12/);assert.match(demo,/<button[^>]*disabled=""[^>]*>Exportar resumo CSV<\/button>/);
  query={...query,isFetching:true};assert.doesNotMatch(render('FRC'),/Equipe A \(demo\)|Observações: 12/);
  query={...query,isFetching:false,error:Error('Acesso negado')};assert.doesNotMatch(render('FRC'),/Equipe A \(demo\)|Observações: 12/);
  query={...query,error:null,data:{...query.data,rows:[{team:'Real',value:999,date:'2026-11-12',event:'Real'}]}};assert.doesNotMatch(render('FRC'),/Equipe A \(demo\)|Demonstração FRC — dados fictícios/);
});
