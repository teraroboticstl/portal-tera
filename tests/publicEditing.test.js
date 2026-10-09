import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {transform} from 'sucrase';
import {canEditInternal} from '../src/lib/accessLevels.js';
const require=createRequire(import.meta.url);
let identity;
const motion=new Proxy({},{get:(_target,tag)=>({children,...props})=>{
 for(const key of ['initial','animate','whileInView','viewport','exit','transition'])delete props[key];
 return React.createElement(tag,props,children);
}});
function page(filename){
 const code=transform(fs.readFileSync(new URL('../src/pages/'+filename,import.meta.url),'utf8'),{transforms:['jsx','imports']}).code;
 const module={exports:{}};
 const mocks={
  '@/lib/AuthContext':{useAuth:()=>identity},
  '@/lib/accessLevels':{canEditInternal},
  '@/utils':{createPageUrl:name=>'/'+name},
  'react-router-dom':{Link:({to,children})=>React.createElement('a',{href:to},children)},
  'framer-motion':{motion,AnimatePresence:({children})=>children},
  'lucide-react':new Proxy({},{get:()=>props=>React.createElement('svg',props)}),
  '@tanstack/react-query':{useQuery:()=>({data:[]}),useMutation:()=>({mutate(){}}),useQueryClient:()=>({})},
  '@/api/base44Client':{base44:{}},
  '@/components/tir/ChatMentor':{default:()=>null,__esModule:true},
  '@/components/internal/ProtectedRoute':{isAdmin:user=>user?.role==='admin'||user?.member_role==='admin'},
 };
 vm.runInNewContext(code,{module,exports:module.exports,require:name=>mocks[name]||require(name),localStorage:{getItem:()=>null}}, {filename});
 return module.exports.default;
}
const About=page('About.jsx'),TIR=page('TIR2026.jsx'),TIRAdmin=page('TIRAdmin.jsx');
const render=component=>renderToStaticMarkup(React.createElement(component));
test('Public, student, trainee, unapproved and denied sessions cannot edit About or TIR',()=>{
 const users=[null,...['public','student','trainee'].map(access_level=>({access_level,status:'approved',portal_can_edit:false})),
  {access_level:'member',member_role:'member',status:'pending',portal_can_edit:false},
  {access_level:'leader',role:'admin',status:'approved',portal_can_edit:false}];
 for(const user of users){
  identity={user,isAuthenticated:!!user,isLoadingAuth:false};
  assert.doesNotMatch(render(About),/Adicionar Foto|Alterar Foto|type="file"|clicando no botão/);
  assert.doesNotMatch(render(TIRAdmin),/Nova Equipe|Nova Seção|Publicar Foto|type="file"/);
 }
 identity={user:{access_level:'leader',status:'approved',portal_can_edit:true},isAuthenticated:true,isLoadingAuth:true};
 assert.doesNotMatch(render(About),/Adicionar Foto|Alterar Foto|type="file"/);
});
test('Approved integrated members and leaders retain About editing and TIR management',()=>{
 for(const access_level of ['member','leader']){
  identity={user:{access_level,status:'approved',portal_can_edit:true},isAuthenticated:true,isLoadingAuth:false};
  assert.match(render(About),/Adicionar Foto/);
  assert.match(render(About),/Alterar Foto/);
  assert.match(render(About),/type="file"/);
  assert.match(render(TIRAdmin),/Nova Equipe/);
  assert.match(render(TIR),/Equipes/);
 }
});
