import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../api/_lib/supabaseServer.js',import.meta.url),'utf8');
const validate=vm.runInNewContext(source.slice(source.indexOf('export function validateUploadPermission')).replace('export function','function')+';validateUploadPermission');
const user=(status,member_role='user',is_admin=false)=>({profile:{status,member_role,is_admin,portal_can_edit:status==='approved' && ['member','admin'].includes(member_role)}});
test('Projetos: membros integrados e líderes podem enviar imagens; treinamento somente consulta',()=>{
 assert.equal(validate(user('approved','member'),'projects'),true);
 assert.equal(validate(user('approved','admin',true),'projects'),true);
 assert.throws(()=>validate(user('approved','user'),'projects'),/consulta/);
});
test('Projetos: cadastros pendentes e rejeitados continuam bloqueados',()=>{
 for(const status of ['pending','rejected',undefined])assert.throws(()=>validate(user(status),'projects'),/aprovação/);
});
test('Projetos: permissão editorial não concede acesso a contextos administrativos',()=>{
 for(const context of ['products','robots','sponsors','featured-news','fll-missions','fll-audio','test'])assert.throws(()=>validate(user('approved','member'),context),/administrador/);
});
test('Projetos: privilégios administrativos existentes são preservados',()=>{
 assert.equal(validate(user('approved','admin',true),'projects'),true);
 assert.equal(validate(user('approved','admin',true),'fll-audio'),true);
});
