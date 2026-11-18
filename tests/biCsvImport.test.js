import test from 'node:test';import assert from 'node:assert/strict';
import {parseBiCsv,csvNumeric,csvChartData} from '../src/lib/biCsvImport.js';
test('CSV imports comma/semicolon/tab, BOM, CRLF, quoted delimiters and embedded newlines inertly',()=>{
 const d=parseBiCsv('\uFEFFEquipe;Pontos;Nota\r\n"Tera; A";"123,5";"linha 1\nlinha 2"\r\nB;20;"aspas ""texto"""');assert.equal(d.delimiter,';');assert.equal(d.rows[0][0],'Tera; A');assert.equal(d.rows[0][2],'linha 1\nlinha 2');assert.equal(csvChartData(d,0,1)[0].value,123.5);
 assert.equal(parseBiCsv('team,score\nA,2').rows.length,1);assert.equal(parseBiCsv('team\tscore\nA\t2\n').delimiter,'\t');
 const malicious=parseBiCsv('label,value\n"<script>alert(1)</script>","=HYPERLINK(1)"');assert.equal(csvChartData(malicious,0,1)[0].value,null);
});
test('numeric formats are explicit and malformed, empty or formula values never become scores',()=>{
 assert.equal(csvNumeric('1.234,56'),1234.56);assert.equal(csvNumeric('1,234.56'),1234.56);assert.equal(csvNumeric('0.9'),0.9);assert.equal(csvNumeric('1.234','pt-BR'),1234);assert.equal(csvNumeric('1,234','en-US'),1234);for(const s of ['', 'abc','=10+20','Infinity','1e100','50%'])assert.equal(csvNumeric(s),null);
});
test('CSV validation reports inconsistent columns, duplicate headers, broken quotes and bounded coverage',()=>{
 for(const s of ['a,a\n1,2','a,b\n1','a,b\n"broken,2','a,b\n1,2\0'])assert.throws(()=>parseBiCsv(s));
 const partial=parseBiCsv('team,score\nA,1\nB,"cut',{partial:true});assert.equal(partial.rows.length,1);assert.equal(partial.partial,true);
 const limited=parseBiCsv('a,b\n1,2\n3,4\n5,6\n',{maxRows:2});assert.equal(limited.rows.length,2);assert.equal(limited.partial,true);
});
import fs from 'node:fs';import vm from 'node:vm';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {transform} from 'sucrase';
test('actual CSV chart UI displays provenance, column mapping, numeric coverage and escaped labels',()=>{
 const mod={exports:{}};const dataset=parseBiCsv('Equipe;Pontos\n"<script>team</script>";"25,5"\nB;=1+2');
 const Chart=({title,data})=>React.createElement('section',{title},data.map((r,i)=>React.createElement('p',{key:i},r.name+': '+r.value)));
 const mocks={react:React,'./BiVisuals':{BiChart:Chart,biControl:'control'},'@/lib/biCsvImport':{csvChartData}};
 vm.runInNewContext(transform(fs.readFileSync(new URL('../src/components/bi/BiCsvAnalysis.jsx',import.meta.url),'utf8'),{transforms:['jsx','imports']}).code,{React,module:mod,exports:mod.exports,require:n=>mocks[n]});
 const html=renderToStaticMarkup(React.createElement(mod.exports.default,{dataset,name:'scouting.csv'}));assert.match(html,/Coluna de referência/);assert.match(html,/Coluna de valor/);assert.match(html,/não alteram scouting/);assert.match(html,/&lt;script&gt;team&lt;\/script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/25.5/);assert.match(html,/1 de 2 valores numéricos/);
});
