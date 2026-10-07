import {test} from 'node:test';
import assert from 'node:assert/strict';
import {teamToday,operationalFacts,goalProgress,evidenceForMember,pendingDependencies} from '../src/lib/teamOperations.js';
test('Hoje uses Cuiabá day boundaries; late work excludes completed, cancelled and archived items',()=>{
 assert.equal(teamToday(new Date('2026-10-08T02:00:00Z')),'2026-10-07');
 const tasks=[{id:'a',kind:'task',due_on:'2026-10-06',status:'active',depends_on:['b']},{id:'b',kind:'task',status:'active',due_on:'2026-10-07',responsible_id:'u'},...['done','cancelled'].map(status=>({kind:'task',status,due_on:'2026-10-01'})),{kind:'task',status:'active',archived:true,due_on:'2026-10-01'}];
 const f=operationalFacts(tasks,'2026-10-07');assert.equal(f.late.length,1);assert.equal(f.dueToday.length,1);assert.equal(f.blocked.length,1);assert.equal(f.unassigned.length,1);
 assert.deepEqual(pendingDependencies(tasks[0],tasks),['b']);
});
test('Goal progress derives from linked tasks and never substitutes for learning or PDI evaluation',()=>{
 assert.equal(goalProgress({id:'g'},[]),null);
 assert.equal(goalProgress({id:'g'},[{kind:'task',goal_id:'g',status:'done',progress:0},{kind:'task',goal_id:'g',status:'active',progress:40},{kind:'task',goal_id:'g',status:'cancelled',progress:0}]),70);
 const items=[{kind:'activity',author_id:'u',participants:[{user_id:'other'}]},{kind:'activity',participants:[{user_id:'u',contribution:'Programação'}],evidence:[]},{kind:'meeting',archived:true,participants:[{user_id:'u'}]}];
 assert.equal(evidenceForMember(items,'u').length,1);assert.equal(evidenceForMember(items,'u')[0],items[1]);
});
