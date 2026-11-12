import {ResponsiveContainer,BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,LineChart,Line} from 'recharts';

export const biNumber=value=>value===null||value===undefined?'—':new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(value);
export const biControl='min-h-11 w-full rounded-xl border border-white/20 bg-[#111217] px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500';
export const biButton='inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-500/50 bg-red-600/10 px-4 py-2 text-white hover:bg-red-600/25 disabled:opacity-50';
export function BiKpi({label,value,hint}) {
  return <div className="min-w-0 rounded-2xl border border-white/10 bg-[#111217] p-5"><p className="text-sm text-gray-300">{label}</p><p className="my-2 text-3xl sm:text-4xl font-bold tabular-nums text-white">{biNumber(value)}</p>{hint&&<p className="text-xs leading-relaxed text-gray-400">{hint}</p>}</div>;
}
export function BiChart({title,data,line=false}) {
  const Chart=line?LineChart:BarChart;
  const visible=data.slice(0,30);
  return <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#111217] p-4 sm:p-5" aria-label={title}>
    <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
    {data.length>30&&<p className="mb-3 text-xs text-gray-400">Gráfico: primeiras 30 referências em ordem. Tabela: primeiras 100. Ajuste os filtros para detalhar o recorte.</p>}
    {visible.some(row=>row.value!==null)?<div className="h-64 w-full min-w-0" aria-hidden="true"><ResponsiveContainer width="100%" height="100%"><Chart data={visible} margin={{left:0,right:16,top:10,bottom:15}}><CartesianGrid stroke="#292c34" strokeDasharray="3 3"/><XAxis dataKey="name" stroke="#B8BDC7" tick={{fontSize:11}} tickFormatter={value=>String(value).slice(0,18)}/><YAxis stroke="#B8BDC7" width={46} tick={{fontSize:11}}/><Tooltip formatter={value=>biNumber(value)} labelStyle={{color:'#fff'}} contentStyle={{background:'#18191f',border:'1px solid #53545d',borderRadius:12,color:'#fff'}}/>{line?<Line name="Média" type="linear" dataKey="value" stroke="#ff4a43" strokeWidth={3} dot={{r:3}} connectNulls={false}/>:<Bar name="Valor" dataKey="value" fill="#E10600" radius={[5,5,0,0]}/>}</Chart></ResponsiveContainer></div>:<p className="py-16 text-center text-gray-400">Sem valores numéricos neste recorte.</p>}
    <details className="mt-3 text-sm text-gray-300"><summary className="cursor-pointer py-3">Ver valores do gráfico em tabela</summary><div className="max-h-60 overflow-auto"><table className="w-full text-left"><thead><tr><th className="p-2">Referência</th><th className="p-2">Valor</th></tr></thead><tbody>{data.slice(0,100).map((row,i)=><tr key={i} className="border-t border-white/10"><td className="p-2 break-words">{row.name}</td><td className="p-2">{biNumber(row.value)}</td></tr>)}</tbody></table></div></details>
  </section>;
}
