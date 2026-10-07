import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../api/_lib/supabaseServer.js',import.meta.url),'utf8');
const validate=vm.runInNewContext(source.slice(source.indexOf('export function validateUploadPermission')).replace('export function','function')+';validateUploadPermission');
const user=(status,member_role='user',is_admin=false)=>({profile:{status,member_role,is_admin}});
test('Projetos: qualquer perfil aprovado da Área Interna pode enviar imagens',()=>{
 for(const role of ['user','member','admin'])assert.equal(validate(user('approved',role),'projects'),true);
});
test('Projetos: cadastros pendentes e rejeitados continuam bloqueados',()=>{
 for(const status of ['pending','rejected',undefined])assert.throws(()=>validate(user(status),'projects'),/aprovação/);
});
test('Projetos: permissão editorial não concede acesso a contextos administrativos',()=>{
 for(const context of ['products','robots','sponsors','featured-news','fll-missions','fll-audio','test'])assert.throws(()=>validate(user('approved'),context),/administrador/);
});
test('Projetos: privilégios administrativos existentes são preservados',()=>{
 assert.equal(validate(user('approved','admin',true),'projects'),true);
 assert.equal(validate(user('approved','admin',true),'fll-audio'),true);
});
