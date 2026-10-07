import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ACCESS_LEVELS,accessLevel,canEditInternal} from '../src/lib/accessLevels.js';
test('Five access levels preserve read-only training and explicit external scope',()=>{
 assert.equal(ACCESS_LEVELS.length,5);
 assert.equal(accessLevel(null),'public');
 for(const level of ['public','student','trainee'])assert.equal(canEditInternal({access_level:level,status:'approved'}),false);
 for(const level of ['member','leader'])assert.equal(canEditInternal({access_level:level,status:'approved'}),true);
 assert.equal(canEditInternal({access_level:'member',status:'pending'}),false);
 assert.equal(canEditInternal({access_level:'member',status:'approved',portal_can_edit:false}),false);
 assert.equal(accessLevel({status:'approved',member_role:'user'}),'trainee');
 assert.equal(accessLevel({status:'approved',member_role:'member',access:{portal_internal:false,ava_status:'active'}}),'student');
});
