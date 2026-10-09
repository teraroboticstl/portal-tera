import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import {renderToStaticMarkup} from 'react-dom/server';
import {transform} from 'sucrase';
import {youtubeId} from '../src/lib/avaRules.js';
import {remarkYoutubeLinks} from '../src/lib/avaYoutubeMarkdown.js';
const require=createRequire(import.meta.url);
function component(name,mocks={}) {
  const module={exports:{}};
  const code=transform(fs.readFileSync(new URL(`../src/components/ava/${name}.jsx`,import.meta.url),'utf8'),{transforms:['jsx','imports']}).code;
  vm.runInNewContext(code,{module,exports:module.exports,require:name=>({
    '@/lib/avaRules':{youtubeId},'react-markdown':{default:ReactMarkdown,__esModule:true},
    '@/lib/avaYoutubeMarkdown':{remarkYoutubeLinks},...mocks,
  })[name] || require(name)});
  return module.exports.default;
}
const Video=component('AvaYoutube');
const Text=component('AvaText',{'./AvaYoutube':{default:Video,__esModule:true}});
const render=(C,props)=>renderToStaticMarkup(React.createElement(C,props));
test('Video URLs and IDs render an inline player with fullscreen and no external navigation',()=>{
  for(const value of ['abcdefghijk','https://www.youtube.com/watch?v=abcdefghijk&t=10','https://youtu.be/abcdefghijk?si=sample','https://youtube.com/shorts/abcdefghijk','https://youtube.com/live/abcdefghijk','https://www.youtube-nocookie.com/embed/abcdefghijk']) {
    const html=render(Video,{value,title:'Aula'});
    assert.match(html,/youtube-nocookie\.com\/embed\/abcdefghijk\?playsinline=1/);
    assert.match(html,/allowfullscreen=""/);
    assert.doesNotMatch(html,/<a /);
  }
  assert.doesNotMatch(render(Video,{value:'https://youtube.com.evil.test/watch?v=abcdefghijk'}),/<iframe/);
  assert.equal(youtubeId('https://user:password@youtube.com/watch?v=abcdefghijk'),null);
});
test('Existing Markdown links and pasted URLs become players; other links and code stay intact',()=>{
  const html=render(Text,{text:'Assista [à aula](https://www.youtube.com/watch?v=abcdefghijk).\n\nhttps://youtu.be/lmnopqrstuv?si=test\n\n[Documento](https://example.org/material)\n\n`https://youtu.be/abcdefghijk`'});
  assert.equal((html.match(/<iframe/g)||[]).length,2);
  assert.doesNotMatch(html,/href="https:\/\/(www\.youtube\.com|youtu\.be)/);
  assert.match(html,/href="https:\/\/example.org\/material"/);
  assert.match(html,/<code>https:\/\/youtu.be\/abcdefghijk<\/code>/);
  assert.equal((render(Text,{text:'https://youtube.com.evil.test/watch?v=abcdefghijk'}).match(/<iframe/g)||[]).length,0);
});
