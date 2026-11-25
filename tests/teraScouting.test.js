import test from 'node:test';
import assert from 'node:assert/strict';
import {scoutingRole, observation, eventName, recordKey, validateScoutingRecord, scoreResponses, compareObservations, summarizeScouting, dataQuality} from '../src/lib/teraScouting.js';

const fields = [{id:'cycles',type:'counter',points:3},{id:'parked',type:'boolean',points:10}];
const context = {season_id:'s1',event_id:'e1',team_numbers:['10343'],fields};
const record = changes => ({id:'r1',season_id:'s1',event_id:'e1',match_number:'Q1',team_number:'10343',
  alliance:'red',start_position:'left',status:'pending',responses:{cycles:0,parked:false},scout_user_id:'u1',...changes});

test('new/unrecognized scouting assignments fail closed to viewer',()=>{
  for(const role of [undefined,null,'leader','ADMIN',{},true]) assert.equal(scoutingRole(role),'viewer');
  assert.equal(scoutingRole('scout'),'scout');
});
test('missing observations are distinct from zero and invalid counters fail',()=>{
  for(const value of [undefined,null,'not_observed','not_applicable','not_informed']) assert.equal(observation(value),null);
  assert.equal(observation(0),0);
  for(const value of [-1,NaN,Infinity,'0',false]) assert.throws(()=>observation(value));
});
test('event name edit detects duplicates without replacing the event identity',()=>{
  assert.equal(eventName(' Regional 2026 ',['Regional 1'],'Regional 1'),'Regional 2026');
  assert.equal(eventName('Regional 1',['Regional 1'],'Regional 1'),'Regional 1');
  for(const value of ['', '   ',null]) assert.throws(()=>eventName(value));
  assert.throws(()=>eventName('regional 1',['Regional 1']));
});
test('record requires correct event membership and known nonnegative typed responses',()=>{
  assert.equal(validateScoutingRecord(record(),context),true);
  assert.notEqual(recordKey(record()),recordKey(record({event_id:'other'})));
  for(const changes of [{season_id:'other'},{event_id:'other'},{team_number:'9164'},{match_number:''},
    {alliance:'other'},{start_position:null},{status:'approved'}, {responses:{cycles:-1}},
    {responses:{cycles:0.5}},{responses:{parked:'false'}},{responses:{extra:1}}]) {
    assert.throws(()=>validateScoutingRecord(record(changes),context));
  }
  assert.equal(validateScoutingRecord(record({responses:{cycles:'not_observed',parked:null}}),context),true);
});
test('no invented official scores; scoring needs provenance and missing values stay missing',()=>{
  assert.equal(scoreResponses({cycles:10},{}).total,null);
  assert.equal(scoreResponses({cycles:10},{fields}).configured,false);
  const config={source:'administrator:test-fixture-not-official',fields};
  assert.equal(scoreResponses({cycles:2,parked:true},config).total,16);
  assert.equal(scoreResponses({cycles:0,parked:false},config).total,0);
  assert.deepEqual(scoreResponses({cycles:2},config).missing,['parked']);
  assert.equal(scoreResponses({cycles:2},config).total,null);
  assert.throws(()=>scoreResponses({cycles:-1,parked:false},config));
  assert.throws(()=>scoreResponses({cycles:1,parked:'yes'},config));
});
test('independent observations flag differences without erasing either record',()=>{
  const a=record(),b=record({id:'r2',scout_user_id:'u2',responses:{cycles:1,parked:false}});
  const before=JSON.stringify([a,b]);
  assert.deepEqual(compareObservations(a,b,['cycles','parked']),{independent:true,differences:['cycles'],requires_review:true});
  assert.equal(JSON.stringify([a,b]),before);
  assert.equal(compareObservations(a,a,['cycles']).independent,false);
  assert.throws(()=>compareObservations(a,record({event_id:'other'}),['cycles']));
});
test('statistics scope event/season, deduplicate observers and exclude unvalidated/ambiguous matches',()=>{
  const rows=[record({status:'validated',total:10}),record({id:'r2',status:'validated',total:10,scout_user_id:'u2'}),
    record({match_number:'Q2',status:'validated',total:20}),record({match_number:'Q3',total:99}),
    record({event_id:'e2',status:'validated',total:999}),record({season_id:'s2',status:'validated',total:999})];
  const result=summarizeScouting(rows,'s1','e1');
  assert.equal(result.matches,3);assert.equal(result.scored_matches,2);assert.equal(result.mean,15);assert.equal(result.best,20);
  assert.equal(result.unresolved.length,1);
  assert.equal(summarizeScouting([record({status:'validated',total:0})],'s1','e1').mean,0);
  assert.equal(summarizeScouting([],'s1','e1').mean,null);
  assert.equal(summarizeScouting([record({status:'validated',total:null})],'s1','e1').mean,null);
  assert.equal(summarizeScouting([record({status:'validated',total:10}),record({status:'validated',total:11})],'s1','e1').mean,null);
  assert.equal(summarizeScouting([record({status:'validated',total:10})],'s1','e1').consistency,null);
});
test('quality reports configurable methodology and coverage rather than disguising absence as zero',()=>{
  const weights={complete:2,verified:1};
  assert.equal(dataQuality({},weights).score,null);
  const result=dataQuality({complete:1},weights);
  assert.equal(result.score,100);assert.equal(result.coverage,2/3);
  assert.equal(dataQuality({complete:1,verified:0},weights).score,67);
  for(const invalid of [{},{complete:-1},{complete:NaN},{complete:0}]) assert.throws(()=>dataQuality({},invalid));
  assert.throws(()=>dataQuality({complete:2},weights));
});
