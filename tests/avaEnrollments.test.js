import {test} from 'node:test';
import assert from 'node:assert/strict';
import {enrollmentRows,studentCatalog} from '../src/lib/avaEnrollmentRules.js';
const tracks=[{id:'first',title:'FIRST',position:1,audience:'all',status:'published'},
 {id:'tera',title:'Tera',position:2,audience:'tera',status:'published'},
 {id:'external',title:'Parceiros',position:3,audience:'external',status:'published'},
 {id:'draft',title:'Em preparação',position:4,audience:'all',status:'draft'},
 {id:'old',title:'Arquivada',position:5,audience:'all',status:'archived'}];
test('Enrollment management distinguishes each student and preserves withdrawn progress',()=>{
 const user={id:'student',status:'approved',access:{access_level:'student',ava_status:'active'}};
 const data={tracks,enrollments:[{user_id:'other',track_id:'tera',status:'active'},
  {user_id:'student',track_id:'first',status:'active',progress:25},
  {user_id:'student',track_id:'external',status:'revoked',progress:60}]};
 const rows=enrollmentRows(data,user);
 assert.equal(rows[0].status,'active');assert.equal(rows[0].enrollment.progress,25);
 assert.equal(rows[1].status,'none');assert.equal(rows[1].canEnroll,false);
 assert.equal(rows[2].status,'revoked');assert.equal(rows[2].enrollment.progress,60);
 assert.equal(rows[2].canEnroll,true);
 assert.equal(rows[3].canEnroll,true);assert.equal(rows[4].canEnroll,false);
});
test('Enrollment keeps AVA approval and track audiences separate from portal permissions',()=>{
 for(const level of ['trainee','member','leader']){
  const rows=enrollmentRows({tracks},{id:level,status:'approved',access:{access_level:level,ava_status:'active'}});
  assert.equal(rows[1].canEnroll,true);assert.equal(rows[2].canEnroll,false);
 }
 for(const ava_status of ['pending','blocked','none'])assert.equal(enrollmentRows({tracks},{id:'x',access:{access_level:'student',ava_status}})[0].canEnroll,false);
 assert.equal(enrollmentRows({tracks},null)[0].canEnroll,false);
});

test('Catalog retains all published metadata and pending states without exposing restricted details',()=>{
 const data={catalog:[{id:'tera',title:'Tera',enrollment_status:'pending'},
  {id:'external',title:'Parceiros',enrollment_status:'active'}],tracks:[{id:'external',enrolled:true,progress:40}]};
 const catalog=studentCatalog(data);assert.equal(catalog.length,2);
 assert.equal(catalog[0].enrollment_status,'pending');assert.equal(catalog[0].enrolled,undefined);
 assert.equal(catalog[1].enrolled,true);assert.equal(catalog[1].progress,40);
 const rows=enrollmentRows({tracks,enrollments:[{user_id:'student',track_id:'first',status:'pending'}]},{id:'student',access:{access_level:'student',ava_status:'active'}});
 assert.equal(rows[0].status,'pending');assert.equal(rows[0].canEnroll,true);
});
