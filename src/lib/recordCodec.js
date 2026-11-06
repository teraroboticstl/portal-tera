const marker='\n[portal_record_v1]\n';
const fields={
 priorities:['priority_group'],
 daily_logs:['log_type','participants','what_was_done','decisions_made','problems_found','solutions','next_steps','evidence_links','evidence_images','video_urls'],
 meeting_notes:['participants','agenda','technical_discussions','final_decisions','pending_items','responsible_deadlines','video_urls','evidence_images','evidence_links'],
 prototype_tests:['test_method','what_didnt_work','lessons_learned','improvements','decision_reason','metrics_kpis','evidence_links','evidence_images','video_urls']
};
const listFields=new Set(['participants','evidence_links','evidence_images','video_urls']);
const list=value=>Array.isArray(value)?value.filter(item=>typeof item==='string'):typeof value==='string'?value.split(',').map(item=>item.trim()).filter(Boolean):[];
export const isStructuredRecord=table=>Boolean(fields[table]);
export function encodeRecord(table,payload) {
 if(!fields[table])return payload;
 const out={...payload};const extra={};
 for(const key of fields[table])if(Object.hasOwn(out,key)){extra[key]=listFields.has(key)?list(out[key]):out[key];delete out[key];}
 if(out.program!==undefined && table!=='meeting_notes'){out.category=out.program;delete out.program;}
 if(table==='meeting_notes' && extra.participants!==undefined)out.attendees=extra.participants;
 const column=table==='prototype_tests'?'result':table==='priorities'?'description':'content';
 if(table==='priorities'&&extra.priority_group!==undefined&&!['PRECISAMOS','QUEREMOS','SERIA BOM','IGNORAR','SEM CLASSIFICAÇÃO'].includes(extra.priority_group))throw new Error('Grupo de prioridade inválido.');
 if(Object.keys(extra).length){
  const summary=table==='daily_logs'?extra.what_was_done:table==='meeting_notes'?extra.agenda:out.result;
  out[column]=(summary || out[column] || '')+marker+JSON.stringify(extra);
  if(!['prototype_tests','priorities'].includes(table) && !out.title)out.title=table==='daily_logs'?`${extra.log_type || 'Log'} — ${out.date || ''}`:(extra.agenda || 'Reunião').slice(0,160);
 }
 return out;
}
export function decodeRecord(table,row) {
 if(!fields[table])return row;
 const out={...row};const column=table==='prototype_tests'?'result':table==='priorities'?'description':'content';const raw=row[column] || '';
 const index=raw.lastIndexOf(marker);
 if(index>=0){try {const extra=JSON.parse(raw.slice(index+marker.length));for(const key of fields[table])if(Object.hasOwn(extra,key))out[key]=listFields.has(key)?list(extra[key]):extra[key];out[column]=raw.slice(0,index);}catch{/* Keep legacy text intact. */}}
 out.program=row.program || row.category || 'Geral';
 if(table==='priorities'&&!['PRECISAMOS','QUEREMOS','SERIA BOM','IGNORAR','SEM CLASSIFICAÇÃO'].includes(out.priority_group))out.priority_group='SEM CLASSIFICAÇÃO';
 if(table==='daily_logs'){out.what_was_done ??= out.content;out.participants ??=[];}
 if(table==='meeting_notes'){out.agenda ??= row.title;out.technical_discussions ??= out.content;out.participants ??= list(row.attendees);}
 return out;
}
