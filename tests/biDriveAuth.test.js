import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import vm from 'node:vm';import crypto from 'node:crypto';import path from 'node:path';import {Readable} from 'node:stream';
test('actual Drive auth helper shares institutional OAuth across chunks and invalidates cache on credential change',async()=>{
 let token='synthetic-refresh-1',created=0;const context=vm.createContext({process:{env:{GOOGLE_CLIENT_ID:'synthetic-client',GOOGLE_CLIENT_SECRET:'synthetic-secret',NODE_ENV:'production'},cwd:()=>'/synthetic'},console,Buffer,Date,Map,Set,Math});
 class OAuth{constructor(){created++;}setCredentials(c){this.credentials=c;}}
 const mod=new vm.SourceTextModule(await fs.readFile(new URL('../api/_lib/googleDrive.js',import.meta.url),'utf8'),{context});
 const mocks={'./googleOAuthStore.js':{getStoredGoogleRefreshToken:async()=>token},googleapis:{google:{auth:{OAuth2:OAuth},drive:options=>({options})}},stream:{Readable},fs:{default:{}},path:{default:path},crypto:{default:crypto}};
 await mod.link(s=>new vm.SyntheticModule(Object.keys(mocks[s]),function(){for(const [k,v]of Object.entries(mocks[s]))this.setExport(k,v);},{context}));await mod.evaluate();
 const first=await mod.namespace.getGoogleDriveTransport();assert.equal(await mod.namespace.getGoogleDriveTransport(),first);assert.equal((await mod.namespace.getGoogleDriveClient()).options.auth,first);assert.equal(created,1);
 token='synthetic-refresh-2';const second=await mod.namespace.getGoogleDriveTransport();assert.notEqual(second,first);assert.equal(created,2);assert.equal(second.credentials.refresh_token,token);
 context.process.env.GOOGLE_CLIENT_SECRET='';await assert.rejects(mod.namespace.getGoogleDriveTransport());await assert.rejects(mod.namespace.getGoogleDriveClient(),/não está configurada/);
});
