import test from 'node:test';
import assert from 'node:assert/strict';
import {canReadBi,scoutingRow,summarizeScouting,publicBi,biCsv,missionRows,biDate} from '../src/lib/teraBi.js';
import {createBiHandler} from '../api/_lib/teraBi.js';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {requestDeadline} from '../src/api/requestDeadline.js';

const user={id:'actor',profile:{portal_internal:true}};
const snapshot=(modalities=['FTC'])=>({actor:'actor',modalities,pages:{InternalFTCScout:{visible:true},InternalFRCScout:{visible:true},InternalFLLDashboard:{visible:true}}});
function fixture({tables={},snapshots=[snapshot()],auth=async()=>user,fail='',limit=5000}={}) {
  const calls=[];let rpcIndex=0;
  function client(kind){return {rpc:async()=>{calls.push([kind,'rpc']);return {data:snapshots[Math.min(rpcIndex++,snapshots.length-1)]};},from(table){
    const call={kind,table,filters:[]};calls.push(call);
    const query={select(fields){call.fields=fields;return query;},order(){return query;},eq(key,value){call.filters.push([key,value]);return query;},is(key,value){call.filters.push([key,value]);return query;},abortSignal(){return query;},range(start,end){call.range=[start,end];return query;},then(resolve){let data=tables[table]||[];for(const [key,value]of call.filters)data=data.filter(r=>r[key]===value);return Promise.resolve(table===fail?{error:{message:'sensitive-service-error'}}:{data:data.slice(call.range[0],call.range[1]+1)}).then(resolve);}};return query;
  }};}
  const handler=createBiHandler({publicClient:client('anon'),scopedClient:token=>{assert.equal(token,'synthetic-token');return client('user');},authenticate:auth,limit});
  async function request(query={program:'FTC'},headers={authorization:'Bearer synthetic-token'},method='GET') {
    const response={headers:{},setHeader(key,value){this.headers[key]=value;},status(value){this.code=value;return this;},json(value){this.body=value;return this;}};
    await handler({method,query,headers},response);return response;
  }
  return {calls,request};
}
test('BI grants only matching authenticated internal identity, permitted modality and visible page',()=>{
  assert.equal(canReadBi('FTC',user,snapshot()),true);
  for(const [program,actor,access]of [['FRC',user,snapshot()],['FTC',{},snapshot()],['FTC',{id:'other',profile:user.profile},snapshot()],['FTC',{id:'actor',profile:{}},snapshot()],['OBR',user,snapshot()],['FTC',user,{...snapshot(),pages:{}}]])assert.equal(Boolean(canReadBi(program,actor,access)),false);
  assert.equal(canReadBi('FRC',user,{...snapshot(),is_admin:true}),true);
  assert.equal(canReadBi('FRC',user,{...snapshot(),all_modalities:true}),true);
});
test('real metrics remain distinct; missing data are not silently zero; strings and dates are projected safely',()=>{
  assert.equal(scoutingRow({auto_points:10,teleop_points:12,total_score:999},'FRC').value,22);
  assert.equal(scoutingRow({auto_score:10,teleop_score:12},'FRC').value,22);
  assert.equal(scoutingRow({auto_points:0},'FRC').value,null);
  assert.equal(scoutingRow({efficiency_index:-2},'FTC').value,-2);
  assert.equal(scoutingRow({score:0},'FLL').value,0);
  assert.equal(scoutingRow({score:'NaN'},'FLL').value,null);
  assert.equal(biDate('2026-11-12T02:00:00Z'),'2026-11-11');
  const row=scoutingRow({score:30,notes:'secret',user_id:'private',team_name:'Tera',season_year:2026,rules_version:'v1'},'FLL');
  assert.deepEqual(Object.keys(row).sort(),['date','event','match','team','value']);
  assert.equal(missionRows([{title:'Missão',current_score:0,max_score:20,portal_form_data:{status:'em_teste'}}])[0].status,'em_teste');
});
test('filters and chart/table summaries agree; absent values are excluded from mean',()=>{
  const rows=[{team:'1',event:'A',date:'2026-11-12',value:10},{team:'1',event:'A',date:'2026-11-12',value:30},{team:'2',event:'B',date:'2026-11-13',value:100},{team:'1',event:'A',date:'',value:null}];
  const summary=summarizeScouting(rows,{team:'1',event:'A',from:'2026-11-12',to:'2026-11-12'});
  assert.equal(summary.count,2);assert.equal(summary.average,20);assert.equal(summary.teams[0].average,summary.days[0].average);assert.equal(summary.best,30);
  assert.equal(summarizeScouting(rows,{team:'missing'}).average,null);
  assert.equal(summarizeScouting(rows).measured,3);
});
test('CSV formulas are neutralized and public projections omit identities, descriptions and links',()=>{
  const csv=biCsv({teams:[{name:' =HYPERLINK("bad")',records:1,average:-2,best:0}]},'IEF');
  assert.match(csv,/"' =HYPERLINK/);assert.match(csv,/;-2;0;/);
  const output=publicBi([{id:'id',title:'Project',description:'private',links:'secret'}],[{name:'Robot',category:'FRC',specs:'secret'}],[{title:'Award',program:'FRC',team_members:['private'],images:['secret']}]);
  assert.doesNotMatch(JSON.stringify(output),/private|secret|team_members|specs|links/);
});
test('anonymous, forbidden modality, hidden page and changed session fail before or after retrieval',async()=>{
  const malformed=fixture();assert.equal((await malformed.request({program:['FRC']})).code,400);assert.equal(malformed.calls.length,0);
  const anonymous=fixture({auth:async()=>{throw Error('token');}});assert.equal((await anonymous.request()).code,401);assert.equal(anonymous.calls.length,0);
  const denied=fixture();assert.equal((await denied.request({program:'FRC'})).code,403);assert.equal(denied.calls.filter(c=>c.table).length,0);
  const revoked=fixture({snapshots:[snapshot(),{...snapshot(),modalities:[]}]});assert.equal((await revoked.request()).code,403);
  let count=0;const changed=fixture({auth:async()=>++count===1?user:{...user,id:'different'}});assert.equal((await changed.request()).code,403);
  const noHeader=fixture();assert.equal((await noHeader.request({program:'FTC'},{})).code,401);assert.equal(noHeader.calls.length,0);
});
test('scoped pagination exceeds former 500 record ceiling; cap is explicit and service errors disclose nothing',async()=>{
  const tables={scout_ftcs:Array.from({length:700},(_,id)=>({id,team_number:'1',efficiency_index:10}))};
  const f=fixture({tables});const result=await f.request();assert.equal(result.code,200);assert.equal(result.body.rows.length,700);assert.equal(result.body.partial,false);assert.equal(f.calls.filter(c=>c.table).length,2);
  const capped=await fixture({tables,limit:500}).request();assert.equal(capped.body.partial,true);assert.equal(capped.body.rows.length,500);
  const failed=await fixture({fail:'scout_ftcs'}).request();assert.equal(failed.code,503);assert.doesNotMatch(JSON.stringify(failed.body),/sensitive|rows/);
  assert.equal((await fixture().request({},undefined,'POST')).code,405);
});
test('FLL preserves own-round privacy, simulator rules and test/trash exclusions',async()=>{
  const round={rules_version:'bioglow-2026-2027-v1',is_test:false,deleted_at:null,user_id:'actor',score:10};
  const f=fixture({snapshots:[snapshot(['FLL'])],tables:{fll_round_simulations:[round,{...round,user_id:'other'},{...round,is_test:true},{...round,deleted_at:'now'},{...round,rules_version:'industria'}]}});
  const response=await f.request({program:'FLL'});assert.equal(response.code,200);assert.equal(response.body.rows.length,1);
  assert.deepEqual(f.calls.find(c=>c.table==='fll_round_simulations').filters,[['rules_version','bioglow-2026-2027-v1'],['is_test',false],['deleted_at',null],['user_id','actor']]);
  const admin=fixture({snapshots:[{...snapshot(['FLL']),is_admin:true}],tables:{fll_round_simulations:[round,{...round,user_id:'other'}]}});assert.equal((await admin.request({program:'FLL'})).body.rows.length,2);
});
test('public requests always use anon client even with an authenticated header; only active projects are queried',async()=>{
  const f=fixture({auth:async()=>{throw Error('must not run');},tables:{projects:[{id:'1',title:'A',status:'Ativo'},{id:'2',title:'B',status:'Planejamento'}]}});
  const response=await f.request({scope:'public'});assert.equal(response.code,200);assert.equal(response.body.data.projects.length,1);assert.ok(f.calls.every(c=>c.kind==='anon'));assert.match(response.headers['Cache-Control'],/no-store/);
});
async function clientModule(auth,fetcher) {
  const context=vm.createContext({AbortSignal,fetch:fetcher,encodeURIComponent,Error});
  const module=new vm.SourceTextModule(await fs.readFile(new URL('../src/api/teraBiClient.js',import.meta.url),'utf8'),{context});
  await module.link(specifier=>new vm.SyntheticModule([specifier.includes('supabase')?'supabase':'requestDeadline'],function(){this.setExport(specifier.includes('supabase')?'supabase':'requestDeadline',specifier.includes('supabase')?{auth}:requestDeadline);},{context}));await module.evaluate();return module.namespace;
}
test('actual browser client verifies identity before/after, and public mode sends no Supabase token',async()=>{
  let identity='actor',calls=0;
  const auth={getUser:async()=>({data:{user:{id:identity}}}),getSession:async()=>({data:{session:{user:{id:'actor'},access_token:'synthetic'}}})};
  const module=await clientModule(auth,async(url,options)=>{calls++;if(url.includes('scope=public')){assert.equal(options.credentials,'same-origin');assert.equal(options.headers,undefined);return {ok:true,json:async()=>({scope:'public',data:{}})};}assert.equal(options.headers.Authorization,'Bearer synthetic');return {ok:true,json:async()=>({actor:'actor',program:'FTC',rows:[]})};});
  assert.equal((await module.readTeraBi('FTC','actor')).program,'FTC');
  await module.readPublicBi();identity='changed';await assert.rejects(()=>module.readTeraBi('FTC','actor'),/Sessão inválida/);assert.equal(calls,2);
  identity='actor';const changed=await clientModule(auth,async()=>{identity='changed';return {ok:true,json:async()=>({actor:'actor',program:'FTC',rows:[]})};});await assert.rejects(()=>changed.readTeraBi('FTC','actor'),/sessão mudou/);
});
