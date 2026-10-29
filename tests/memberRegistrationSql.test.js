import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const runtime=process.env.PDI_TEST_PGLITE_MODULE;
test('isolated PostgreSQL: staged recadastro, atomic proposal, privacy, identity, preserved legacy and rollback',{skip:!runtime},async()=>{
  const {PGlite}=await import(pathToFileURL(runtime).href); const db=new PGlite();
  const owner='10000000-0000-0000-0000-000000000001',other='10000000-0000-0000-0000-000000000002',
    leader='10000000-0000-0000-0000-000000000003',mentor='10000000-0000-0000-0000-000000000004',
    student='10000000-0000-0000-0000-000000000005',fresh='10000000-0000-0000-0000-000000000006';
  try {
    await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated,anon;
      CREATE TABLE profiles(id uuid PRIMARY KEY,name text,internal boolean,mentor boolean,leader boolean);
      INSERT INTO profiles VALUES ('${owner}','Mesmo nome',true,false,false),('${other}','Mesmo nome',true,false,false),
        ('${leader}','Líder',true,false,true),('${mentor}','Mentor',true,true,false),('${student}','Aluno',false,false,false);
      CREATE FUNCTION portal_internal_access() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT coalesce((SELECT internal FROM profiles WHERE id=auth.uid()),false) $$;
      CREATE FUNCTION is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT coalesce((SELECT leader FROM profiles WHERE id=auth.uid()),false) $$;
      CREATE FUNCTION ava_identity() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT jsonb_build_object('mentor',mentor,'access_level',CASE WHEN leader THEN 'leader' ELSE 'member' END) FROM profiles WHERE id=auth.uid() $$;
      CREATE TABLE pdis(id integer PRIMARY KEY,body text); INSERT INTO pdis VALUES(1,'histórico FTC');
      CREATE TABLE pdi_frcs(id integer PRIMARY KEY,body text); INSERT INTO pdi_frcs VALUES(1,'histórico FRC');
      CREATE TABLE member_histories(user_id uuid PRIMARY KEY,history text); INSERT INTO member_histories VALUES('${owner}','história anterior');`);
    const before=(await db.query('SELECT jsonb_agg(to_jsonb(p)) AS records FROM profiles p')).rows;
    await db.exec(await readFile(new URL('../supabase/migrations/20261021_member_re_registration.sql',import.meta.url),'utf8'));
    const as=async(id,sql,args=[])=>{
      await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('SET ROLE authenticated');
      try{return await db.query(sql,args);}finally{await db.exec('RESET ROLE');}
    };
    const status=async id=>(await as(id,'SELECT member_registration_status() AS result')).rows[0].result;
    assert.equal((await db.query('SELECT count(*)::int n FROM member_registrations WHERE completed_version=0')).rows[0].n,5);
    assert.equal((await status(owner)).enabled,false);assert.equal((await status(owner)).required,false);
    const payload={preferred_name:'Nome escolhido',age:15,reason:'Equipe',modalities:['FTC','FRC'],areas:['programação','mecânica'],experience:'Inicial',contribution:'Aprender',season:'2026 — FTC/FRC',objectives:['Aprender CAD'],competencies:['Projeto']};
    const save=data=>as(owner,'SELECT member_registration_complete($1::jsonb) AS result',[JSON.stringify(data)]);
    await assert.rejects(save(payload),/REGISTRATION_NOT_ACTIVE/);
    await db.exec('UPDATE member_registration_settings SET enabled=true');
    for(const id of [owner,other,leader,mentor])assert.equal((await status(id)).required,true);
    await assert.rejects(status(student),/REGISTRATION_ACCESS_DENIED/);
    for(const invalid of [{...payload,user_id:other},{...payload,role:'admin'},{...payload,age:15.5},{...payload,age:0},{...payload,modalities:['inexistente']},{...payload,objectives:[]},{...payload,competencies:[{}]}]) {
      await assert.rejects(save(invalid),/REGISTRATION_INVALID/);
      assert.equal((await status(owner)).required,true);
    }
    const saved=(await save(payload)).rows[0].result;
    assert.equal(saved.actor,owner); assert.equal(saved.required,false);assert.equal(saved.preferred_name,'Nome escolhido');
    assert.equal(saved.profile,undefined,'status never returns age/narrative/proposal');
    const row=(await as(owner,'SELECT * FROM member_registrations')).rows;
    assert.equal(row.length,1);assert.equal(row[0].profile.age,15);
    assert.equal(row[0].initial_pdi.participant_id,owner);assert.equal(row[0].initial_pdi.status,'pending_mentor_review');
    assert.deepEqual(row[0].initial_pdi.modalities,['FTC','FRC']);
    assert.equal((await as(other,'SELECT * FROM member_registrations WHERE user_id=$1',[owner])).rows.length,0,'homonym is not owner/mentor');
    for(const id of [leader,mentor])assert.equal((await as(id,'SELECT * FROM member_registrations WHERE user_id=$1',[owner])).rows.length,1);
    assert.equal((await as(student,'SELECT * FROM member_registrations')).rows.length,0);
    await assert.rejects(as(owner,'UPDATE member_registrations SET completed_version=1'),/permission denied/);
    await assert.rejects(as(owner,'UPDATE member_registration_settings SET enabled=false'),/permission denied/);
    await save({...payload,preferred_name:'tentativa de sobrescrita'});
    assert.equal((await status(owner)).preferred_name,'Nome escolhido','idempotent submission preserves proposal');
    await db.exec(`INSERT INTO profiles VALUES('${fresh}','Novo',true,false,false)`);
    assert.equal((await status(fresh)).required,true);
    assert.deepEqual((await db.query('SELECT jsonb_agg(to_jsonb(p)) AS records FROM profiles p WHERE id!=$1',[fresh])).rows,before);
    assert.equal((await db.query('SELECT body FROM pdis')).rows[0].body,'histórico FTC');
    assert.equal((await db.query('SELECT body FROM pdi_frcs')).rows[0].body,'histórico FRC');
    assert.equal((await db.query('SELECT history FROM member_histories')).rows[0].history,'história anterior');
    await db.exec('SET ROLE anon');
    try{await assert.rejects(db.query('SELECT * FROM member_registrations'),/permission denied/);await assert.rejects(db.query('SELECT member_registration_status()'),/permission denied/);}finally{await db.exec('RESET ROLE');}
    await db.exec(await readFile(new URL('../supabase/rollbacks/20261021_member_re_registration.sql',import.meta.url),'utf8'));
    assert.equal((await status(other)).required,false);
    assert.equal((await as(owner,'SELECT * FROM member_registrations')).rows[0].profile.age,15);
  } finally {await db.close();}
});
