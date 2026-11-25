import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrcScoutingClient} from '../src/api/frcScoutingClient.js';
const actor='10000000-0000-0000-0000-000000000001',event='20000000-0000-0000-0000-000000000001',season='30000000-0000-0000-0000-000000000001';
function fixture(){
 const state={actor,calls:[],error:null,swap:false};
 const db={auth:{getUser:async()=>({data:{user:{id:state.actor}}})},from:table=>{
  const call={table,operations:[]};state.calls.push(call);
  const chain={then:resolve=>{if(state.swap)state.actor='different';return Promise.resolve(resolve({data:[],error:state.error}));}};
  for(const key of ['select','eq','order','limit','insert','update','single'])chain[key]=(...args)=>{call.operations.push([key,...args]);return chain;};return chain;
 }};return {state,api:createFrcScoutingClient(db)};
}
test('linked save uses actual columns and leaves author exclusively to database session',async()=>{
 const {state,api}=fixture();
 await api.save(actor,{event,season},{team:'10343',match:'Q1',auto:'0',teleop:'12',notes:'<script>inert</script>',scouting_user_id:'forged'});
 const payload=state.calls[0].operations.find(([op])=>op==='insert')[1];
 assert.deepEqual(payload,{team_number:'10343',match_number:'Q1',auto_points:0,teleop_points:12,notes:'<script>inert</script>',scouting_season_id:season,scouting_event_id:event});
 assert.ok(!Object.hasOwn(payload,'scouting_user_id'));
});
test('invalid/missing score is not turned into zero, and bad context never issues an insert',async()=>{
 for(const patch of [{auto:''},{auto:'-1'},{auto:'NaN'},{teleop:'1.5'},{match:''},{team:'invalid'}]){
  const {state,api}=fixture();await assert.rejects(api.save(actor,{event,season},{team:'10343',match:'Q1',auto:'0',teleop:'1',...patch}));assert.equal(state.calls.length,0);
 }
});
test('reads are FRC/event filtered and scoped packets check account before/after request',async()=>{
 const {state,api}=fixture();
 assert.equal((await api.load(actor)).actor,actor);
 for(const call of state.calls)assert.ok(call.operations.some(([key,,value])=>key==='eq'&&value==='FRC'));
 state.calls=[];await api.event(actor,event);
 assert.ok(state.calls.every(c=>c.operations.some(([key,,value])=>key==='eq'&&value===event)));
 state.swap=true;await assert.rejects(api.event(actor,event),/Sessão/);
});
test('service errors are sanitized and account mismatch stops mutation',async()=>{
 const {state,api}=fixture();state.error={message:'SECRET_DATABASE_DETAIL'};
 await assert.rejects(api.configure(actor,event,season),e=>!e.message.includes('SECRET'));
 state.actor='other';state.calls=[];await assert.rejects(api.enroll(actor,event,season));assert.equal(state.calls.length,0);
});
test('event creation includes mandatory tournament_date and rejects missing/impossible calendar dates',async()=>{
 const {state,api}=fixture();
 for(const date of ['',undefined,'2026-02-30','2026-13-01','03/12/2026']){
  await assert.rejects(api.create(actor,'event',{name:'Regional',season,date}),/data/);assert.equal(state.calls.length,0);
 }
 await api.create(actor,'event',{name:'Regional',season,date:'2026-12-03'});
 const payload=state.calls[0].operations.find(([key])=>key==='insert')[1];
 assert.equal(payload.tournament_date,'2026-12-03T12:00:00.000Z');
 assert.equal(payload.scouting_season_id,season);
});
test('database constraint failures have specific safe messages',async()=>{
 for(const [code,pattern] of [['23502',/obrigatório/],['23505',/já existe/],['23503',/vínculo/],['42501',/acesso/]]){
  const {state,api}=fixture();state.error={code,message:'SECRET_DATABASE_DETAIL'};
  await assert.rejects(api.configure(actor,event,season),e=>pattern.test(e.message)&&!e.message.includes('SECRET'));
 }
});
