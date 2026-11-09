import test from 'node:test';
import assert from 'node:assert/strict';
import {remainingBusinessDays} from '../src/lib/businessDays.js';

test('regional preparation counts today through the day before the event, excluding weekends',()=>{
  const target='2026-12-03T00:00:00-04:00';
  assert.equal(remainingBusinessDays(target,{now:'2026-11-09T08:00:00-04:00'}),18);
  assert.equal(remainingBusinessDays(target,{now:'2026-12-02T23:59:59-04:00'}),1);
  assert.equal(remainingBusinessDays(target,{now:'2026-12-03T00:00:00-04:00'}),0);
  assert.equal(remainingBusinessDays(target,{now:'2026-12-04'}),0);
  assert.equal(remainingBusinessDays('2026-11-09',{now:'2026-11-06'}),1);
  assert.equal(remainingBusinessDays('2026-11-09',{now:'2026-11-07'}),0);
  assert.equal(remainingBusinessDays('2026-11-10',{now:'2026-11-07'}),1);
  assert.equal(remainingBusinessDays('2026-11-10',{now:'2026-11-08'}),1);
});
test('Três Lagoas midnight, year boundaries, and invalid dates have deterministic behavior',()=>{
  assert.equal(remainingBusinessDays('2026-11-10T00:00:00-04:00',{now:'2026-11-10T03:59:59Z'}),1);
  assert.equal(remainingBusinessDays('2026-11-10T00:00:00-04:00',{now:'2026-11-10T04:00:00Z'}),0);
  assert.equal(remainingBusinessDays('2027-01-04',{now:'2026-12-31'}),2);
  assert.equal(remainingBusinessDays('invalid'),0);
  assert.equal(remainingBusinessDays('2026-12-03',{now:'invalid'}),0);
  assert.equal(remainingBusinessDays('2026-02-30',{now:'2026-02-01'}),0);
});
test('optional excluded dates are counted once, ignore weekends/out-of-range/invalid entries',()=>{
  assert.equal(remainingBusinessDays('2026-12-03',{now:'2026-11-09',excludedDates:['2026-11-20','2026-11-20','2026-11-15','2026-11-02','2026-12-03','invalid','2026-02-30']}),17);
  assert.equal(remainingBusinessDays('2026-11-23',{now:'2026-11-20',excludedDates:['2026-11-20']}),0);
});
