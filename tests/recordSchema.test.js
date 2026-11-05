import {pathToFileURL} from 'node:url';
import {encodeRecord,decodeRecord} from '../src/lib/recordCodec.js';
import test from 'node:test';
import assert from 'node:assert/strict';

test('record payloads insert and round-trip against the columns confirmed in production (isolated PostgreSQL)',{skip:!process.env.PDI_TEST_PGLITE_MODULE},async()=>{
 const {PGlite}=await import(pathToFileURL(process.env.PDI_TEST_PGLITE_MODULE).href);
 const db=new PGlite();
 try {
  await db.exec(`CREATE TABLE daily_logs(id uuid DEFAULT gen_random_uuid(),user_id uuid,user_name text,title text NOT NULL,content text NOT NULL,date date NOT NULL DEFAULT CURRENT_DATE,category text NOT NULL DEFAULT 'Geral',created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());CREATE TABLE meeting_notes(id uuid DEFAULT gen_random_uuid(),title text NOT NULL,content text NOT NULL,date date NOT NULL DEFAULT CURRENT_DATE,program text NOT NULL DEFAULT 'Geral',attendees text[] DEFAULT '{}',action_items jsonb DEFAULT '[]',created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());CREATE TABLE prototype_tests(id uuid DEFAULT gen_random_uuid(),subsystem text NOT NULL,hypothesis text NOT NULL,result text NOT NULL,conclusion text,date date NOT NULL DEFAULT CURRENT_DATE,tester_name text,category text NOT NULL DEFAULT 'Geral',created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());`);
  const forms={daily_logs:{date:'2026-11-05',program:'FTC',what_was_done:'CAD',participants:['Histórico sem conta'],evidence_images:[],video_urls:[]},meeting_notes:{date:'2026-11-05',program:'FRC',agenda:'Plano',technical_discussions:'Discussão',participants:['Autor não participante'],evidence_images:['/api/media/syntheticphoto'],evidence_links:['/api/media/syntheticpdf'],video_urls:[]},prototype_tests:{date:'2026-11-05',program:'FLL',subsystem:'Garra',hypothesis:'Teste',test_method:'Medição',result:'Funcionou',video_urls:[]}};
  for(const [table,form] of Object.entries(forms)) {
   const payload=encodeRecord(table,form),columns=Object.keys(payload),values=Object.values(payload);
   const {rows}=await db.query(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`,values);
   const decoded=decodeRecord(table,{...rows[0],date:rows[0].date.toISOString().slice(0,10)});for(const [key,value] of Object.entries(form))assert.deepEqual(decoded[key],value,`${table}.${key}`);
  }
  await assert.rejects(db.query("INSERT INTO daily_logs (title,content,what_was_done) VALUES ('legacy','text','unknown')"),/what_was_done/);
 } finally {await db.close();}
});
