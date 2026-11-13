import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import {transform} from 'sucrase';

// Exercise the real JSX handlers with persistent hook state and synthetic files.
function harness(path, upload=async()=>({fileId:'private-fixture'}), extras={}) {
 const slots=[];let cursor=0;
 const hooks={...React,useId:()=> 'fixture-input',useRef:value=>{const n=cursor++;return slots[n]??(slots[n]={current:value});},useState:value=>{const n=cursor++;if(!(n in slots))slots[n]=typeof value==='function'?value():value;return [slots[n],next=>{slots[n]=typeof next==='function'?next(slots[n]):next;}];}};
 const noop=()=>null;
 const mocks={react:hooks,'lucide-react':new Proxy({},{get:()=>noop}),'@/components/common/PortalMedia':noop,'@/api/googleDriveClient':{uploadToGoogleDrive:upload},...extras};
 const module={exports:{}};
 const source=fs.readFileSync(new URL(path,import.meta.url),'utf8');
 vm.runInNewContext(transform(source,{transforms:['jsx','imports']}).code,{React:hooks,module,exports:module.exports,require:name=>mocks[name]||new Proxy({},{get:()=>noop}),console});
 return {api:module.exports,render(fn,props){cursor=0;return fn(props);}};
}
function elements(tree){if(!tree||typeof tree!=='object')return [];return [tree,...React.Children.toArray(tree.props?.children).flatMap(elements)];}
const mediaPath='../src/components/internal/PdiMediaFields.jsx';
test('PDI upload validates format/size and sends private modality context; never trusts returned URLs',async()=>{
 let received,calls=0;
 const h=harness(mediaPath,async request=>{calls++;received=request;return {fileId:'private-fixture',directUrl:'https://external.invalid'};});
 const pdf={type:'application/pdf',size:10,name:'certificate.pdf'};
 assert.equal(await h.api.uploadPdiFile(pdf,{program:'FRC',season:'2026'}),'/api/media/private-fixture');
 assert.equal(received.context,'pdi');assert.equal(received.program,'FRC');assert.equal(received.season,'2026');
 for(const file of [{...pdf,type:'image/heic'},{...pdf,size:4*1024*1024+1}])await assert.rejects(h.api.uploadPdiFile(file,{program:'FTC'}));
 await assert.rejects(h.api.uploadPdiFile(pdf,{program:'FTC',photo:true}));assert.equal(calls,1);
 const bad=harness(mediaPath,async()=>({fileId:'../outside'}));await assert.rejects(bad.api.uploadPdiFile(pdf,{}));
});
test('PDI upload failure preserves attachments, releases busy state and allows retrying the same file',async()=>{
 let resolve,reject,calls=0;const changes=[],busy=[];
 const h=harness(mediaPath,()=>{calls++;return new Promise((yes,no)=>{resolve=yes;reject=no;});});
 const existing=[{name:'Original',url:'/api/media/old'}],props={value:existing,onChange:value=>changes.push(value),onBusyChange:value=>busy.push(value),program:'FTC'};
 const input=()=>elements(h.render(h.api.default,props)).find(node=>node.type==='input'&&node.props.type==='file');
 const event=()=>({currentTarget:{files:[{type:'image/png',size:70,name:'same.png'}],value:'same.png'}});
 const first=event(),pending=input().props.onChange(first);assert.equal(first.currentTarget.value,'');assert.equal(input().props.disabled,true);
 await input().props.onChange(event());assert.equal(calls,1);
 reject(Object.assign(Error('Drive unavailable'),{code:'GOOGLE_DRIVE_REAUTH_REQUIRED'}));await pending;
 assert.equal(changes.length,0);assert.equal(existing.length,1);assert.equal(input().props.disabled,false);
 const alert=elements(h.render(h.api.default,props)).find(node=>node.props.role==='alert');assert.match(alert.props.children,/renovada pelo administrador/);
 const retry=input().props.onChange(event());resolve({fileId:'retry-ok'});await retry;
 assert.equal(changes[0][0].url,'/api/media/old');assert.equal(changes[0][1].url,'/api/media/retry-ok');assert.deepEqual(busy,[true,false,true,false]);
 assert.match(h.api.pdiUploadError({status:401}),/sessão expirou/);assert.match(h.api.pdiUploadError({status:403}),/permissão/);
});
for(const program of ['FTC','FRC'])test(`${program} actual form blocks save during upload; preserves identity and file references`,()=>{

 // Expose only the existing local component to test its actual handlers.
 const source=fs.readFileSync(new URL(`../src/pages/Internal${program}PDI.jsx`,import.meta.url),'utf8');
 const tmp=source+'\nexport {PDIForm};';
 const module={exports:{}};const slots=[];let cursor=0;
 const react={...React,useState:value=>{const n=cursor++;if(!(n in slots))slots[n]=value;return [slots[n],next=>slots[n]=typeof next==='function'?next(slots[n]):next];}};
 const stub=()=>null;const mocks={react,'lucide-react':new Proxy({},{get:()=>stub}),'framer-motion':{motion:{div:'div'},AnimatePresence:'section'}};
 vm.runInNewContext(transform(tmp,{transforms:['jsx','imports']}).code,{module,exports:module.exports,require:name=>mocks[name]||new Proxy({},{get:()=>stub}),console});
 let saved;const initial={participant_id:'stable-owner',registration_version:1,member_name:'Synthetic',season:'2026',certificates:[]};
 const render=(extra={})=>{cursor=0;return module.exports.PDIForm({initial,onSave:value=>saved=value,onCancel:stub,...extra});};
 let tree=render();const media=elements(tree).find(node=>node.props.program===program&&!node.props.photo);
 media.props.onBusyChange(true);tree=render();
 assert.ok(elements(tree).filter(node=>node.props.onClick&&node.props.disabled===true).length>=3);
 media.props.onChange([{name:'Evidence',url:'/api/media/private-fixture'}]);media.props.onBusyChange(false);
 tree=render();const save=elements(tree).find(node=>node.props.onClick&&React.Children.toArray(node.props.children).includes(' Salvar Rascunho'));
 assert.equal(Boolean(save.props.disabled),false);save.props.onClick();
 assert.equal(saved.participant_id,'stable-owner');assert.equal(saved.registration_version,1);assert.equal(saved.certificates[0].url,'/api/media/private-fixture');
 assert.equal(render({isSaving:true}).props.disabled,true);
 assert.ok(elements(render({error:Error('offline')})).some(node=>node.props.role==='alert'));

});
