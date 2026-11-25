import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {transform} from 'sucrase';

test('actual linked UI keeps contexts explicit and configuration admin-only',()=>{
 const source=readFileSync(new URL('../src/components/frc/LinkedFrcScouting.jsx',import.meta.url),'utf8');
 let admin=false,packetActor='actor';
 const mocks={react:React,'@tanstack/react-query':{useQueryClient:()=>({}),useMutation:()=>({isPending:false}),useQuery:()=>({data:{actor:packetActor,seasons:[{id:'s',year:2026,theme:'<script>unsafe</script>'}],events:[],teams:[]}})},'@/api/supabaseClient':{supabase:{}},'@/api/frcScoutingClient':{createFrcScoutingClient:()=>({})},'@/components/internal/ProtectedRoute':{isAdmin:()=>admin,canEdit:()=>false}};
 const module={exports:{}};vm.runInNewContext(transform(source,{transforms:['jsx','imports']}).code,{module,exports:module.exports,require:key=>mocks[key]});
 const html=()=>renderToStaticMarkup(React.createElement(module.exports.default,{user:{id:'actor'}}));
 assert.match(html(),/Tera Scouting/);assert.match(html(),/Temporada/);assert.match(html(),/&lt;script&gt;/);assert.doesNotMatch(html(),/Cadastrar temporada|Salvar registro/);
 admin=true;assert.match(html(),/Cadastrar temporada/);assert.match(html(),/Data do campeonato/);assert.match(html(),/required="" type="date"/);
 packetActor='other';assert.doesNotMatch(html(),/unsafe|Cadastrar temporada/);
});
