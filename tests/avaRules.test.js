import test from 'node:test';
import assert from 'node:assert/strict';
import {youtubeId,safeHttps,validateContents,nextModule} from '../src/lib/avaRules.js';
test('AVA rejeita vídeos de domínio falso e links ativos perigosos',()=>{
 assert.equal(youtubeId('https://www.youtube.com/watch?v=abcdefghijk'),'abcdefghijk');
 assert.equal(youtubeId('https://youtu.be/abcdefghijk'),'abcdefghijk');
 assert.equal(youtubeId('https://youtube.com.evil.test/watch?v=abcdefghijk'),null);
 assert.equal(youtubeId('javascript:alert(1)'),null);
 assert.equal(safeHttps('javascript:alert(1)'),null);
 assert.equal(safeHttps('https://user:pass@example.org'),null);
});
test('AVA valida questões, notas, limites e identificadores antes de salvar',()=>{
 const quiz={id:'quiz',type:'quiz',min_score:70,max_attempts:3,questions:[{prompt:'Pergunta?',options:['A','B'],correct:1}]};
 assert.doesNotThrow(()=>validateContents([quiz]));
 assert.throws(()=>validateContents([{...quiz,min_score:0}]));
 assert.throws(()=>validateContents([{...quiz,max_attempts:0}]));
 assert.throws(()=>validateContents([{...quiz,questions:[{prompt:'?',options:['A','B'],correct:2}]}]));
 assert.throws(()=>validateContents([quiz,quiz]));
 assert.throws(()=>validateContents([{id:'file',type:'pdf'}]));
});
test('Continuar trilha respeita ordem, matrícula da trilha e versão do conteúdo',()=>{
 const modules=[{id:'b',track_id:'t',position:2,version:2},{id:'a',track_id:'t',position:1,version:1},{id:'other',track_id:'other',position:0,version:1}];
 assert.equal(nextModule(modules,[],'t').id,'a');
 assert.equal(nextModule(modules,[{module_id:'a',version:1,completed_at:'2026-10-07'}],'t').id,'b');
 assert.equal(nextModule(modules,[{module_id:'a',version:1,completed_at:'2026-10-07'},{module_id:'b',version:1,completed_at:'2026-10-07'}],'t').id,'b');
 assert.equal(nextModule(modules,[],'missing'),undefined);
});
