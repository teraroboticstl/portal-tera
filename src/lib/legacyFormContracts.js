// Versioned UI/SQL contracts confirmed against production metadata, not guesses.
// Extra editorial fields stay on the existing row; IDs/roles/scopes cannot be
// overridden by JSON metadata. No member/PDI copy or shared AI index is created.
export const FORM_CONTRACTS = {
 fll_missions:{columns:['mission_number','title','max_score','current_score','status','description'],aliases:{name:'title',best_score:'current_score',order:'mission_number',notes:'description'},extra:['status'],defaults:{name:'Missão',max_score:0,best_score:0,order:0,notes:''},status:{em_teste:'Em Desenvolvimento',concluida:'Consistente',descartada:'Não Iniciada'},inverseStatus:{'Não Iniciada':'em_teste','Em Desenvolvimento':'em_teste',Consistente:'concluida'},sort:{order:'mission_number'}},
 fll_tasks:{columns:['title','status','area','assignee_id','assignee_name','deadline'],aliases:{responsible:'assignee_name'},extra:['priority','notes'],defaults:{priority:'media',notes:'',responsible:''},status:{pendente:'pendente',em_andamento:'em_progresso',concluida:'concluida'},inverseStatus:{pendente:'pendente',em_progresso:'em_andamento',concluida:'concluida'}},
 fll_innovation_projects:{columns:['problem_definition','proposed_solution','experts_consulted','presentation_status'],aliases:{problem:'problem_definition',solution:'proposed_solution',research:'experts_consulted',status:'presentation_status'},extra:['title','date','prototypes','feedbacks','evolution','links'],defaults:{title:'Projeto de inovação',problem:'',solution:'',research:'',prototypes:'',feedbacks:'',evolution:'',links:[],status:'rascunho'},sort:{date:'portal_form_data->>date'}},
 fll_core_values:{columns:['value_name','evidence','activity_example'],aliases:{value:'value_name',reflection:'evidence',activity:'activity_example'},extra:['date','participants'],defaults:{value:'Descoberta',activity:'',reflection:'',participants:''},sort:{date:'portal_form_data->>date'}},
 fll_judge_preps:{columns:['category','question','key_points','responsible_student'],aliases:{answer:'key_points'},extra:['notes','ready'],defaults:{answer:'',notes:'',ready:false}},
 fll_members:{columns:['name','role','avatar_url','subsystem','bio'],aliases:{photo_url:'avatar_url'},extra:['skills','contributions','order'],defaults:{photo_url:'',role:'',skills:'',contributions:'',order:0},sort:{order:'portal_form_data->order'}},
 fll_attachments:{columns:['name','type','missions_served','status','notes'],aliases:{title:'name',file_type:'type',description:'notes'},extra:['file_url','date'],defaults:{title:'Anexo',file_url:'',file_type:'documento',description:''},sort:{date:'portal_form_data->>date'}},
 board_diaries:{columns:['title','content','author_id','author_name','date','category'],aliases:{program:'category'},extra:['section','participants','brainstorm','build_notes','process_description','links'],defaults:{section:'Engenharia',participants:'',brainstorm:'',build_notes:'',process_description:'',links:[]}},
 team_logs:{columns:['user_id','user_name','title','content','date','program'],aliases:{},extra:['section'],defaults:{section:'',program:'Geral'}},
 project_risks:{columns:['risk','category','probability','impact','mitigation','contingency','responsible','program'],aliases:{title:'risk',preventive_action:'mitigation',plan_b:'contingency'},extra:['project','cause','prevent_plan','mitigate_plan','status'],defaults:{project:'Interclasse 2026',title:'',cause:'',prevent_plan:'',mitigate_plan:'',preventive_action:'',plan_b:'',status:'nao_ocorreu'}},
 esg_initiatives:{columns:['title','pillar','status','impact_description'],aliases:{theme:'pillar',description:'impact_description'},extra:['effort','horizon'],defaults:{theme:'Resíduos',description:'',effort:'médio',horizon:'médio prazo'}},
};
export const hasFormContract=table=>Object.hasOwn(FORM_CONTRACTS,table);
export function formColumn(table,key){const c=FORM_CONTRACTS[table];return c?.aliases[key]|| (c?.extra.includes(key)?`portal_form_data->>${key}`:key);}
export function formOrder(table,key){return FORM_CONTRACTS[table]?.sort?.[key]||formColumn(table,key);}
export function encodeForm(table,input,previous={}, {isUpdate=false}={}) {
 const c=FORM_CONTRACTS[table];if(!c)return input;
 const payload={};const meta=previous&&typeof previous==='object'&&!Array.isArray(previous)?{...previous}:{};
 for(const key of c.columns)if(Object.hasOwn(input,key))payload[key]=input[key];
 for(const [key,column] of Object.entries(c.aliases))if(Object.hasOwn(input,key))payload[column]=input[key];
 for(const key of c.extra)if(Object.hasOwn(input,key))meta[key]=input[key];
 if(c.status&&input.status!==undefined){
  if(Object.hasOwn(c.status,input.status))payload.status=c.status[input.status];
  else if(!Object.values(c.status).includes(input.status))throw new Error('Status inválido para este formulário.');
 }
 if(table==='fll_judge_preps'&&payload.category==='Robot Game')payload.category='Robot Design';
 if(table==='fll_tasks'&&!isUpdate&&!payload.area)payload.area='Geral';
 if(table==='fll_innovation_projects'&&typeof payload.experts_consulted==='string')payload.experts_consulted=payload.experts_consulted?[payload.experts_consulted]:[];
 if(table==='board_diaries'){
  if(!isUpdate&&!payload.title)payload.title=`${input.section||meta.section||'Diário'} — ${input.date||''}`;
  if(input.brainstorm!==undefined||input.build_notes!==undefined||input.process_description!==undefined)
   payload.content=[input.brainstorm??meta.brainstorm,input.build_notes??meta.build_notes,input.process_description??meta.process_description].filter(Boolean).join('\n\n');
 }
 if(table==='fll_tasks'&&payload.deadline==='')payload.deadline=null;
 // Missing metadata is a schema/deployment error, never silently drop form data.
 if(JSON.stringify(meta).length>60000)throw new Error('O formulário excede o tamanho permitido. Divida o conteúdo em mais registros.');
 payload.portal_form_data=meta;
 return payload;
}
export function decodeForm(table,row) {
 const c=FORM_CONTRACTS[table];if(!c||!row)return row;
 const out={...c.defaults,...row};const meta=row.portal_form_data&&typeof row.portal_form_data==='object'?row.portal_form_data:{};
 for(const [key,column] of Object.entries(c.aliases))if(row[column]!==undefined&&row[column]!==null)out[key]=row[column];
 for(const key of c.extra)if(Object.hasOwn(meta,key)){
  const value=meta[key];
  if(key==='links')out[key]=Array.isArray(value)?value.filter(v=>typeof v==='string'):[];
  else if(key==='ready')out[key]=value===true;
  else if(key==='order')out[key]=typeof value==='number'&&Number.isFinite(value)?value:0;
  else if(typeof value==='string')out[key]=value;
 }
 if(table==='fll_innovation_projects'&&Array.isArray(out.research))out.research=out.research.filter(v=>typeof v==='string').join('\n');
 if(c.inverseStatus&&!Object.hasOwn(meta,'status'))out.status=c.inverseStatus[row.status]||Object.keys(c.status)[0];
 if(table==='fll_judge_preps'&&row.category==='Robot Design')out.category='Robot Game';
 if(!out.date&&row.created_at)out.date=String(row.created_at).slice(0,10);
 if(table==='board_diaries'&&!Object.hasOwn(meta,'build_notes'))out.build_notes=row.content||'';
 return out;
}
