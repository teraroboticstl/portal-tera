import './helpers/isolatedSupabase.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateUploadPermission} from '../api/_lib/supabaseServer.js';
test('management cannot upload even when stale profile flags claim admin/edit privileges',()=>{
 const user={profile:{access_level:'management_readonly',status:'approved',portal_internal:true,portal_can_edit:true,is_admin:true}};
 for(const context of ['pdi','projects','seasons','ava','products','test'])assert.throws(()=>validateUploadPermission(user,context),/Gestão-leitura/);
 assert.equal(validateUploadPermission({profile:{access_level:'member',status:'approved',portal_internal:true,portal_can_edit:true,is_admin:false}},'pdi'),true);
});
