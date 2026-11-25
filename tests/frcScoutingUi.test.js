import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {transform} from 'sucrase';

test('retired scouting route redirects to FRC without importing scouting or querying data',()=>{
 const source=readFileSync(new URL('../src/pages/InternalFRCScout.jsx',import.meta.url),'utf8');
 const Navigate=()=>null,module={exports:{}};
 vm.runInNewContext(transform(source,{transforms:['jsx','imports']}).code,{module,exports:module.exports,require:key=>{
  if(key==='react')return React;if(key==='react-router-dom')return {Navigate};
  throw Error('Retired route must not load '+key);
 }});
 const result=module.exports.default();assert.equal(result.type,Navigate);assert.equal(result.props.to,'/InternalFRC');assert.equal(result.props.replace,true);
});

test('actual linked UI keeps contexts explicit and configuration admin-only',()=>{
 const source=readFileSync(new URL('../src/components/frc/LinkedFrcScouting.jsx',import.meta.url),'utf8');
 let admin=false,packetActor='actor',chosenSeason='',stateIndex=0;
 const mocks={react:{...React,useState:initial=>[stateIndex++===0?chosenSeason:initial,()=>{}]},'@tanstack/react-query':{useQueryClient:()=>({}),useMutation:()=>({isPending:false}),useQuery:()=>({data:{actor:packetActor,seasons:[{id:'s',year:2026,theme:'<script>unsafe</script>'}],events:[],teams:[]}})},'./FrcScoutingManagement':{__esModule:true,default:()=>null},'@/api/supabaseClient':{supabase:{}},'@/api/frcScoutingClient':{createFrcScoutingClient:()=>({})},'@/components/internal/ProtectedRoute':{isAdmin:()=>admin,canEdit:()=>false}};
 const module={exports:{}};vm.runInNewContext(transform(source,{transforms:['jsx','imports']}).code,{module,exports:module.exports,require:key=>mocks[key]});
 const html=()=>{stateIndex=0;return renderToStaticMarkup(React.createElement(module.exports.default,{user:{id:'actor'}}));};
 assert.match(html(),/Tera Scouting/);assert.match(html(),/Temporada/);assert.match(html(),/&lt;script&gt;/);assert.doesNotMatch(html(),/Cadastrar temporada|Salvar registro/);
 admin=true;assert.match(html(),/Cadastrar temporada/);assert.match(html(),/Data do campeonato/);assert.match(html(),/required="" type="date"/);
 const adminHtml=html();assert.ok(adminHtml.indexOf('Temporada (obrigatória)')<adminHtml.indexOf('Cadastrar temporada'));
 assert.match(adminHtml,/aria-label="Temporada" aria-required="true"/);
 assert.match(adminHtml,/Selecione uma temporada para cadastrar um campeonato/);
 chosenSeason='s';assert.doesNotMatch(html(),/Selecione uma temporada para cadastrar um campeonato/);
 packetActor='other';assert.doesNotMatch(html(),/unsafe|Cadastrar temporada/);
});
