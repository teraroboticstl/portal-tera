// Bounded, inert CSV parsing. No evaluation of formulas, HTML or executable content.
export function parseBiCsv(input,{partial=false,maxRows=5000}={}){
 if(typeof input!=='string'||input.length>3*1024*1024||input.includes('\0'))throw Error('CSV inválido. Exporte como CSV UTF-8.');
 const text=input.replace(/^\uFEFF/,'');let quoted=false,head='';
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){i++;continue;}quoted=!quoted;}if(!quoted&&/[\r\n]/.test(c))break;if(!quoted)head+=c;}
 const delimiter=[',',';','\t'].sort((a,b)=>head.split(b).length-head.split(a).length)[0];
 const records=[];let row=[],value='',inQuotes=false,closed=false,truncated=partial;
 const cell=()=>{if(value.length>4096||row.length>=100)throw Error('CSV excede o limite de colunas ou tamanho de célula.');row.push(value);value='';closed=false;};
 const line=()=>{cell();if(row.some(v=>v.trim()))records.push(row);row=[];};
 for(let i=0;i<text.length;i++){
  const c=text[i];if(inQuotes){if(c==='"'){if(text[i+1]==='"'){value+='"';i++;}else{inQuotes=false;closed=true;}}else value+=c;}
  else if(c==='"'){if(value||closed)throw Error('Aspas inválidas no CSV.');inQuotes=true;}
  else if(c===delimiter)cell();
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;line();if(records.length>maxRows){truncated=true;break;}}
  else{if(closed&&!/\s/.test(c))throw Error('Separador inválido após aspas.');if(!closed)value+=c;}
  if(value.length>4096)throw Error('Uma célula do CSV é muito longa.');
  if(i===text.length-1&&!partial){if(inQuotes)throw Error('Aspas não fechadas no CSV.');if(value||row.length)line();}
 }
 if(records.length<2)throw Error('O CSV precisa de cabeçalho e pelo menos uma linha completa.');
 const headers=records.shift().map((name,i)=>name.trim()||`Coluna ${i+1}`);
 if(new Set(headers).size!==headers.length)throw Error('O CSV possui cabeçalhos repetidos. Renomeie as colunas.');
 const rows=records.slice(0,maxRows);if(rows.some(r=>r.length!==headers.length))throw Error('Há linhas com quantidade diferente de colunas. Confira o separador e as aspas.');
 return {headers,rows,partial:truncated,delimiter};
}
export function csvNumeric(value,format='auto'){
 if(typeof value!=='string')return null;let raw=value.trim().replace(/[\s\u00a0]/g,'');if(!raw)return null;
 if(format==='pt-BR')raw=raw.replace(/\./g,'').replace(',','.');
 else if(format==='en-US')raw=raw.replace(/,/g,'');
 else if(raw.includes(',')&&raw.includes('.'))raw=raw.lastIndexOf(',')>raw.lastIndexOf('.')?raw.replace(/\./g,'').replace(',','.'):raw.replace(/,/g,'');
 else raw=raw.replace(',','.');
 if(!/^[+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(raw))return null;const n=Number(raw);return Number.isFinite(n)&&Math.abs(n)<1e12?n:null;
}
export function csvChartData(dataset,labelColumn,valueColumn,format='auto'){
 if(!dataset||!Number.isInteger(labelColumn)||!Number.isInteger(valueColumn)||labelColumn<0||valueColumn<0||labelColumn>=dataset.headers.length||valueColumn>=dataset.headers.length)return [];
 return dataset.rows.map((row,index)=>({name:String(row[labelColumn]||`Linha ${index+2}`).slice(0,160),value:csvNumeric(row[valueColumn],format)}));
}
